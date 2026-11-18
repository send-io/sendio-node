import type { Response } from '../../interfaces';

export type RemoveMailboxResponseSuccess = {
  object: 'mailbox';
  id: string;
  deleted: boolean;
};

export type RemoveMailboxResponse = Response<RemoveMailboxResponseSuccess>;
