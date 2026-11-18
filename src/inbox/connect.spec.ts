import { mkdtempSync, rmSync } from 'node:fs';
import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import nacl from 'tweetnacl';
import { type WebSocket, WebSocketServer } from 'ws';
import vectors from './__fixtures__/testvectors.json';
import {
  appBase,
  buildConnectLink,
  connectMessage,
  DEFAULT_APP_URL,
  toBase64Url,
} from './connect';
import {
  authMessage,
  deriveKeys,
  fromBase64,
  phraseFromSeed,
  randomSeed,
  toBase64,
} from './core';
import { InboxClaimedError, InboxEndedError, InboxError } from './errors';
import { inbox } from './inbox';

const hex = (s: string) => new Uint8Array(Buffer.from(s, 'hex'));
const enc = new TextEncoder();

// Same golden values as cli/internal/freeinbox/connect_test.go: seeds[0],
// ts 1760000000, nonce bytes 0x80..0x8f.
const ADDR = 'praveen@instantly.sendioinbox.com';
const TS = 1760000000;
const NONCE = 'gIGCg4SFhoeIiYqLjI2Ojw';
const SIG =
  'gSnJs3MhDEZjbjszN63ZTGF5oNwf9Qk318EM66kbunPxAoBaZBAhJJAbaD4j6H-5UCmYvcRdLb67dnSNR9cADQ';
const goldenNonce = () =>
  new Uint8Array(Array.from({ length: 16 }, (_, i) => 0x80 + i));

describe('connect links', () => {
  const savedEnv = process.env.SENDIO_APP_URL;
  afterEach(() => {
    if (savedEnv === undefined) delete process.env.SENDIO_APP_URL;
    else process.env.SENDIO_APP_URL = savedEnv;
  });

  it('signs the golden vector', async () => {
    delete process.env.SENDIO_APP_URL;
    const keys = await deriveKeys(hex(vectors.seeds[0].seed_hex));
    expect(connectMessage(TS, ADDR, NONCE)).toBe(
      `sendio-free-connect-v1:1760000000:${ADDR}:${NONCE}`,
    );
    const cl = buildConnectLink(keys, ' Praveen@Instantly.SendioInbox.com ', {
      ts: TS,
      nonce: goldenNonce(),
    });
    expect(cl.nonce).toBe(NONCE);
    expect(cl.sig).toBe(SIG);
    expect(cl.address).toBe(ADDR);
    expect(cl.link).toBe(
      `https://app.send.io/connect#a=${ADDR}&t=1760000000&n=${NONCE}&s=${SIG}`,
    );
    expect(cl.expiresAt.toISOString()).toBe('2025-10-09T09:23:20.000Z');
    // verifies with the vector's public key, as the relay does
    const sig = new Uint8Array(
      Buffer.from(SIG.replace(/-/g, '+').replace(/_/g, '/'), 'base64'),
    );
    expect(
      nacl.sign.detached.verify(
        enc.encode(connectMessage(TS, ADDR, NONCE)),
        sig,
        fromBase64(vectors.seeds[0].sign_pub),
      ),
    ).toBe(true);
    // the fragment parses back into the claim fields
    const u = new URL(cl.link);
    expect(u.pathname).toBe('/connect');
    const q = new URLSearchParams(u.hash.slice(1));
    expect([q.get('a'), q.get('t'), q.get('n'), q.get('s')]).toEqual([
      ADDR,
      '1760000000',
      NONCE,
      SIG,
    ]);
  });

  it('uses fresh base64url nonces and the app origin', async () => {
    const keys = await deriveKeys(randomSeed());
    process.env.SENDIO_APP_URL = 'https://dev.app.sendio.test/';
    const a = buildConnectLink(keys, 'bot@acme.sendioinbox.com');
    const b = buildConnectLink(keys, 'bot@acme.sendioinbox.com', {
      appUrl: 'localhost:3000',
    });
    expect(a.nonce).not.toBe(b.nonce);
    expect(
      a.link.startsWith('https://dev.app.sendio.test/connect#a=bot@'),
    ).toBe(true);
    expect(b.link.startsWith('https://localhost:3000/connect#a=')).toBe(true);
    for (const cl of [a, b]) {
      expect(cl.nonce).toMatch(/^[A-Za-z0-9_-]{22}$/);
      expect(cl.sig).toMatch(/^[A-Za-z0-9_-]{86}$/);
      expect(cl.expiresAt.getTime() - cl.ts * 1000).toBe(30 * 60_000);
    }
    expect(toBase64Url(new Uint8Array([0xfb, 0xff]))).toBe('-_8');
    expect(buildConnectLink(keys, 'a+b@x.test', { ts: 1 }).link).toContain(
      '#a=a%2Bb@x.test&',
    );
    delete process.env.SENDIO_APP_URL;
    expect(appBase()).toBe(DEFAULT_APP_URL);
  });
});

/** A relay that can claim the inbox: live connections get an error frame. */
function claimRelay(signPub: Uint8Array) {
  let claimed = false;
  let authed = 0;
  const conns = new Set<WebSocket>();
  const http: Server = createServer((req, res) => {
    if (req.url === '/v1/messages') {
      res.writeHead(claimed ? 401 : 200, {
        'content-type': 'application/json',
      });
      res.end(
        JSON.stringify(
          claimed
            ? {
                error: 'auth_failed',
                message: 'unknown inbox or bad signature',
              }
            : { messages: [] },
        ),
      );
      return;
    }
    res.writeHead(404).end();
  });
  const wss = new WebSocketServer({ server: http, path: '/v1/stream' });
  wss.on('connection', (ws) => {
    const nonce = toBase64(nacl.randomBytes(32));
    ws.send(JSON.stringify({ type: 'challenge', nonce }));
    ws.on('message', (data) => {
      const f = JSON.parse(String(data));
      if (f.type !== 'auth') return;
      const address = f.inboxes[0].address;
      const ok = nacl.sign.detached.verify(
        enc.encode(authMessage(nonce, address)),
        fromBase64(f.inboxes[0].sig),
        signPub,
      );
      if (!ok) {
        ws.send(JSON.stringify({ type: 'error', code: 'auth_failed' }));
        ws.close();
        return;
      }
      authed++;
      if (claimed) {
        ws.send(JSON.stringify({ type: 'ready', inboxes: [] }));
        ws.send(JSON.stringify({ type: 'error', code: 'claimed', address }));
        ws.close();
        return;
      }
      conns.add(ws);
      ws.send(JSON.stringify({ type: 'ready', inboxes: [address] }));
    });
    ws.on('close', () => conns.delete(ws));
  });
  return {
    http,
    get authed() {
      return authed;
    },
    claim(address: string) {
      claimed = true;
      for (const c of conns)
        c.send(
          JSON.stringify({
            type: 'error',
            code: 'claimed',
            address,
            message: 'this inbox was claimed by send.io',
          }),
        );
    },
    close() {
      wss.close();
      http.close();
    },
  };
}

describe('claimed inboxes', () => {
  let home: string;
  beforeEach(() => {
    home = mkdtempSync(join(tmpdir(), 'sendio-free-connect-'));
  });
  afterEach(() => rmSync(home, { recursive: true, force: true }));

  it('ends the stream, poll and waitFor without retrying', async () => {
    const seed = randomSeed();
    const keys = await deriveKeys(seed);
    const relay = claimRelay(keys.signPublicKey);
    await new Promise<void>((r) => relay.http.listen(0, '127.0.0.1', r));
    const url = `http://127.0.0.1:${(relay.http.address() as AddressInfo).port}`;
    const address = 'unit@acme.sendioinbox.test';
    try {
      const box = await inbox.recover(phraseFromSeed(seed), address, {
        relay: url,
        home,
        verify: false,
      });
      // module-level helper picks the only local inbox
      const cl = await inbox.connectLink(undefined, { home });
      expect(cl.address).toBe(address);
      expect(cl.link.startsWith(`${appBase()}/connect#a=${address}&t=`)).toBe(
        true,
      );
      expect(Object.keys(cl).sort()).toEqual(['address', 'expiresAt', 'link']);
      expect(await box.status()).toBe('active');

      const states: string[] = [];
      const it = box.messages({ onState: (s) => states.push(s) });
      const next = it.next();
      await new Promise((r) => setTimeout(r, 200));
      const before = relay.authed;
      relay.claim(address);
      const err = await next.catch((e) => e);
      expect(err).toBeInstanceOf(InboxClaimedError);
      expect(err).toBeInstanceOf(InboxEndedError);
      expect(err.code).toBe('claimed');
      expect(err.message).toBe(
        `${address} was moved into a send.io workspace; read it in the dashboard`,
      );
      expect(states[states.length - 1]).toBe('closed');
      expect(states).not.toContain('reconnecting');
      await new Promise((r) => setTimeout(r, 300));
      expect(relay.authed).toBe(before);

      // a new stream ends at once
      await expect(box.messages().next()).rejects.toBeInstanceOf(
        InboxClaimedError,
      );
      // HTTP says only auth_failed; poll asks the stream why
      expect(await box.status()).toBe('claimed');
      await expect(box.poll()).rejects.toBeInstanceOf(InboxClaimedError);
      await expect(box.waitFor({ timeoutMs: 3000 })).rejects.toBeInstanceOf(
        InboxClaimedError,
      );
      await expect(
        box.waitFor({ timeoutMs: 3000, via: 'stream' }),
      ).rejects.toBeInstanceOf(InboxClaimedError);
    } finally {
      relay.close();
    }
  }, 15_000);

  it('connectLink needs an address when there are several inboxes', async () => {
    for (const name of ['one', 'two']) {
      await inbox.recover(
        phraseFromSeed(randomSeed()),
        `${name}@acme.sendioinbox.test`,
        { home, verify: false, relay: 'http://127.0.0.1:1' },
      );
    }
    await expect(inbox.connectLink(undefined, { home })).rejects.toThrow(
      /several free inboxes/,
    );
    const cl = await inbox.connectLink('two@acme.sendioinbox.test', {
      home,
      appUrl: 'https://x.test',
    });
    expect(cl.link.startsWith('https://x.test/connect#a=two@')).toBe(true);
    await rmSync(home, { recursive: true, force: true });
    await expect(inbox.connectLink(undefined, { home })).rejects.toBeInstanceOf(
      InboxError,
    );
  });
});
