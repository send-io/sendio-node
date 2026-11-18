import type { RequestOptions } from '../common/interfaces/request-options.interface';
import { buildPaginationUrl } from '../common/utils/build-pagination-query';
import type { Sendio } from '../sendio';
import type {
  CreateTopicOptions,
  CreateTopicResponse,
  CreateTopicResponseSuccess,
} from './interfaces/create-topic-options.interface';
import type {
  GetTopicResponse,
  GetTopicResponseSuccess,
} from './interfaces/get-topic.interface';
import type {
  ListTopicsOptions,
  ListTopicsResponse,
  ListTopicsResponseSuccess,
} from './interfaces/list-topics.interface';
import type {
  RemoveTopicResponse,
  RemoveTopicResponseSuccess,
} from './interfaces/remove-topic.interface';
import type {
  UpdateTopicOptions,
  UpdateTopicResponse,
  UpdateTopicResponseSuccess,
} from './interfaces/update-topic.interface';

export class Topics {
  constructor(private readonly sendio: Sendio) {}

  async create(
    payload: CreateTopicOptions,
    requestOptions: RequestOptions = {},
  ): Promise<CreateTopicResponse> {
    const { defaultSubscription, ...body } = payload;

    const data = await this.sendio.post<CreateTopicResponseSuccess>(
      '/topics',
      {
        ...body,
        default_subscription: defaultSubscription,
      },
      requestOptions,
    );

    return data;
  }

  /**
   * Lists topics a page at a time (GET /topics returns 20 by default). Pass
   * `limit`, and `after` / `before` with the last / first id of a page, to
   * read the rest; `has_more` says whether there is another page.
   */
  async list(
    options?: ListTopicsOptions,
    requestOptions?: RequestOptions,
  ): Promise<ListTopicsResponse>;
  /** @deprecated Pass pagination options first: `list({}, requestOptions)`. */
  async list(requestOptions: RequestOptions): Promise<ListTopicsResponse>;
  async list(
    options: ListTopicsOptions | RequestOptions = {},
    requestOptions: RequestOptions = {},
  ): Promise<ListTopicsResponse> {
    // list(requestOptions), the only form before pagination, still works.
    const legacy = 'headers' in options || 'signal' in options;
    const pagination = legacy ? {} : (options as ListTopicsOptions);
    const data = await this.sendio.get<ListTopicsResponseSuccess>(
      buildPaginationUrl('/topics', pagination),
      legacy ? (options as RequestOptions) : requestOptions,
    );

    return data;
  }

  async get(
    id: string,
    requestOptions: RequestOptions = {},
  ): Promise<GetTopicResponse> {
    if (!id) {
      return {
        data: null,
        headers: null,
        error: {
          message: 'Missing `id` field.',
          statusCode: null,
          name: 'missing_required_field',
        },
      };
    }
    const data = await this.sendio.get<GetTopicResponseSuccess>(
      `/topics/${id}`,
      requestOptions,
    );

    return data;
  }

  async update(
    payload: UpdateTopicOptions,
    requestOptions: RequestOptions = {},
  ): Promise<UpdateTopicResponse> {
    if (!payload.id) {
      return {
        data: null,
        headers: null,
        error: {
          message: 'Missing `id` field.',
          statusCode: null,
          name: 'missing_required_field',
        },
      };
    }

    const data = await this.sendio.patch<UpdateTopicResponseSuccess>(
      `/topics/${payload.id}`,
      payload,
      requestOptions,
    );

    return data;
  }

  async remove(
    id: string,
    requestOptions: RequestOptions = {},
  ): Promise<RemoveTopicResponse> {
    if (!id) {
      return {
        data: null,
        headers: null,
        error: {
          message: 'Missing `id` field.',
          statusCode: null,
          name: 'missing_required_field',
        },
      };
    }

    const data = await this.sendio.delete<RemoveTopicResponseSuccess>(
      `/topics/${id}`,
      undefined,
      requestOptions,
    );

    return data;
  }
}
