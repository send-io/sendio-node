/**
 * End-to-end test of the free agent inbox against the local dev stack
 * (free-mx + relay + NATS in one binary).
 *
 *   FREE_DEVSTACK=/path/to/devstack pnpm vitest run e2e/free-inbox
 *
 * Or point at an already running stack with FREE_RELAY / FREE_SMTP_PORT.
 */
import { type ChildProcess, spawn } from 'node:child_process';
import {
  existsSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  statSync,
} from 'node:fs';
import { connect } from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { type FreeMail, InboxTakenError, inbox } from '../src';

const BIN = process.env.FREE_DEVSTACK || '';
const RELAY = process.env.FREE_RELAY || 'http://127.0.0.1:18080';
const SMTP_PORT = Number(process.env.FREE_SMTP_PORT || 12525);
const POOL = process.env.FREE_POOL || 'sendioinbox.test';

const enabled = Boolean(BIN || process.env.FREE_RELAY);
// With FREE_DEVSTACK the binary is started here on FREE_RELAY's host:port and FREE_SMTP_PORT.

/** Sends one message with a raw SMTP dialogue. */
export function smtpSend(
  port: number,
  from: string,
  to: string,
  data: string,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const sock = connect(port, '127.0.0.1');
    const steps = [
      'EHLO test.local',
      `MAIL FROM:<${from}>`,
      `RCPT TO:<${to}>`,
      'DATA',
      `${data.replace(/\r?\n/g, '\r\n').replace(/^\./gm, '..')}\r\n.`,
      'QUIT',
    ];
    let buf = '';
    let i = -1;
    sock.setEncoding('utf8');
    sock.setTimeout(15_000, () => sock.destroy(new Error('smtp timeout')));
    sock.on('data', (chunk: string) => {
      buf += chunk;
      // wait for a complete final reply line ("250 ..." not "250-...")
      const lines = buf.split('\r\n').filter(Boolean);
      const last = lines[lines.length - 1];
      if (!buf.endsWith('\r\n') || !last || last[3] === '-') return;
      buf = '';
      const code = Number(last.slice(0, 3));
      if (code >= 400) {
        sock.destroy();
        reject(new Error(`smtp step ${steps[i] ?? 'greeting'}: ${last}`));
        return;
      }
      i++;
      if (i < steps.length) sock.write(`${steps[i]}\r\n`);
      else sock.end();
    });
    sock.on('close', () => resolve());
    sock.on('error', reject);
  });
}

function plain(to: string, subject: string, body: string) {
  return [
    'From: Robot <robot@example.org>',
    `To: ${to}`,
    `Subject: ${subject}`,
    `Date: ${new Date().toUTCString()}`,
    `Message-ID: <${Date.now()}.${Math.random()}@example.org>`,
    'Content-Type: text/plain; charset=utf-8',
    '',
    body,
  ].join('\r\n');
}

async function waitHealthy(url: string, ms: number) {
  const end = Date.now() + ms;
  while (Date.now() < end) {
    try {
      const r = await fetch(`${url}/v1/health`);
      if (r.ok) return;
    } catch {
      // not up yet
    }
    await new Promise((r) => setTimeout(r, 250));
  }
  throw new Error(`devstack not healthy at ${url}`);
}

describe.skipIf(!enabled)('free inbox against the dev stack', () => {
  let proc: ChildProcess | undefined;
  let home: string;
  const org = `e2e${Date.now().toString(36)}`;

  beforeAll(async () => {
    home = mkdtempSync(join(tmpdir(), 'sendio-free-e2e-'));
    if (BIN && existsSync(BIN)) {
      const relayAddr = new URL(RELAY).host;
      proc = spawn(
        BIN,
        [
          '-relay',
          relayAddr,
          '-smtp',
          `127.0.0.1:${SMTP_PORT}`,
          '-nats-port',
          '0',
        ],
        { stdio: process.env.FREE_DEBUG ? 'inherit' : 'ignore' },
      );
    }
    await waitHealthy(RELAY, 30_000);
  }, 40_000);

  afterAll(() => {
    proc?.kill('SIGTERM');
    rmSync(home, { recursive: true, force: true });
  });

  it('creates, receives live, acks, reconnects without duplicates, polls and waits for a code', async () => {
    const opts = { relay: RELAY, home };

    const avail = await inbox.check({ name: 'agent', org, ...opts });
    expect(avail.available).toBe(true);
    expect(avail.address).toBe(`agent@${org}.${POOL}`);

    const created = await inbox.create({ name: 'agent', org, ...opts });
    expect(created.address).toBe(avail.address);
    expect(created.recoveryPhrase).toMatch(/^([a-z2-7]{4}-){12}[a-z2-7]{4}$/);
    const keyPath = join(created.dir, 'key.json');
    expect(statSync(keyPath).mode & 0o777).toBe(0o600);
    expect(JSON.parse(readFileSync(keyPath, 'utf8')).address).toBe(
      created.address,
    );
    expect(await inbox.list(opts)).toContain(created.address);

    // Taken now, with suggestions.
    const again = await inbox.check({ name: 'agent', org, ...opts });
    expect(again.available).toBe(false);
    await expect(
      inbox.create({ name: 'agent', org, ...opts }),
    ).rejects.toBeInstanceOf(InboxTakenError);

    const box = await inbox.open(created.address, opts);
    const address = box.address;

    // 1. live delivery over the WebSocket
    const ctl = new AbortController();
    const states: string[] = [];
    const it1 = box.messages({
      signal: ctl.signal,
      onState: (s) => states.push(s),
    });
    const first = it1.next();
    await new Promise((r) => setTimeout(r, 500));
    await smtpSend(
      SMTP_PORT,
      'robot@example.org',
      address,
      plain(address, 'Hello live', 'First body line'),
    );
    const got = await first;
    expect(got.done).toBe(false);
    const m1 = got.value as FreeMail;
    expect(m1.subject).toBe('Hello live');
    expect(m1.from).toBe('Robot <robot@example.org>');
    expect(m1.text).toContain('First body line');
    expect(existsSync(m1.path)).toBe(true);
    expect(existsSync(m1.path.replace(/\.eml$/, '.json'))).toBe(true);
    expect(states).toContain('live');
    await it1.return(undefined);
    ctl.abort();
    expect(await box.cursor()).toBe(m1.seq);

    // 2. reconnect: nothing is redelivered, the next mail arrives once
    const ctl2 = new AbortController();
    const seen: number[] = [];
    const it2 = box.messages({ signal: ctl2.signal });
    const next = it2.next();
    await new Promise((r) => setTimeout(r, 500));
    await smtpSend(
      SMTP_PORT,
      'robot@example.org',
      address,
      plain(address, 'Second', 'two'),
    );
    const m2 = (await next).value as FreeMail;
    seen.push(m2.seq);
    expect(m2.subject).toBe('Second');
    expect(m2.seq).toBeGreaterThan(m1.seq);
    const extra = await Promise.race([
      it2.next().then((r) => r.value),
      new Promise((r) => setTimeout(() => r(null), 1500)),
    ]);
    expect(extra).toBeNull();
    ctl2.abort();
    await it2.return(undefined);

    // 3. long poll
    await smtpSend(
      SMTP_PORT,
      'robot@example.org',
      address,
      plain(address, 'Polled', 'three'),
    );
    let polled = await box.poll({ wait: 5 });
    if (polled.length === 0) polled = await box.poll({ wait: 5 });
    expect(polled.map((m) => m.subject)).toEqual(['Polled']);
    expect(await box.poll({ wait: 0 })).toEqual([]);

    // 4. waitFor extracts a 6-digit code
    const waiting = box.waitFor({
      from: 'robot@',
      subject: /verify/i,
      timeoutMs: 20_000,
    });
    await new Promise((r) => setTimeout(r, 300));
    await smtpSend(
      SMTP_PORT,
      'robot@example.org',
      address,
      plain(address, 'Please verify', 'Your code is 482913. It expires soon.'),
    );
    const otp = await waiting;
    expect(otp.code).toBe('482913');

    // 5. local read, newest first
    const local = await box.read({ limit: 10 });
    expect(local.map((m) => m.subject)).toEqual([
      'Please verify',
      'Polled',
      'Second',
      'Hello live',
    ]);

    // 6. recover on a "new machine"
    const home2 = mkdtempSync(join(tmpdir(), 'sendio-free-e2e2-'));
    try {
      const restored = await inbox.recover(created.recoveryPhrase, address, {
        relay: RELAY,
        home: home2,
      });
      expect(restored.address).toBe(address);
      await smtpSend(
        SMTP_PORT,
        'robot@example.org',
        address,
        plain(address, 'After recover', 'ok'),
      );
      const r = await restored.waitFor({
        subject: 'After recover',
        timeoutMs: 15_000,
      });
      expect(r.text).toContain('ok');
    } finally {
      rmSync(home2, { recursive: true, force: true });
    }
  }, 120_000);

  it('surfaces replaced when a second connection takes the inbox', async () => {
    const created = await inbox.create({
      name: 'dual',
      org,
      relay: RELAY,
      home,
    });
    const a = created.inbox.messages();
    const pa = a.next();
    await new Promise((r) => setTimeout(r, 700));
    const ctl = new AbortController();
    const b = created.inbox.messages({ signal: ctl.signal });
    const pb = b.next();
    await expect(pa).rejects.toThrow(/another connection/);
    ctl.abort();
    await pb.catch(() => undefined);
  }, 30_000);
});
