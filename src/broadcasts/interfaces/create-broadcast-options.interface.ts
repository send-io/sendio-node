import type * as React from 'react';
import type { PostOptions } from '../../common/interfaces';
import type { RequireAtLeastOne } from '../../common/interfaces/require-at-least-one';
import type { Response } from '../../interfaces';

interface EmailRenderOptions {
  /**
   * The React component used to write the message.
   *
   * @link https://developer.send.io/docs/api   */
  react: React.ReactNode;
  /**
   * The HTML version of the message.
   *
   * @link https://developer.send.io/docs/api   */
  html: string;
  /**
   * The plain text version of the message.
   *
   * @link https://developer.send.io/docs/api   */
  text: string;
}

/**
 * Who a broadcast goes to: a segment (`segmentId`, or the deprecated
 * `audienceId`), several segments (`segmentIds`) or every contact
 * (`audience: 'all'`).
 */
export interface BroadcastAudienceOptions {
  /**
   * The id of the segment you want to send to
   *
   * @link https://developer.send.io/docs/api   */
  segmentId?: string;
  /**
   * @deprecated Use segmentId instead
   */
  audienceId?: string;
  /**
   * Several segments to send to; a contact in more than one gets one email.
   * Can be combined with `segmentId`. (send.io extension)
   */
  segmentIds?: string[];
  /**
   * Members of these segments never get the broadcast. (send.io extension)
   */
  excludeSegmentIds?: string[];
  /**
   * `segments` (the default) sends to the segments' members; `all` sends to
   * every contact and cannot be combined with `segmentId` or `segmentIds`.
   * (send.io extension)
   */
  audience?: 'segments' | 'all';
  /**
   * The id of the topic you want to send to: contacts who opted out of it
   * are skipped.
   *
   * @link https://developer.send.io/docs/api   */
  topicId?: string | null;
}

type RequiredAudience =
  | { segmentId: string }
  | { audienceId: string }
  | { segmentIds: string[] }
  | { audience: 'all' };

interface CreateBroadcastBaseOptions extends BroadcastAudienceOptions {
  /**
   * The name of the broadcast
   *
   * @link https://developer.send.io/docs/api   */
  name?: string;
  /**
   * A short snippet of text displayed as a preview in recipients' inboxes, often shown below or beside the subject line.
   *
   * @link https://developer.send.io/docs/api   */
  previewText?: string;
  /**
   * Sender email address. To include a friendly name, use the format `"Your Name <sender@domain.com>"`
   *
   * @link https://developer.send.io/docs/api   */
  from?: string;
  /**
   * Reply-to email address. For multiple addresses, send as an array of strings.
   *
   * @link https://developer.send.io/docs/api   */
  replyTo?: string | string[];
  /**
   * Email subject.
   *
   * @link https://developer.send.io/docs/api   */
  subject?: string;
  /**
   * The React component used to write the message.
   */
  react?: React.ReactNode;
  /**
   * The HTML version of the message.
   */
  html?: string;
  /**
   * The plain text version of the message. `''` opts out of the text part
   * generated from the HTML.
   */
  text?: string;
  /**
   * `all` (the default): unsubscribing leaves everything (or the topic);
   * `list`: it leaves the broadcast's segments only. (send.io extension)
   */
  unsubscribeScope?: 'all' | 'list';
  /**
   * Count opens and clicks (default `true`). `false` turns tracking off.
   * (send.io extension)
   */
  tracking?: boolean;
  /**
   * `simple` merge tags (the default) or `handlebars`, rendered for each
   * recipient with the contact as data. (send.io extension)
   */
  templateEngine?: 'simple' | 'handlebars';
  /**
   * Make the broadcast from a published template (id or alias): it copies
   * the version's content, and its subject, From, preview text and reply-to
   * where the request has none. Not with `html`, `text`, `react` or
   * `templateEngine`. (send.io extension)
   */
  templateId?: string;
  /** The published version to copy (default: the one published now). */
  templateVersionId?: string;
}

/**
 * A draft: every field is optional, and the broadcast can be completed with
 * `update` and sent with `send` later.
 */
type CreateBroadcastDraftOptions = CreateBroadcastBaseOptions & {
  /**
   * Whether to send the broadcast immediately or keep it as a draft.
   * If not provided or set to false, the broadcast will be created as a draft.
   *
   * @link https://developer.send.io/docs/api       */
  send?: false;
  /**
   * Schedule time to send the broadcast. Can only be used if `send` is true.
   *
   * @link https://developer.send.io/docs/api       */
  scheduledAt?: never;
};

/**
 * Sent on creation: `from`, `subject`, a body and an audience are required.
 */
type CreateBroadcastAndSendOptions = CreateBroadcastBaseOptions &
  RequireAtLeastOne<EmailRenderOptions> &
  RequiredAudience & {
    from: string;
    subject: string;
    /**
     * Whether to send the broadcast immediately or keep it as a draft.
     * If not provided or set to false, the broadcast will be created as a draft.
     *
     * @link https://developer.send.io/docs/api       */
    send: true;
    /**
     * Schedule time to send the broadcast. Can only be used if `send` is true.
     * The date should be in ISO 8601 format (e.g: 2024-08-05T11:52:01.858Z)
     * or relative time (eg: in 2 days).
     *
     * @link https://developer.send.io/docs/api       */
    scheduledAt?: string;
  };

export type CreateBroadcastOptions =
  | CreateBroadcastDraftOptions
  | CreateBroadcastAndSendOptions;

export interface CreateBroadcastRequestOptions extends PostOptions {}

export interface CreateBroadcastResponseSuccess {
  /** The ID of the newly sent broadcasts. */
  id: string;
}

export type CreateBroadcastResponse = Response<CreateBroadcastResponseSuccess>;
