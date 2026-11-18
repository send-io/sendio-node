import type { PostOptions } from '../../common/interfaces';
import type { Response } from '../../interfaces';
import type {
  Domain,
  DomainCapabilities,
  DomainRecords,
  DomainRegion,
} from './domain';

export interface CreateDomainOptions {
  name: string;
  region?: DomainRegion;
  customReturnPath?: string;
  /**
   * What the domain is used for. Set `receiving: 'enabled'` to also accept
   * inbound email for the domain (the response then includes a `Receiving`
   * MX record to publish). Sending is always on: `sending: 'disabled'` is
   * rejected with a 422.
   */
  capabilities?: Partial<DomainCapabilities>;
  openTracking?: boolean;
  clickTracking?: boolean;
  tls?: 'enforced' | 'opportunistic';
  trackingSubdomain?: string;
}

export interface CreateDomainRequestOptions extends PostOptions {}

export interface CreateDomainResponseSuccess
  extends Pick<
    Domain,
    | 'name'
    | 'id'
    | 'status'
    | 'created_at'
    | 'region'
    | 'open_tracking'
    | 'click_tracking'
    | 'tracking_subdomain'
    | 'dns_zone'
  > {
  records: DomainRecords[];
  capabilities: DomainCapabilities;
}

export type CreateDomainResponse = Response<CreateDomainResponseSuccess>;
