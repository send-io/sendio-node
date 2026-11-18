import type { Response } from '../../interfaces';
import type { WebhookEvent } from './webhook-event.interface';

export interface GetWebhookResponseSuccess {
  object: 'webhook';
  id: string;
  /** RFC 3339 in UTC, for example `2026-11-10T14:40:35.840078+00:00`. */
  created_at: string;
  status: 'enabled' | 'disabled';
  endpoint: string;
  events: WebhookEvent[] | null;
  /** Left out for workspace Members; see `signing_secret_hidden`. */
  signing_secret?: string | null;
  /** `true` when `signing_secret` is left out because the caller is a workspace Member. */
  signing_secret_hidden?: boolean;
  /** Why send.io disabled the endpoint (after 3 days of failed deliveries). `null` while enabled or when you disabled it. */
  disabled_reason?: string | null;
  /** When the current run of failed deliveries started (RFC 3339). `null` when the last delivery succeeded. */
  failing_since?: string | null;
}

export type GetWebhookResponse = Response<GetWebhookResponseSuccess>;
