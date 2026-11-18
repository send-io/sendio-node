import type { PaginationOptions } from '../../common/interfaces';
import type { Response } from '../../interfaces';
import type { Topic } from './topic';

export type ListTopicsOptions = PaginationOptions;

export interface ListTopicsResponseSuccess {
  object: 'list';
  data: Topic[];
  has_more: boolean;
}

export type ListTopicsResponse = Response<ListTopicsResponseSuccess>;
