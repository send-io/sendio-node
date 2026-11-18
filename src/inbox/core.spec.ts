import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import nacl from 'tweetnacl';
import {
  assessAttachment,
  base32Decode,
  base32Encode,
  deriveKeys,
  extractCode,
  inboxToken,
  leadingZeroBits,
  normalizeLabel,
  openEnvelope,
  parseMail,
  phraseFromSeed,
  RISKY_EXTENSIONS,
  randomSeed,
  relayBase,
  sealEnvelope,
  seedFromPhrase,
  streamUrl,
  validateName,
  validateOrg,
} from './core';
import { solvePow } from './inbox';

const enc = new TextEncoder();

describe('names', () => {
  it('normalises per protocol', () => {
    expect(normalizeLabel('  José_Smith ')).toBe('jose-smith');
    expect(normalizeLabel('My Org')).toBe('my-org');
    expect(normalizeLabel('ＡＢＣ')).toBe('abc');
  });

  it('validates names and orgs', () => {
    expect(validateName('praveen')).toBeNull();
    expect(validateName('a.b-c')).toBeNull();
    expect(validateName('a')).not.toBeNull();
    expect(validateName('a..b')).not.toBeNull();
    expect(validateName('-ab')).not.toBeNull();
    expect(validateName('postmaster')).toMatch(/reserved/);
    expect(validateName('x'.repeat(33))).not.toBeNull();
    expect(validateOrg('instantly')).toBeNull();
    expect(validateOrg('a.b')).not.toBeNull();
  });
});

describe('recovery phrase', () => {
  it('base32 matches RFC 4648', () => {
    expect(base32Encode(enc.encode('foobar'))).toBe('mzxw6ytboi');
    expect(new TextDecoder().decode(base32Decode('mzxw6ytboi'))).toBe('foobar');
  });

  it('round trips a seed', () => {
    for (let i = 0; i < 50; i++) {
      const seed = randomSeed();
      const phrase = phraseFromSeed(seed);
      expect(phrase).toMatch(/^([a-z2-7]{4}-){12}[a-z2-7]{4}$/);
      expect(seedFromPhrase(phrase)).toEqual(seed);
      expect(seedFromPhrase(phrase.toUpperCase().replace(/-/g, ' '))).toEqual(
        seed,
      );
    }
  });

  it('rejects short phrases', () => {
    expect(() => seedFromPhrase('abcd-efgh')).toThrow();
  });
});

describe('keys and envelopes', () => {
  it('derives Ed25519 from the seed and X25519 from sha256(prefix || seed)', async () => {
    const seed = new Uint8Array(32).fill(7);
    const keys = await deriveKeys(seed);
    expect(keys.signPublicKey).toEqual(
      nacl.sign.keyPair.fromSeed(seed).publicKey,
    );
    const boxSk = createHash('sha256')
      .update(
        Buffer.concat([Buffer.from('sendio-free-box-v1'), Buffer.from(seed)]),
      )
      .digest();
    expect(Buffer.from(keys.boxSecretKey)).toEqual(boxSk);
    expect(keys.boxPublicKey).toEqual(
      nacl.scalarMult.base(new Uint8Array(boxSk)),
    );
  });

  it('opens a sealed envelope and rejects tampering', async () => {
    const keys = await deriveKeys(randomSeed());
    const msg = enc.encode('Subject: hi\r\n\r\nhello');
    const env = sealEnvelope(msg, keys.boxPublicKey);
    expect(openEnvelope(env, keys.boxSecretKey)).toEqual(msg);
    env[env.length - 1] ^= 1;
    expect(() => openEnvelope(env, keys.boxSecretKey)).toThrow();
    expect(() => openEnvelope(enc.encode('XX1'), keys.boxSecretKey)).toThrow();
  });

  it('computes the inbox token', async () => {
    const want = createHash('sha256')
      .update('a@b.sendioinbox.com')
      .digest('hex')
      .slice(0, 32);
    expect(await inboxToken('A@B.sendioinbox.com')).toBe(want);
  });
});

describe('proof of work', () => {
  it('finds a nonce with enough leading zero bits', async () => {
    const nonce = await solvePow('00ff', 12);
    const digest = createHash('sha256').update(`00ff:${nonce}`).digest();
    expect(leadingZeroBits(digest)).toBeGreaterThanOrEqual(12);
    expect(leadingZeroBits(new Uint8Array([0, 0x10]))).toBe(11);
  });
});

/** Minimal stored (uncompressed) zip with the given file names. */
function zipWith(names: string[]): Uint8Array {
  const parts: Buffer[] = [];
  for (const n of names) {
    const h = Buffer.alloc(30);
    h.writeUInt32LE(0x04034b50, 0);
    h.writeUInt16LE(Buffer.byteLength(n), 26);
    parts.push(h, Buffer.from(n));
  }
  return new Uint8Array(Buffer.concat(parts));
}

describe('attachment warnings', () => {
  it('flags risky extensions, MZ content and archives with risky names', () => {
    expect(assessAttachment('invoice.EXE').risky).toBe(true);
    expect(assessAttachment('macro.docm').risky).toBe(true);
    expect(assessAttachment('report.pdf', enc.encode('%PDF-1.7')).risky).toBe(
      false,
    );
    expect(
      assessAttachment('photo.jpg', new Uint8Array([0x4d, 0x5a, 0, 0])).risky,
    ).toBe(true);
    expect(
      assessAttachment('docs.zip', zipWith(['readme.txt', 'setup.exe'])).risky,
    ).toBe(true);
    expect(assessAttachment('docs.zip', zipWith(['readme.txt'])).risky).toBe(
      false,
    );
    const rar = new Uint8Array([
      ...[0x52, 0x61, 0x72, 0x21, 0x1a, 0x07, 0],
      ...enc.encode('\u0000run.vbs\u0000'),
    ]);
    expect(assessAttachment('a.rar', rar).risky).toBe(true);
  });

  it('flags browser, script and installer attachments (SENDIO-695)', () => {
    for (const name of [
      'invoice.html',
      'a.HTM',
      'logo.svg',
      'run.sh',
      'Setup.dmg',
      'open.command',
      'x.appref-ms',
      'settings.ps1xml',
      'x.pkg',
    ]) {
      expect(assessAttachment(name).risky, name).toBe(true);
    }
    for (const name of ['report.pdf', 'photo.png', 'notes.txt', 'data.csv']) {
      expect(assessAttachment(name).risky, name).toBe(false);
    }
    expect(
      assessAttachment('docs.zip', zipWith(['readme.txt', 'page.html'])).risky,
    ).toBe(true);
  });

  // KEEP IN SYNC guard: the console copy and the CLI list must match this one.
  it('matches the console and CLI risky lists', () => {
    const root = resolve(__dirname, '../../../..');
    const consoleCore = resolve(
      root,
      'frontend/console/src/modules/free-inbox/core.ts',
    );
    const cliParse = resolve(root, 'cli/internal/freeinbox/parse.go');
    if (!existsSync(consoleCore) || !existsSync(cliParse)) return;
    const mine = [...RISKY_EXTENSIONS].sort();
    const between = (src: string, start: string, end: string) => {
      const i = src.indexOf(start);
      expect(i, start).toBeGreaterThanOrEqual(0);
      return src.slice(i, src.indexOf(end, i));
    };
    const consoleList = between(
      readFileSync(consoleCore, 'utf8'),
      'export const RISKY_EXTENSIONS = [',
      '];',
    );
    expect(
      [...consoleList.matchAll(/'([a-z0-9-]+)'/g)].map((m) => m[1]).sort(),
    ).toEqual(mine);
    const cliList = between(
      readFileSync(cliParse, 'utf8'),
      'var riskyExt = setOf(',
      ')\n',
    );
    expect(
      [...cliList.matchAll(/"([a-z0-9-]+)"/g)].map((m) => m[1]).sort(),
    ).toEqual(mine);
  });

  it('marks parsed attachments', async () => {
    const raw = [
      'From: Bob <bob@example.com>',
      'To: a@b.sendioinbox.com',
      'Subject: files',
      'MIME-Version: 1.0',
      'Content-Type: multipart/mixed; boundary=XX',
      '',
      '--XX',
      'Content-Type: text/plain',
      '',
      'see attached',
      '--XX',
      'Content-Type: application/octet-stream; name=tool.exe',
      'Content-Disposition: attachment; filename=tool.exe',
      'Content-Transfer-Encoding: base64',
      '',
      Buffer.from('MZ hello').toString('base64'),
      '--XX',
      'Content-Type: text/plain; name=notes.txt',
      'Content-Disposition: attachment; filename=notes.txt',
      '',
      'plain notes',
      '--XX--',
      '',
    ].join('\r\n');
    const mail = await parseMail(enc.encode(raw));
    expect(mail.from).toBe('Bob <bob@example.com>');
    expect(mail.subject).toBe('files');
    expect(mail.text.trim()).toBe('see attached');
    expect(mail.attachments.map((a) => [a.filename, a.risky])).toEqual([
      ['tool.exe', true],
      ['notes.txt', false],
    ]);
  });
});

describe('helpers', () => {
  it('extracts codes', () => {
    expect(
      extractCode({
        subject: 'Your code',
        text: 'Use 482913 to sign in. Ref 12345678',
      }),
    ).toBe('482913');
    expect(extractCode({ subject: 'Code 000111' })).toBe('000111');
    expect(extractCode({ html: '<b>991122</b>' })).toBe('991122');
    expect(extractCode({ text: 'nothing here 1234567' })).toBeUndefined();
  });

  it('normalises relay URLs', () => {
    expect(relayBase('wss://relay.sendioinbox.com/v1/stream')).toBe(
      'https://relay.sendioinbox.com',
    );
    expect(streamUrl('http://127.0.0.1:18080/')).toBe(
      'ws://127.0.0.1:18080/v1/stream',
    );
  });
});
