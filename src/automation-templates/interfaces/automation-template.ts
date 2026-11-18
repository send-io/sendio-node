import type {
  AutomationConnectionType,
  AutomationResponseStep,
  AutomationStepType,
} from '../../automations/interfaces/automation-step.interface';

export type AutomationTemplateCategory =
  | 'onboarding'
  | 'billing'
  | 'ecommerce'
  | 'engagement'
  | 'lead_capture'
  | 'appointments'
  | 'events'
  | 'education'
  | 'account'
  | 'nonprofit'
  | 'internal';

export type AutomationTemplateKind = 'marketing' | 'transactional';

export interface AutomationTemplateEvent {
  /** The event's ref in the template, the key used in `createFromTemplate({ events })`. */
  ref: string;
  /** The event's default name. */
  name: string;
  purpose: string;
  /** Whether your team already has an event with this name. */
  exists: boolean;
}

export interface AutomationTemplateStep {
  key: string;
  type: AutomationStepType;
}

export interface AutomationTemplateConnection {
  from: string;
  to: string;
  type: AutomationConnectionType;
}

export interface AutomationTemplate {
  object: 'automation_template';
  slug: string;
  version: number;
  name: string;
  category: AutomationTemplateCategory;
  kind: AutomationTemplateKind;
  outcome: string;
  events: AutomationTemplateEvent[];
  email_count: number;
  steps: AutomationTemplateStep[];
  connections: AutomationTemplateConnection[];
  /** How many of your automations were made from this template. */
  in_use_count: number;
}

export interface AutomationTemplateEventDetail extends AutomationTemplateEvent {
  /** Field name to type. */
  schema: Record<string, string>;
  /** The fields setup adds to your existing event (all of them for a new one). */
  adds: Record<string, string>;
}

export interface AutomationTemplateEmail {
  ref: string;
  step_label: string;
  /** The key of the step that sends this email. */
  step_key: string;
  subject: string;
  preview: string;
  /** Filled with your team's brand, as setup will create it. */
  html: string;
  text: string;
  variables: Record<string, unknown>[];
}

export interface AutomationTemplateParam {
  /** The key used in `createFromTemplate({ params })`. */
  ref: string;
  /** A duration has a default; a url has none and must be given at setup. */
  type: 'duration' | 'url';
  label: string;
  default: string;
  placeholder?: string;
  hint?: string;
}

export interface AutomationTemplateDetail
  extends Omit<AutomationTemplate, 'events' | 'steps'> {
  how_it_works: string;
  events: AutomationTemplateEventDetail[];
  emails: AutomationTemplateEmail[];
  params: AutomationTemplateParam[];
  steps: AutomationResponseStep[];
  settings?: Record<string, unknown>;
}
