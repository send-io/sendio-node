import type { Response } from '../../interfaces';
import type { Mailbox } from './mailbox';

export interface UpdateMailboxOptions {
  warmupEnabled: boolean;
}

export type UpdateMailboxResponseSuccess = Mailbox;

export type UpdateMailboxResponse = Response<UpdateMailboxResponseSuccess>;
