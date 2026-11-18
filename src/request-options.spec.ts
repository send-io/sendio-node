import createFetchMock from 'vitest-fetch-mock';
import type { RequestOptions } from './common/interfaces/request-options.interface';
import { Sendio } from './sendio';
import { mockSuccessResponse } from './test-utils/mock-fetch';

const fetchMocker = createFetchMock(vi);
fetchMocker.enableMocks();

const sendio = new Sendio('mx_zKa4RCko_Lhm9ost2YjNCctnPjbLw8Nop');

type Call = (requestOptions: RequestOptions) => unknown;

const calls: Record<string, Call> = {
  'apiKeys.create': (o) => sendio.apiKeys.create({ name: 'key' }, o),
  'apiKeys.list': (o) => sendio.apiKeys.list({}, o),
  'apiKeys.update': (o) => sendio.apiKeys.update('id', { name: 'key' }, o),
  'apiKeys.remove': (o) => sendio.apiKeys.remove('id', o),

  'automations.create': (o) =>
    sendio.automations.create(
      { name: 'automation', steps: [], connections: [] },
      o,
    ),
  'automations.list': (o) => sendio.automations.list({}, o),
  'automations.get': (o) => sendio.automations.get('id', o),
  'automations.remove': (o) => sendio.automations.remove('id', o),
  'automations.update': (o) =>
    sendio.automations.update('id', { name: 'automation' }, o),
  'automations.duplicate': (o) => sendio.automations.duplicate('id', o),
  'automations.stop': (o) => sendio.automations.stop('id', o),
  'automations.runs.get': (o) =>
    sendio.automations.runs.get({ automationId: 'id', runId: 'id' }, o),
  'automations.runs.list': (o) =>
    sendio.automations.runs.list({ automationId: 'id' }, o),
  'automations.createFromTemplate': (o) =>
    sendio.automations.createFromTemplate(
      { slug: 'slug', sender: { from: 'a@sendio.com' } },
      o,
    ),
  'automations.templates.list': (o) => sendio.automations.templates.list({}, o),
  'automations.templates.get': (o) =>
    sendio.automations.templates.get('slug', o),

  'batch.send': (o) =>
    sendio.batch.send(
      [{ from: 'a@sendio.com', to: 'b@sendio.com', subject: 's', text: 't' }],
      o,
    ),
  'batch.create': (o) =>
    sendio.batch.create(
      [{ from: 'a@sendio.com', to: 'b@sendio.com', subject: 's', text: 't' }],
      o,
    ),

  'broadcasts.create': (o) =>
    sendio.broadcasts.create(
      { segmentId: 'id', from: 'a@sendio.com', subject: 's', text: 't' },
      o,
    ),
  'broadcasts.send': (o) => sendio.broadcasts.send('id', undefined, o),
  'broadcasts.list': (o) => sendio.broadcasts.list({}, o),
  'broadcasts.get': (o) => sendio.broadcasts.get('id', o),
  'broadcasts.recipients': (o) =>
    sendio.broadcasts.recipients('id', { type: 'delivered' }, o),
  'broadcasts.clickedLinks': (o) => sendio.broadcasts.clickedLinks('id', {}, o),
  'broadcasts.remove': (o) => sendio.broadcasts.remove('id', o),
  'broadcasts.cancel': (o) => sendio.broadcasts.cancel('id', o),
  'broadcasts.pause': (o) => sendio.broadcasts.pause('id', o),
  'broadcasts.resume': (o) => sendio.broadcasts.resume('id', o),
  'broadcasts.duplicate': (o) => sendio.broadcasts.duplicate('id', o),
  'broadcasts.update': (o) =>
    sendio.broadcasts.update('id', { name: 'broadcast' }, o),
  'broadcasts.estimate': (o) =>
    sendio.broadcasts.estimate({ audience: 'all' }, o),
  'broadcasts.sendTest': (o) =>
    sendio.broadcasts.sendTest('id', { to: 'a@sendio.com' }, o),
  'broadcasts.stats': (o) => sendio.broadcasts.stats('id', o),
  'broadcasts.listVersions': (o) => sendio.broadcasts.listVersions('id', {}, o),
  'broadcasts.getVersion': (o) => sendio.broadcasts.getVersion('id', 1, o),
  'broadcasts.updateVersion': (o) =>
    sendio.broadcasts.updateVersion('id', 1, { name: 'v' }, o),
  'broadcasts.restoreVersion': (o) =>
    sendio.broadcasts.restoreVersion('id', 1, o),

  'contactProperties.create': (o) =>
    sendio.contactProperties.create({ key: 'plan', type: 'string' }, o),
  'contactProperties.list': (o) => sendio.contactProperties.list({}, o),
  'contactProperties.get': (o) => sendio.contactProperties.get('id', o),
  'contactProperties.update': (o) =>
    sendio.contactProperties.update({ id: 'id', fallbackValue: 'free' }, o),
  'contactProperties.remove': (o) => sendio.contactProperties.remove('id', o),

  'contacts.create': (o) =>
    sendio.contacts.create({ email: 'a@sendio.com' }, o),
  'contacts.list': (o) => sendio.contacts.list({}, o),
  'contacts.get': (o) => sendio.contacts.get('id', o),
  'contacts.update': (o) =>
    sendio.contacts.update({ id: 'id', firstName: 'A' }, o),
  'contacts.remove': (o) => sendio.contacts.remove('id', o),
  'contacts.imports.create': (o) =>
    sendio.contacts.imports.create(
      { file: new Blob(['email\na@sendio.com']) },
      o,
    ),
  'contacts.imports.list': (o) => sendio.contacts.imports.list({}, o),
  'contacts.imports.get': (o) => sendio.contacts.imports.get('id', o),
  'contacts.topics.update': (o) =>
    sendio.contacts.topics.update({ id: 'id', topics: [] }, o),
  'contacts.topics.list': (o) => sendio.contacts.topics.list({ id: 'id' }, o),
  'contacts.segments.list': (o) =>
    sendio.contacts.segments.list({ contactId: 'id' }, o),
  'contacts.segments.add': (o) =>
    sendio.contacts.segments.add({ contactId: 'id', segmentId: 'id' }, o),
  'contacts.segments.remove': (o) =>
    sendio.contacts.segments.remove({ contactId: 'id', segmentId: 'id' }, o),

  'domains.create': (o) => sendio.domains.create({ name: 'sendio.com' }, o),
  'domains.list': (o) => sendio.domains.list({}, o),
  'domains.get': (o) => sendio.domains.get('id', o),
  'domains.update': (o) =>
    sendio.domains.update({ id: 'id', openTracking: true }, o),
  'domains.remove': (o) => sendio.domains.remove('id', o),
  'domains.verify': (o) => sendio.domains.verify('id', o),

  'emails.send': (o) =>
    sendio.emails.send(
      { from: 'a@sendio.com', to: 'b@sendio.com', subject: 's', text: 't' },
      o,
    ),
  'emails.create': (o) =>
    sendio.emails.create(
      { from: 'a@sendio.com', to: 'b@sendio.com', subject: 's', text: 't' },
      o,
    ),
  'emails.get': (o) => sendio.emails.get('id', o),
  'emails.list': (o) => sendio.emails.list({}, o),
  'emails.update': (o) =>
    sendio.emails.update({ id: 'id', scheduledAt: 'in 1 hour' }, o),
  'emails.cancel': (o) => sendio.emails.cancel('id', o),
  'emails.share': (o) => sendio.emails.share('id', undefined, o),
  'emails.metrics': (o) => sendio.emails.metrics({}, o),
  'emails.attachments.get': (o) =>
    sendio.emails.attachments.get({ emailId: 'id', id: 'id' }, o),
  'emails.attachments.list': (o) =>
    sendio.emails.attachments.list({ emailId: 'id' }, o),
  'emails.receiving.get': (o) => sendio.emails.receiving.get('id', {}, o),
  'emails.receiving.list': (o) => sendio.emails.receiving.list({}, o),
  'emails.receiving.attachments.get': (o) =>
    sendio.emails.receiving.attachments.get({ emailId: 'id', id: 'id' }, o),
  'emails.receiving.attachments.list': (o) =>
    sendio.emails.receiving.attachments.list({ emailId: 'id' }, o),

  'events.send': (o) =>
    sendio.events.send({ event: 'signup', email: 'a@sendio.com' }, o),
  'events.create': (o) => sendio.events.create({ name: 'signup' }, o),
  'events.get': (o) => sendio.events.get('id', o),
  'events.list': (o) => sendio.events.list({}, o),
  'events.update': (o) => sendio.events.update('id', { schema: null }, o),
  'events.remove': (o) => sendio.events.remove('id', o),

  'logs.list': (o) => sendio.logs.list({}, o),
  'logs.get': (o) => sendio.logs.get('id', o),

  'mailboxes.list': (o) => sendio.mailboxes.list(o),
  'mailboxes.create': (o) =>
    sendio.mailboxes.create({ address: 'a@sendio.com' }, o),
  'mailboxes.update': (o) =>
    sendio.mailboxes.update('id', { warmupEnabled: false }, o),
  'mailboxes.resetPassword': (o) => sendio.mailboxes.resetPassword('id', o),
  'mailboxes.remove': (o) => sendio.mailboxes.remove('id', o),

  'oauthGrants.list': (o) => sendio.oauthGrants.list({}, o),
  'oauthGrants.revoke': (o) => sendio.oauthGrants.revoke('id', o),

  'segments.create': (o) => sendio.segments.create({ name: 'segment' }, o),
  'segments.list': (o) => sendio.segments.list({}, o),
  'segments.get': (o) => sendio.segments.get('id', o),
  'segments.update': (o) =>
    sendio.segments.update('id', { name: 'segment' }, o),
  'segments.remove': (o) => sendio.segments.remove('id', o),

  'suppressions.add': (o) =>
    sendio.suppressions.add({ email: 'a@sendio.com' }, o),
  'suppressions.list': (o) => sendio.suppressions.list({}, o),
  'suppressions.get': (o) => sendio.suppressions.get('id', o),
  'suppressions.remove': (o) => sendio.suppressions.remove('id', o),
  'suppressions.batch.add': (o) =>
    sendio.suppressions.batch.add({ emails: ['a@sendio.com'] }, o),
  'suppressions.batch.remove': (o) =>
    sendio.suppressions.batch.remove({ emails: ['a@sendio.com'] }, o),

  'templates.create': (o) =>
    sendio.templates.create({ name: 'template', html: '<p>hi</p>' }, o),
  'templates.remove': (o) => sendio.templates.remove('id', o),
  'templates.get': (o) => sendio.templates.get('id', o),
  'templates.list': (o) => sendio.templates.list({}, o),
  'templates.duplicate': (o) => sendio.templates.duplicate('id', o),
  'templates.publish': (o) => sendio.templates.publish('id', o),
  'templates.update': (o) =>
    sendio.templates.update('id', { name: 'template' }, o),

  'topics.create': (o) =>
    sendio.topics.create({ name: 'topic', defaultSubscription: 'opt_in' }, o),
  'topics.list': (o) => sendio.topics.list(o),
  'topics.get': (o) => sendio.topics.get('id', o),
  'topics.update': (o) => sendio.topics.update({ id: 'id', name: 'topic' }, o),
  'topics.remove': (o) => sendio.topics.remove('id', o),

  'transactional.create': (o) =>
    sendio.transactional.create(
      { name: 'n', templateId: 't', from: 'a@b.co', subject: 's' },
      o,
    ),
  'transactional.list': (o) => sendio.transactional.list({}, o),
  'transactional.get': (o) => sendio.transactional.get('id', o),
  'transactional.update': (o) =>
    sendio.transactional.update('id', { name: 'n' }, o),
  'transactional.remove': (o) => sendio.transactional.remove('id', o),
  'transactional.sendTest': (o) =>
    sendio.transactional.sendTest('id', { to: 'a@b.co' }, o),
  'transactional.stats': (o) => sendio.transactional.stats('id', {}, o),

  'usage.get': (o) => sendio.usage.get(o),

  'webhooks.create': (o) =>
    sendio.webhooks.create(
      { endpoint: 'https://send.io', events: ['email.sent'] },
      o,
    ),
  'webhooks.get': (o) => sendio.webhooks.get('id', o),
  'webhooks.list': (o) => sendio.webhooks.list({}, o),
  'webhooks.update': (o) =>
    sendio.webhooks.update('id', { endpoint: 'https://send.io' }, o),
  'webhooks.remove': (o) => sendio.webhooks.remove('id', o),
  'webhooks.rotateSigningSecret': (o) =>
    sendio.webhooks.rotateSigningSecret('id', o),
  'webhooks.events.list': (o) =>
    sendio.webhooks.events.list({ webhookId: 'id' }, o),
  'webhooks.events.get': (o) =>
    sendio.webhooks.events.get({ webhookId: 'id', eventId: 'id' }, o),
  'webhooks.events.replay': (o) =>
    sendio.webhooks.events.replay({ webhookId: 'id', eventId: 'id' }, o),
  'webhooks.events.attempts.list': (o) =>
    sendio.webhooks.events.attempts.list({ webhookId: 'id', eventId: 'id' }, o),
};

const coveredElsewhere = new Set([
  'emails.receiving.forward',
  'webhooks.verify',
]);

function listPublicMethods(
  target: object,
  path: string,
  seen: Set<object>,
): string[] {
  if (seen.has(target)) {
    return [];
  }
  seen.add(target);

  const methods = Object.getOwnPropertyNames(Object.getPrototypeOf(target))
    .filter((name) => name !== 'constructor')
    .filter(
      (name) => typeof (target as Record<string, unknown>)[name] === 'function',
    )
    .map((name) => `${path}.${name}`);

  const nested = Object.entries(target).flatMap(([name, value]) =>
    value !== null && typeof value === 'object' && 'sendio' in value
      ? listPublicMethods(value, `${path}.${name}`, seen)
      : [],
  );

  return [...methods, ...nested];
}

describe('per-request options', () => {
  afterEach(() => fetchMock.resetMocks());
  afterAll(() => fetchMocker.disableMocks());

  it('covers every public resource method', () => {
    const seen = new Set<object>();
    const privateMethods = new Set([
      'templates.performCreate',
      'contacts.imports.buildCreateFormData',
      'contacts.imports.buildColumnMap',
      'contacts.imports.appendField',
      'emails.receiving.forwardPassthrough',
      'emails.receiving.forwardWrapped',
      'emails.receiving.downloadRaw',
    ]);

    const methods = Object.entries(sendio)
      .filter(
        ([, value]) =>
          value !== null && typeof value === 'object' && 'sendio' in value,
      )
      .flatMap(([name, value]) => listPublicMethods(value, name, seen))
      .filter((method) => !privateMethods.has(method))
      .filter((method) => !coveredElsewhere.has(method))
      .sort();

    expect(methods).toEqual(Object.keys(calls).sort());
  });

  it.each(
    Object.entries(calls),
  )('%s forwards headers and signal', async (_, call) => {
    mockSuccessResponse({ object: 'list', data: [] });
    const controller = new AbortController();

    await call({
      headers: { 'X-Trace-Id': 'trace-123' },
      signal: controller.signal,
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const init = fetchMock.mock.calls[0][1];
    expect(new Headers(init?.headers).get('X-Trace-Id')).toBe('trace-123');
    expect(init?.signal).toBe(controller.signal);
  });

  it.each([
    { passthrough: true as const },
    { passthrough: false as const, text: 'FYI' },
  ])('emails.receiving.forward with %o passes the signal to every request and headers only to the send', async (mode) => {
    mockSuccessResponse({
      object: 'email',
      id: 'id',
      subject: 'Hello',
      raw: { download_url: 'https://send.io/raw.eml' },
    });
    fetchMock.mockOnce('Subject: Hello\r\n\r\nHi');
    mockSuccessResponse({ id: 'id' });
    const controller = new AbortController();

    await sendio.emails.receiving.forward(
      { emailId: 'id', to: 'b@sendio.com', from: 'a@sendio.com', ...mode },
      { headers: { 'X-Trace-Id': 'trace-123' }, signal: controller.signal },
    );

    expect(fetchMock).toHaveBeenCalledTimes(3);
    const [lookup, download, send] = fetchMock.mock.calls.map(
      ([, init]) => init,
    );
    for (const init of [lookup, download, send]) {
      expect(init?.signal).toBe(controller.signal);
    }
    expect(new Headers(lookup?.headers).get('X-Trace-Id')).toBeNull();
    expect(new Headers(download?.headers).get('X-Trace-Id')).toBeNull();
    expect(new Headers(send?.headers).get('X-Trace-Id')).toBe('trace-123');
  });

  it('emails.receiving.forward returns an error when the raw download aborts', async () => {
    mockSuccessResponse({
      object: 'email',
      id: 'id',
      subject: 'Hello',
      raw: { download_url: 'https://send.io/raw.eml' },
    });
    fetchMock.mockRejectOnce(new DOMException('Aborted', 'AbortError'));

    const result = await sendio.emails.receiving.forward(
      { emailId: 'id', to: 'b@sendio.com', from: 'a@sendio.com' },
      { signal: new AbortController().signal },
    );

    expect(result.data).toBeNull();
    expect(result.error).not.toBeNull();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it.each([
    [
      'create',
      (o: RequestOptions) =>
        sendio.templates.create({ name: 'template', html: '<p>hi</p>' }, o),
    ],
    ['duplicate', (o: RequestOptions) => sendio.templates.duplicate('id', o)],
  ])('templates.%s(...).publish() takes its own request options', async (_, start) => {
    mockSuccessResponse({ object: 'template', id: 'id' });
    mockSuccessResponse({ object: 'template', id: 'id' });
    const first = new AbortController();
    const second = new AbortController();

    await start({ signal: first.signal }).publish({
      headers: { 'X-Trace-Id': 'trace-123' },
      signal: second.signal,
    });

    expect(fetchMock).toHaveBeenCalledTimes(2);
    const [initial, publish] = fetchMock.mock.calls.map(([, init]) => init);
    expect(initial?.signal).toBe(first.signal);
    expect(new Headers(initial?.headers).get('X-Trace-Id')).toBeNull();
    expect(publish?.signal).toBe(second.signal);
    expect(new Headers(publish?.headers).get('X-Trace-Id')).toBe('trace-123');
  });
});
