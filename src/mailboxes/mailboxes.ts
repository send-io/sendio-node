import type { RequestOptions } from '../common/interfaces/request-options.interface';
import type { Sendio } from '../sendio';
import type {
  CreateMailboxOptions,
  CreateMailboxRequestOptions,
  CreateMailboxResponse,
  CreateMailboxResponseSuccess,
} from './interfaces/create-mailbox-options.interface';
import type {
  ListMailboxesResponse,
  ListMailboxesResponseSuccess,
} from './interfaces/list-mailboxes.interface';
import type {
  RemoveMailboxResponse,
  RemoveMailboxResponseSuccess,
} from './interfaces/remove-mailbox.interface';
import type {
  ResetMailboxPasswordResponse,
  ResetMailboxPasswordResponseSuccess,
} from './interfaces/reset-mailbox-password.interface';
import type {
  UpdateMailboxOptions,
  UpdateMailboxResponse,
  UpdateMailboxResponseSuccess,
} from './interfaces/update-mailbox.interface';

export class Mailboxes {
  constructor(private readonly sendio: Sendio) {}

  /** Lists every mailbox of the team (not paginated). */
  async list(
    requestOptions: RequestOptions = {},
  ): Promise<ListMailboxesResponse> {
    const data = await this.sendio.get<ListMailboxesResponseSuccess>(
      '/mailboxes',
      requestOptions,
    );
    return data;
  }

  /**
   * Creates a mailbox, a real email account with IMAP/SMTP login. The domain
   * must be verified; an address that already exists returns a 409. The
   * response carries `credentials` once, when IMAP/SMTP is ready: the
   * password is also an API key for that mailbox.
   */
  async create(
    payload: CreateMailboxOptions,
    requestOptions: CreateMailboxRequestOptions = {},
  ): Promise<CreateMailboxResponse> {
    const data = await this.sendio.post<CreateMailboxResponseSuccess>(
      '/mailboxes',
      {
        address: payload.address,
        local_part: payload.localPart,
        domain_id: payload.domainId,
        username: payload.username,
        org: payload.org,
        display_name: payload.displayName,
      },
      requestOptions,
    );
    return data;
  }

  /** Turns warmup on or off for a mailbox. */
  async update(
    id: string,
    payload: UpdateMailboxOptions,
    requestOptions: RequestOptions = {},
  ): Promise<UpdateMailboxResponse> {
    const data = await this.sendio.patch<UpdateMailboxResponseSuccess>(
      `/mailboxes/${id}`,
      { warmup_enabled: payload.warmupEnabled },
      requestOptions,
    );
    return data;
  }

  /**
   * Issues a new IMAP/SMTP password (also the mailbox's API key). The old
   * password stops working.
   */
  async resetPassword(
    id: string,
    requestOptions: RequestOptions = {},
  ): Promise<ResetMailboxPasswordResponse> {
    const data = await this.sendio.post<ResetMailboxPasswordResponseSuccess>(
      `/mailboxes/${id}/password`,
      undefined,
      requestOptions,
    );
    return data;
  }

  /** Deletes the email account, and the agent inbox on it if there is one. */
  async remove(
    id: string,
    requestOptions: RequestOptions = {},
  ): Promise<RemoveMailboxResponse> {
    const data = await this.sendio.delete<RemoveMailboxResponseSuccess>(
      `/mailboxes/${id}`,
      undefined,
      requestOptions,
    );
    return data;
  }
}
