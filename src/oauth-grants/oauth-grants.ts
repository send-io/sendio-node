import type { RequestOptions } from '../common/interfaces/request-options.interface';
import { buildPaginationUrl } from '../common/utils/build-pagination-query';
import type { Sendio } from '../sendio';
import type {
  ListOAuthGrantsOptions,
  ListOAuthGrantsResponse,
  ListOAuthGrantsResponseSuccess,
} from './interfaces/list-oauth-grants.interface';
import type {
  RevokeOAuthGrantResponse,
  RevokeOAuthGrantResponseSuccess,
} from './interfaces/revoke-oauth-grant.interface';

export class OAuthGrants {
  constructor(private readonly sendio: Sendio) {}

  async list(
    options: ListOAuthGrantsOptions = {},
    requestOptions: RequestOptions = {},
  ): Promise<ListOAuthGrantsResponse> {
    const url = buildPaginationUrl('/oauth/grants', options);

    const data = await this.sendio.get<ListOAuthGrantsResponseSuccess>(
      url,
      requestOptions,
    );
    return data;
  }

  async revoke(
    id: string,
    requestOptions: RequestOptions = {},
  ): Promise<RevokeOAuthGrantResponse> {
    const data = await this.sendio.delete<RevokeOAuthGrantResponseSuccess>(
      `/oauth/grants/${id}`,
      undefined,
      requestOptions,
    );
    return data;
  }
}
