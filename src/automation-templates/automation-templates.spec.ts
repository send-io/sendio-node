import createFetchMock from 'vitest-fetch-mock';
import { Sendio } from '../sendio';
import { mockSuccessResponse } from '../test-utils/mock-fetch';
import type { GetAutomationTemplateResponseSuccess } from './interfaces/get-automation-template.interface';
import type { ListAutomationTemplatesResponseSuccess } from './interfaces/list-automation-templates.interface';

const fetchMocker = createFetchMock(vi);
fetchMocker.enableMocks();

const sendio = new Sendio('mx_zKa4RCko_Lhm9ost2YjNCctnPjbLw8Nop');

afterEach(() => fetchMock.resetMocks());
afterAll(() => fetchMocker.disableMocks());

describe('list', () => {
  const response: ListAutomationTemplatesResponseSuccess = {
    object: 'list',
    categories: ['onboarding', 'billing'],
    data: [
      {
        object: 'automation_template',
        slug: 'email-verification-reminder',
        version: 1,
        name: 'Email verification reminder',
        category: 'onboarding',
        kind: 'transactional',
        outcome: "Remind users who haven't verified their email.",
        events: [
          {
            ref: 'trigger',
            name: 'user.created',
            purpose: 'Starts the workflow.',
            exists: true,
          },
        ],
        email_count: 2,
        steps: [{ key: 'trigger', type: 'trigger' }],
        connections: [],
        in_use_count: 0,
      },
    ],
  };

  it('lists automation templates', async () => {
    mockSuccessResponse(response);

    const data = await sendio.automations.templates.list();

    expect(data.data).toEqual(response);
    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.send.io/automation-templates',
      expect.objectContaining({ method: 'GET' }),
    );
  });

  it('filters by category', async () => {
    mockSuccessResponse(response);

    await sendio.automations.templates.list({ category: 'lead_capture' });

    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.send.io/automation-templates?category=lead_capture',
      expect.objectContaining({ method: 'GET' }),
    );
  });
});

describe('get', () => {
  it('gets an automation template by slug', async () => {
    const response: GetAutomationTemplateResponseSuccess = {
      object: 'automation_template',
      slug: 'email-verification-reminder',
      version: 2,
      name: 'Email verification reminder',
      category: 'onboarding',
      kind: 'transactional',
      outcome: "Remind users who haven't verified their email.",
      how_it_works: 'Each signup starts its own run for that user.',
      events: [
        {
          ref: 'verified',
          name: 'user.email.verified',
          purpose: 'Ends the workflow for that user.',
          schema: {},
          exists: false,
          adds: {},
        },
      ],
      emails: [
        {
          ref: 'reminder_1',
          step_label: 'Reminder 1',
          step_key: 'email_1',
          subject: 'Confirm your email to finish signing up',
          preview: 'One click',
          html: '<p>Hi</p>',
          text: 'Hi',
          variables: [],
        },
      ],
      params: [
        {
          ref: 'wait_1',
          type: 'duration',
          label: 'First reminder if not verified within',
          default: '24 hours',
        },
      ],
      email_count: 1,
      steps: [{ key: 'trigger', type: 'trigger', config: {} }],
      connections: [],
      in_use_count: 0,
    };
    mockSuccessResponse(response);

    const data = await sendio.automations.templates.get(
      'email-verification-reminder',
    );

    expect(data.data).toEqual(response);
    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.send.io/automation-templates/email-verification-reminder',
      expect.objectContaining({ method: 'GET' }),
    );
  });
});
