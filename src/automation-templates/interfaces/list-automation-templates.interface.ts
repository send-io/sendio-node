import type { Response } from '../../interfaces';
import type {
  AutomationTemplate,
  AutomationTemplateCategory,
} from './automation-template';

export interface ListAutomationTemplatesOptions {
  category?: AutomationTemplateCategory;
}

export interface ListAutomationTemplatesResponseSuccess {
  object: 'list';
  categories: AutomationTemplateCategory[];
  data: AutomationTemplate[];
}

export type ListAutomationTemplatesResponse =
  Response<ListAutomationTemplatesResponseSuccess>;
