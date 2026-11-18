// Node built-ins are loaded lazily so the package entry stays importable in
// edge runtimes and browsers that never touch the free inbox.
const fsp = () => import('node:fs/promises');

const SEP =
  typeof process !== 'undefined' && process.platform === 'win32' ? '\\' : '/';
const join = (...parts: string[]) =>
  parts.map((p, i) => (i === 0 ? p.replace(/[\\/]+$/, '') : p)).join(SEP);

function homeDir(): string {
  const h = process.env.HOME || process.env.USERPROFILE;
  if (!h) throw new Error('cannot find the home directory; set SENDIO_HOME');
  return h;
}

import { DEFAULT_RELAY, type FreeAttachment } from './core';

/** key.json, shared with the Go CLI and MCP tools. */
export interface KeyFile {
  address: string;
  seed: string;
  sign_pub: string;
  box_pub: string;
  created_at: string;
  relay: string;
}

/** mail/<seq>.json (text and html are SDK extras; other clients may omit them). */
export interface MailRecord {
  seq: number;
  id: string;
  received_at: string;
  from: string;
  to: string;
  subject: string;
  date: string;
  attachments: FreeAttachment[];
  text?: string;
  html?: string;
}

/**
 * Root for inbox folders: `$SENDIO_HOME/free` when SENDIO_HOME is set
 * (SENDIO_HOME stands in for `~/.sendio`), else `~/.sendio/free`.
 */
export function freeRoot(home?: string): string {
  const base = home || process.env.SENDIO_HOME || join(homeDir(), '.sendio');
  return join(base, 'free');
}

export function defaultRelay(): string {
  return process.env.SENDIO_FREE_RELAY || DEFAULT_RELAY;
}

async function writeAtomic(path: string, data: string | Uint8Array) {
  const { writeFile, chmod, rename } = await fsp();
  const tmp = `${path}.${process.pid}.tmp`;
  await writeFile(tmp, data, { mode: 0o600 });
  await chmod(tmp, 0o600);
  await rename(tmp, path);
}

export class InboxStore {
  readonly dir: string;
  readonly mailDir: string;

  constructor(
    readonly address: string,
    home?: string,
  ) {
    this.dir = join(freeRoot(home), address);
    this.mailDir = join(this.dir, 'mail');
  }

  async ensure() {
    const { mkdir } = await fsp();
    await mkdir(this.mailDir, { recursive: true, mode: 0o700 });
  }

  async writeKey(key: KeyFile) {
    await this.ensure();
    await writeAtomic(
      join(this.dir, 'key.json'),
      `${JSON.stringify(key, null, 2)}\n`,
    );
  }

  async readKey(): Promise<KeyFile> {
    const { readFile } = await fsp();
    return JSON.parse(await readFile(join(this.dir, 'key.json'), 'utf8'));
  }

  async readCursor(): Promise<number> {
    const { readFile } = await fsp();
    try {
      const s = JSON.parse(
        await readFile(join(this.dir, 'state.json'), 'utf8'),
      );
      return typeof s.cursor === 'number' ? s.cursor : 0;
    } catch {
      return 0;
    }
  }

  async writeCursor(cursor: number) {
    await this.ensure();
    await writeAtomic(
      join(this.dir, 'state.json'),
      `${JSON.stringify({ cursor })}\n`,
    );
  }

  emlPath(seq: number) {
    return join(this.mailDir, `${seq}.eml`);
  }

  async writeMail(seq: number, raw: Uint8Array, record: MailRecord) {
    await this.ensure();
    await writeAtomic(this.emlPath(seq), raw);
    await writeAtomic(
      join(this.mailDir, `${seq}.json`),
      `${JSON.stringify(record, null, 2)}\n`,
    );
  }

  async readRecord(seq: number): Promise<MailRecord> {
    const { readFile } = await fsp();
    return JSON.parse(
      await readFile(join(this.mailDir, `${seq}.json`), 'utf8'),
    );
  }

  async readRaw(seq: number): Promise<Uint8Array> {
    const { readFile } = await fsp();
    return new Uint8Array(await readFile(this.emlPath(seq)));
  }

  /** Sequence numbers with both .eml and .json on disk, ascending. */
  async listSeqs(): Promise<number[]> {
    const { readdir } = await fsp();
    let names: string[];
    try {
      names = await readdir(this.mailDir);
    } catch {
      return [];
    }
    const eml = new Set(
      names.filter((n) => n.endsWith('.eml')).map((n) => n.slice(0, -4)),
    );
    return names
      .filter((n) => n.endsWith('.json') && eml.has(n.slice(0, -5)))
      .map((n) => Number(n.slice(0, -5)))
      .filter((n) => Number.isInteger(n))
      .sort((a, b) => a - b);
  }
}

/** Addresses that have a key.json under the root. */
export async function listAddresses(home?: string): Promise<string[]> {
  const { readdir, readFile } = await fsp();
  let names: string[];
  try {
    names = await readdir(freeRoot(home));
  } catch {
    return [];
  }
  const out: string[] = [];
  for (const n of names.sort()) {
    try {
      await readFile(join(freeRoot(home), n, 'key.json'));
      out.push(n);
    } catch {
      // not an inbox folder
    }
  }
  return out;
}
