import type { RequestOptions } from '../common/interfaces/request-options.interface';
import { buildPaginationUrl } from '../common/utils/build-pagination-query';
import type { Sendio } from '../sendio';
import type {
  CreateApiKeyOptions,
  CreateApiKeyRequestOptions,
  CreateApiKeyResponse,
  CreateApiKeyResponseSuccess,
} from './interfaces/create-api-key-options.interface';
import type {
  ListApiKeysOptions,
  ListApiKeysResponse,
  ListApiKeysResponseSuccess,
} from './interfaces/list-api-keys.interface';
import type {
  RemoveApiKeyResponse,
  RemoveApiKeyResponseSuccess,
} from './interfaces/remove-api-keys.interface';
import type {
  UpdateApiKeyOptions,
  UpdateApiKeyResponse,
  UpdateApiKeyResponseSuccess,
} from './interfaces/update-api-key-options.interface';

export class ApiKeys {
  constructor(private readonly sendio: Sendio) {}

  async create(
    payload: CreateApiKeyOptions,
    requestOptions: CreateApiKeyRequestOptions = {},
  ): Promise<CreateApiKeyResponse> {
    const data = await this.sendio.post<CreateApiKeyResponseSuccess>(
      '/api-keys',
      payload,
      requestOptions,
    );

    return data;
  }

  async list(
    options: ListApiKeysOptions = {},
    requestOptions: RequestOptions = {},
  ): Promise<ListApiKeysResponse> {
    const url = buildPaginationUrl('/api-keys', options);

    const data = await this.sendio.get<ListApiKeysResponseSuccess>(
      url,
      requestOptions,
    );
    return data;
  }

  async update(
    id: string,
    payload: UpdateApiKeyOptions,
    requestOptions: RequestOptions = {},
  ): Promise<UpdateApiKeyResponse> {
    const data = await this.sendio.patch<UpdateApiKeyResponseSuccess>(
      `/api-keys/${id}`,
      payload,
      requestOptions,
    );
    return data;
  }

  async remove(
    id: string,
    requestOptions: RequestOptions = {},
  ): Promise<RemoveApiKeyResponse> {
    const data = await this.sendio.delete<RemoveApiKeyResponseSuccess>(
      `/api-keys/${id}`,
      undefined,
      requestOptions,
    );
    return data;
  }
}
