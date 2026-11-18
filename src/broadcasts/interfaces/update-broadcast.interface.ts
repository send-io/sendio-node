import type * as React from 'react';
import type { Response } from '../../interfaces';

export interface UpdateBroadcastResponseSuccess {
  id: string;
}

/**
 * The fields to change; the ones left out are kept. Once a broadcast is
 * sending or sent, only `name` can be changed.
 */
export type UpdateBroadcastOptions = {
  name?: string;
  segmentId?: string;
  /**
   * @deprecated Use segmentId instead
   */
  audienceId?: string;
  /** Several segments to send to (send.io extension). */
  segmentIds?: string[];
  /** Members of these segments never get the broadcast (send.io extension). */
  excludeSegmentIds?: string[];
  /** `segments` or `all` (every contact) (send.io extension). */
  audience?: 'segments' | 'all';
  /** `all` or `list` (send.io extension). */
  unsubscribeScope?: 'all' | 'list';
  /** Count opens and clicks; `false` turns tracking off (send.io extension). */
  tracking?: boolean;
  /** `simple` or `handlebars` (send.io extension). */
  templateEngine?: 'simple' | 'handlebars';
  /**
   * Link the broadcast to a published template (id or alias) and copy its
   * version's content; `null` detaches it (the content stays). Sending
   * `html`, `text`, `react` or `templateEngine` instead gives the broadcast
   * its own content and detaches it. (send.io extension)
   */
  templateId?: string | null;
  /** The published version to copy; alone, another version of its template. */
  templateVersionId?: string;
  from?: string;
  html?: string;
  react?: React.ReactNode;
  text?: string;
  subject?: string;
  replyTo?: string | string[];
  previewText?: string;
  topicId?: string | null;
};

export type UpdateBroadcastResponse = Response<UpdateBroadcastResponseSuccess>;
