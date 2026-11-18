/** Base error for the free agent inbox. `code` is the relay's error code when there is one. */
export class InboxError extends Error {
  readonly code: string;
  readonly status?: number;

  constructor(code: string, message: string, status?: number) {
    super(message);
    this.name = 'InboxError';
    this.code = code;
    this.status = status;
  }
}

/** The address is taken (or its org label belongs to another key). */
export class InboxTakenError extends InboxError {
  readonly address: string;
  readonly suggestions: string[];

  constructor(
    address: string,
    suggestions: string[],
    code = 'taken',
    message?: string,
  ) {
    super(
      code,
      message ||
        `${address} is not available${suggestions.length ? `; try ${suggestions.join(', ')}` : ''}`,
      409,
    );
    this.name = 'InboxTakenError';
    this.address = address;
    this.suggestions = suggestions;
  }
}

/** Another client authenticated for this inbox; this connection no longer receives it. */
export class InboxReplacedError extends InboxError {
  constructor(address: string) {
    super('replaced', `${address} is now being received by another connection`);
    this.name = 'InboxReplacedError';
  }
}

/** The relay refused the signature or does not know the inbox. */
export class InboxAuthError extends InboxError {
  constructor(message = 'relay refused authentication for this inbox') {
    super('auth_failed', message);
    this.name = 'InboxAuthError';
  }
}

/**
 * The relay ended this inbox for good (`code` "claimed", "suspended" or
 * "deleted"): the key can no longer stream or poll it, so do not retry.
 */
export class InboxEndedError extends InboxError {
  readonly address: string;

  constructor(address: string, code: string, message?: string) {
    super(code, message || `${address} was ${code} by send.io`);
    this.name = 'InboxEndedError';
    this.address = address;
  }
}

/**
 * The inbox was attached to a send.io workspace (e.g. through a connect link):
 * it is read in the dashboard now, and can send from there.
 */
export class InboxClaimedError extends InboxEndedError {
  constructor(address: string) {
    super(
      address,
      'claimed',
      `${address} was moved into a send.io workspace; read it in the dashboard`,
    );
    this.name = 'InboxClaimedError';
  }
}

/** The error for a relay "error" frame code that ends one inbox, else null. */
export function endedError(
  address: string,
  code: string,
): InboxEndedError | null {
  if (code === 'claimed') return new InboxClaimedError(address);
  if (code === 'suspended' || code === 'deleted')
    return new InboxEndedError(address, code);
  return null;
}
