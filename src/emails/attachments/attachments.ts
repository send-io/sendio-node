import type { RequestOptions } from '../../common/interfaces/request-options.interface';
import { buildPaginationUrl } from '../../common/utils/build-pagination-query';
import type { Sendio } from '../../sendio';
import type {
  GetAttachmentOptions,
  GetAttachmentResponse,
  GetAttachmentResponseSuccess,
  ListAttachmentsOptions,
  ListAttachmentsResponse,
  ListAttachmentsResponseSuccess,
} from './interfaces';

export class Attachments {
  constructor(private readonly sendio: Sendio) {}

  async get(
    options: GetAttachmentOptions,
    requestOptions: RequestOptions = {},
  ): Promise<GetAttachmentResponse> {
    const { emailId, id } = options;

    const data = await this.sendio.get<GetAttachmentResponseSuccess>(
      `/emails/${emailId}/attachments/${id}`,
      requestOptions,
    );

    return data;
  }

  async list(
    options: ListAttachmentsOptions,
    requestOptions: RequestOptions = {},
  ): Promise<ListAttachmentsResponse> {
    const { emailId } = options;

    const url = buildPaginationUrl(`/emails/${emailId}/attachments`, options);

    const data = await this.sendio.get<ListAttachmentsResponseSuccess>(
      url,
      requestOptions,
    );

    return data;
  }
}
