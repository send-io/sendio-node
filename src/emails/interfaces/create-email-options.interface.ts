import type * as React from 'react';
import type { PostOptions } from '../../common/interfaces';
import type { IdempotentRequest } from '../../common/interfaces/idempotent-request.interface';
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

interface EmailTemplateOptions {
  /**
   * @deprecated Send a template with `transactionalId` instead (create a
   * transactional email for it with `transactional.create`). Still accepted
   * for now.
   */
  template: {
    id: string;
    variables?: Record<string, string | number>;
  };
}

interface CreateEmailBaseOptionsWithTemplate
  extends Omit<CreateEmailBaseOptions, 'from' | 'subject'> {
  from?: string;
  subject?: string;
}

interface EmailTransactionalOptions {
  /**
   * Send a transactional email (`tx_...`): it sets the sender, subject,
   * reply-to, preview text, tracking and content (its template's published
   * version). Pass the template's variables in `variables`. (send.io extension)
   */
  transactionalId: string;
  /** Values for the template's variables. */
  variables?: Record<string, unknown>;
}

interface CreateEmailBaseOptionsWithTransactional
  extends Omit<CreateEmailBaseOptions, 'from' | 'subject' | 'replyTo'> {
  /** Set by the transactional email. */
  from?: never;
  /** Set by the transactional email. */
  subject?: never;
  /** Set by the transactional email. */
  replyTo?: never;
}

interface CreateEmailBaseOptions {
  /**
   * Filename and content of attachments (max 40mb per email)
   *
   * @link https://developer.send.io/docs/api   */
  attachments?: Attachment[];
  /**
   * Blind carbon copy recipient email address. For multiple addresses, send as an array of strings.
   *
   * @link https://developer.send.io/docs/api   */
  bcc?: string | string[];
  /**
   * Carbon copy recipient email address. For multiple addresses, send as an array of strings.
   *
   * @link https://developer.send.io/docs/api   */
  cc?: string | string[];
  /**
   * Sender email address. To include a friendly name, use the format `"Your Name <sender@domain.com>"`
   *
   * @link https://developer.send.io/docs/api   */
  from: string;
  /**
   * Custom headers to add to the email.
   *
   * @link https://developer.send.io/docs/api   */
  headers?: Record<string, string>;
  /**
   * Reply-to email address. For multiple addresses, send as an array of strings.
   *
   * @link https://developer.send.io/docs/api   */
  replyTo?: string | string[];
  /**
   * Email subject.
   *
   * @link https://developer.send.io/docs/api   */
  subject: string;
  /**
   * Email tags
   *
   * @link https://developer.send.io/docs/api   */
  tags?: Tag[];
  /**
   * Recipient email address. For multiple addresses, send as an array of strings. Max 50.
   *
   * @link https://developer.send.io/docs/api   */
  to: string | string[];
  /**
   * The id of the topic you want to send to
   *
   * @link https://developer.send.io/docs/api   */
  topicId?: string | null;
  /**
   * Schedule email to be sent later.
   * The date should be in ISO 8601 format (e.g: 2024-08-05T11:52:01.858Z).
   *
   * @link https://developer.send.io/docs/api   */
  scheduledAt?: string;
  /**
   * Open tracking for this email only: `false` leaves the pixel out. Left
   * out, the domain's setting (or the transactional email's) applies.
   * (send.io extension)
   */
  trackOpens?: boolean;
  /**
   * Click tracking for this email only: `false` leaves links as written.
   * (send.io extension)
   */
  trackClicks?: boolean;
}

export type CreateEmailOptions =
  | ((RequireAtLeastOne<EmailRenderOptions> & CreateEmailBaseOptions) & {
      template?: never;
      transactionalId?: never;
      variables?: never;
    })
  | ((EmailTemplateOptions & CreateEmailBaseOptionsWithTemplate) & {
      react?: never;
      html?: never;
      text?: never;
      transactionalId?: never;
      variables?: never;
    })
  | ((EmailTransactionalOptions & CreateEmailBaseOptionsWithTransactional) & {
      template?: never;
      react?: never;
      html?: never;
      text?: never;
    });

export interface CreateEmailRequestOptions
  extends PostOptions,
    IdempotentRequest {}

export interface CreateEmailResponseSuccess {
  /** The ID of the newly created email. */
  id: string;
}

export type CreateEmailResponse = Response<CreateEmailResponseSuccess>;

export interface Attachment {
  /** Content of an attached file. */
  content?: string | Buffer;
  /** Name of attached file. */
  filename?: string | false | undefined;
  /** Path where the attachment file is hosted */
  path?: string;
  /** Optional content type for the attachment, if not set will be derived from the filename property */
  contentType?: string;
  /**
   * Optional content ID for the attachment, to be used as a reference in the HTML content.
   * If set, this attachment will be sent as an inline attachment and you can reference it in the HTML content using the `cid:` prefix.
   */
  contentId?: string;
}

export type Tag = {
  /**
   * The name of the email tag. It can only contain ASCII letters (a–z, A–Z), numbers (0–9), underscores (_), or dashes (-). It can contain no more than 256 characters.
   */
  name: string;
  /**
   * The value of the email tag. It can only contain ASCII letters (a–z, A–Z), numbers (0–9), underscores (_), or dashes (-). It can contain no more than 256 characters.
   */
  value: string;
};
