import type { Response } from '../../interfaces';
import type { Broadcast } from './broadcast';

/** Pause and resume answer with the whole broadcast (send.io extension). */
export interface PauseBroadcastResponseSuccess extends Broadcast {
  object: 'broadcast';
}

export type PauseBroadcastResponse = Response<PauseBroadcastResponseSuccess>;
export type ResumeBroadcastResponseSuccess = PauseBroadcastResponseSuccess;
export type ResumeBroadcastResponse = Response<ResumeBroadcastResponseSuccess>;
