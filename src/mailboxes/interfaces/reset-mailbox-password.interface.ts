import type { Response } from '../../interfaces';
import type { MailboxCredentials } from './mailbox';

export type ResetMailboxPasswordResponseSuccess = {
  object: 'mailbox_credentials';
  id: string;
  address: string;
  credentials: MailboxCredentials;
  note: string;
};

export type ResetMailboxPasswordResponse =
  Response<ResetMailboxPasswordResponseSuccess>;
