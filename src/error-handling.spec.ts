import createFetchMock from 'vitest-fetch-mock';
import type { ErrorResponse } from './interfaces';
import { Sendio } from './sendio';

const fetchMocker = createFetchMock(vi);
fetchMocker.enableMocks();

const KEY = 'mx_zKa4RCko_Lhm9ost2YjNCctnPjbLw8Nop';
const SEND = {
  from: 'Acme <onboarding@yourdomain.com>',
  to: 'delivered@send.io',
  subject: 'Hi',
  html: '<p>Hi</p>',
};

function mockError(body: ErrorResponse) {
  fetchMock.mockOnce(JSON.stringify(body), {
    status: body.statusCode ?? 500,
    headers: { 'content-type': 'application/json' },
  });
}

describe('API errors', () => {
  afterEach(() => {
    fetchMock.resetMocks();
    vi.restoreAllMocks();
  });
  afterAll(() => fetchMocker.disableMocks());

  // SENDIO-414: a send refused because the balance ran out answers 402
  // insufficient_credits, returned by name in { error }.
  it('returns 402 insufficient_credits by name', async () => {
    mockError({
      statusCode: 402,
      name: 'insufficient_credits',
      message: 'Your credit balance is too low to send this email.',
    });
    const sendio = new Sendio(KEY);

    const { data, error } = await sendio.emails.send(SEND);

    expect(data).toBeNull();
    expect(error).toEqual({
      statusCode: 402,
      name: 'insufficient_credits',
      message: 'Your credit balance is too low to send this email.',
    });
  });

  it('returns the subaccount quota names', async () => {
    mockError({
      statusCode: 429,
      name: 'subaccount_daily_quota_exceeded',
      message: 'This subaccount has reached its daily sending limit.',
    });
    const sendio = new Sendio(KEY);

    const { error } = await sendio.emails.send(SEND);

    expect(error?.name).toBe('subaccount_daily_quota_exceeded');
  });

  // SENDIO-419: a handled error is returned, not printed.
  it('prints nothing to stderr for a handled 4xx', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    mockError({
      statusCode: 422,
      name: 'validation_error',
      message: 'The `to` field is required.',
    });
    const sendio = new Sendio(KEY);

    const { error } = await sendio.emails.send(SEND);

    expect(error?.name).toBe('validation_error');
    expect(spy).not.toHaveBeenCalled();
  });

  it('logs API errors when debug is on', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    mockError({
      statusCode: 404,
      name: 'not_found',
      message: 'Email not found.',
    });
    const sendio = new Sendio(KEY, { debug: true });

    await sendio.emails.get('4ef9a417-02e9-4d39-ad75-9611e0fcc33c');

    expect(spy).toHaveBeenCalledOnce();
    expect(spy.mock.calls[0][0]).toBe('[send.io API Error]:');
  });
});
