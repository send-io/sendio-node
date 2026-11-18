/**
 * Platform-neutral core of the send.io free agent inbox (contracts/free-inbox/PROTOCOL.md v1):
 * names, keys, recovery phrase, sealed envelopes, signatures, attachment
 * warnings and MIME parsing. Uses only WebCrypto, tweetnacl and postal-mime,
 * so the same file runs in Node >= 20 and in the browser.
 *
 * KEEP IN SYNC: frontend/console/src/modules/free-inbox/core.ts is the source
 * copy; RISKY_EXTENSIONS must match it and cli/internal/freeinbox/parse.go riskyExt
 * (core.spec.ts checks both).
 */

import PostalMime from 'postal-mime';
import nacl from 'tweetnacl';

export const DEFAULT_RELAY = 'https://relay.sendioinbox.com';

export const RESERVED_NAMES = new Set([
  'admin',
  'administrator',
  'postmaster',
  'abuse',
  'security',
  'noreply',
  'no-reply',
  'hostmaster',
  'webmaster',
  'root',
  'support',
  'billing',
  'mailer-daemon',
  'info',
]);

const NAME_RE = /^[a-z0-9](?:[a-z0-9.-]{0,30}[a-z0-9])?$/;
const ORG_RE = /^[a-z0-9](?:[a-z0-9-]{0,30}[a-z0-9])?$/;

/** NFKD, strip accents, lower-case, trim, spaces and `_` to `-`. */
export function normalizeLabel(input: string): string {
  return input
    .normalize('NFKD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .trim()
    .replace(/[\s_]/g, '-');
}

/** Normalises a whole address the same way (`Test Bot@My-Org.x` → `test-bot@my-org.x`). */
export function normalizeAddress(input: string): string {
  return normalizeLabel(input);
}

/** Returns an error reason for a normalised name, or null when it is valid. */
export function validateName(name: string): string | null {
  if (name.length < 2 || name.length > 32)
    return 'Name must be 2 to 32 characters.';
  if (!NAME_RE.test(name) || name.includes('..'))
    return 'Use letters, digits, dots and dashes; start and end with a letter or digit.';
  if (RESERVED_NAMES.has(name)) return 'This name is reserved.';
  return null;
}

/** Returns an error reason for a normalised org label, or null when it is valid. */
export function validateOrg(org: string): string | null {
  if (org.length < 2 || org.length > 32)
    return 'Organization must be 2 to 32 characters.';
  if (!ORG_RE.test(org))
    return 'Use letters, digits and dashes (no dots); start and end with a letter or digit.';
  return null;
}

// ---------------------------------------------------------------- encoding

const B32 = 'abcdefghijklmnopqrstuvwxyz234567';

export function base32Encode(bytes: Uint8Array): string {
  let out = '';
  let bits = 0;
  let value = 0;
  for (const b of bytes) {
    value = ((value << 8) | b) & 0xffff;
    bits += 8;
    while (bits >= 5) {
      out += B32[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) out += B32[(value << (5 - bits)) & 31];
  return out;
}

export function base32Decode(text: string): Uint8Array {
  const clean = text.toLowerCase().replace(/=+$/, '');
  const out: number[] = [];
  let bits = 0;
  let value = 0;
  for (const ch of clean) {
    const v = B32.indexOf(ch);
    if (v < 0) throw new Error(`invalid base32 character "${ch}"`);
    value = ((value << 5) | v) & 0xffff;
    bits += 5;
    if (bits >= 8) {
      out.push((value >>> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }
  return new Uint8Array(out);
}

export function toBase64(bytes: Uint8Array): string {
  let s = '';
  for (let i = 0; i < bytes.length; i += 0x8000) {
    s += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  }
  return btoa(s);
}

export function fromBase64(text: string): Uint8Array {
  const s = atob(text);
  const out = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) out[i] = s.charCodeAt(i);
  return out;
}

export function toHex(bytes: Uint8Array): string {
  let s = '';
  for (const b of bytes) s += b.toString(16).padStart(2, '0');
  return s;
}

const utf8 = new TextEncoder();

export async function sha256(data: Uint8Array | string): Promise<Uint8Array> {
  const bytes = typeof data === 'string' ? utf8.encode(data) : data;
  const digest = await globalThis.crypto.subtle.digest(
    'SHA-256',
    bytes as Uint8Array<ArrayBuffer>,
  );
  return new Uint8Array(digest);
}

// ---------------------------------------------------------------- keys

export interface InboxKeys {
  seed: Uint8Array;
  signPublicKey: Uint8Array;
  signSecretKey: Uint8Array;
  boxPublicKey: Uint8Array;
  boxSecretKey: Uint8Array;
}

export function randomSeed(): Uint8Array {
  return globalThis.crypto.getRandomValues(new Uint8Array(32));
}

/** Ed25519 signing pair from the seed; X25519 box pair from sha256("sendio-free-box-v1" || seed). */
export async function deriveKeys(seed: Uint8Array): Promise<InboxKeys> {
  if (seed.length !== 32) throw new Error('seed must be 32 bytes');
  const sign = nacl.sign.keyPair.fromSeed(seed);
  const prefix = utf8.encode('sendio-free-box-v1');
  const input = new Uint8Array(prefix.length + seed.length);
  input.set(prefix);
  input.set(seed, prefix.length);
  const boxSecretKey = await sha256(input);
  const box = nacl.box.keyPair.fromSecretKey(boxSecretKey);
  return {
    seed,
    signPublicKey: sign.publicKey,
    signSecretKey: sign.secretKey,
    boxPublicKey: box.publicKey,
    boxSecretKey,
  };
}

/** RFC 4648 base32 of the seed, lower-case, no padding, groups of 4 joined by `-`. */
export function phraseFromSeed(seed: Uint8Array): string {
  return (
    base32Encode(seed)
      .match(/.{1,4}/g)
      ?.join('-') ?? ''
  );
}

/** Accepts the phrase with or without dashes, spaces or upper case. */
export function seedFromPhrase(phrase: string): Uint8Array {
  const clean = phrase.toLowerCase().replace(/[^a-z2-7]/g, '');
  const seed = base32Decode(clean);
  if (clean.length !== 52 || seed.length !== 32)
    throw new Error('recovery phrase must encode exactly 32 bytes');
  return seed;
}

/** hex(sha256(lowercase address))[0:32] */
export async function inboxToken(address: string): Promise<string> {
  return toHex(await sha256(address.toLowerCase())).slice(0, 32);
}

export function sign(message: string, keys: InboxKeys): string {
  return toBase64(nacl.sign.detached(utf8.encode(message), keys.signSecretKey));
}

export const authMessage = (nonce: string, address: string) =>
  `sendio-free-auth-v1:${nonce}:${address}`;
export const pollMessage = (ts: number, address: string) =>
  `sendio-free-poll-v1:${ts}:${address}`;
export const ackMessage = (ts: number, address: string, seq: number) =>
  `sendio-free-ack-v1:${ts}:${address}:${seq}`;
export const orgMessage = (address: string) => `sendio-free-org-v1:${address}`;

// ---------------------------------------------------------------- envelope

const MAGIC = [0x53, 0x42, 0x31]; // "SB1"

/** Opens "SB1" || epk(32) || nonce(24) || NaCl box. Throws if it does not authenticate. */
export function openEnvelope(
  envelope: Uint8Array,
  boxSecretKey: Uint8Array,
): Uint8Array {
  if (
    envelope.length < 3 + 32 + 24 + nacl.box.overheadLength ||
    envelope[0] !== MAGIC[0] ||
    envelope[1] !== MAGIC[1] ||
    envelope[2] !== MAGIC[2]
  ) {
    throw new Error('not a sealed envelope (SB1)');
  }
  const epk = envelope.subarray(3, 35);
  const nonce = envelope.subarray(35, 59);
  const ct = envelope.subarray(59);
  const plain = nacl.box.open(ct, nonce, epk, boxSecretKey);
  if (!plain) throw new Error('envelope did not decrypt with this inbox key');
  return plain;
}

/** Test helper: seals like free-mx does. */
export function sealEnvelope(
  message: Uint8Array,
  boxPublicKey: Uint8Array,
): Uint8Array {
  const eph = nacl.box.keyPair();
  const nonce = nacl.randomBytes(24);
  const ct = nacl.box(message, nonce, boxPublicKey, eph.secretKey);
  const out = new Uint8Array(3 + 32 + 24 + ct.length);
  out.set(MAGIC);
  out.set(eph.publicKey, 3);
  out.set(nonce, 35);
  out.set(ct, 59);
  return out;
}

// ---------------------------------------------------------------- attachments

export const RISKY_EXTENSIONS = [
  'exe',
  'scr',
  'bat',
  'cmd',
  'com',
  'pif',
  'js',
  'jse',
  'vbs',
  'vbe',
  'wsf',
  'hta',
  'msi',
  'ps1',
  'jar',
  'lnk',
  'iso',
  'img',
  'docm',
  'xlsm',
  'pptm',
  'dotm',
  // Open in a browser or viewer and can run script or phish (SENDIO-695).
  'html',
  'htm',
  'xhtml',
  'shtml',
  'mht',
  'mhtml',
  'svg',
  // macOS and Linux installers and scripts.
  'sh',
  'bash',
  'command',
  'dmg',
  'pkg',
  'app',
  'scpt',
  'applescript',
  'apk',
  // More Windows script and installer types.
  'vb',
  'wsh',
  'ps1xml',
  'psm1',
  'reg',
  'cpl',
  'msp',
  'msix',
  'appx',
  'appref-ms',
  'xll',
  'xlam',
  'vhd',
  'vhdx',
];
const RISKY_EXT = new Set(RISKY_EXTENSIONS);
const ARCHIVE_EXT = new Set(['zip', 'rar', '7z']);
const RISKY_NAME_IN_BYTES = new RegExp(
  `[\\w\\- ()\\[\\]]{1,200}\\.(?:${RISKY_EXTENSIONS.join('|')})(?![a-z0-9])`,
  'i',
);

function extOf(filename: string): string {
  const m = /\.([^./\\]+)$/.exec(filename.trim().toLowerCase());
  return m ? m[1] : '';
}

export function hasRiskyExtension(filename: string): boolean {
  return RISKY_EXT.has(extOf(filename));
}

function startsWith(bytes: Uint8Array, sig: number[]): boolean {
  return sig.every((b, i) => bytes[i] === b);
}

/** File names stored in a zip (local headers and central directory). */
export function zipEntryNames(bytes: Uint8Array): string[] {
  const names: string[] = [];
  const dec = new TextDecoder();
  for (let i = 0; i + 30 <= bytes.length; i++) {
    if (bytes[i] !== 0x50 || bytes[i + 1] !== 0x4b) continue;
    const kind = bytes[i + 2] | (bytes[i + 3] << 8);
    let nameLen = 0;
    let nameAt = 0;
    if (kind === 0x0403) {
      nameLen = bytes[i + 26] | (bytes[i + 27] << 8);
      nameAt = i + 30;
    } else if (kind === 0x0201 && i + 46 <= bytes.length) {
      nameLen = bytes[i + 28] | (bytes[i + 29] << 8);
      nameAt = i + 46;
    } else continue;
    if (nameLen > 0 && nameAt + nameLen <= bytes.length) {
      names.push(dec.decode(bytes.subarray(nameAt, nameAt + nameLen)));
    }
  }
  return names;
}

export interface RiskVerdict {
  risky: boolean;
  reason?: string;
}

/**
 * Risky when the extension is in the list, the content starts with `MZ`, or it
 * is a zip/rar/7z whose (unencrypted) listing contains such a name.
 */
export function assessAttachment(
  filename: string,
  content?: Uint8Array,
): RiskVerdict {
  const name = filename || '';
  const ext = extOf(name);
  if (RISKY_EXT.has(ext)) return { risky: true, reason: `.${ext} file` };
  if (!content || content.length === 0) return { risky: false };
  if (startsWith(content, [0x4d, 0x5a]))
    return { risky: true, reason: 'Windows executable (MZ)' };
  const isZip = startsWith(content, [0x50, 0x4b, 0x03, 0x04]);
  const isRar = startsWith(content, [0x52, 0x61, 0x72, 0x21, 0x1a, 0x07]);
  const is7z = startsWith(content, [0x37, 0x7a, 0xbc, 0xaf, 0x27, 0x1c]);
  if (isZip || ext === 'zip') {
    const hit = zipEntryNames(content).find(hasRiskyExtension);
    if (hit) return { risky: true, reason: `archive contains ${hit}` };
    return { risky: false };
  }
  if (isRar || is7z || ARCHIVE_EXT.has(ext)) {
    // rar and 7z keep names in headers; scan as latin1 and as UTF-16LE.
    const latin1 = new TextDecoder('latin1').decode(content);
    let m = RISKY_NAME_IN_BYTES.exec(latin1);
    if (!m)
      m = RISKY_NAME_IN_BYTES.exec(new TextDecoder('utf-16le').decode(content));
    if (m) return { risky: true, reason: `archive contains ${m[0].trim()}` };
  }
  return { risky: false };
}

// ---------------------------------------------------------------- mail parsing

export interface FreeAttachment {
  filename: string;
  content_type: string;
  size: number;
  risky: boolean;
  reason?: string;
}

export interface ParsedMail {
  from: string;
  to: string;
  subject: string;
  date: string;
  text: string;
  html: string;
  attachments: FreeAttachment[];
  /** Attachment bodies, same order as `attachments`. Not stored in .json. */
  attachmentContents: Uint8Array[];
}

interface PostalAddress {
  name?: string;
  address?: string;
  group?: PostalAddress[];
}

function fmtAddress(a?: PostalAddress): string {
  if (!a) return '';
  if (a.group) return a.group.map(fmtAddress).join(', ');
  if (a.name && a.address) return `${a.name} <${a.address}>`;
  return a.address || a.name || '';
}

function asBytes(content: unknown): Uint8Array {
  if (content instanceof Uint8Array) return content;
  if (content instanceof ArrayBuffer) return new Uint8Array(content);
  if (typeof content === 'string') return utf8.encode(content);
  return new Uint8Array(0);
}

/** Parses a raw RFC 5322 message into the fields the clients store and show. */
export async function parseMail(raw: Uint8Array): Promise<ParsedMail> {
  const email = await PostalMime.parse(raw as Uint8Array<ArrayBuffer>);
  const attachmentContents: Uint8Array[] = [];
  const attachments = (email.attachments || []).map((a) => {
    const content = asBytes(a.content);
    attachmentContents.push(content);
    const filename = a.filename || '';
    const verdict = assessAttachment(filename, content);
    const att: FreeAttachment = {
      filename,
      content_type: a.mimeType || 'application/octet-stream',
      size: content.length,
      risky: verdict.risky,
    };
    if (verdict.reason) att.reason = verdict.reason;
    return att;
  });
  return {
    from: fmtAddress(email.from as PostalAddress | undefined),
    to: (email.to || []).map((a) => fmtAddress(a as PostalAddress)).join(', '),
    subject: email.subject || '',
    date: email.date || '',
    text: email.text || '',
    html: email.html || '',
    attachments,
    attachmentContents,
  };
}

/** First standalone 4-8 digit code (default 6) in the subject, then the text. */
export function extractCode(
  mail: { subject?: string; text?: string; html?: string },
  digits = 6,
): string | undefined {
  const re = new RegExp(`(?<![0-9])[0-9]{${digits}}(?![0-9])`);
  const htmlText = (mail.html || '').replace(/<[^>]+>/g, ' ');
  for (const s of [mail.subject, mail.text, htmlText]) {
    const m = s ? re.exec(s) : null;
    if (m) return m[0];
  }
  return undefined;
}

// ---------------------------------------------------------------- proof of work

/** Number of leading zero bits in a digest. */
export function leadingZeroBits(digest: Uint8Array): number {
  let n = 0;
  for (const b of digest) {
    if (b === 0) {
      n += 8;
      continue;
    }
    return n + Math.clz32(b) - 24;
  }
  return n;
}

/** Normalises a relay URL from key.json or config to its https base. */
export function relayBase(url: string): string {
  let u = url.trim().replace(/\/+$/, '');
  u = u.replace(/^ws(s?):\/\//, 'http$1://');
  u = u.replace(/\/v1\/stream$/, '');
  return u;
}

export function streamUrl(base: string): string {
  return `${relayBase(base).replace(/^http(s?):\/\//, 'ws$1://')}/v1/stream`;
}
