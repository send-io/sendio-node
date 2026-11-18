/**
 * Connect links (free/ADMIN-API.md "Connect links"): a one-use link, signed
 * with the inbox key, that whoever opens it (signed in to send.io) uses to
 * attach the inbox to their workspace. Kept out of core.ts, which is mirrored
 * verbatim in the web app.
 */

import nacl from 'tweetnacl';
import type { InboxKeys } from './core';

/** The send.io web app that opens connect links (env SENDIO_APP_URL overrides it). */
export const DEFAULT_APP_URL = 'https://app.send.io';

/** A connect link can be used once within this window. */
export const CONNECT_TTL_MS = 30 * 60_000;

export interface ConnectLink {
  address: string;
  /** `<app>/connect#a=<address>&t=<ts>&n=<nonce>&s=<sig>` */
  link: string;
  expiresAt: Date;
}

/** Signature input: `sendio-free-connect-v1:<ts>:<address>:<nonce>`. */
export const connectMessage = (ts: number, address: string, nonce: string) =>
  `sendio-free-connect-v1:${ts}:${address}:${nonce}`;

/** base64url without padding. */
export function toBase64Url(bytes: Uint8Array): string {
  let s = '';
  for (let i = 0; i < bytes.length; i += 0x8000) {
    s += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  }
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/** Normalises an app origin; empty means SENDIO_APP_URL, then DEFAULT_APP_URL. */
export function appBase(url?: string): string {
  const env =
    typeof process !== 'undefined' ? process.env?.SENDIO_APP_URL : undefined;
  let u = (url || env || '').trim().replace(/\/+$/, '');
  if (!u) return DEFAULT_APP_URL;
  if (!u.includes('://')) u = `https://${u}`;
  return u;
}

/**
 * Builds and signs a connect link. `nonce` (16 bytes) and `ts` (unix seconds)
 * default to fresh random bytes and now.
 */
export function buildConnectLink(
  keys: InboxKeys,
  address: string,
  options: { appUrl?: string; ts?: number; nonce?: Uint8Array } = {},
): ConnectLink & { ts: number; nonce: string; sig: string } {
  const addr = address.trim().toLowerCase();
  const ts = options.ts ?? Math.floor(Date.now() / 1000);
  const nonce = toBase64Url(options.nonce ?? nacl.randomBytes(16));
  const sig = toBase64Url(
    nacl.sign.detached(
      new TextEncoder().encode(connectMessage(ts, addr, nonce)),
      keys.signSecretKey,
    ),
  );
  // "@" is legal in a fragment; keep the address readable.
  const a = encodeURIComponent(addr).replace(/%40/g, '@');
  return {
    address: addr,
    link: `${appBase(options.appUrl)}/connect#a=${a}&t=${ts}&n=${nonce}&s=${sig}`,
    expiresAt: new Date(ts * 1000 + CONNECT_TTL_MS),
    ts,
    nonce,
    sig,
  };
}
