import type { IdempotentRequest } from '../../common/interfaces/idempotent-request.interface';
import type { RequestOptions } from '../../common/interfaces/request-options.interface';
import type { Response } from '../../interfaces';
import type { Automation } from './automation';
import type {
  AutomationResponseConnection,
  AutomationResponseStep,
} from './automation-step.interface';

export interface CreateAutomationFromTemplateEvent {
  /** `create` (the default) uses or creates the event; `existing` maps the ref to an event your app already sends. */
  mode?: 'create' | 'existing';
  name: string;
}

export interface CreateAutomationFromTemplateOptions {
  slug: string;
  /** The version you reviewed. A newer one returns 409 `template_version_changed`. */
  version?: number;
  /** 1 to 120 characters. Default: the template's name. */
  name?: string;
  /** Per event ref. */
  events?: Record<string, CreateAutomationFromTemplateEvent>;
  sender: {
    /** Must be on one of your verified sending domains. */
    from: string;
    replyTo?: string | string[];
  };
  /** Required for a marketing template: the topic contacts can unsubscribe from. */
  topicId?: string;
  /** Per param ref: a duration such as `"24 hours"`, or a full http(s) url. */
  params?: Record<string, string>;
}

export interface CreateAutomationFromTemplateRequestOptions
  extends RequestOptions,
    IdempotentRequest {}

export interface AutomationEmail {
  object: 'automation_email';
  id: string;
  name: string;
  status: string;
  step_key: string | null;
  subject?: string | null;
  preview_text?: string | null;
  from?: string | null;
  reply_to?: string[] | null;
  updated_at?: string | null;
  has_unpublished_versions?: boolean;
}

export interface CreateAutomationFromTemplateResponseSuccess
  extends Partial<Omit<Automation, 'id' | 'status'>> {
  object: 'automation';
  id: string;
  /** Always created disabled. */
  status: 'disabled';
  source_template: { slug: string; version: number; name: string };
  emails: AutomationEmail[];
  events_created: string[];
  events_reused: string[];
  steps?: AutomationResponseStep[];
  connections?: AutomationResponseConnection[];
}

export type CreateAutomationFromTemplateResponse =
  Response<CreateAutomationFromTemplateResponseSuccess>;
