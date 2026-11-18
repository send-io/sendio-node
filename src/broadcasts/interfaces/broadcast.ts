export type BroadcastStatus =
  | 'draft'
  | 'scheduled'
  | 'queued'
  | 'sent'
  | 'canceled'
  | 'failed';

export interface Broadcast {
  id: string;
  name: string | null;
  segment_id: string | null;
  audience_id: string | null;
  from: string | null;
  subject: string | null;
  reply_to: string[] | null;
  preview_text: string | null;
  status: BroadcastStatus;
  created_at: string;
  scheduled_at: string | null;
  sent_at: string | null;
  updated_at?: string;
  topic_id?: string | null;
  html: string | null;
  text: string | null;
  /** The segments the broadcast goes to (send.io extension). */
  segment_ids?: string[];
  /** Members of these segments never get the broadcast (send.io extension). */
  exclude_segment_ids?: string[];
  /** `all`: every contact; `segments`: the segments' members (send.io extension). */
  audience?: 'segments' | 'all';
  /** `list`: unsubscribing leaves the broadcast's segments only (send.io extension). */
  unsubscribe_scope?: 'all' | 'list';
  /** Whether opens and clicks are tracked (send.io extension). */
  tracking?: boolean;
  /** How merge tags are rendered (send.io extension). */
  template_engine?: 'simple' | 'handlebars';
  /** The broadcast's current saved version. */
  version_number?: number | null;
  /** Why the broadcast failed, when its status is `failed`. */
  failed_reason?: string | null;
  /** Why a queued broadcast is held back, and until when. */
  hold_reason?: string | null;
  hold_until?: string | null;
  /** When the team paused this sending broadcast; null when it is not paused (send.io extension). */
  paused_at?: string | null;
  /** The template the broadcast was made from; null for its own content (send.io extension). */
  template_id?: string | null;
  /** The exact published version it copied. */
  template_version_id?: string | null;
  template_name?: string | null;
  template_version_number?: number | null;
  template_version_name?: string | null;
  template_deleted?: boolean;
  /**
   * For a broadcast made from a template: the template variables with no
   * value in a broadcast. While not empty, sending is refused with 422
   * `unfillable_variables`.
   */
  unfillable_variables?: string[];
}
