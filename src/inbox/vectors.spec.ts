import { createHash } from 'node:crypto';
import nacl from 'tweetnacl';
import vectors from './__fixtures__/testvectors.json';
import {
  ackMessage,
  authMessage,
  deriveKeys,
  fromBase64,
  inboxToken,
  leadingZeroBits,
  normalizeAddress,
  openEnvelope,
  orgMessage,
  parseMail,
  phraseFromSeed,
  pollMessage,
  seedFromPhrase,
  sign,
  toBase64,
} from './core';

const hex = (s: string) => new Uint8Array(Buffer.from(s, 'hex'));

describe('free/testvectors.json (Go server)', () => {
  it('derives keys and phrases from seeds', async () => {
    for (const v of vectors.seeds) {
      const seed = hex(v.seed_hex);
      const keys = await deriveKeys(seed);
      expect(toBase64(keys.signPublicKey)).toBe(v.sign_pub);
      expect(toBase64(keys.boxPublicKey)).toBe(v.box_pub);
      expect(toBase64(keys.boxSecretKey)).toBe(v.box_sk);
      expect(phraseFromSeed(seed)).toBe(v.recovery_phrase);
      expect(seedFromPhrase(v.recovery_phrase)).toEqual(seed);
    }
  });

  it('normalises addresses and computes tokens', async () => {
    for (const v of vectors.addresses) {
      expect(normalizeAddress(v.input)).toBe(v.normalised);
      expect(await inboxToken(v.normalised)).toBe(v.token);
    }
  });

  it('opens the sealed envelope', async () => {
    const keys = await deriveKeys(hex(vectors.seeds[0].seed_hex));
    const plain = openEnvelope(
      fromBase64(vectors.envelope.envelope_b64),
      keys.boxSecretKey,
    );
    expect(new TextDecoder().decode(plain)).toBe(
      vectors.envelope.plaintext_utf8,
    );
    const mail = await parseMail(plain);
    expect(mail.subject).toBe('Hello agent');
    expect(mail.from).toBe('sender@example.com');
  });

  it('produces identical signatures', async () => {
    const keys = await deriveKeys(hex(vectors.seeds[0].seed_hex));
    const { auth, poll, ack, org_sig } = vectors;
    expect(authMessage(auth.nonce, auth.address)).toBe(auth.input);
    expect(sign(auth.input, keys)).toBe(auth.signature);
    expect(pollMessage(poll.ts, poll.address)).toBe(poll.input);
    expect(sign(poll.input, keys)).toBe(poll.signature);
    expect(ackMessage(ack.ts, ack.address, ack.seq)).toBe(ack.input);
    expect(sign(ack.input, keys)).toBe(ack.signature);
    expect(orgMessage(org_sig.address)).toBe(org_sig.input);
    expect(sign(org_sig.input, keys)).toBe(org_sig.signature);
    expect(
      nacl.sign.detached.verify(
        new TextEncoder().encode(auth.input),
        fromBase64(auth.signature),
        keys.signPublicKey,
      ),
    ).toBe(true);
  });

  it('agrees on proof of work', () => {
    const { pow } = vectors;
    expect(pow.hash_input).toBe(`${pow.challenge}:${pow.nonce}`);
    const digest = createHash('sha256').update(pow.hash_input).digest();
    expect(leadingZeroBits(digest)).toBeGreaterThanOrEqual(pow.difficulty);
  });
});
