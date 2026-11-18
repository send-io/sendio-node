import type { RequestOptions } from '../common/interfaces/request-options.interface';
import { buildPaginationUrl } from '../common/utils/build-pagination-query';
import { parseEventToApiOptions } from '../common/utils/parse-automation-to-api-options';
import type { Sendio } from '../sendio';
import type {
  CreateEventOptions,
  CreateEventResponse,
  CreateEventResponseSuccess,
} from './interfaces/create-event.interface';
import type {
  GetEventResponse,
  GetEventResponseSuccess,
} from './interfaces/get-event.interface';
import type {
  ListEventsOptions,
  ListEventsResponse,
  ListEventsResponseSuccess,
} from './interfaces/list-events.interface';
import type {
  RemoveEventResponse,
  RemoveEventResponseSuccess,
} from './interfaces/remove-event.interface';
import type {
  SendEventOptions,
  SendEventResponse,
  SendEventResponseSuccess,
} from './interfaces/send-event.interface';
import type {
  UpdateEventOptions,
  UpdateEventResponse,
  UpdateEventResponseSuccess,
} from './interfaces/update-event.interface';

export class Events {
  constructor(private readonly sendio: Sendio) {}

  async send(
    payload: SendEventOptions,
    requestOptions: RequestOptions = {},
  ): Promise<SendEventResponse> {
    const data = await this.sendio.post<SendEventResponseSuccess>(
      '/events/send',
      parseEventToApiOptions(payload),
      requestOptions,
    );

    return data;
  }

  async create(
    payload: CreateEventOptions,
    requestOptions: RequestOptions = {},
  ): Promise<CreateEventResponse> {
    const data = await this.sendio.post<CreateEventResponseSuccess>(
      '/events',
      payload,
      requestOptions,
    );

    return data;
  }

  async get(
    identifier: string,
    requestOptions: RequestOptions = {},
  ): Promise<GetEventResponse> {
    const data = await this.sendio.get<GetEventResponseSuccess>(
      `/events/${encodeURIComponent(identifier)}`,
      requestOptions,
    );
    return data;
  }

  async list(
    options: ListEventsOptions = {},
    requestOptions: RequestOptions = {},
  ): Promise<ListEventsResponse> {
    const url = buildPaginationUrl('/events', options);
    const data = await this.sendio.get<ListEventsResponseSuccess>(
      url,
      requestOptions,
    );
    return data;
  }

  async update(
    identifier: string,
    payload: UpdateEventOptions,
    requestOptions: RequestOptions = {},
  ): Promise<UpdateEventResponse> {
    const data = await this.sendio.patch<UpdateEventResponseSuccess>(
      `/events/${encodeURIComponent(identifier)}`,
      payload,
      requestOptions,
    );
    return data;
  }

  async remove(
    identifier: string,
    requestOptions: RequestOptions = {},
  ): Promise<RemoveEventResponse> {
    const data = await this.sendio.delete<RemoveEventResponseSuccess>(
      `/events/${encodeURIComponent(identifier)}`,
      undefined,
      requestOptions,
    );
    return data;
  }
}
