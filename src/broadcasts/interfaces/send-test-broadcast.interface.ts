import type { Response } from '../../interfaces';

export interface SendTestBroadcastOptions {
  /** 1 to 5 addresses to send the test to. */
  to: string | string[];
}

export interface SendTestBroadcastResponseSuccess {
  object: 'broadcast_test';
  /** How many test emails were sent. */
  sent: number;
}

export type SendTestBroadcastResponse =
  Response<SendTestBroadcastResponseSuccess>;
