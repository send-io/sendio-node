import createFetchMock from 'vitest-fetch-mock';
import { Sendio } from './sendio';
import { mockSuccessResponse } from './test-utils/mock-fetch';

const fetchMocker = createFetchMock(vi);
fetchMocker.enableMocks();

describe('Sendio', () => {
  afterEach(() => fetchMock.resetMocks());
  afterAll(() => fetchMocker.disableMocks());

  describe('constructor options', () => {
    it('uses default baseUrl and userAgent when no options provided', () => {
      const sendio = new Sendio('mx_zKa4RCko_Lhm9ost2YjNCctnPjbLw8Nop');

      expect(sendio.baseUrl).toBe('https://api.send.io');
      expect(sendio.userAgent).toMatch(/^sendio-node:/);
    });

    it('uses custom baseUrl when options.baseUrl is provided', () => {
      const customBaseUrl = 'https://eu.api.send.io';
      const sendio = new Sendio('mx_zKa4RCko_Lhm9ost2YjNCctnPjbLw8Nop', {
        baseUrl: customBaseUrl,
      });

      expect(sendio.baseUrl).toBe(customBaseUrl);
    });

    it('uses custom userAgent when options.userAgent is provided', () => {
      const customUserAgent = 'my-app/1.0';
      const sendio = new Sendio('mx_zKa4RCko_Lhm9ost2YjNCctnPjbLw8Nop', {
        userAgent: customUserAgent,
      });

      expect(sendio.userAgent).toBe(customUserAgent);
    });

    it('uses both custom baseUrl and userAgent when both provided', () => {
      const sendio = new Sendio('mx_zKa4RCko_Lhm9ost2YjNCctnPjbLw8Nop', {
        baseUrl: 'https://custom.api.com',
        userAgent: 'custom-agent/2.0',
      });

      expect(sendio.baseUrl).toBe('https://custom.api.com');
      expect(sendio.userAgent).toBe('custom-agent/2.0');
    });

    it('uses SENDIO_BASE_URL from env when no options.baseUrl provided', () => {
      const originalEnv = process.env;
      process.env = {
        ...originalEnv,
        SENDIO_BASE_URL: 'https://env-base-url.example.com',
      };

      const sendio = new Sendio('mx_zKa4RCko_Lhm9ost2YjNCctnPjbLw8Nop');
      expect(sendio.baseUrl).toBe('https://env-base-url.example.com');

      process.env = originalEnv;
    });

    it('uses SENDIO_USER_AGENT from env when no options.userAgent provided', () => {
      const originalEnv = process.env;
      process.env = {
        ...originalEnv,
        SENDIO_USER_AGENT: 'env-user-agent/1.0',
      };

      const sendio = new Sendio('mx_zKa4RCko_Lhm9ost2YjNCctnPjbLw8Nop');
      expect(sendio.userAgent).toBe('env-user-agent/1.0');

      process.env = originalEnv;
    });

    it('options.baseUrl overrides SENDIO_BASE_URL env', () => {
      const originalEnv = process.env;
      process.env = {
        ...originalEnv,
        SENDIO_BASE_URL: 'https://env-base-url.example.com',
      };

      const sendio = new Sendio('mx_zKa4RCko_Lhm9ost2YjNCctnPjbLw8Nop', {
        baseUrl: 'https://options-base-url.example.com',
      });
      expect(sendio.baseUrl).toBe('https://options-base-url.example.com');

      process.env = originalEnv;
    });

    it('options.userAgent overrides SENDIO_USER_AGENT env', () => {
      const originalEnv = process.env;
      process.env = {
        ...originalEnv,
        SENDIO_USER_AGENT: 'env-user-agent/1.0',
      };

      const sendio = new Sendio('mx_zKa4RCko_Lhm9ost2YjNCctnPjbLw8Nop', {
        userAgent: 'options-user-agent/2.0',
      });
      expect(sendio.userAgent).toBe('options-user-agent/2.0');

      process.env = originalEnv;
    });
  });

  describe('fetchRequest with custom options', () => {
    it('sends request to custom baseUrl', async () => {
      const customBaseUrl = 'https://custom.api.send.io';
      const sendio = new Sendio('mx_zKa4RCko_Lhm9ost2YjNCctnPjbLw8Nop', {
        baseUrl: customBaseUrl,
      });

      mockSuccessResponse({ id: 'key-123' }, { headers: {} });

      await sendio.apiKeys.list();

      const [url] = fetchMock.mock.calls[0];
      expect(url).toBe(`${customBaseUrl}/api-keys`);
    });

    it('sends custom User-Agent in request headers', async () => {
      const customUserAgent = 'my-integration/3.0';
      const sendio = new Sendio('mx_zKa4RCko_Lhm9ost2YjNCctnPjbLw8Nop', {
        userAgent: customUserAgent,
      });

      mockSuccessResponse({ id: 'key-123' }, { headers: {} });

      await sendio.apiKeys.list();

      const requestOptions = fetchMock.mock.calls[0][1];
      const headers = requestOptions?.headers as Headers;
      expect(headers.get('User-Agent')).toBe(customUserAgent);
    });
  });

  describe('cancellation', () => {
    it('cancels the request when the provided signal aborts', async () => {
      const sendio = new Sendio('mx_zKa4RCko_Lhm9ost2YjNCctnPjbLw8Nop');
      const controller = new AbortController();
      const fetchStub = vi.fn((_url: string, init?: RequestInit) => {
        return new Promise<never>((_resolve, reject) => {
          if (!init?.signal) {
            reject(new Error('No AbortSignal passed to fetch'));
            return;
          }
          if (init.signal.aborted) {
            reject(
              new DOMException('The operation was aborted.', 'AbortError'),
            );
            return;
          }
          init.signal.addEventListener(
            'abort',
            () =>
              reject(
                new DOMException('The operation was aborted.', 'AbortError'),
              ),
            { once: true },
          );
        });
      });
      vi.stubGlobal('fetch', fetchStub);

      try {
        const promise = sendio.emails.send(
          {
            from: 'admin@sendio.com',
            to: 'user@sendio.com',
            subject: 'Hello',
            text: 'Hello',
          },
          { signal: controller.signal },
        );
        controller.abort();
        const result = await promise;

        expect(result.error?.message).toBe(
          'Unable to fetch data. The request could not be resolved.',
        );
        expect(
          (fetchStub.mock.calls[0][1] as RequestInit).signal?.aborted,
        ).toBe(true);
      } finally {
        vi.unstubAllGlobals();
      }
    });

    const networkFailure = {
      data: null,
      error: {
        name: 'application_error',
        statusCode: null,
        message: 'Unable to fetch data. The request could not be resolved.',
      },
      headers: null,
    };

    function stubResponse(
      status: number,
      readBody: 'text' | 'json',
      rejection: unknown,
    ) {
      const response = new Response(null, { status });
      vi.spyOn(response, readBody).mockRejectedValue(rejection);
      vi.stubGlobal(
        'fetch',
        vi.fn(async () => response),
      );
    }

    it.each([
      ['an AbortError', undefined],
      ['a string reason', 'user left the page'],
    ])('returns the network failure result when the abort hits an error body, with %s', async (_, reason) => {
      const sendio = new Sendio('mx_zKa4RCko_Lhm9ost2YjNCctnPjbLw8Nop');
      const controller = new AbortController();
      controller.abort(reason);
      stubResponse(400, 'text', controller.signal.reason);

      try {
        const result = await sendio.emails.get('id', {
          signal: controller.signal,
        });

        expect(result).toEqual(networkFailure);
      } finally {
        vi.unstubAllGlobals();
      }
    });

    it('returns the network failure result when the abort hits a success body', async () => {
      const sendio = new Sendio('mx_zKa4RCko_Lhm9ost2YjNCctnPjbLw8Nop');
      const controller = new AbortController();
      controller.abort();
      stubResponse(200, 'json', controller.signal.reason);

      try {
        const result = await sendio.emails.get('id', {
          signal: controller.signal,
        });

        expect(result).toEqual(networkFailure);
      } finally {
        vi.unstubAllGlobals();
      }
    });

    it('keeps the status code when an error body read fails for another reason', async () => {
      const sendio = new Sendio('mx_zKa4RCko_Lhm9ost2YjNCctnPjbLw8Nop');
      const controller = new AbortController();
      controller.abort();
      stubResponse(500, 'text', new Error('socket hang up'));

      try {
        const result = await sendio.emails.get('id', {
          signal: controller.signal,
        });

        expect(result.error).toEqual({
          name: 'application_error',
          statusCode: 500,
          message: 'socket hang up',
        });
      } finally {
        vi.unstubAllGlobals();
      }
    });

    it('still logs a network failure', async () => {
      const sendio = new Sendio('mx_zKa4RCko_Lhm9ost2YjNCctnPjbLw8Nop');
      const consoleError = vi
        .spyOn(console, 'error')
        .mockImplementation(() => {});
      vi.stubGlobal(
        'fetch',
        vi.fn(async () => {
          throw new TypeError('fetch failed');
        }),
      );

      try {
        await sendio.emails.get('id', {
          signal: new AbortController().signal,
        });

        expect(consoleError).toHaveBeenCalledTimes(1);
      } finally {
        vi.unstubAllGlobals();
        consoleError.mockRestore();
      }
    });
  });
});
