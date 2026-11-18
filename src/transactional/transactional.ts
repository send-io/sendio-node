import type { RequestOptions } from '../common/interfaces/request-options.interface';
import { buildPaginationQuery } from '../common/utils/build-pagination-query';
import type { Sendio } from '../sendio';
import type {
  CreateTransactionalEmailOptions,
  CreateTransactionalEmailRequestOptions,
  ListTransactionalEmailsOptions,
  ListTransactionalEmailsResponse,
  ListTransactionalEmailsResponseSuccess,
  RemoveTransactionalEmailResponse,
  RemoveTransactionalEmailResponseSuccess,
  SendTestTransactionalEmailOptions,
  SendTestTransactionalEmailResponse,
  TransactionalEmail,
  TransactionalEmailResponse,
  TransactionalEmailStats,
  TransactionalEmailStatsOptions,
  TransactionalEmailStatsResponse,
  UpdateTransactionalEmailOptions,
} from './interfaces/transactional-email';

/**
 * Transactional emails (`/transactional`): saved sends of a published
 * template, sent with `emails.send({ transactionalId, to, variables })`.
 * Creating, changing and deleting them needs a full-access key; a
 * sending-only key can send them.
 */
export class Transactional {
  constructor(private readonly sendio: Sendio) {}

  /** Saves a transactional email on a published template. */
  async create(
    payload: CreateTransactionalEmailOptions,
    requestOptions: CreateTransactionalEmailRequestOptions = {},
  ): Promise<TransactionalEmailResponse> {
    return this.sendio.post<TransactionalEmail>(
      '/transactional',
      {
        name: payload.name,
        template_id: payload.templateId,
        from: payload.from,
        subject: payload.subject,
        preview_text: payload.previewText,
        reply_to: payload.replyTo,
        track_opens: payload.trackOpens,
        track_clicks: payload.trackClicks,
      },
      requestOptions,
    );
  }

  /** Lists transactional emails, newest first. */
  async list(
    options: ListTransactionalEmailsOptions = {},
    requestOptions: RequestOptions = {},
  ): Promise<ListTransactionalEmailsResponse> {
    const query = new URLSearchParams(buildPaginationQuery(options));
    if (options.search) query.set('search', options.search);
    if (options.templateId) query.set('template_id', options.templateId);
    const qs = query.toString();
    return this.sendio.get<ListTransactionalEmailsResponseSuccess>(
      qs ? `/transactional?${qs}` : '/transactional',
      requestOptions,
    );
  }

  /** Gets one, with the variables of the template version its sends use now. */
  async get(
    id: string,
    requestOptions: RequestOptions = {},
  ): Promise<TransactionalEmailResponse> {
    return this.sendio.get<TransactionalEmail>(
      `/transactional/${encodeURIComponent(id)}`,
      requestOptions,
    );
  }

  /** Changes the fields given. Sends use the change within 10 seconds. */
  async update(
    id: string,
    payload: UpdateTransactionalEmailOptions,
    requestOptions: RequestOptions = {},
  ): Promise<TransactionalEmailResponse> {
    return this.sendio.patch<TransactionalEmail>(
      `/transactional/${encodeURIComponent(id)}`,
      {
        name: payload.name,
        template_id: payload.templateId,
        from: payload.from,
        subject: payload.subject,
        preview_text: payload.previewText,
        reply_to: payload.replyTo,
        track_opens: payload.trackOpens,
        track_clicks: payload.trackClicks,
        expected_updated_at: payload.expectedUpdatedAt,
      },
      requestOptions,
    );
  }

  /** Deletes it: sends of it then fail with 404. Its emails and stats stay. */
  async remove(
    id: string,
    requestOptions: RequestOptions = {},
  ): Promise<RemoveTransactionalEmailResponse> {
    return this.sendio.delete<RemoveTransactionalEmailResponseSuccess>(
      `/transactional/${encodeURIComponent(id)}`,
      undefined,
      requestOptions,
    );
  }

  /** Sends it now to 1 to 5 addresses, with "[Test] " before the subject. */
  async sendTest(
    id: string,
    payload: SendTestTransactionalEmailOptions,
    requestOptions: RequestOptions = {},
  ): Promise<SendTestTransactionalEmailResponse> {
    return this.sendio.post<{ id: string }>(
      `/transactional/${encodeURIComponent(id)}/test`,
      { to: payload.to, variables: payload.variables },
      requestOptions,
    );
  }

  /** Its sends' numbers in a period (the template stats' shape). */
  async stats(
    id: string,
    options: TransactionalEmailStatsOptions = {},
    requestOptions: RequestOptions = {},
  ): Promise<TransactionalEmailStatsResponse> {
    const query = new URLSearchParams();
    for (const [k, v] of Object.entries(options)) {
      if (v !== undefined && v !== '') query.set(k, String(v));
    }
    const qs = query.toString();
    const path = `/transactional/${encodeURIComponent(id)}/stats`;
    return this.sendio.get<TransactionalEmailStats>(
      qs ? `${path}?${qs}` : path,
      requestOptions,
    );
  }
}
