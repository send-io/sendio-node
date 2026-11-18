import { buildPaginationUrl } from '../../common/utils/build-pagination-query';
import type { Sendio } from '../../sendio';
import type {
  ListContactTopicsOptions,
  ListContactTopicsRequestOptions,
  ListContactTopicsResponse,
  ListContactTopicsResponseSuccess,
} from './interfaces/list-contact-topics.interface';
import type {
  UpdateContactTopicsOptions,
  UpdateContactTopicsRequestOptions,
  UpdateContactTopicsResponse,
  UpdateContactTopicsResponseSuccess,
} from './interfaces/update-contact-topics.interface';

export class ContactTopics {
  constructor(private readonly sendio: Sendio) {}

  async update(
    payload: UpdateContactTopicsOptions,
    requestOptions: UpdateContactTopicsRequestOptions = {},
  ): Promise<UpdateContactTopicsResponse> {
    if (!payload.id && !payload.email) {
      return {
        data: null,
        headers: null,
        error: {
          message: 'Missing `id` or `email` field.',
          statusCode: null,
          name: 'missing_required_field',
        },
      };
    }

    const identifier = payload.email ? payload.email : payload.id;
    return this.sendio.patch<UpdateContactTopicsResponseSuccess>(
      `/contacts/${identifier}/topics`,
      payload.topics,
      requestOptions,
    );
  }

  async list(
    options: ListContactTopicsOptions,
    requestOptions: ListContactTopicsRequestOptions = {},
  ): Promise<ListContactTopicsResponse> {
    if (!options.id && !options.email) {
      return {
        data: null,
        headers: null,
        error: {
          message: 'Missing `id` or `email` field.',
          statusCode: null,
          name: 'missing_required_field',
        },
      };
    }

    const identifier = options.email ? options.email : options.id;
    const url = buildPaginationUrl(`/contacts/${identifier}/topics`, options);

    return this.sendio.get<ListContactTopicsResponseSuccess>(
      url,
      requestOptions,
    );
  }
}
