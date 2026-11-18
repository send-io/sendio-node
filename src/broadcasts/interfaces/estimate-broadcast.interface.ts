import type { Response } from '../../interfaces';
import type { BroadcastAudienceOptions } from './create-broadcast-options.interface';

/** The audience to estimate, as on `create`. Nothing is saved. */
export type EstimateBroadcastOptions = BroadcastAudienceOptions;

export interface EstimateBroadcastResponseSuccess {
  object: 'broadcast_estimate';
  /** Contacts the audience reaches now. */
  recipients: number;
  skipped: {
    /** Contacts left out because email verification found them invalid. */
    invalid: number;
  };
}

export type EstimateBroadcastResponse =
  Response<EstimateBroadcastResponseSuccess>;
