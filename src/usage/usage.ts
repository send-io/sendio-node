import type { RequestOptions } from '../common/interfaces/request-options.interface';
import type { Sendio } from '../sendio';
import type { GetUsageResponse, GetUsageResponseSuccess } from './interfaces';

export class Usage {
  constructor(private readonly sendio: Sendio) {}

  async get(requestOptions: RequestOptions = {}): Promise<GetUsageResponse> {
    const data = await this.sendio.get<GetUsageResponseSuccess>(
      '/usage',
      requestOptions,
    );
    return data;
  }
}
