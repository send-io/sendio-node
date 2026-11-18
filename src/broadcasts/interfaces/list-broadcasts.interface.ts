import type { PaginationOptions } from '../../common/interfaces';
import type { Response } from '../../interfaces';
import type { Broadcast, BroadcastStatus } from './broadcast';

export type ListBroadcastsOptions = PaginationOptions & {
  /** Only broadcasts in this status. */
  status?: BroadcastStatus;
  /** Only broadcasts that send to this segment. */
  segmentId?: string;
  /** Only broadcasts whose name contains this text. */
  search?: string;
};

export type ListBroadcastsResponseSuccess = {
  object: 'list';
  has_more: boolean;
  data: Pick<
    Broadcast,
    | 'id'
    | 'name'
    | 'audience_id'
    | 'segment_id'
    | 'segment_ids'
    | 'exclude_segment_ids'
    | 'audience'
    | 'status'
    | 'created_at'
    | 'scheduled_at'
    | 'sent_at'
    | 'failed_reason'
    | 'hold_reason'
    | 'hold_until'
  >[];
};

export type ListBroadcastsResponse = Response<ListBroadcastsResponseSuccess>;
