import type { Response } from '../../interfaces';
import type { BroadcastStatus } from './broadcast';

export interface GetBroadcastStatsResponseSuccess {
  object: 'broadcast_stats';
  status: BroadcastStatus;
  recipients: number;
  sent: number;
  delivered: number;
  bounced: number;
  complained: number;
  suppressed: number;
  failed: number;
  opened: number;
  unique_opened: number;
  clicked: number;
  unique_clicked: number;
  unsubscribed: number;
  skipped: { invalid: number };
  /** Rates are fractions from 0 to 1. */
  delivery_rate: number;
  open_rate: number;
  click_rate: number;
  bounce_rate: number;
  unsubscribe_rate: number;
  progress: { queued: number; total: number };
}

export type GetBroadcastStatsResponse =
  Response<GetBroadcastStatsResponseSuccess>;
