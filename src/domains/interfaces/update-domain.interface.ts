import type { Response } from '../../interfaces';
import type { Domain, DomainCapabilities } from './domain';

export interface UpdateDomainsOptions {
  id: string;
  clickTracking?: boolean;
  openTracking?: boolean;
  tls?: 'enforced' | 'opportunistic';
  /**
   * Turn receiving on or off for the domain.
   *
   * - `receiving: 'disabled'` stops accepting email for the domain; you can
   *   then remove its MX record.
   * - `receiving: 'enabled'` asks for the domain's MX record; publish it to
   *   start receiving email.
   *
   * Sending can't be disabled: `sending: 'disabled'` is rejected with a 422.
   */
  capabilities?: Partial<DomainCapabilities>;
  trackingSubdomain?: string;
}

export type UpdateDomainsResponseSuccess = Pick<Domain, 'id'> & {
  object: 'domain';
};

export type UpdateDomainsResponse = Response<UpdateDomainsResponseSuccess>;
