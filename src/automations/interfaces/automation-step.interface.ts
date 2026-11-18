export type ConditionRule =
  | {
      type: 'rule';
      field: string;
      operator: 'eq' | 'neq';
      value: string | number | boolean | null;
    }
  | {
      type: 'rule';
      field: string;
      operator: 'gt' | 'gte' | 'lt' | 'lte';
      value: number;
    }
  | {
      type: 'rule';
      field: string;
      operator: 'contains' | 'starts_with' | 'ends_with';
      value: string;
    }
  | {
      type: 'rule';
      field: string;
      operator: 'exists' | 'is_empty';
    }
  | { type: 'and'; rules: ConditionRule[] }
  | { type: 'or'; rules: ConditionRule[] };

export type TemplateVariableValue =
  | string
  | number
  | boolean
  | { var: string }
  | Record<string, string | number | boolean>
  | Array<
      string | number | boolean | Record<string, string | number | boolean>
    >;

export interface TriggerStepConfig {
  eventName: string;
}

export interface DelayStepConfig {
  duration: string;
}

export interface SendEmailStepConfig {
  template: {
    id: string;
    variables?: Record<string, TemplateVariableValue>;
  };
  subject?: string;
  from?: string;
  replyTo?: string;
}

export interface WaitForEventStepConfig {
  eventName: string;
  timeout?: string;
  filterRule?: ConditionRule;
}

export type ConditionStepConfig = ConditionRule;

export interface ContactUpdateStepConfig {
  firstName?: string | null | { var: string };
  lastName?: string | null | { var: string };
  unsubscribed?: boolean | { var: string };
  properties?: Record<
    string,
    string | number | boolean | null | { var: string }
  >;
}

export type ContactDeleteStepConfig = Record<string, never>;

export interface AddToSegmentStepConfig {
  segmentId: string;
}

export interface WebhookHeader {
  name: string;
  /** May hold `{{scope.path}}` tokens. Empty on reads of a secret header. */
  value: string;
  /**
   * Stored encrypted. Reads (AutomationResponseStep.config) return `value: ""`
   * with `has_value: true`; send `value: ""` to keep the stored value.
   */
  secret?: boolean;
}

export interface WebhookFormField {
  name: string;
  value: string;
}

/**
 * The "HTTP request" step: calls your own https URL. `url`, header values and
 * the body may hold `{{event.x}}`, `{{contact.email}}` and other tokens.
 */
export interface WebhookStepConfig {
  url: string;
  /** Default POST. A body is sent only for POST, PUT and PATCH. */
  method?: 'POST' | 'PUT' | 'PATCH' | 'GET' | 'DELETE';
  /** At most 10. */
  headers?: WebhookHeader[];
  /** Default json. */
  bodyType?: 'json' | 'form' | 'text' | 'none';
  /** json: any JSON value; form: name/value rows; text: a string. */
  body?: unknown;
  /** Follow the default connection after the last retry fails. Default false. */
  continueOnFailure?: boolean;
  /** 1 to 30. Default 10. */
  timeoutSeconds?: number;
}

export type AutomationStep =
  | { key: string; type: 'trigger'; config: TriggerStepConfig }
  | { key: string; type: 'delay'; config: DelayStepConfig }
  | { key: string; type: 'send_email'; config: SendEmailStepConfig }
  | { key: string; type: 'wait_for_event'; config: WaitForEventStepConfig }
  | { key: string; type: 'condition'; config: ConditionStepConfig }
  | { key: string; type: 'contact_update'; config: ContactUpdateStepConfig }
  | { key: string; type: 'contact_delete'; config: ContactDeleteStepConfig }
  | { key: string; type: 'add_to_segment'; config: AddToSegmentStepConfig }
  | { key: string; type: 'webhook'; config: WebhookStepConfig };

export type AutomationConnectionType =
  | 'default'
  | 'condition_met'
  | 'condition_not_met'
  | 'timeout'
  | 'event_received';

export interface AutomationConnection {
  from: string;
  to: string;
  type?: AutomationConnectionType;
}

export type AutomationStepType = AutomationStep['type'];

export interface AutomationResponseStep {
  key: string;
  type: AutomationStepType;
  config: Record<string, unknown>;
}

export interface AutomationResponseConnection {
  from: string;
  to: string;
  type: AutomationConnectionType;
}
