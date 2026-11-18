import type { RequestOptions } from '../../common/interfaces/request-options.interface';
import type { Sendio } from '../../sendio';
import type {
  BatchAddSuppressionsOptions,
  BatchAddSuppressionsResponse,
  BatchAddSuppressionsResponseSuccess,
  BatchRemoveSuppressionsOptions,
  BatchRemoveSuppressionsResponse,
  BatchRemoveSuppressionsResponseSuccess,
} from './interfaces';

export class Batch {
  constructor(private readonly sendio: Sendio) {}

  async add(
    options: BatchAddSuppressionsOptions,
    requestOptions: RequestOptions = {},
  ): Promise<BatchAddSuppressionsResponse> {
    return this.sendio.post<BatchAddSuppressionsResponseSuccess>(
      '/suppressions/batch/add',
      options,
      requestOptions,
    );
  }

  async remove(
    options: BatchRemoveSuppressionsOptions,
    requestOptions: RequestOptions = {},
  ): Promise<BatchRemoveSuppressionsResponse> {
    return this.sendio.post<BatchRemoveSuppressionsResponseSuccess>(
      '/suppressions/batch/remove',
      options,
      requestOptions,
    );
  }
}
