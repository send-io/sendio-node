import type { Response } from '../../interfaces';
import type { Mailbox } from './mailbox';

export type ListMailboxesResponseSuccess = {
  object: 'list';
  has_more: boolean;
  data: Mailbox[];
};

export type ListMailboxesResponse = Response<ListMailboxesResponseSuccess>;
