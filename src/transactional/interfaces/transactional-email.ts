import type { PostOptions } from '../../common/interfaces';
import type { IdempotentRequest } from '../../common/interfaces/idempotent-request.interface';
import type { PaginationOptions } from '../../common/interfaces/pagination-options.interface';
import type { Response } from '../../interfaces';

/**
 * A transactional email: a named, saved send of a published template (a
 * sign-in code, a password reset, a receipt). It keeps the envelope and the
 * tracking switches; its content is the template's published version at
 * send time. Send it with `emails.send({ transactionalId, to, variables })`.
 */
export interface TransactionalEmail {
  object: 'transactional_email';
  /** `tx_` and 27 letters and digits. */
  id: string;
  name: string;
  template_id: string;
  template_name?: string;
  template_alias?: string | null;
  /** True when the template was deleted: sends fail until another template is chosen. */
  template_deleted?: boolean;
  /** The template version sends use now (null when it has no published version). */
  published_version_id?: string | null;
  published_version_number?: number | null;
  from: string;
  subject: string;
  preview_text: string | null;
  reply_to: string[];
  /** Off by default. A send's own `trackOpens` overrides it. */
  track_opens: boolean;
  /** Off by default. A send's own `trackClicks` overrides it. */
  track_clicks: boolean;
  created_via: 'api' | 'dashboard';
  created_at: string;
  updated_at: string;
  /** The published version's variables (`get` only): what a send's `variables` fills. */
  variables?: TransactionalEmailVariable[];
}

export interface TransactionalEmailVariable {
  key: string;
  type: string;
  fallback_value: unknown;
}

export interface CreateTransactionalEmailOptions {
  /** Your name for it, 1 to 255 characters. */
  name: string;
  /** The published template (id or alias) whose published version is the content. */
  templateId: string;
  /** Sender on a verified sending domain, `"Name <user@domain>"` or an address. */
  from: string;
  /** Subject line; may use the template's variables (`{{CODE}}`). */
  subject: string;
  previewText?: string | null;
  replyTo?: string | string[] | null;
  /** Default `false`. */
  trackOpens?: boolean;
  /** Default `false`. */
  trackClicks?: boolean;
}

export interface CreateTransactionalEmailRequestOptions
  extends PostOptions,
    IdempotentRequest {}

/** The fields to change; the ones left out are kept. */
export interface UpdateTransactionalEmailOptions {
  name?: string;
  templateId?: string;
  from?: string;
  subject?: string;
  /** `null` or `''` removes it. */
  previewText?: string | null;
  /** `null` or `[]` removes them. */
  replyTo?: string | string[] | null;
  trackOpens?: boolean;
  trackClicks?: boolean;
  /**
   * The `updated_at` you read. When the transactional email changed since,
   * the update fails with 409 `conflict` instead of overwriting the change.
   */
  expectedUpdatedAt?: string;
}

export type ListTransactionalEmailsOptions = PaginationOptions & {
  /** Matches the name and subject (case-insensitive). */
  search?: string;
  /** Only the transactional emails of this template (id or alias). */
  templateId?: string;
};

export interface SendTestTransactionalEmailOptions {
  /** 1 to 5 addresses. */
  to: string | string[];
  variables?: Record<string, unknown>;
}

export interface TransactionalEmailStatsOptions {
  /** A date (`2026-11-01`) or an ISO 8601 time; at most 90 days before `to`. */
  from?: string;
  to?: string;
  /** IANA time zone (default `UTC`). */
  timezone?: string;
  /** A template version id, or a version number of the current template. */
  version?: string | number;
  granularity?: 'daily' | 'hourly';
}

export interface TransactionalEmailStats {
  object: 'transactional_email_stats';
  transactional_id: string;
  template_id: string;
  range: { from: string; to: string; timezone: string; granularity: string };
  version: Record<string, unknown> | null;
  live_version: Record<string, unknown> | null;
  totals: Record<string, number>;
  daily: Record<string, unknown>[];
  per_version: Record<string, unknown>[];
  top_links: { url: string; clicks: number; unique_clicks: number }[];
}

export type TransactionalEmailResponse = Response<TransactionalEmail>;
export type ListTransactionalEmailsResponseSuccess = {
  object: 'list';
  has_more: boolean;
  data: TransactionalEmail[];
};
export type ListTransactionalEmailsResponse =
  Response<ListTransactionalEmailsResponseSuccess>;
export type RemoveTransactionalEmailResponseSuccess = {
  object: 'transactional_email';
  id: string;
  deleted: boolean;
};
export type RemoveTransactionalEmailResponse =
  Response<RemoveTransactionalEmailResponseSuccess>;
export type SendTestTransactionalEmailResponse = Response<{ id: string }>;
export type TransactionalEmailStatsResponse = Response<TransactionalEmailStats>;
