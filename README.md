# send.io Node.js SDK

The official Node.js and TypeScript SDK for the [send.io](https://send.io) email API. Ships ESM and CommonJS builds with full type definitions.

Full API reference: https://developer.send.io/docs/api

## Install

```bash
npm install @sendio/node
# or
pnpm add @sendio/node
# or
yarn add @sendio/node
```

Requires Node.js 20 or newer.

## Quick start

Create an API key in the send.io dashboard (keys start with `mx_`) and verify a sending domain.

```ts
import { Sendio } from '@sendio/node';

const sendio = new Sendio('mx_123456789');

const { data, error } = await sendio.emails.send({
  from: 'Acme <onboarding@yourdomain.com>',
  to: ['delivered@send.io'],
  subject: 'Hello from send.io',
  html: '<strong>It works!</strong>',
});

if (error) {
  console.error(error);
} else {
  console.log(`Email ${data.id} accepted`);
}
```

CommonJS works too:

```js
const { Sendio } = require('@sendio/node');
```

### Plain text, reply-to, CC/BCC, tags and attachments

```ts
await sendio.emails.send({
  from: 'Acme <onboarding@yourdomain.com>',
  to: 'delivered@send.io',
  cc: ['team@yourdomain.com'],
  replyTo: 'support@yourdomain.com',
  subject: 'Your invoice',
  text: 'Your invoice is attached.',
  tags: [{ name: 'category', value: 'billing' }],
  attachments: [
    { filename: 'invoice.pdf', content: Buffer.from(pdfBytes) },
  ],
});
```

### Scheduling and idempotency

```ts
await sendio.emails.send(
  {
    from: 'Acme <onboarding@yourdomain.com>',
    to: 'delivered@send.io',
    subject: 'Reminder',
    html: '<p>See you tomorrow.</p>',
    scheduledAt: 'in 1 hour',
  },
  { idempotencyKey: 'reminder-42' },
);
```

### React templates

Pass a React element in `react` (requires the optional peer dependency `@react-email/render`):

```tsx
import { Welcome } from './emails/welcome';

await sendio.emails.send({
  from: 'Acme <onboarding@yourdomain.com>',
  to: 'delivered@send.io',
  subject: 'Welcome',
  react: <Welcome firstName="Ada" />,
});
```

## Batch sending

Send up to 100 emails in one request:

```ts
const { data, error } = await sendio.batch.send([
  {
    from: 'Acme <onboarding@yourdomain.com>',
    to: ['delivered@send.io'],
    subject: 'Hello #1',
    html: '<p>First</p>',
  },
  {
    from: 'Acme <onboarding@yourdomain.com>',
    to: ['delivered@send.io'],
    subject: 'Hello #2',
    html: '<p>Second</p>',
  },
]);

console.log(data?.data.map((e) => e.id));
```

## Retrieve, update and cancel emails

```ts
const { data: email } = await sendio.emails.get('4ef9a417-02e9-4d39-ad75-9611e0fcc33c');
console.log(email?.last_event); // e.g. "delivered"

const { data: page } = await sendio.emails.list({ limit: 20 });

await sendio.emails.update({ id: email!.id, scheduledAt: 'in 2 days' });
await sendio.emails.cancel(email!.id);
```

## Domains

```ts
const { data: domain } = await sendio.domains.create({ name: 'yourdomain.com' });
console.log(domain?.records); // DNS records to publish

await sendio.domains.verify(domain!.id);
const { data: list } = await sendio.domains.list();
await sendio.domains.update({ id: domain!.id, openTracking: true, clickTracking: true });
await sendio.domains.remove(domain!.id);
```

### Receiving email on a domain

Pass `capabilities` to also accept inbound email. The create response then includes a `Receiving` MX record to publish.

```ts
const { data: inbound } = await sendio.domains.create({
  name: 'yourdomain.com',
  capabilities: { receiving: 'enabled' },
});

// Stop accepting email for the domain; you can then remove its MX record.
await sendio.domains.update({ id: inbound!.id, capabilities: { receiving: 'disabled' } });

// Turn it back on. This asks for the domain's MX record; publish it to start receiving email.
await sendio.domains.update({ id: inbound!.id, capabilities: { receiving: 'enabled' } });
```

Sending can't be turned off: `sending: 'disabled'` is rejected with a 422.

## Topics

`topics.list()` returns one page: 20 topics by default (`limit` up to 100), newest first. While `has_more` is true, pass the last id of the page as `after` to get the next one (`before` pages back):

```ts
const topics = [];
let after: string | undefined;
do {
  const { data, error } = await sendio.topics.list({ limit: 100, ...(after ? { after } : {}) });
  if (error) throw new Error(error.message);
  topics.push(...data.data);
  after = data.has_more ? data.data[data.data.length - 1]?.id : undefined;
} while (after);
```

Request options go second: `sendio.topics.list({ limit: 50 }, { signal })`. The older `sendio.topics.list({ signal })` form, with request options only, still works but is deprecated.

`sendio.topics.update(...)` sends a `topic.updated` webhook only when a value actually changes.

## Transactional emails

A transactional email (a sign-in code, a password reset, a receipt) is a saved send of a published template: it keeps the From, subject, reply-to and tracking (off by default), and its content is always the template's published version. Create it once, then send it by id with only the recipient and the variables.

```ts
const { data: tx } = await sendio.transactional.create({
  name: 'Sign-in code',
  templateId: 'signin-code', // a published template, by id or alias
  from: 'Acme <security@yourdomain.com>',
  subject: 'Your code is {{CODE}}',
});

await sendio.emails.send({
  transactionalId: tx!.id,
  to: 'ada@example.com',
  variables: { CODE: '123456' },
});
```

`sendio.transactional` also has `list({ search, templateId })`, `get`, `update` (pass `expectedUpdatedAt` to get a 409 instead of overwriting someone else's change), `remove`, `sendTest` and `stats`. A republish of the template, or an update, reaches every send within 10 seconds.

## Mailboxes

Mailboxes are real email accounts with IMAP/SMTP login. Create one on a verified domain (an address that already exists returns a 409); `credentials` comes back once, when IMAP/SMTP is ready. The password is also an API key for that mailbox, so store it like one.

```ts
const { data: mailbox } = await sendio.mailboxes.create({ address: 'ada@yourdomain.com' });
console.log(mailbox?.credentials?.smtp); // { host, port: 587, security: 'starttls' }

const { data: list } = await sendio.mailboxes.list(); // every mailbox, not paginated
await sendio.mailboxes.update(mailbox!.id, { warmupEnabled: false });
const { data: reset } = await sendio.mailboxes.resetPassword(mailbox!.id); // the old password stops working
await sendio.mailboxes.remove(mailbox!.id); // also removes an agent inbox on it
```

Pass `localPart` + `domainId` instead of `address`, or `username` (with optional `org` and `displayName`) for a free mailbox without a domain.

## More resources

Every resource of the send.io API is available on the client:

| Property | What it covers |
|---|---|
| `emails` | send, get, list, update, cancel, attachments, receiving (inbound) |
| `batch` | batch send |
| `domains` | create, get, list, update, verify, remove |
| `apiKeys` | create, list, remove |
| `contacts` | contacts, contact segments, contact topics, imports |
| `contactProperties` | custom contact properties |
| `segments` (alias `audiences`) | segments |
| `broadcasts` | create (drafts or send), update, send, schedule, list (status, segment, search), estimate, test sends, pause and resume, stats, recipients, clicked links, versions |
| `templates` | create, publish, duplicate, list, remove |
| `topics` | subscription topics |
| `automations` | automations, runs, templates (`templates.list`, `templates.get`) and `createFromTemplate` |
| `events` | custom events |
| `webhooks` | webhook endpoints and signature verification |
| `suppressions` | suppression list |
| `logs` | API request logs |
| `mailboxes` | mailboxes (IMAP/SMTP accounts): list, create, update warmup, reset password, remove |
| `usage` | usage |
| `oauthGrants` | OAuth grants |

### Verifying webhooks

```ts
const event = sendio.webhooks.verify({
  payload: rawBody,
  headers: {
    id: req.headers['svix-id'],
    timestamp: req.headers['svix-timestamp'],
    signature: req.headers['svix-signature'],
  },
  webhookSecret: process.env.SENDIO_WEBHOOK_SECRET!,
});
```

## Free agent inbox

Anonymous, receive-only inboxes on `sendioinbox.com` for agents (sign-up codes,
verification links). No API key. Mail is sealed to a key generated on your machine,
held by the relay for at most 72 hours, and deleted once you ack it.

```ts
import { inbox, InboxTakenError } from '@sendio/node';

const { address, recoveryPhrase, inbox: box } = await inbox.create({ name: 'agent', org: 'acme' });
console.log(address); // agent@acme.sendioinbox.com (keep recoveryPhrase somewhere safe)

const { code } = await box.waitFor({ subject: /verify/i, timeoutMs: 120_000 }); // 6-digit OTP

for await (const mail of box.messages()) {       // live over WebSocket, auto-reconnects
  console.log(mail.from, mail.subject, mail.text); // already decrypted, saved, acked
}

// To send from it too: move it into a send.io workspace.
const { link } = box.connectLink(); // give `link` to your user; one use, 30 minutes
```

- `inbox.check({ name, org })` returns `{ address, available, reason, suggestions }`;
  `inbox.create` throws `InboxTakenError` (with `.suggestions`) when taken.
- `inbox.open(address)`, `inbox.list()`, `inbox.recover(phrase, address)` work with keys in
  `~/.sendio/free/<address>/` (`$SENDIO_HOME/free/...` when `SENDIO_HOME` is set; shared with the
  `sendio` CLI). Relay: `SENDIO_FREE_RELAY` (default `https://relay.sendioinbox.com`).
- `box.poll({ wait })` is a signed long poll for cron and serverless; `box.read({ limit })`
  returns stored mail newest first. Attachments carry `risky: true` for executables, scripts, installers,
  HTML and SVG files, macro documents and archives containing them: never open those automatically.
- `inbox.connectLink(address?)` (or `box.connectLink()`) returns `{ address, link, expiresAt }`: a
  one-time link, signed locally with the inbox key, that your user opens to attach the inbox to
  their send.io workspace (read in the dashboard, and it can send with the workspace's credits, up
  to 50 a day). It works once and expires in 30 minutes; anyone holding it can take the inbox, so
  give it only to its owner. Origin: `appUrl` option, then `SENDIO_APP_URL`, then
  `https://app.send.io`. `address` may be left out when there is one local inbox.
- Once attached, the key can no longer read the inbox: `box.messages()`, `box.poll()` and
  `box.waitFor()` throw `InboxClaimedError` (code `claimed`, a subclass of `InboxEndedError`, which
  also covers `suspended` and `deleted`) instead of reconnecting. `box.status()` asks the relay
  (`'active' | 'claimed' | 'suspended' | 'deleted' | 'auth_failed'`).
- Node 22+ uses the built-in WebSocket; on Node 20 install the optional `ws` package.

## Configuration

| Setting | Constructor | Environment variable | Default |
|---|---|---|---|
| API key | `new Sendio(key)` | `SENDIO_API_KEY` | none (required) |
| Base URL | `new Sendio(key, { baseUrl })` | `SENDIO_BASE_URL` | `https://api.send.io` |
| User-Agent | `new Sendio(key, { userAgent })` | `SENDIO_USER_AGENT` | `sendio-node:<version>` |

With `SENDIO_API_KEY` set, the key argument can be omitted:

```ts
const sendio = new Sendio();
```

Point the client at another environment (for example a staging or test API) with the base URL option or `SENDIO_BASE_URL`:

```ts
const sendio = new Sendio(process.env.SENDIO_API_KEY, {
  baseUrl: 'https://api.send.io',
});
```

## Request options

Every method takes request options as its last argument. Use `signal` to cancel a request or set a timeout, and `headers` to add request headers:

```ts
await sendio.emails.list(
  { limit: 50 },
  { signal: AbortSignal.timeout(5000), headers: { 'X-Trace-Id': traceId } },
);
```

An aborted request returns a network-failure error with a `null` status code. To tell a cancel apart from a real failure, check the status code and `signal.aborted`:

```ts
const signal = AbortSignal.timeout(5000);
const { error } = await sendio.emails.list({}, { signal });

if (error?.statusCode === null && signal.aborted) {
  // The request was cancelled or timed out.
}
```

When a method has an optional argument before the request options, pass `undefined` in its place:

```ts
await sendio.broadcasts.send(broadcastId, undefined, { signal });
```

## Error handling

Methods never throw for API errors. Each call resolves to `{ data, error, headers }`; exactly one of `data` or `error` is set.

```ts
const { data, error, headers } = await sendio.emails.send({
  from: 'Acme <onboarding@yourdomain.com>',
  to: 'delivered@send.io',
  subject: 'Hi',
  html: '<p>Hi</p>',
});

if (error) {
  // error.name:       machine readable code, e.g. "validation_error", "rate_limit_exceeded"
  // error.message:    human readable explanation
  // error.statusCode: HTTP status (null for network failures)
  console.error(error.name, error.statusCode, error.message);
  console.log('rate limit remaining:', headers?.['ratelimit-remaining']);
  return;
}
```

Errors worth handling by name include `insufficient_credits` (402: the credit balance does not cover the send, and nothing was sent), `rate_limit_exceeded`, `daily_quota_exceeded`, `monthly_quota_exceeded`, `subaccount_daily_quota_exceeded` and `subaccount_monthly_quota_exceeded` (all 429).

The SDK prints nothing for API errors. Pass `{ debug: true }` as the second constructor argument to also log each one to the console as `[send.io API Error]`. Network failures (no HTTP response) are still logged outside `NODE_ENV=production`.

## Development

```bash
pnpm install
pnpm test        # unit tests (recorded fixtures, no network)
pnpm typecheck
pnpm lint
pnpm build
```

`examples/smoke.mjs` is a live check against a real send.io environment (sends one email):

```bash
pnpm build
SENDIO_API_KEY=mx_... SENDIO_BASE_URL=https://api.send.io \
SMOKE_FROM=you@yourdomain.com node examples/smoke.mjs
```

## License

MIT. See [LICENSE](./LICENSE) and [NOTICE](./NOTICE).
