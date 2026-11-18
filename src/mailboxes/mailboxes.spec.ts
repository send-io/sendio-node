import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';
import createFetchMock from 'vitest-fetch-mock';
import type { ErrorResponse } from '../interfaces';
import { Sendio } from '../sendio';
import { mockSuccessResponse } from '../test-utils/mock-fetch';
import type { CreateMailboxResponseSuccess } from './interfaces/create-mailbox-options.interface';
import type { ListMailboxesResponseSuccess } from './interfaces/list-mailboxes.interface';
import type { Mailbox, MailboxCredentials } from './interfaces/mailbox';
import type { RemoveMailboxResponseSuccess } from './interfaces/remove-mailbox.interface';
import type { ResetMailboxPasswordResponseSuccess } from './interfaces/reset-mailbox-password.interface';

const fetchMocker = createFetchMock(vi);
fetchMocker.enableMocks();

const id = 'b6d24b8e-af0b-4c3c-be0c-359bbd97381e';

const mailbox: Mailbox = {
  object: 'mailbox',
  id,
  address: 'ada@example.com',
  kind: 'normal',
  agent_inbox_id: null,
  imap_smtp: 'ready',
  domain_id: '4dd369bc-aa82-4ff3-97de-514ae3000ee0',
  domain: 'example.com',
  warmup_enabled: true,
  warmup_changed_at: null,
  created_at: '2026-10-01T10:00:00.000Z',
  sent: 12,
  sent_total: 40,
  delivered: 11,
  bounced: 1,
  complained: 0,
  last_sent_at: '2026-10-20T08:30:00.000Z',
  health: 'healthy',
  can_send: true,
  send_reason: null,
};

const credentials: MailboxCredentials = {
  username: 'ada@example.com',
  password: 'mx_mailbox_secret',
  imap: { host: 'imap.send.io', port: 993, security: 'ssl' },
  smtp: { host: 'smtp.send.io', port: 587, security: 'starttls' },
};

function lastCall() {
  const [url, init] = fetchMock.mock.calls[fetchMock.mock.calls.length - 1];
  return { url, init: init as RequestInit };
}

describe('Mailboxes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    fetchMock.resetMocks();
  });

  afterAll(() => fetchMocker.disableMocks());

  describe('list', () => {
    it('lists mailboxes', async () => {
      const response: ListMailboxesResponseSuccess = {
        object: 'list',
        has_more: false,
        data: [{ ...mailbox, pool: 'free', receive_only: true }],
      };
      mockSuccessResponse(response, { headers: {} });

      const sendio = new Sendio('mx_zKa4RCko_Lhm9ost2YjNCctnPjbLw8Nop');
      const result = await sendio.mailboxes.list();

      expect(result).toEqual({
        data: response,
        error: null,
        headers: { 'content-type': 'application/json' },
      });
      expect(result.data?.data[0].pool).toBe('free');
      expect(fetchMock).toHaveBeenCalledWith(
        'https://api.send.io/mailboxes',
        expect.objectContaining({
          method: 'GET',
          headers: expect.any(Headers),
        }),
      );
    });
  });

  describe('create', () => {
    it('creates a mailbox from an address and returns credentials', async () => {
      const response: CreateMailboxResponseSuccess = {
        ...mailbox,
        credentials,
      };
      mockSuccessResponse(response, { status: 201, headers: {} });

      const sendio = new Sendio('mx_zKa4RCko_Lhm9ost2YjNCctnPjbLw8Nop');
      const result = await sendio.mailboxes.create({
        address: 'ada@example.com',
      });

      expect(result.error).toBeNull();
      expect(result.data?.credentials).toEqual(credentials);
      expect(result.data?.credentials?.smtp.port).toBe(587);

      const { url, init } = lastCall();
      expect(url).toBe('https://api.send.io/mailboxes');
      expect(init.method).toBe('POST');
      expect(JSON.parse(init.body as string)).toEqual({
        address: 'ada@example.com',
      });
    });

    it('sends local_part and domain_id', async () => {
      mockSuccessResponse(mailbox, { status: 201, headers: {} });

      const sendio = new Sendio('mx_zKa4RCko_Lhm9ost2YjNCctnPjbLw8Nop');
      await sendio.mailboxes.create({
        localPart: 'ada',
        domainId: '4dd369bc-aa82-4ff3-97de-514ae3000ee0',
      });

      expect(JSON.parse(lastCall().init.body as string)).toEqual({
        local_part: 'ada',
        domain_id: '4dd369bc-aa82-4ff3-97de-514ae3000ee0',
      });
    });

    it('sends username, org and display_name for a free mailbox', async () => {
      mockSuccessResponse(
        { ...mailbox, domain_id: null, domain: null },
        { status: 201, headers: {} },
      );

      const sendio = new Sendio('mx_zKa4RCko_Lhm9ost2YjNCctnPjbLw8Nop');
      await sendio.mailboxes.create({
        username: 'ada',
        org: 'acme',
        displayName: 'Ada Lovelace',
      });

      expect(JSON.parse(lastCall().init.body as string)).toEqual({
        username: 'ada',
        org: 'acme',
        display_name: 'Ada Lovelace',
      });
    });

    it('returns the error when the address exists', async () => {
      const response = {
        name: 'conflict',
        message: 'Mailbox already exists.',
        statusCode: 409,
      } as unknown as ErrorResponse;
      fetchMock.mockOnce(JSON.stringify(response), {
        status: 409,
        headers: { 'content-type': 'application/json' },
      });

      const sendio = new Sendio('mx_zKa4RCko_Lhm9ost2YjNCctnPjbLw8Nop');
      const result = await sendio.mailboxes.create({
        address: 'ada@example.com',
      });

      expect(result.data).toBeNull();
      expect(result.error).toEqual(response);
    });
  });

  describe('update', () => {
    it.each([true, false])('sends warmup_enabled %s', async (warmupEnabled) => {
      mockSuccessResponse(
        { ...mailbox, warmup_enabled: warmupEnabled },
        { headers: {} },
      );

      const sendio = new Sendio('mx_zKa4RCko_Lhm9ost2YjNCctnPjbLw8Nop');
      const result = await sendio.mailboxes.update(id, { warmupEnabled });

      expect(result.data?.warmup_enabled).toBe(warmupEnabled);

      const { url, init } = lastCall();
      expect(url).toBe(`https://api.send.io/mailboxes/${id}`);
      expect(init.method).toBe('PATCH');
      expect(JSON.parse(init.body as string)).toEqual({
        warmup_enabled: warmupEnabled,
      });
    });
  });

  describe('resetPassword', () => {
    it('resets the password and returns new credentials', async () => {
      const response: ResetMailboxPasswordResponseSuccess = {
        object: 'mailbox_credentials',
        id,
        address: 'ada@example.com',
        credentials,
        note: 'The old password no longer works.',
      };
      mockSuccessResponse(response, { headers: {} });

      const sendio = new Sendio('mx_zKa4RCko_Lhm9ost2YjNCctnPjbLw8Nop');
      const result = await sendio.mailboxes.resetPassword(id);

      expect(result).toEqual({
        data: response,
        error: null,
        headers: { 'content-type': 'application/json' },
      });

      const { url, init } = lastCall();
      expect(url).toBe(`https://api.send.io/mailboxes/${id}/password`);
      expect(init.method).toBe('POST');
      expect(init.body).toBeUndefined();
    });
  });

  describe('remove', () => {
    it('removes a mailbox', async () => {
      const response: RemoveMailboxResponseSuccess = {
        object: 'mailbox',
        id,
        deleted: true,
      };
      mockSuccessResponse(response, { headers: {} });

      const sendio = new Sendio('mx_zKa4RCko_Lhm9ost2YjNCctnPjbLw8Nop');
      const result = await sendio.mailboxes.remove(id);

      expect(result.data).toEqual(response);
      expect(fetchMock).toHaveBeenCalledWith(
        `https://api.send.io/mailboxes/${id}`,
        expect.objectContaining({
          method: 'DELETE',
          headers: expect.any(Headers),
        }),
      );
    });
  });
});
