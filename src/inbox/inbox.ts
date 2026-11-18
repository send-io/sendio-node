import { buildConnectLink, type ConnectLink } from './connect';
import {
  ackMessage,
  authMessage,
  deriveKeys,
  extractCode,
  type FreeAttachment,
  fromBase64,
  type InboxKeys,
  leadingZeroBits,
  normalizeLabel,
  openEnvelope,
  orgMessage,
  parseMail,
  phraseFromSeed,
  pollMessage,
  randomSeed,
  relayBase,
  seedFromPhrase,
  sign,
  streamUrl,
  toBase64,
  validateName,
  validateOrg,
} from './core';
import {
  endedError,
  InboxAuthError,
  InboxEndedError,
  InboxError,
  InboxReplacedError,
  InboxTakenError,
} from './errors';
import {
  defaultRelay,
  InboxStore,
  type KeyFile,
  listAddresses,
  type MailRecord,
} from './storage';

// ---------------------------------------------------------------- types

export interface InboxClientOptions {
  /** Relay base URL. Default: SENDIO_FREE_RELAY, then the inbox's key.json, then https://relay.sendioinbox.com. */
  relay?: string;
  /** Replaces `~/.sendio` (files go to `<home>/free/<address>`). Default: SENDIO_HOME. */
  home?: string;
  signal?: AbortSignal;
}

export interface CheckResult {
  address: string;
  available: boolean;
  reason?: 'taken' | 'org_owned' | 'reserved' | 'blocked' | 'invalid' | string;
  hold_token?: string;
  suggestions: string[];
}

export interface CreateInboxOptions extends InboxClientOptions {
  name: string;
  org: string;
  /** Pool domain (default: the relay's first, e.g. sendioinbox.com). Sent as `&pool=`. */
  pool?: string;
}

export interface CreatedInbox {
  address: string;
  /** Shown once. The only way to restore the inbox on another machine. */
  recoveryPhrase: string;
  createdAt: string;
  holdHours: number;
  dailyLimit: number;
  maxMessageBytes: number;
  /** Folder holding key.json, state.json and mail/. */
  dir: string;
  inbox: FreeInbox;
}

export type FreeMailAttachment = FreeAttachment & { content: Uint8Array };

export interface FreeMail extends Omit<MailRecord, 'attachments'> {
  address: string;
  size: number;
  text: string;
  html: string;
  attachments: FreeMailAttachment[];
  /** Raw decrypted RFC 5322 message. */
  raw: Uint8Array;
  /** Path of the stored .eml. */
  path: string;
}

export type ConnectionState = 'connecting' | 'live' | 'reconnecting' | 'closed';

export interface MessagesOptions {
  signal?: AbortSignal;
  /** Called on connection state changes. */
  onState?: (
    state: ConnectionState,
    detail?: { attempt: number; delayMs?: number },
  ) => void;
  /** Called when a message cannot be opened or stored (it is skipped). */
  onError?: (error: Error) => void;
  /** Close and reconnect when no frame arrives for this long. Default 90 000. */
  idleTimeoutMs?: number;
}

export interface PollOptions {
  /** Seconds to wait when nothing is waiting (0 to 25). Default 0. */
  wait?: number;
  /** Max messages per call (1 to 100). Default 100. */
  limit?: number;
  signal?: AbortSignal;
}

export interface WaitForOptions {
  /** Substring (case-insensitive) or pattern matched against the From header. */
  from?: string | RegExp;
  /** Substring (case-insensitive) or pattern matched against the subject. */
  subject?: string | RegExp;
  match?: (mail: FreeMail) => boolean;
  /** Default 120 000. */
  timeoutMs?: number;
  signal?: AbortSignal;
  /** 'poll' (default, signed long poll) or 'stream' (WebSocket). */
  via?: 'poll' | 'stream';
  /** Also consider mail already stored locally. Default false. */
  includeStored?: boolean;
  /** Digits in the code to extract. Default 6. */
  codeDigits?: number;
}

export interface ConnectLinkOptions extends InboxClientOptions {
  /** Web app origin. Default: SENDIO_APP_URL, then https://app.send.io. */
  appUrl?: string;
}

/** What the relay says about an inbox's key (see FreeInbox.status). */
export type InboxStatus =
  | 'active'
  | 'claimed'
  | 'suspended'
  | 'deleted'
  | 'auth_failed';

export interface MessageFrame {
  address: string;
  seq: number;
  id: string;
  received_at: string;
  size: number;
  envelope: string;
}

// ---------------------------------------------------------------- http

async function relayFetch<T>(
  base: string,
  path: string,
  init: { method?: string; body?: unknown; signal?: AbortSignal } = {},
): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${relayBase(base)}${path}`, {
      method: init.method || 'GET',
      headers: init.body ? { 'content-type': 'application/json' } : undefined,
      body: init.body ? JSON.stringify(init.body) : undefined,
      signal: init.signal,
    });
  } catch (e) {
    if ((e as Error).name === 'AbortError') throw e;
    throw new InboxError(
      'network',
      `relay unreachable: ${(e as Error).message}`,
    );
  }
  const text = await res.text();
  let data: Record<string, unknown> = {};
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    // non-JSON body
  }
  if (!res.ok) {
    const code =
      typeof data.error === 'string' ? data.error : `http_${res.status}`;
    const message =
      typeof data.message === 'string' ? data.message : text || res.statusText;
    if (res.status === 409) {
      throw new InboxTakenError(
        typeof data.address === 'string' ? data.address : '',
        Array.isArray(data.suggestions) ? (data.suggestions as string[]) : [],
        code,
        message,
      );
    }
    throw new InboxError(code, message, res.status);
  }
  return data as T;
}

// ---------------------------------------------------------------- proof of work

/** Finds a decimal nonce so sha256(challenge + ":" + nonce) has `difficulty` leading zero bits. */
export async function solvePow(
  challenge: string,
  difficulty: number,
  signal?: AbortSignal,
): Promise<string> {
  const { createHash } = await import('node:crypto');
  for (let nonce = 0; ; nonce++) {
    const digest = createHash('sha256')
      .update(`${challenge}:${nonce}`)
      .digest();
    if (leadingZeroBits(digest) >= difficulty) return String(nonce);
    if (nonce % 50_000 === 49_999) {
      signal?.throwIfAborted();
      await new Promise((r) => setImmediate(r));
    }
  }
}

// ---------------------------------------------------------------- helpers

function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve) => {
    const t = setTimeout(done, ms);
    function done() {
      clearTimeout(t);
      signal?.removeEventListener('abort', done);
      resolve();
    }
    signal?.addEventListener('abort', done, { once: true });
  });
}

/** 1, 2, 4 ... 60 s plus up to 1 s of jitter. */
export function backoffMs(attempt: number): number {
  return Math.min(60, 2 ** attempt) * 1000 + Math.floor(Math.random() * 1000);
}

type WS = {
  readyState: number;
  send(data: string): void;
  close(code?: number): void;
  addEventListener(type: string, fn: (ev: { data?: unknown }) => void): void;
};

async function openSocket(url: string): Promise<WS> {
  const G = (globalThis as { WebSocket?: new (u: string) => WS }).WebSocket;
  if (G) return new G(url);
  try {
    const mod = (await import('ws')) as unknown as {
      default?: new (u: string) => WS;
      WebSocket?: new (u: string) => WS;
    };
    const Ctor = mod.WebSocket || mod.default;
    if (!Ctor) throw new Error('ws export missing');
    return new Ctor(url);
  } catch (e) {
    throw new InboxError(
      'no_websocket',
      `this Node version has no global WebSocket; install the "ws" package (${(e as Error).message})`,
    );
  }
}

/** A WebSocket as an async stream of parsed JSON frames. */
class FrameStream {
  private queue: Record<string, unknown>[] = [];
  private wake: (() => void) | null = null;
  private closed = false;
  private idle: ReturnType<typeof setTimeout> | undefined;

  constructor(
    private readonly ws: WS,
    private readonly idleMs: number,
    signal?: AbortSignal,
  ) {
    ws.addEventListener('message', (ev) => {
      this.touch();
      try {
        this.queue.push(JSON.parse(String(ev.data)));
      } catch {
        return;
      }
      this.notify();
    });
    const end = () => this.end();
    ws.addEventListener('close', end);
    ws.addEventListener('error', end);
    signal?.addEventListener('abort', end, { once: true });
    this.touch();
  }

  private touch() {
    clearTimeout(this.idle);
    this.idle = setTimeout(() => this.end(), this.idleMs);
  }

  private notify() {
    const w = this.wake;
    this.wake = null;
    w?.();
  }

  send(frame: unknown) {
    if (!this.closed && this.ws.readyState === 1)
      this.ws.send(JSON.stringify(frame));
  }

  end() {
    if (this.closed) return;
    this.closed = true;
    clearTimeout(this.idle);
    try {
      this.ws.close();
    } catch {
      // already closing
    }
    this.notify();
  }

  async *frames(): AsyncGenerator<Record<string, unknown>> {
    while (true) {
      const f = this.queue.shift();
      if (f) {
        yield f;
        continue;
      }
      if (this.closed) return;
      await new Promise<void>((r) => {
        this.wake = r;
      });
    }
  }
}

function textMatch(value: string, want?: string | RegExp): boolean {
  if (want === undefined) return true;
  if (want instanceof RegExp) return want.test(value);
  return value.toLowerCase().includes(want.toLowerCase());
}

// ---------------------------------------------------------------- inbox

/** One anonymous inbox whose key lives on this machine. */
export class FreeInbox {
  readonly address: string;
  readonly relay: string;
  readonly dir: string;
  private readonly store: InboxStore;
  private readonly keys: InboxKeys;

  constructor(store: InboxStore, keys: InboxKeys, relay: string) {
    this.store = store;
    this.keys = keys;
    this.address = store.address;
    this.relay = relayBase(relay);
    this.dir = store.dir;
  }

  /** Last acked sequence number. */
  cursor(): Promise<number> {
    return this.store.readCursor();
  }

  /** The recovery phrase for this inbox (from the local seed). */
  recoveryPhrase(): string {
    return phraseFromSeed(this.keys.seed);
  }

  /** Opens, parses and stores a message frame. Returns null when it was already stored. */
  private async accept(
    frame: MessageFrame,
    cursor: number,
  ): Promise<FreeMail | null> {
    if (frame.seq <= cursor) return null;
    const raw = openEnvelope(
      fromBase64(frame.envelope),
      this.keys.boxSecretKey,
    );
    const parsed = await parseMail(raw);
    const record: MailRecord = {
      seq: frame.seq,
      id: frame.id,
      received_at: frame.received_at,
      from: parsed.from,
      to: parsed.to,
      subject: parsed.subject,
      date: parsed.date,
      attachments: parsed.attachments,
      text: parsed.text,
      html: parsed.html,
    };
    await this.store.writeMail(frame.seq, raw, record);
    return {
      ...record,
      address: this.address,
      size: frame.size ?? raw.length,
      text: parsed.text,
      html: parsed.html,
      attachments: parsed.attachments.map((a, i) => ({
        ...a,
        content: parsed.attachmentContents[i],
      })),
      raw,
      path: this.store.emlPath(frame.seq),
    };
  }

  /**
   * Live mail over the relay WebSocket: replays everything after the cursor, then
   * streams new mail. Each message is decrypted, written to disk, acked, and then
   * yielded. Reconnects with backoff (1, 2, 4 ... 60 s + jitter) until `signal`
   * aborts or the consumer breaks out. Throws InboxReplacedError when another
   * connection takes over the inbox, InboxAuthError when the relay refuses it,
   * and InboxClaimedError (an InboxEndedError) once the inbox was attached to a
   * send.io workspace (it is not retried; suspended/deleted end it the same way).
   */
  async *messages(
    options: MessagesOptions = {},
  ): AsyncGenerator<FreeMail, void, undefined> {
    const { signal, onState, onError } = options;
    const idleMs = options.idleTimeoutMs ?? 90_000;
    let attempt = 0;
    let cursor = await this.store.readCursor();
    while (!signal?.aborted) {
      onState?.(attempt === 0 ? 'connecting' : 'reconnecting', { attempt });
      let stream: FrameStream | null = null;
      try {
        stream = new FrameStream(
          await openSocket(streamUrl(this.relay)),
          idleMs,
          signal,
        );
        for await (const f of stream.frames()) {
          switch (f.type) {
            case 'challenge': {
              const nonce = String(f.nonce);
              stream.send({
                type: 'auth',
                inboxes: [
                  {
                    address: this.address,
                    sig: sign(authMessage(nonce, this.address), this.keys),
                  },
                ],
                cursors: { [this.address]: cursor },
              });
              break;
            }
            case 'ready':
              attempt = 0;
              onState?.('live', { attempt });
              break;
            case 'ping':
              stream.send({ type: 'pong' });
              break;
            case 'replaced':
              throw new InboxReplacedError(this.address);
            case 'error': {
              if (f.code === 'auth_failed') throw new InboxAuthError();
              const ended = endedError(this.address, String(f.code));
              if (
                ended &&
                (!f.address || String(f.address).toLowerCase() === this.address)
              )
                throw ended;
              throw new InboxError(
                String(f.code || 'error'),
                String(f.message || 'relay error'),
              );
            }
            case 'message': {
              const frame = f as unknown as MessageFrame;
              if (frame.address && frame.address !== this.address) break;
              let mail: FreeMail | null = null;
              try {
                mail = await this.accept(frame, cursor);
              } catch (e) {
                onError?.(e as Error);
                break;
              }
              stream.send({
                type: 'ack',
                address: this.address,
                seq: frame.seq,
              });
              if (frame.seq > cursor) {
                cursor = frame.seq;
                await this.store.writeCursor(cursor);
              }
              if (mail) yield mail;
              break;
            }
          }
        }
      } catch (e) {
        if (
          e instanceof InboxReplacedError ||
          e instanceof InboxAuthError ||
          e instanceof InboxEndedError
        ) {
          onState?.('closed', { attempt });
          throw e;
        }
        if (!(e instanceof InboxError)) onError?.(e as Error);
      } finally {
        stream?.end();
      }
      if (signal?.aborted) break;
      const delayMs = backoffMs(attempt);
      attempt++;
      onState?.('reconnecting', { attempt, delayMs });
      await sleep(delayMs, signal);
    }
    onState?.('closed', { attempt });
  }

  /**
   * One signed long poll (for cron and serverless): fetches mail after the cursor,
   * waiting up to `wait` seconds when none is waiting, stores it, then acks.
   */
  async poll(options: PollOptions = {}): Promise<FreeMail[]> {
    const wait = Math.max(0, Math.min(25, Math.floor(options.wait ?? 0)));
    const limit = Math.max(1, Math.min(100, Math.floor(options.limit ?? 100)));
    const cursor = await this.store.readCursor();
    const ts = Math.floor(Date.now() / 1000);
    let res: { messages?: MessageFrame[] };
    try {
      res = await relayFetch<{ messages?: MessageFrame[] }>(
        this.relay,
        '/v1/messages',
        {
          method: 'POST',
          body: {
            address: this.address,
            ts,
            sig: sign(pollMessage(ts, this.address), this.keys),
            after: cursor,
            wait,
            limit,
          },
          signal: options.signal,
        },
      );
    } catch (e) {
      throw await this.explain(e, options.signal);
    }
    const out: FreeMail[] = [];
    let last = cursor;
    for (const frame of [...(res.messages || [])].sort(
      (a, b) => a.seq - b.seq,
    )) {
      const mail = await this.accept(frame, cursor);
      if (mail) out.push(mail);
      last = Math.max(last, frame.seq);
    }
    if (last > cursor) {
      await this.ack(last, options.signal);
      await this.store.writeCursor(last);
    }
    return out;
  }

  /**
   * The HTTP API answers 401 auth_failed for a claimed, suspended or deleted
   * inbox alike; the stream says which. Returns the error to throw.
   */
  private async explain(e: unknown, signal?: AbortSignal): Promise<unknown> {
    if (
      !(e instanceof InboxError) ||
      e.code !== 'auth_failed' ||
      (e.status !== 401 && e.status !== 403) ||
      /ts outside/.test(e.message)
    )
      return e;
    try {
      const st = await this.status({ signal });
      return endedError(this.address, st) || e;
    } catch {
      return e;
    }
  }

  /**
   * A one-time link that attaches this inbox to a send.io workspace: give it to
   * your user; they open it, sign in, and the inbox moves into their workspace,
   * where it is read in the dashboard and can also send (workspace credits, up
   * to 50 a day). Signed locally with the inbox key; works once and expires in
   * 30 minutes. Anyone holding it can take the inbox. Afterwards messages(),
   * poll() and waitFor() throw InboxClaimedError.
   */
  connectLink(options: { appUrl?: string } = {}): ConnectLink {
    const { address, link, expiresAt } = buildConnectLink(
      this.keys,
      this.address,
      { appUrl: options.appUrl },
    );
    return { address, link, expiresAt };
  }

  /**
   * Asks the relay over the stream whether this key can still read the inbox:
   * 'active', 'claimed' (moved into a send.io workspace), 'suspended',
   * 'deleted' or 'auth_failed'. Receives no mail. Like any stream connection
   * it takes over an active inbox from another live connection.
   */
  async status(
    options: { signal?: AbortSignal; timeoutMs?: number } = {},
  ): Promise<InboxStatus> {
    const ctl = new AbortController();
    const timer = setTimeout(() => ctl.abort(), options.timeoutMs ?? 15_000);
    const onAbort = () => ctl.abort();
    options.signal?.addEventListener('abort', onAbort, { once: true });
    const stream = new FrameStream(
      await openSocket(streamUrl(this.relay)),
      options.timeoutMs ?? 15_000,
      ctl.signal,
    );
    let ready = false;
    let settle: ReturnType<typeof setTimeout> | undefined;
    try {
      for await (const f of stream.frames()) {
        if (f.type === 'challenge') {
          stream.send({
            type: 'auth',
            inboxes: [
              {
                address: this.address,
                sig: sign(
                  authMessage(String(f.nonce), this.address),
                  this.keys,
                ),
              },
            ],
          });
        } else if (f.type === 'ready') {
          ready = true;
          if (Array.isArray(f.inboxes) && f.inboxes.length > 0) return 'active';
          // ended inboxes are reported right after ready
          settle = setTimeout(() => stream.end(), 2000);
        } else if (f.type === 'error') {
          const code = String(f.code);
          if (
            code === 'auth_failed' ||
            code === 'claimed' ||
            code === 'suspended' ||
            code === 'deleted'
          )
            return code;
          throw new InboxError(code, String(f.message || 'relay error'));
        }
      }
    } finally {
      clearTimeout(timer);
      clearTimeout(settle);
      options.signal?.removeEventListener('abort', onAbort);
      stream.end();
    }
    options.signal?.throwIfAborted();
    if (ready) return 'active';
    throw new InboxError('network', 'no answer from the relay stream');
  }

  /** Cumulative signed ack over HTTP (the relay deletes every message with seq <= `seq`). */
  async ack(seq: number, signal?: AbortSignal): Promise<void> {
    const ts = Math.floor(Date.now() / 1000);
    await relayFetch(this.relay, '/v1/ack', {
      method: 'POST',
      body: {
        address: this.address,
        ts,
        sig: sign(ackMessage(ts, this.address, seq), this.keys),
        seq,
      },
      signal,
    });
  }

  /**
   * Waits for the first new message matching the filters and returns it with
   * `code`: the first 6-digit number in the subject or body (for OTP mails).
   */
  async waitFor(
    options: WaitForOptions = {},
  ): Promise<FreeMail & { code?: string }> {
    const timeoutMs = options.timeoutMs ?? 120_000;
    const deadline = Date.now() + timeoutMs;
    const matches = (m: FreeMail) =>
      textMatch(m.from, options.from) &&
      textMatch(m.subject, options.subject) &&
      (!options.match || options.match(m));
    const found = (m: FreeMail) => ({
      ...m,
      code: extractCode(m, options.codeDigits ?? 6),
    });

    if (options.includeStored) {
      const hit = (await this.read({ limit: 100 })).find(matches);
      if (hit) return found(hit);
    }

    const ctl = new AbortController();
    const timer = setTimeout(() => ctl.abort(), timeoutMs);
    const onAbort = () => ctl.abort();
    options.signal?.addEventListener('abort', onAbort, { once: true });
    try {
      if (options.via === 'stream') {
        for await (const m of this.messages({ signal: ctl.signal })) {
          if (matches(m)) return found(m);
        }
      } else {
        while (!ctl.signal.aborted) {
          const left = Math.floor((deadline - Date.now()) / 1000);
          let batch: FreeMail[] = [];
          try {
            batch = await this.poll({
              wait: Math.max(0, Math.min(25, left)),
              signal: ctl.signal,
            });
          } catch (e) {
            if (ctl.signal.aborted) break;
            if (
              e instanceof InboxError &&
              e.code !== 'network' &&
              !(e.status && e.status >= 500)
            )
              throw e;
            await sleep(1000, ctl.signal);
          }
          const hit = batch.find(matches);
          if (hit) return found(hit);
          if (left <= 0) break;
        }
      }
    } finally {
      clearTimeout(timer);
      options.signal?.removeEventListener('abort', onAbort);
    }
    options.signal?.throwIfAborted();
    throw new InboxError(
      'timeout',
      `no matching mail for ${this.address} within ${timeoutMs} ms`,
    );
  }

  /** Mail stored on this machine, newest first. */
  async read(options: { limit?: number } = {}): Promise<FreeMail[]> {
    const seqs = (await this.store.listSeqs())
      .reverse()
      .slice(0, options.limit ?? 20);
    const out: FreeMail[] = [];
    for (const seq of seqs) {
      const record = await this.store.readRecord(seq);
      const raw = await this.store.readRaw(seq);
      const parsed = await parseMail(raw);
      out.push({
        ...record,
        address: this.address,
        size: raw.length,
        text: parsed.text,
        html: parsed.html,
        attachments: parsed.attachments.map((a, i) => ({
          ...a,
          content: parsed.attachmentContents[i],
        })),
        raw,
        path: this.store.emlPath(seq),
      });
    }
    return out;
  }
}

// ---------------------------------------------------------------- module API

function pickRelay(explicit?: string, fromKey?: string): string {
  return relayBase(
    explicit || process.env.SENDIO_FREE_RELAY || fromKey || defaultRelay(),
  );
}

async function loadInbox(
  address: string,
  options: InboxClientOptions,
): Promise<FreeInbox> {
  const store = new InboxStore(address.toLowerCase(), options.home);
  let key: KeyFile;
  try {
    key = await store.readKey();
  } catch {
    throw new InboxError(
      'not_found',
      `no local key for ${address} in ${store.dir}`,
    );
  }
  const keys = await deriveKeys(fromBase64(key.seed));
  return new FreeInbox(store, keys, pickRelay(options.relay, key.relay));
}

function normalizeParts(name: string, org: string) {
  const n = normalizeLabel(name);
  const o = normalizeLabel(org);
  const problem = validateName(n) || validateOrg(o);
  if (problem) throw new InboxError('invalid', problem, 400);
  return { name: n, org: o };
}

/** Is `<name>@<org>.<pool>` free? Returns suggestions when it is not. */
async function check(options: CreateInboxOptions): Promise<CheckResult> {
  const { name, org } = normalizeParts(options.name, options.org);
  const relay = pickRelay(options.relay);
  const q = new URLSearchParams({ name, org });
  if (options.pool) q.set('pool', options.pool.toLowerCase());
  const res = await relayFetch<CheckResult>(relay, `/v1/check?${q}`, {
    signal: options.signal,
  });
  const result = { ...res, suggestions: res.suggestions || [] };
  // An available check holds the address for 10 minutes; create() reuses the
  // hold instead of checking again (a second check would see it held).
  const key = holdKey(relay, name, org, options.pool);
  if (result.available && result.hold_token) {
    holds.set(key, { result, at: Date.now() });
  } else {
    holds.delete(key);
  }
  return result;
}

const holds = new Map<string, { result: CheckResult; at: number }>();
const HOLD_REUSE_MS = 9 * 60_000;

function holdKey(relay: string, name: string, org: string, pool?: string) {
  return `${relay}|${name}|${org}|${(pool || '').toLowerCase()}`;
}

/** Finds a local inbox that owns the org label of `address` and signs for it. */
async function localOrgSig(
  address: string,
  home?: string,
): Promise<string | undefined> {
  const domain = address.split('@')[1];
  for (const other of await listAddresses(home)) {
    if (other === address || other.split('@')[1] !== domain) continue;
    try {
      const key = await new InboxStore(other, home).readKey();
      const keys = await deriveKeys(fromBase64(key.seed));
      return sign(orgMessage(address), keys);
    } catch {
      // unreadable key; try the next one
    }
  }
  return undefined;
}

/**
 * Creates an anonymous inbox: check, proof of work, keys from a fresh seed,
 * register, and save key.json (0600). Throws InboxTakenError with
 * `.suggestions` when the address is not available.
 */
async function create(options: CreateInboxOptions): Promise<CreatedInbox> {
  const relay = pickRelay(options.relay);
  const { signal, home } = options;
  const parts = normalizeParts(options.name, options.org);
  const key = holdKey(relay, parts.name, parts.org, options.pool);
  const held = holds.get(key);
  holds.delete(key);
  const avail =
    held && Date.now() - held.at < HOLD_REUSE_MS
      ? held.result
      : await check({ ...options, relay });
  holds.delete(key);
  let orgSig: string | undefined;
  if (!avail.available) {
    if (avail.reason === 'org_owned')
      orgSig = await localOrgSig(avail.address, home);
    if (!orgSig) {
      if (avail.reason === 'taken' || avail.reason === 'org_owned') {
        throw new InboxTakenError(
          avail.address,
          avail.suggestions,
          avail.reason,
        );
      }
      throw new InboxError(
        avail.reason || 'invalid',
        `${avail.address} cannot be issued (${avail.reason})`,
        403,
      );
    }
  }
  const address = avail.address;
  const pow = await relayFetch<{ challenge: string; difficulty: number }>(
    relay,
    '/v1/pow',
    {
      method: 'POST',
      signal,
    },
  );
  const nonce = await solvePow(pow.challenge, pow.difficulty, signal);
  const seed = randomSeed();
  const keys = await deriveKeys(seed);
  const body: Record<string, unknown> = {
    address,
    sign_pub: toBase64(keys.signPublicKey),
    box_pub: toBase64(keys.boxPublicKey),
    pow: { challenge: pow.challenge, nonce },
  };
  if (avail.hold_token) body.hold_token = avail.hold_token;
  if (orgSig) body.org_sig = orgSig;
  let res: {
    address: string;
    created_at: string;
    hold_hours: number;
    daily_limit: number;
    max_message_bytes: number;
  };
  try {
    res = await relayFetch(relay, '/v1/inboxes', {
      method: 'POST',
      body,
      signal,
    });
  } catch (e) {
    if (e instanceof InboxTakenError && !e.address) {
      throw new InboxTakenError(address, e.suggestions, e.code, e.message);
    }
    throw e;
  }
  const finalAddress = res.address || address;
  const store = new InboxStore(finalAddress, home);
  await store.writeKey({
    address: finalAddress,
    seed: toBase64(seed),
    sign_pub: toBase64(keys.signPublicKey),
    box_pub: toBase64(keys.boxPublicKey),
    created_at: res.created_at,
    relay,
  });
  await store.writeCursor(0);
  return {
    address: finalAddress,
    recoveryPhrase: phraseFromSeed(seed),
    createdAt: res.created_at,
    holdHours: res.hold_hours,
    dailyLimit: res.daily_limit,
    maxMessageBytes: res.max_message_bytes,
    dir: store.dir,
    inbox: new FreeInbox(store, keys, relay),
  };
}

/** Opens an inbox whose key.json is on this machine. */
function open(
  address: string,
  options: InboxClientOptions = {},
): Promise<FreeInbox> {
  return loadInbox(address, options);
}

/** Addresses with a key on this machine. */
function list(options: InboxClientOptions = {}): Promise<string[]> {
  return listAddresses(options.home);
}

/**
 * Restores an inbox from its recovery phrase and writes key.json. With
 * `verify` (default true) a signed zero-wait poll confirms the relay accepts the key
 * (nothing is stored or acked).
 */
async function recover(
  phrase: string,
  address: string,
  options: InboxClientOptions & { verify?: boolean } = {},
): Promise<FreeInbox> {
  let seed: Uint8Array;
  try {
    seed = seedFromPhrase(phrase);
  } catch (e) {
    throw new InboxError('invalid', (e as Error).message, 400);
  }
  const addr = address.trim().toLowerCase();
  const keys = await deriveKeys(seed);
  const relay = pickRelay(options.relay);
  if (options.verify !== false) {
    const ts = Math.floor(Date.now() / 1000);
    try {
      await relayFetch(relay, '/v1/messages', {
        method: 'POST',
        body: {
          address: addr,
          ts,
          sig: sign(pollMessage(ts, addr), keys),
          after: 0,
          wait: 0,
          limit: 1,
        },
        signal: options.signal,
      });
    } catch (e) {
      if (
        e instanceof InboxError &&
        (e.status === 401 || e.status === 403 || e.status === 404)
      ) {
        throw new InboxAuthError(
          `the relay does not accept this phrase for ${addr}`,
        );
      }
      throw e;
    }
  }
  const store = new InboxStore(addr, options.home);
  let createdAt = new Date().toISOString();
  try {
    createdAt = (await store.readKey()).created_at || createdAt;
  } catch {
    // fresh machine
  }
  await store.writeKey({
    address: addr,
    seed: toBase64(seed),
    sign_pub: toBase64(keys.signPublicKey),
    box_pub: toBase64(keys.boxPublicKey),
    created_at: createdAt,
    relay,
  });
  return new FreeInbox(store, keys, relay);
}

/**
 * A one-time connect link for a local inbox (`address` may be left out when
 * there is only one): your user opens it, signs in, and the inbox moves into
 * their send.io workspace where it can also send. Works once, expires in 30
 * minutes; see FreeInbox.connectLink.
 */
async function connectLink(
  address?: string,
  options: ConnectLinkOptions = {},
): Promise<ConnectLink> {
  let addr = address?.trim().toLowerCase();
  if (!addr) {
    const all = await listAddresses(options.home);
    if (all.length === 0)
      throw new InboxError(
        'not_found',
        'there is no free inbox on this machine; create one with inbox.create()',
      );
    if (all.length > 1)
      throw new InboxError(
        'invalid',
        `several free inboxes on this machine; pass the address (one of ${all.join(', ')})`,
        400,
      );
    addr = all[0];
  }
  const box = await loadInbox(addr, options);
  return box.connectLink({ appUrl: options.appUrl });
}

/** Anonymous (free) agent inboxes on sendioinbox.com. No API key needed. */
export const inbox = { check, create, open, list, recover, connectLink };
