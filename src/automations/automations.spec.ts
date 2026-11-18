import createFetchMock from 'vitest-fetch-mock';
import type { ErrorResponse } from '../interfaces';
import { Sendio } from '../sendio';
import { mockSuccessResponse } from '../test-utils/mock-fetch';
import type { CreateAutomationFromTemplateResponseSuccess } from './interfaces/create-automation-from-template.interface';
import type {
  CreateAutomationOptions,
  CreateAutomationResponseSuccess,
} from './interfaces/create-automation-options.interface';
import type { DuplicateAutomationResponseSuccess } from './interfaces/duplicate-automation.interface';
import type { GetAutomationResponseSuccess } from './interfaces/get-automation.interface';
import type { ListAutomationsResponseSuccess } from './interfaces/list-automation.interface';
import type { RemoveAutomationResponseSuccess } from './interfaces/remove-automation.interface';
import type { StopAutomationResponseSuccess } from './interfaces/stop-automation.interface';
import type { UpdateAutomationResponseSuccess } from './interfaces/update-automation.interface';

const fetchMocker = createFetchMock(vi);
fetchMocker.enableMocks();

const sendio = new Sendio('mx_zKa4RCko_Lhm9ost2YjNCctnPjbLw8Nop');

afterEach(() => fetchMock.resetMocks());
afterAll(() => fetchMocker.disableMocks());

describe('create', () => {
  it('creates an automation', async () => {
    const response: CreateAutomationResponseSuccess = {
      object: 'automation',
      id: '71cdfe68-cf79-473a-a9d7-21f91db6a526',
    };

    fetchMock.mockOnce(JSON.stringify(response), {
      status: 200,
      headers: {
        'content-type': 'application/json',
      },
    });

    const payload: CreateAutomationOptions = {
      name: 'Welcome Flow',
      status: 'enabled',
      steps: [
        {
          key: 'trigger',
          type: 'trigger',
          config: { eventName: 'user.created' },
        },
        {
          key: 'welcome_email',
          type: 'send_email',
          config: { template: { id: 'tpl-123' } },
        },
      ],
      connections: [{ from: 'trigger', to: 'welcome_email', type: 'default' }],
    };

    const data = await sendio.automations.create(payload);
    expect(data).toMatchInlineSnapshot(`
        {
          "data": {
            "id": "71cdfe68-cf79-473a-a9d7-21f91db6a526",
            "object": "automation",
          },
          "error": null,
          "headers": {
            "content-type": "application/json",
          },
        }
      `);
  });

  it('throws an error when an ErrorResponse is returned', async () => {
    const response: ErrorResponse = {
      name: 'missing_required_field',
      statusCode: 422,
      message: 'Missing `name` field.',
    };

    fetchMock.mockOnce(JSON.stringify(response), {
      status: 422,
      headers: {
        'content-type': 'application/json',
      },
    });

    const data = await sendio.automations.create({
      name: '',
      steps: [],
      connections: [],
    });
    expect(data).toMatchInlineSnapshot(`
        {
          "data": null,
          "error": {
            "message": "Missing \`name\` field.",
            "name": "missing_required_field",
            "statusCode": 422,
          },
          "headers": {
            "content-type": "application/json",
          },
        }
      `);
  });
});

describe('list', () => {
  const response: ListAutomationsResponseSuccess = {
    object: 'list',
    has_more: false,
    data: [
      {
        id: '49a3999c-0ce1-4ea6-ab68-afcd6dc2e794',
        name: 'Welcome Flow',
        status: 'enabled',
        created_at: '2025-01-01T00:00:00+00:00',
        updated_at: '2025-01-01T00:00:00+00:00',
      },
      {
        id: '559ac32e-9ef5-46fb-82a1-b76b840c0f7b',
        name: 'Onboarding Flow',
        status: 'disabled',
        created_at: '2025-02-01T00:00:00+00:00',
        updated_at: '2025-02-01T00:00:00+00:00',
      },
    ],
  };

  describe('when no pagination options are provided', () => {
    it('lists automations', async () => {
      mockSuccessResponse(response, {
        headers: {},
      });

      const sendio = new Sendio('mx_zKa4RCko_Lhm9ost2YjNCctnPjbLw8Nop');

      const result = await sendio.automations.list();
      expect(result).toEqual({
        data: response,
        error: null,
        headers: {
          'content-type': 'application/json',
        },
      });

      expect(fetchMock).toHaveBeenCalledWith(
        'https://api.send.io/automations',
        expect.objectContaining({
          method: 'GET',
          headers: expect.any(Headers),
        }),
      );
    });
  });

  describe('when pagination options are provided', () => {
    it('passes limit param and returns a response', async () => {
      mockSuccessResponse(response, {
        headers: {},
      });

      const sendio = new Sendio('mx_zKa4RCko_Lhm9ost2YjNCctnPjbLw8Nop');
      const result = await sendio.automations.list({ limit: 1 });
      expect(result).toEqual({
        data: response,
        error: null,
        headers: {
          'content-type': 'application/json',
        },
      });

      expect(fetchMock).toHaveBeenCalledWith(
        'https://api.send.io/automations?limit=1',
        expect.objectContaining({
          method: 'GET',
          headers: expect.any(Headers),
        }),
      );
    });

    it('passes after param and returns a response', async () => {
      mockSuccessResponse(response, {
        headers: {},
      });

      const sendio = new Sendio('mx_zKa4RCko_Lhm9ost2YjNCctnPjbLw8Nop');
      const result = await sendio.automations.list({
        limit: 1,
        after: 'cursor-value',
      });
      expect(result).toEqual({
        data: response,
        error: null,
        headers: {
          'content-type': 'application/json',
        },
      });

      expect(fetchMock).toHaveBeenCalledWith(
        'https://api.send.io/automations?limit=1&after=cursor-value',
        expect.objectContaining({
          method: 'GET',
          headers: expect.any(Headers),
        }),
      );
    });

    it('passes before param and returns a response', async () => {
      mockSuccessResponse(response, {
        headers: {},
      });

      const sendio = new Sendio('mx_zKa4RCko_Lhm9ost2YjNCctnPjbLw8Nop');
      const result = await sendio.automations.list({
        limit: 1,
        before: 'cursor-value',
      });
      expect(result).toEqual({
        data: response,
        error: null,
        headers: {
          'content-type': 'application/json',
        },
      });

      expect(fetchMock).toHaveBeenCalledWith(
        'https://api.send.io/automations?limit=1&before=cursor-value',
        expect.objectContaining({
          method: 'GET',
          headers: expect.any(Headers),
        }),
      );
    });
  });

  describe('when status filter is provided', () => {
    it('passes status param', async () => {
      mockSuccessResponse(response, {
        headers: {},
      });

      const sendio = new Sendio('mx_zKa4RCko_Lhm9ost2YjNCctnPjbLw8Nop');
      const result = await sendio.automations.list({ status: 'enabled' });
      expect(result).toEqual({
        data: response,
        error: null,
        headers: {
          'content-type': 'application/json',
        },
      });

      expect(fetchMock).toHaveBeenCalledWith(
        'https://api.send.io/automations?status=enabled',
        expect.objectContaining({
          method: 'GET',
          headers: expect.any(Headers),
        }),
      );
    });
  });
});

describe('get', () => {
  describe('when automation not found', () => {
    it('returns error', async () => {
      const response: ErrorResponse = {
        name: 'not_found',
        statusCode: 404,
        message: 'Automation not found',
      };

      fetchMock.mockOnce(JSON.stringify(response), {
        status: 404,
        headers: {
          'content-type': 'application/json',
        },
      });

      const sendio = new Sendio('mx_zKa4RCko_Lhm9ost2YjNCctnPjbLw8Nop');

      const result = sendio.automations.get(
        '559ac32e-9ef5-46fb-82a1-b76b840c0f7b',
      );

      await expect(result).resolves.toMatchInlineSnapshot(`
          {
            "data": null,
            "error": {
              "message": "Automation not found",
              "name": "not_found",
              "statusCode": 404,
            },
            "headers": {
              "content-type": "application/json",
            },
          }
        `);
    });
  });

  it('gets an automation', async () => {
    const response: GetAutomationResponseSuccess = {
      object: 'automation',
      id: '559ac32e-9ef5-46fb-82a1-b76b840c0f7b',
      name: 'Welcome Flow',
      status: 'enabled',
      created_at: '2025-01-01T00:00:00+00:00',
      updated_at: '2025-01-01T00:00:00+00:00',
      steps: [
        {
          key: 'step-1',
          type: 'trigger',
          config: { event_name: 'user.created' },
        },
      ],
      connections: [],
    };

    fetchMock.mockOnce(JSON.stringify(response), {
      status: 200,
      headers: {
        'content-type': 'application/json',
      },
    });

    const sendio = new Sendio('mx_zKa4RCko_Lhm9ost2YjNCctnPjbLw8Nop');

    await expect(
      sendio.automations.get('559ac32e-9ef5-46fb-82a1-b76b840c0f7b'),
    ).resolves.toMatchInlineSnapshot(`
        {
          "data": {
            "connections": [],
            "created_at": "2025-01-01T00:00:00+00:00",
            "id": "559ac32e-9ef5-46fb-82a1-b76b840c0f7b",
            "name": "Welcome Flow",
            "object": "automation",
            "status": "enabled",
            "steps": [
              {
                "config": {
                  "event_name": "user.created",
                },
                "key": "step-1",
                "type": "trigger",
              },
            ],
            "updated_at": "2025-01-01T00:00:00+00:00",
          },
          "error": null,
          "headers": {
            "content-type": "application/json",
          },
        }
      `);
  });
});

describe('remove', () => {
  it('removes an automation', async () => {
    const id = 'b01e0de9-7c27-4a53-bf38-2e3f98389a65';
    const response: RemoveAutomationResponseSuccess = {
      object: 'automation',
      id,
      deleted: true,
    };
    fetchMock.mockOnce(JSON.stringify(response), {
      status: 200,
      headers: {
        'content-type': 'application/json',
      },
    });

    const sendio = new Sendio('mx_zKa4RCko_Lhm9ost2YjNCctnPjbLw8Nop');

    await expect(sendio.automations.remove(id)).resolves.toMatchInlineSnapshot(`
        {
          "data": {
            "deleted": true,
            "id": "b01e0de9-7c27-4a53-bf38-2e3f98389a65",
            "object": "automation",
          },
          "error": null,
          "headers": {
            "content-type": "application/json",
          },
        }
      `);
  });
});

describe('update', () => {
  it('updates automation status', async () => {
    const id = '71cdfe68-cf79-473a-a9d7-21f91db6a526';
    const response: UpdateAutomationResponseSuccess = {
      object: 'automation',
      id,
    };

    fetchMock.mockOnce(JSON.stringify(response), {
      status: 200,
      headers: {
        'content-type': 'application/json',
      },
    });

    const data = await sendio.automations.update(id, { status: 'disabled' });
    expect(data).toMatchInlineSnapshot(`
        {
          "data": {
            "id": "71cdfe68-cf79-473a-a9d7-21f91db6a526",
            "object": "automation",
          },
          "error": null,
          "headers": {
            "content-type": "application/json",
          },
        }
      `);

    expect(fetchMock).toHaveBeenCalledWith(
      `https://api.send.io/automations/${id}`,
      expect.objectContaining({
        method: 'PATCH',
        headers: expect.any(Headers),
        body: JSON.stringify({ status: 'disabled' }),
      }),
    );
  });

  it('updates automation steps only', async () => {
    const id = '71cdfe68-cf79-473a-a9d7-21f91db6a526';
    const response: UpdateAutomationResponseSuccess = {
      object: 'automation',
      id,
    };

    fetchMock.mockOnce(JSON.stringify(response), {
      status: 200,
      headers: {
        'content-type': 'application/json',
      },
    });

    await sendio.automations.update(id, {
      steps: [
        {
          key: 'trigger',
          type: 'trigger',
          config: { eventName: 'user.created' },
        },
      ],
    });

    expect(fetchMock).toHaveBeenCalledWith(
      `https://api.send.io/automations/${id}`,
      expect.objectContaining({
        method: 'PATCH',
        headers: expect.any(Headers),
        body: JSON.stringify({
          steps: [
            {
              key: 'trigger',
              type: 'trigger',
              config: { event_name: 'user.created' },
            },
          ],
        }),
      }),
    );
  });

  it('updates automation connections only', async () => {
    const id = '71cdfe68-cf79-473a-a9d7-21f91db6a526';
    const response: UpdateAutomationResponseSuccess = {
      object: 'automation',
      id,
    };

    fetchMock.mockOnce(JSON.stringify(response), {
      status: 200,
      headers: {
        'content-type': 'application/json',
      },
    });

    await sendio.automations.update(id, {
      connections: [{ from: 'trigger', to: 'welcome_email', type: 'default' }],
    });

    expect(fetchMock).toHaveBeenCalledWith(
      `https://api.send.io/automations/${id}`,
      expect.objectContaining({
        method: 'PATCH',
        headers: expect.any(Headers),
        body: JSON.stringify({
          connections: [
            { from: 'trigger', to: 'welcome_email', type: 'default' },
          ],
        }),
      }),
    );
  });

  it('updates automation name', async () => {
    const id = '71cdfe68-cf79-473a-a9d7-21f91db6a526';
    const response: UpdateAutomationResponseSuccess = {
      object: 'automation',
      id,
    };

    fetchMock.mockOnce(JSON.stringify(response), {
      status: 200,
      headers: {
        'content-type': 'application/json',
      },
    });

    await sendio.automations.update(id, {
      name: 'Updated Flow',
    });

    expect(fetchMock).toHaveBeenCalledWith(
      `https://api.send.io/automations/${id}`,
      expect.objectContaining({
        method: 'PATCH',
        headers: expect.any(Headers),
        body: JSON.stringify({ name: 'Updated Flow' }),
      }),
    );
  });
});

describe('duplicate', () => {
  it('duplicates an automation', async () => {
    const id = '71cdfe68-cf79-473a-a9d7-21f91db6a526';
    const response: DuplicateAutomationResponseSuccess = {
      object: 'automation',
      id: 'e169aa45-1ecf-4183-9955-b1499d5701d3',
    };

    fetchMock.mockOnce(JSON.stringify(response), {
      status: 200,
      headers: {
        'content-type': 'application/json',
      },
    });

    const data = await sendio.automations.duplicate(id);
    expect(data).toMatchInlineSnapshot(`
        {
          "data": {
            "id": "e169aa45-1ecf-4183-9955-b1499d5701d3",
            "object": "automation",
          },
          "error": null,
          "headers": {
            "content-type": "application/json",
          },
        }
      `);

    expect(fetchMock).toHaveBeenCalledWith(
      `https://api.send.io/automations/${id}/duplicate`,
      expect.objectContaining({
        method: 'POST',
        headers: expect.any(Headers),
      }),
    );
  });
});

describe('stop', () => {
  it('stops an automation', async () => {
    const id = '71cdfe68-cf79-473a-a9d7-21f91db6a526';
    const response: StopAutomationResponseSuccess = {
      object: 'automation',
      id,
      status: 'disabled',
    };

    fetchMock.mockOnce(JSON.stringify(response), {
      status: 200,
      headers: {
        'content-type': 'application/json',
      },
    });

    const data = await sendio.automations.stop(id);
    expect(data).toMatchInlineSnapshot(`
        {
          "data": {
            "id": "71cdfe68-cf79-473a-a9d7-21f91db6a526",
            "object": "automation",
            "status": "disabled",
          },
          "error": null,
          "headers": {
            "content-type": "application/json",
          },
        }
      `);

    expect(fetchMock).toHaveBeenCalledWith(
      `https://api.send.io/automations/${id}/stop`,
      expect.objectContaining({
        method: 'POST',
        headers: expect.any(Headers),
      }),
    );
  });
});

describe('createFromTemplate', () => {
  const response: CreateAutomationFromTemplateResponseSuccess = {
    object: 'automation',
    id: '71cdfe68-cf79-473a-a9d7-21f91db6a526',
    status: 'disabled',
    source_template: {
      slug: 'email-verification-reminder',
      version: 2,
      name: 'Email verification reminder',
    },
    emails: [
      {
        object: 'automation_email',
        id: 'b1c2d3e4-0000-4000-8000-000000000001',
        name: 'Reminder 1',
        status: 'published',
        step_key: 'email_1',
      },
    ],
    events_created: ['account.confirmed'],
    events_reused: ['user.created'],
  };

  function sentRequest() {
    return fetchMock.mock.calls[0][1];
  }

  it('creates an automation from a template', async () => {
    mockSuccessResponse(response, { status: 201 });

    const data = await sendio.automations.createFromTemplate(
      {
        slug: 'email-verification-reminder',
        version: 2,
        name: 'Verify reminders',
        events: { verified: { mode: 'existing', name: 'account.confirmed' } },
        sender: { from: 'Acme <hello@acme.com>', replyTo: 'help@acme.com' },
        topicId: '0b5c7c2e-0000-4000-8000-000000000001',
        params: { wait_1: '24 hours', resend_url: 'https://acme.com/verify' },
      },
      { idempotencyKey: 'setup-123' },
    );

    expect(data.data).toEqual(response);
    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.send.io/automations/from-template',
      expect.objectContaining({ method: 'POST' }),
    );
    expect(JSON.parse(sentRequest()?.body as string)).toEqual({
      slug: 'email-verification-reminder',
      sender: { from: 'Acme <hello@acme.com>', reply_to: 'help@acme.com' },
      version: 2,
      name: 'Verify reminders',
      events: { verified: { mode: 'existing', name: 'account.confirmed' } },
      topic_id: '0b5c7c2e-0000-4000-8000-000000000001',
      params: { wait_1: '24 hours', resend_url: 'https://acme.com/verify' },
    });
    expect(new Headers(sentRequest()?.headers).get('Idempotency-Key')).toBe(
      'setup-123',
    );
  });

  it('sends only the given fields and no Idempotency-Key by default', async () => {
    mockSuccessResponse(response, { status: 201 });

    await sendio.automations.createFromTemplate({
      slug: 'email-verification-reminder',
      sender: { from: 'hello@acme.com' },
    });

    expect(JSON.parse(sentRequest()?.body as string)).toEqual({
      slug: 'email-verification-reminder',
      sender: { from: 'hello@acme.com' },
    });
    expect(new Headers(sentRequest()?.headers).has('Idempotency-Key')).toBe(
      false,
    );
  });
});
