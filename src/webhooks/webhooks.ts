import { Webhook } from 'standardwebhooks';
import type { RequestOptions } from '../common/interfaces/request-options.interface';
import { buildPaginationUrl } from '../common/utils/build-pagination-query';
import type { Sendio } from '../sendio';
import { Events } from './events/events';
import type {
  CreateWebhookOptions,
  CreateWebhookRequestOptions,
  CreateWebhookResponse,
  CreateWebhookResponseSuccess,
} from './interfaces/create-webhook-options.interface';
import type {
  GetWebhookResponse,
  GetWebhookResponseSuccess,
} from './interfaces/get-webhook.interface';
import type {
  ListWebhooksOptions,
  ListWebhooksResponse,
  ListWebhooksResponseSuccess,
} from './interfaces/list-webhooks.interface';
import type {
  RemoveWebhookResponse,
  RemoveWebhookResponseSuccess,
} from './interfaces/remove-webhook.interface';
import type {
  RotateWebhookSigningSecretResponse,
  RotateWebhookSigningSecretResponseSuccess,
} from './interfaces/rotate-webhook-signing-secret.interface';
import type {
  UpdateWebhookOptions,
  UpdateWebhookResponse,
  UpdateWebhookResponseSuccess,
} from './interfaces/update-webhook.interface';
import type { WebhookEventPayload } from './interfaces/webhook-event.interface';

interface Headers {
  id: string;
  timestamp: string;
  signature: string;
}

interface VerifyWebhookOptions {
  payload: string;
  headers: Headers;
  webhookSecret: string;
}

export class Webhooks {
  readonly events: Events;

  constructor(private readonly sendio: Sendio) {
    this.events = new Events(sendio);
  }

  async create(
    payload: CreateWebhookOptions,
    requestOptions: CreateWebhookRequestOptions = {},
  ): Promise<CreateWebhookResponse> {
    const data = await this.sendio.post<CreateWebhookResponseSuccess>(
      '/webhooks',
      payload,
      requestOptions,
    );
    return data;
  }

  async get(
    id: string,
    requestOptions: RequestOptions = {},
  ): Promise<GetWebhookResponse> {
    const data = await this.sendio.get<GetWebhookResponseSuccess>(
      `/webhooks/${id}`,
      requestOptions,
    );

    return data;
  }

  async list(
    options: ListWebhooksOptions = {},
    requestOptions: RequestOptions = {},
  ): Promise<ListWebhooksResponse> {
    const url = buildPaginationUrl('/webhooks', options);

    const data = await this.sendio.get<ListWebhooksResponseSuccess>(
      url,
      requestOptions,
    );
    return data;
  }

  async update(
    id: string,
    payload: UpdateWebhookOptions,
    requestOptions: RequestOptions = {},
  ): Promise<UpdateWebhookResponse> {
    const data = await this.sendio.patch<UpdateWebhookResponseSuccess>(
      `/webhooks/${id}`,
      payload,
      requestOptions,
    );
    return data;
  }

  async remove(
    id: string,
    requestOptions: RequestOptions = {},
  ): Promise<RemoveWebhookResponse> {
    const data = await this.sendio.delete<RemoveWebhookResponseSuccess>(
      `/webhooks/${id}`,
      undefined,
      requestOptions,
    );
    return data;
  }

  async rotateSigningSecret(
    id: string,
    requestOptions: RequestOptions = {},
  ): Promise<RotateWebhookSigningSecretResponse> {
    const data =
      await this.sendio.post<RotateWebhookSigningSecretResponseSuccess>(
        `/webhooks/${id}/signing-secret/rotate`,
        undefined,
        requestOptions,
      );
    return data;
  }

  verify(payload: VerifyWebhookOptions): WebhookEventPayload {
    const webhook = new Webhook(payload.webhookSecret);
    return webhook.verify(payload.payload, {
      'webhook-id': payload.headers.id,
      'webhook-timestamp': payload.headers.timestamp,
      'webhook-signature': payload.headers.signature,
    }) as WebhookEventPayload;
  }
}
