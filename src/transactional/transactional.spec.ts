import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';
import createFetchMock from 'vitest-fetch-mock';
import { Sendio } from '../sendio';
import { mockSuccessResponse } from '../test-utils/mock-fetch';
import type { TransactionalEmail } from './interfaces/transactional-email';

const fetchMocker = createFetchMock(vi);
fetchMocker.enableMocks();

const id = 'tx_2hX9Yq1bVv0kq3W4m8sZJt1aB7c';

const tx: TransactionalEmail = {
  object: 'transactional_email',
  id,
  name: 'Sign-in code',
  template_id: '34a080c9-b17d-4187-ad80-5af20266e535',
  template_name: 'Sign-in code',
  template_alias: 'signin',
  template_deleted: false,
  published_version_id: '6a1f4c2e-8b3d-4e5f-9a7b-0c1d2e3f4a5b',
  published_version_number: 3,
  from: 'Acme <security@acme.com>',
  subject: 'Your code is {{CODE}}',
  preview_text: null,
  reply_to: [],
  track_opens: false,
  track_clicks: false,
  created_via: 'api',
  created_at: '2026-11-16T09:00:00Z',
  updated_at: '2026-11-16T09:05:00Z',
};

function lastCall() {
  const [url, init] = fetchMock.mock.calls[fetchMock.mock.calls.length - 1];
  return { url, init: init as RequestInit };
}

const sendio = () => new Sendio('mx_zKa4RCko_Lhm9ost2YjNCctnPjbLw8Nop');

describe('Transactional', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    fetchMock.resetMocks();
  });

  afterAll(() => fetchMocker.disableMocks());

  it('creates one with snake_case fields and an idempotency key', async () => {
    mockSuccessResponse(tx, { headers: {} });
    const result = await sendio().transactional.create(
      {
        name: 'Sign-in code',
        templateId: 'signin',
        from: 'Acme <security@acme.com>',
        subject: 'Your code is {{CODE}}',
        replyTo: 'help@acme.com',
        trackClicks: true,
      },
      { idempotencyKey: 'tx-1' },
    );
    expect(result.data?.id).toBe(id);
    const { url, init } = lastCall();
    expect(url).toBe('https://api.send.io/transactional');
    expect(init.method).toBe('POST');
    expect((init.headers as Headers).get('Idempotency-Key')).toBe('tx-1');
    expect(JSON.parse(init.body as string)).toEqual({
      name: 'Sign-in code',
      template_id: 'signin',
      from: 'Acme <security@acme.com>',
      subject: 'Your code is {{CODE}}',
      reply_to: 'help@acme.com',
      track_clicks: true,
    });
  });

  it('lists with search, template and paging', async () => {
    mockSuccessResponse(
      { object: 'list', has_more: false, data: [tx] },
      { headers: {} },
    );
    await sendio().transactional.list({
      limit: 5,
      after: id,
      search: 'code',
      templateId: 'signin',
    });
    expect(lastCall().url).toBe(
      `https://api.send.io/transactional?limit=5&after=${id}&search=code&template_id=signin`,
    );
  });

  it('updates only what is given, with expected_updated_at', async () => {
    mockSuccessResponse(tx, { headers: {} });
    await sendio().transactional.update(id, {
      subject: 'New',
      previewText: null,
      trackOpens: false,
      expectedUpdatedAt: tx.updated_at,
    });
    const { url, init } = lastCall();
    expect(url).toBe(`https://api.send.io/transactional/${id}`);
    expect(init.method).toBe('PATCH');
    expect(JSON.parse(init.body as string)).toEqual({
      subject: 'New',
      preview_text: null,
      track_opens: false,
      expected_updated_at: tx.updated_at,
    });
  });

  it('gets, tests, reads stats and removes', async () => {
    const t = sendio().transactional;
    mockSuccessResponse(
      {
        ...tx,
        variables: [{ key: 'CODE', type: 'string', fallback_value: null }],
      },
      { headers: {} },
    );
    expect((await t.get(id)).data?.variables?.[0].key).toBe('CODE');

    mockSuccessResponse({ id: 'e1' }, { headers: {} });
    await t.sendTest(id, { to: 'me@acme.com', variables: { CODE: '1' } });
    expect(lastCall().url).toBe(`https://api.send.io/transactional/${id}/test`);
    expect(JSON.parse(lastCall().init.body as string)).toEqual({
      to: 'me@acme.com',
      variables: { CODE: '1' },
    });

    mockSuccessResponse(
      { object: 'transactional_email_stats', totals: { sent: 3 } },
      { headers: {} },
    );
    await t.stats(id, { granularity: 'hourly', version: 3 });
    expect(lastCall().url).toBe(
      `https://api.send.io/transactional/${id}/stats?granularity=hourly&version=3`,
    );

    mockSuccessResponse(
      { object: 'transactional_email', id, deleted: true },
      { headers: {} },
    );
    expect((await t.remove(id)).data?.deleted).toBe(true);
    expect(lastCall().init.method).toBe('DELETE');
  });

  it('sends one by id with emails.send: no from, subject or html', async () => {
    mockSuccessResponse({ id: 'e1' }, { headers: {} });
    await sendio().emails.send({
      transactionalId: id,
      to: 'ada@example.com',
      variables: { CODE: '123456' },
      trackOpens: false,
      tags: [{ name: 'priority', value: 'otp' }],
    });
    expect(JSON.parse(lastCall().init.body as string)).toEqual({
      transactional_id: id,
      to: 'ada@example.com',
      variables: { CODE: '123456' },
      track_opens: false,
      tags: [{ name: 'priority', value: 'otp' }],
    });
  });

  it('links a broadcast to a template version, or detaches it', async () => {
    const s = sendio();
    mockSuccessResponse({ id: 'b1' }, { headers: {} });
    await s.broadcasts.create({
      name: 'Codes',
      segmentId: 's1',
      templateId: 'signin',
      templateVersionId: 'v1',
    });
    expect(JSON.parse(lastCall().init.body as string)).toMatchObject({
      template_id: 'signin',
      template_version_id: 'v1',
    });
    mockSuccessResponse({ id: 'b1' }, { headers: {} });
    await s.broadcasts.update('b1', { templateId: null });
    expect(JSON.parse(lastCall().init.body as string)).toEqual({
      template_id: null,
    });
  });
});
