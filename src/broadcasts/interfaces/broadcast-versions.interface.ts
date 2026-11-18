import type { PaginationOptions } from '../../common/interfaces';
import type { Response } from '../../interfaces';

export interface BroadcastVersionSummary {
  object: 'broadcast_version';
  id: string;
  broadcast_id: string;
  version_number: number;
  name: string | null;
  comment: string | null;
  broadcast_name: string | null;
  subject: string | null;
  /** The version a restore copied, if this version is one. */
  restored_from: number | null;
  created_at: string;
  /** Whether the broadcast holds this version now. */
  current: boolean;
}

export interface BroadcastVersion extends BroadcastVersionSummary {
  from: string | null;
  reply_to: string[] | null;
  preview_text: string | null;
  html: string | null;
  text: string | null;
  template_engine: 'simple' | 'handlebars';
  tracking: boolean;
  topic_id: string | null;
  segment_ids: string[];
  exclude_segment_ids: string[];
  audience: 'segments' | 'all';
  unsubscribe_scope: 'all' | 'list';
}

export type ListBroadcastVersionsOptions = PaginationOptions;

export type ListBroadcastVersionsResponseSuccess = {
  object: 'list';
  has_more: boolean;
  data: BroadcastVersionSummary[];
};

export type ListBroadcastVersionsResponse =
  Response<ListBroadcastVersionsResponseSuccess>;

export type GetBroadcastVersionResponse = Response<BroadcastVersion>;

/** A version's labels; its content is immutable. */
export interface UpdateBroadcastVersionOptions {
  name?: string | null;
  comment?: string | null;
}

export type UpdateBroadcastVersionResponse = Response<BroadcastVersion>;

export type RestoreBroadcastVersionResponse = Response<BroadcastVersion>;
