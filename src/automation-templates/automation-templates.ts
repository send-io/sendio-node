import type { RequestOptions } from '../common/interfaces/request-options.interface';
import type { Sendio } from '../sendio';
import type {
  GetAutomationTemplateResponse,
  GetAutomationTemplateResponseSuccess,
} from './interfaces/get-automation-template.interface';
import type {
  ListAutomationTemplatesOptions,
  ListAutomationTemplatesResponse,
  ListAutomationTemplatesResponseSuccess,
} from './interfaces/list-automation-templates.interface';

export class AutomationTemplates {
  constructor(private readonly sendio: Sendio) {}

  async list(
    options: ListAutomationTemplatesOptions = {},
    requestOptions: RequestOptions = {},
  ): Promise<ListAutomationTemplatesResponse> {
    const url = options.category
      ? `/automation-templates?category=${encodeURIComponent(options.category)}`
      : '/automation-templates';

    const data = await this.sendio.get<ListAutomationTemplatesResponseSuccess>(
      url,
      requestOptions,
    );
    return data;
  }

  async get(
    slug: string,
    requestOptions: RequestOptions = {},
  ): Promise<GetAutomationTemplateResponse> {
    const data = await this.sendio.get<GetAutomationTemplateResponseSuccess>(
      `/automation-templates/${encodeURIComponent(slug)}`,
      requestOptions,
    );
    return data;
  }
}
