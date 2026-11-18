import type { RequestOptions } from '../../common/interfaces/request-options.interface';
import { buildPaginationUrl } from '../../common/utils/build-pagination-query';
import type { Sendio } from '../../sendio';
import type {
  GetWebhookEventOptions,
  GetWebhookEventResponse,
  GetWebhookEventResponseSuccess,
} from '../interfaces/get-webhook-event.interface';
import type {
  ListWebhookEventsOptions,
  ListWebhookEventsResponse,
  ListWebhookEventsResponseSuccess,
} from '../interfaces/list-webhook-events.interface';
import type {
  ReplayWebhookEventOptions,
  ReplayWebhookEventResponse,
  ReplayWebhookEventResponseSuccess,
} from '../interfaces/replay-webhook-event.interface';
import { Attempts } from './attempts/attempts';

export class Events {
  readonly attempts: Attempts;

  constructor(private readonly sendio: Sendio) {
    this.attempts = new Attempts(sendio);
  }

  async list(
    options: ListWebhookEventsOptions,
    requestOptions: RequestOptions = {},
  ): Promise<ListWebhookEventsResponse> {
    const { webhookId } = options;

    const url = buildPaginationUrl(`/webhooks/${webhookId}/events`, options);

    const data = await this.sendio.get<ListWebhookEventsResponseSuccess>(
      url,
      requestOptions,
    );
    return data;
  }

  async get(
    options: GetWebhookEventOptions,
    requestOptions: RequestOptions = {},
  ): Promise<GetWebhookEventResponse> {
    const { webhookId, eventId } = options;

    const data = await this.sendio.get<GetWebhookEventResponseSuccess>(
      `/webhooks/${webhookId}/events/${eventId}`,
      requestOptions,
    );
    return data;
  }

  async replay(
    options: ReplayWebhookEventOptions,
    requestOptions: RequestOptions = {},
  ): Promise<ReplayWebhookEventResponse> {
    const { webhookId, eventId } = options;

    const data = await this.sendio.post<ReplayWebhookEventResponseSuccess>(
      `/webhooks/${webhookId}/events/${eventId}/replay`,
      undefined,
      requestOptions,
    );
    return data;
  }
}
