import type { PostOptions } from '../../common/interfaces';
import type { Response } from '../../interfaces';
import type { Mailbox, MailboxCredentials } from './mailbox';

/**
 * Pass `address` (full address), or `localPart` + `domainId`, for a mailbox on
 * one of your verified domains. For a free mailbox (no domain), pass
 * `username`, with optional `org` and `displayName`.
 */
export interface CreateMailboxOptions {
  address?: string;
  localPart?: string;
  domainId?: string;
  username?: string;
  org?: string;
  displayName?: string;
}

export interface CreateMailboxRequestOptions extends PostOptions {}

export type CreateMailboxResponseSuccess = Mailbox & {
  /** Shown once, when IMAP/SMTP is ready. */
  credentials?: MailboxCredentials;
};

export type CreateMailboxResponse = Response<CreateMailboxResponseSuccess>;
