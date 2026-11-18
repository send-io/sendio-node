import type { Response } from '../../interfaces';
import type { AutomationTemplateDetail } from './automation-template';

export type GetAutomationTemplateResponseSuccess = AutomationTemplateDetail;

export type GetAutomationTemplateResponse =
  Response<GetAutomationTemplateResponseSuccess>;
