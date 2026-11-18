import { mkdtempSync, rmSync } from 'node:fs';
import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import nacl from 'tweetnacl';
import { type WebSocket, WebSocketServer } from 'ws';
import {
  authMessage,
  deriveKeys,
  fromBase64,
  phraseFromSeed,
  randomSeed,
  sealEnvelope,
  toBase64,
} from './core';
import { InboxReplacedError } from './errors';
import { type FreeMail, inbox } from './inbox';

const enc = new TextEncoder();

/** A tiny in-memory relay speaking the WebSocket part of the protocol. */
function fakeRelay(boxPub: Uint8Array, signPub: Uint8Array) {
  const stored: { seq: number; envelope: string }[] = [];
  let seq = 0;
  const acks: number[] = [];
  const conns = new Set<WebSocket>();
  let authed = 0;
  const http: Server = createServer((req, res) => {
    res.writeHead(404).end();
    void req;
  });
  const wss = new WebSocketServer({ server: http, path: '/v1/stream' });
  wss.on('connection', (ws) => {
    conns.add(ws);
    const nonce = toBase64(nacl.randomBytes(32));
    let address = '';
    ws.send(JSON.stringify({ type: 'challenge', nonce }));
    ws.on('message', (data) => {
      const f = JSON.parse(String(data));
      if (f.type === 'auth') {
        address = f.inboxes[0].address;
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
        for (const other of conns) {
          if (other !== ws)
            other.send(JSON.stringify({ type: 'replaced', address }));
        }
        ws.send(JSON.stringify({ type: 'ready', inboxes: [address] }));
        ws.send(JSON.stringify({ type: 'ping' }));
        // replay everything, even what the cursor says was seen (tests dedupe)
        for (const m of stored) send(ws, address, m);
      } else if (f.type === 'ack') {
        acks.push(f.seq);
      }
    });
    ws.on('close', () => conns.delete(ws));
  });
  function send(
    ws: WebSocket,
    address: string,
    m: { seq: number; envelope: string },
  ) {
    ws.send(
      JSON.stringify({
        type: 'message',
        address,
        seq: m.seq,
        id: `id-${m.seq}`,
        received_at: new Date().toISOString(),
        size: 10,
        envelope: m.envelope,
      }),
    );
  }
  return {
    http,
    acks,
    get authed() {
      return authed;
    },
    deliver(raw: string, address: string) {
      const m = {
        seq: ++seq,
        envelope: toBase64(sealEnvelope(enc.encode(raw), boxPub)),
      };
      stored.push(m);
      for (const c of conns) send(c, address, m);
    },
    dropAll() {
      for (const c of conns) c.terminate();
    },
    close() {
      wss.close();
      http.close();
    },
  };
}

describe('messages() against a fake relay', () => {
  let home: string;
  beforeEach(() => {
    home = mkdtempSync(join(tmpdir(), 'sendio-free-unit-'));
  });
  afterEach(() => rmSync(home, { recursive: true, force: true }));

  it.each([
    ['global WebSocket', false],
    ['ws package (Node 20 path)', true],
  ])(
    'stores, acks, dedupes across reconnects, and surfaces replaced (%s)',
    async (_label, hideGlobal) => {
      const g = globalThis as { WebSocket?: unknown };
      const saved = g.WebSocket;
      if (hideGlobal) delete g.WebSocket;
      onTestFinished(() => {
        g.WebSocket = saved;
      });
      const seed = randomSeed();
      const keys = await deriveKeys(seed);
      const relay = fakeRelay(keys.boxPublicKey, keys.signPublicKey);
      await new Promise<void>((r) => relay.http.listen(0, '127.0.0.1', r));
      const url = `http://127.0.0.1:${(relay.http.address() as AddressInfo).port}`;
      const address = 'unit@acme.sendioinbox.test';
      try {
        const box = await inbox.recover(phraseFromSeed(seed), address, {
          relay: url,
          home,
          verify: false,
        });
        const ctl = new AbortController();
        const states: string[] = [];
        const it = box.messages({
          signal: ctl.signal,
          onState: (s) => states.push(s),
        });
        const p1 = it.next();
        await new Promise((r) => setTimeout(r, 200));
        relay.deliver('From: a@b.c\r\nSubject: one\r\n\r\nbody one', address);
        const m1 = (await p1).value as FreeMail;
        expect(m1.subject).toBe('one');
        expect(relay.acks).toEqual([1]);
        expect(await box.cursor()).toBe(1);

        // connection drops; client reconnects after ~1 s and the relay replays seq 1
        const p2 = it.next();
        relay.dropAll();
        await new Promise((r) => setTimeout(r, 2500));
        expect(relay.authed).toBe(2);
        relay.deliver('From: a@b.c\r\nSubject: two\r\n\r\nbody two', address);
        const m2 = (await p2).value as FreeMail;
        expect(m2.subject).toBe('two');
        expect(m2.seq).toBe(2);
        expect(relay.acks).toEqual([1, 1, 2]);
        expect(states.filter((s) => s === 'live')).toHaveLength(2);

        // a second client takes over
        const p3 = it.next();
        const other = await inbox.open(address, { relay: url, home });
        const ctl2 = new AbortController();
        const it2 = other.messages({ signal: ctl2.signal });
        void it2.next().catch(() => undefined);
        await expect(p3).rejects.toBeInstanceOf(InboxReplacedError);
        ctl2.abort();
        ctl.abort();
        const local = await box.read();
        expect(local.map((m) => m.subject)).toEqual(['two', 'one']);
      } finally {
        relay.close();
      }
    },
    15_000,
  );
});
