import type { RequestOptions } from '../common/interfaces/request-options.interface';
import {
  buildPaginationQuery,
  buildPaginationUrl,
} from '../common/utils/build-pagination-query';
import { render } from '../render';
import type { Sendio } from '../sendio';
import type {
  GetBroadcastStatsResponse,
  GetBroadcastStatsResponseSuccess,
} from './interfaces/broadcast-stats.interface';
import type {
  BroadcastVersion,
  GetBroadcastVersionResponse,
  ListBroadcastVersionsOptions,
  ListBroadcastVersionsResponse,
  ListBroadcastVersionsResponseSuccess,
  RestoreBroadcastVersionResponse,
  UpdateBroadcastVersionOptions,
  UpdateBroadcastVersionResponse,
} from './interfaces/broadcast-versions.interface';
import type {
  CancelBroadcastResponse,
  CancelBroadcastResponseSuccess,
} from './interfaces/cancel-broadcast.interface';
import type {
  PauseBroadcastResponse,
  PauseBroadcastResponseSuccess,
  ResumeBroadcastResponse,
  ResumeBroadcastResponseSuccess,
} from './interfaces/pause-broadcast.interface';
import type {
  CreateBroadcastOptions,
  CreateBroadcastRequestOptions,
} from './interfaces/create-broadcast-options.interface';
import type {
  DuplicateBroadcastResponse,
  DuplicateBroadcastResponseSuccess,
} from './interfaces/duplicate-broadcast.interface';
import type {
  EstimateBroadcastOptions,
  EstimateBroadcastResponse,
  EstimateBroadcastResponseSuccess,
} from './interfaces/estimate-broadcast.interface';
import type {
  GetBroadcastResponse,
  GetBroadcastResponseSuccess,
} from './interfaces/get-broadcast.interface';
import type {
  ListBroadcastClickedLinksOptions,
  ListBroadcastClickedLinksResponse,
  ListBroadcastClickedLinksResponseSuccess,
} from './interfaces/list-broadcast-clicked-links.interface';
import type {
  BroadcastRecipientEventType,
  ListBroadcastRecipientsOptions,
  ListBroadcastRecipientsResponse,
  ListBroadcastRecipientsResponseSuccess,
} from './interfaces/list-broadcast-recipients.interface';
import type {
  ListBroadcastsOptions,
  ListBroadcastsResponse,
  ListBroadcastsResponseSuccess,
} from './interfaces/list-broadcasts.interface';
import type {
  RemoveBroadcastResponse,
  RemoveBroadcastResponseSuccess,
} from './interfaces/remove-broadcast.interface';
import type {
  SendBroadcastOptions,
  SendBroadcastRequestOptions,
  SendBroadcastResponse,
  SendBroadcastResponseSuccess,
} from './interfaces/send-broadcast-options.interface';
import type {
  SendTestBroadcastOptions,
  SendTestBroadcastResponse,
  SendTestBroadcastResponseSuccess,
} from './interfaces/send-test-broadcast.interface';
import type {
  UpdateBroadcastOptions,
  UpdateBroadcastResponse,
  UpdateBroadcastResponseSuccess,
} from './interfaces/update-broadcast.interface';

export class Broadcasts {
  constructor(private readonly sendio: Sendio) {}

  async create(
    payload: CreateBroadcastOptions,
    requestOptions: CreateBroadcastRequestOptions = {},
  ): Promise<SendBroadcastResponse> {
    const html = payload.react ? await render(payload.react) : payload.html;

    const data = await this.sendio.post<SendBroadcastResponseSuccess>(
      '/broadcasts',
      {
        name: payload.name,
        segment_id: payload.segmentId,
        audience_id: payload.audienceId,
        preview_text: payload.previewText,
        from: payload.from,
        html,
        reply_to: payload.replyTo,
        subject: payload.subject,
        text: payload.text,
        topic_id: payload.topicId,
        segment_ids: payload.segmentIds,
        exclude_segment_ids: payload.excludeSegmentIds,
        audience: payload.audience,
        unsubscribe_scope: payload.unsubscribeScope,
        tracking: payload.tracking,
        template_engine: payload.templateEngine,
        template_id: payload.templateId,
        template_version_id: payload.templateVersionId,
        send: payload.send,
        scheduled_at: payload.scheduledAt,
      },
      requestOptions,
    );

    return data;
  }

  async send(
    id: string,
    payload?: SendBroadcastOptions,
    requestOptions: SendBroadcastRequestOptions = {},
  ): Promise<SendBroadcastResponse> {
    const data = await this.sendio.post<SendBroadcastResponseSuccess>(
      `/broadcasts/${id}/send`,
      { scheduled_at: payload?.scheduledAt },
      requestOptions,
    );

    return data;
  }

  async list(
    options: ListBroadcastsOptions = {},
    requestOptions: RequestOptions = {},
  ): Promise<ListBroadcastsResponse> {
    const { status, segmentId, search, ...pagination } = options;
    const searchParams = new URLSearchParams(buildPaginationQuery(pagination));
    if (status !== undefined) {
      searchParams.set('status', status);
    }
    if (segmentId !== undefined) {
      searchParams.set('segment_id', segmentId);
    }
    if (search !== undefined) {
      searchParams.set('search', search);
    }
    const queryString = searchParams.toString();
    const url = queryString ? `/broadcasts?${queryString}` : '/broadcasts';

    const data = await this.sendio.get<ListBroadcastsResponseSuccess>(
      url,
      requestOptions,
    );
    return data;
  }

  async get(
    id: string,
    requestOptions: RequestOptions = {},
  ): Promise<GetBroadcastResponse> {
    const data = await this.sendio.get<GetBroadcastResponseSuccess>(
      `/broadcasts/${id}`,
      requestOptions,
    );
    return data;
  }

  async recipients<T extends BroadcastRecipientEventType>(
    id: string,
    options: ListBroadcastRecipientsOptions<T>,
    requestOptions: RequestOptions = {},
  ): Promise<ListBroadcastRecipientsResponse<T>> {
    const queryString = buildRecipientsQuery(
      options as ListBroadcastRecipientsOptions,
    );
    const url = `/broadcasts/${id}/recipients?${queryString}`;

    const data = await this.sendio.get<
      ListBroadcastRecipientsResponseSuccess<T>
    >(url, requestOptions);
    return data;
  }

  async clickedLinks(
    id: string,
    options: ListBroadcastClickedLinksOptions = {},
    requestOptions: RequestOptions = {},
  ): Promise<ListBroadcastClickedLinksResponse> {
    const url = buildPaginationUrl(`/broadcasts/${id}/clicked-links`, options);

    const data =
      await this.sendio.get<ListBroadcastClickedLinksResponseSuccess>(
        url,
        requestOptions,
      );
    return data;
  }

  async remove(
    id: string,
    requestOptions: RequestOptions = {},
  ): Promise<RemoveBroadcastResponse> {
    const data = await this.sendio.delete<RemoveBroadcastResponseSuccess>(
      `/broadcasts/${id}`,
      undefined,
      requestOptions,
    );
    return data;
  }

  async cancel(
    id: string,
    requestOptions: RequestOptions = {},
  ): Promise<CancelBroadcastResponse> {
    const data = await this.sendio.post<CancelBroadcastResponseSuccess>(
      `/broadcasts/${id}/cancel`,
      undefined,
      requestOptions,
    );
    return data;
  }

  /**
   * Pause a sending broadcast after the batch in flight; it stays `queued`
   * with `paused_at` set and resumes from the next recipient.
   */
  async pause(
    id: string,
    requestOptions: RequestOptions = {},
  ): Promise<PauseBroadcastResponse> {
    const data = await this.sendio.post<PauseBroadcastResponseSuccess>(
      `/broadcasts/${id}/pause`,
      undefined,
      requestOptions,
    );
    return data;
  }

  /** Resume a paused broadcast from the next recipient. */
  async resume(
    id: string,
    requestOptions: RequestOptions = {},
  ): Promise<ResumeBroadcastResponse> {
    const data = await this.sendio.post<ResumeBroadcastResponseSuccess>(
      `/broadcasts/${id}/resume`,
      undefined,
      requestOptions,
    );
    return data;
  }

  async duplicate(
    id: string,
    requestOptions: RequestOptions = {},
  ): Promise<DuplicateBroadcastResponse> {
    const data = await this.sendio.post<DuplicateBroadcastResponseSuccess>(
      `/broadcasts/${id}/duplicate`,
      undefined,
      requestOptions,
    );
    return data;
  }

  async update(
    id: string,
    payload: UpdateBroadcastOptions,
    requestOptions: RequestOptions = {},
  ): Promise<UpdateBroadcastResponse> {
    const html = payload.react ? await render(payload.react) : payload.html;

    const data = await this.sendio.patch<UpdateBroadcastResponseSuccess>(
      `/broadcasts/${id}`,
      {
        name: payload.name,
        segment_id: payload.segmentId,
        audience_id: payload.audienceId,
        from: payload.from,
        html,
        text: payload.text,
        subject: payload.subject,
        reply_to: payload.replyTo,
        preview_text: payload.previewText,
        topic_id: payload.topicId,
        segment_ids: payload.segmentIds,
        exclude_segment_ids: payload.excludeSegmentIds,
        audience: payload.audience,
        unsubscribe_scope: payload.unsubscribeScope,
        tracking: payload.tracking,
        template_engine: payload.templateEngine,
        template_id: payload.templateId,
        template_version_id: payload.templateVersionId,
      },
      requestOptions,
    );
    return data;
  }

  /** Counts the contacts an audience reaches now, before anything is saved. */
  async estimate(
    payload: EstimateBroadcastOptions = {},
    requestOptions: RequestOptions = {},
  ): Promise<EstimateBroadcastResponse> {
    const data = await this.sendio.post<EstimateBroadcastResponseSuccess>(
      '/broadcasts/estimate',
      {
        segment_id: payload.segmentId,
        audience_id: payload.audienceId,
        segment_ids: payload.segmentIds,
        exclude_segment_ids: payload.excludeSegmentIds,
        audience: payload.audience,
        topic_id: payload.topicId,
      },
      requestOptions,
    );
    return data;
  }

  /** Sends the broadcast's current content to 1 to 5 test addresses. */
  async sendTest(
    id: string,
    payload: SendTestBroadcastOptions,
    requestOptions: RequestOptions = {},
  ): Promise<SendTestBroadcastResponse> {
    const data = await this.sendio.post<SendTestBroadcastResponseSuccess>(
      `/broadcasts/${id}/test`,
      { to: payload.to },
      requestOptions,
    );
    return data;
  }

  /** A broadcast's delivery and engagement counts and rates. */
  async stats(
    id: string,
    requestOptions: RequestOptions = {},
  ): Promise<GetBroadcastStatsResponse> {
    const data = await this.sendio.get<GetBroadcastStatsResponseSuccess>(
      `/broadcasts/${id}/stats`,
      requestOptions,
    );
    return data;
  }

  /** A broadcast's saved versions, newest first. */
  async listVersions(
    id: string,
    options: ListBroadcastVersionsOptions = {},
    requestOptions: RequestOptions = {},
  ): Promise<ListBroadcastVersionsResponse> {
    const url = buildPaginationUrl(`/broadcasts/${id}/versions`, options);
    const data = await this.sendio.get<ListBroadcastVersionsResponseSuccess>(
      url,
      requestOptions,
    );
    return data;
  }

  /**
   * One saved version with its content and audience. `version` is a version
   * id or its version number.
   */
  async getVersion(
    id: string,
    version: string | number,
    requestOptions: RequestOptions = {},
  ): Promise<GetBroadcastVersionResponse> {
    const data = await this.sendio.get<BroadcastVersion>(
      `/broadcasts/${id}/versions/${version}`,
      requestOptions,
    );
    return data;
  }

  /** Sets a version's name and comment; its content is immutable. */
  async updateVersion(
    id: string,
    version: string | number,
    payload: UpdateBroadcastVersionOptions,
    requestOptions: RequestOptions = {},
  ): Promise<UpdateBroadcastVersionResponse> {
    const data = await this.sendio.patch<BroadcastVersion>(
      `/broadcasts/${id}/versions/${version}`,
      { name: payload.name, comment: payload.comment },
      requestOptions,
    );
    return data;
  }

  /**
   * Copies a saved version back into a draft or scheduled broadcast and
   * returns the new version that records it.
   */
  async restoreVersion(
    id: string,
    version: string | number,
    requestOptions: RequestOptions = {},
  ): Promise<RestoreBroadcastVersionResponse> {
    const data = await this.sendio.post<BroadcastVersion>(
      `/broadcasts/${id}/versions/${version}/restore`,
      undefined,
      requestOptions,
    );
    return data;
  }
}

function buildRecipientsQuery(options: ListBroadcastRecipientsOptions) {
  const { type, email, bounceType, ...pagination } = options;
  const searchParams = new URLSearchParams(buildPaginationQuery(pagination));

  searchParams.set('type', type);

  if (email !== undefined) {
    searchParams.set('email', email);
  }

  if (bounceType !== undefined) {
    searchParams.set('bounce_type', bounceType);
  }

  return searchParams.toString();
}
