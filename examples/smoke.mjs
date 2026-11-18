// Live smoke test against a real send.io environment. Not part of `pnpm test`.
//
//   pnpm build
//   SENDIO_API_KEY=mx_... SENDIO_BASE_URL=https://api.send.io node examples/smoke.mjs
//
// Optional: SMOKE_FROM (sender address on a verified domain), SMOKE_TO.
// Sends exactly one email.
import { Sendio } from '../dist/index.mjs';

const from = process.env.SMOKE_FROM || 'ada@compat-sdk.sendio-test.dev';
const to = process.env.SMOKE_TO || 'delivered@send.io';

const sendio = new Sendio();
console.log(`base URL: ${sendio.baseUrl}`);
console.log(`user agent: ${sendio.userAgent}`);

let failed = false;
function report(step, result, summary) {
  if (result.error) {
    failed = true;
    console.log(`${step}: FAIL ${JSON.stringify(result.error)}`);
    return false;
  }
  console.log(`${step}: OK ${summary(result.data)}`);
  return true;
}

const sent = await sendio.emails.send({
  from,
  to: [to],
  subject: 'sendio-node smoke test',
  html: '<p>Sent by the sendio Node.js SDK smoke test.</p>',
  text: 'Sent by the sendio Node.js SDK smoke test.',
});
report('send', sent, (d) => `id=${d.id}`);

if (sent.data) {
  const got = await sendio.emails.get(sent.data.id);
  report(
    'get',
    got,
    (d) =>
      `id=${d.id} from=${d.from} subject=${JSON.stringify(d.subject)} last_event=${d.last_event}`,
  );
}

const domains = await sendio.domains.list();
report(
  'domains.list',
  domains,
  (d) =>
    `${d.data.length} domain(s): ${d.data
      .slice(0, 5)
      .map((x) => `${x.name}(${x.status})`)
      .join(', ')}`,
);

const keys = await sendio.apiKeys.list();
report('apiKeys.list', keys, (d) => `${d.data.length} key(s)`);

process.exit(failed ? 1 : 0);
