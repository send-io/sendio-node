# Changelog

## 1.1.1 (2026-11-18)

- The package now links to its source, https://github.com/send-io/sendio-node, and is published from GitHub Actions with npm provenance. No code changes.

## 1.1.0 (2026-11-18)

- New: `transactional` resource for transactional emails (`/transactional`): `create` (with `idempotencyKey`), `list({ search, templateId })`, `get` (with the published version's `variables`), `update` (`expectedUpdatedAt` for a 409 on a stale save), `remove`, `sendTest` and `stats`. `trackOpens` and `trackClicks` are off by default.
- `emails.send` and `batch.send` take `transactionalId` with `variables` (and no `from`, `subject`, `replyTo` or body), and `trackOpens` / `trackClicks` for one email. `emails.get` reads `transactional_id`.
- Deprecated: sending a template with `emails.send({ template: { id, variables } })`. Create a transactional email for the template and send it with `transactionalId` instead. The old form still works for now.
- `broadcasts.create` and `broadcasts.update` take `templateId` and `templateVersionId` (the exact published version to copy); `update({ templateId: null })` detaches a broadcast from its template. Broadcasts read the template link fields and `unfillable_variables`.
- New: `broadcasts.pause(id)` and `broadcasts.resume(id)`. Pause stops a sending broadcast after the batch in flight; resume carries on from the next recipient.
- `Mailbox` reads `can_send` and `send_reason`.
- Free inbox attachment check: the list of risky attachment types now also covers HTML, SVG, shell scripts, installers and more Windows script types.

## 1.0.0 (2026-11-11)

First public release.

- New: automation templates. `automations.templates.list({ category })` and `automations.templates.get(slug)` read the prebuilt workflows; `automations.createFromTemplate({ slug, sender, topicId?, events?, params?, version?, name? }, { idempotencyKey })` sets one up as a disabled automation with its events and emails.
- Removed `domains.claims` (`create`, `get`, `verify`) and its types: the API has no domain-claim routes, so every call failed with a 404. Claim a domain by deleting it from the team that owns it, then adding it to yours.
- `domains.create` and `domains.update` take `capabilities: { receiving: 'enabled' | 'disabled' }` to turn receiving on or off (the API now honours it; `'disabled'` is sent as-is). Turning receiving on asks for the domain's MX record (publish it to start receiving email); `sending: 'disabled'` is rejected with a 422.
- New: `mailboxes` resource for mailboxes (email accounts with IMAP/SMTP login): `list`, `create` (`address`, or `localPart` + `domainId`, or `username` for a free mailbox; returns `credentials` once), `update` (`warmupEnabled`, `false` is sent), `resetPassword` and `remove`.
- `broadcasts.create` saves a draft with any subset of fields (`create({})` is valid); `from`, `subject`, a body and an audience are required only with `send: true`, as the API requires.
- `broadcasts.create` and `broadcasts.update` take the send.io fields `segmentIds`, `excludeSegmentIds`, `audience` (`'all'` sends to every contact), `unsubscribeScope`, `tracking` (`false` is sent) and `templateEngine`. Fields left out are not sent, so existing calls send exactly what they did.
- `broadcasts.list` filters by `status`, `segmentId` and `search` (name).
- New: `broadcasts.estimate` (audience size before saving), `broadcasts.sendTest` (1 to 5 addresses), `broadcasts.stats`, and the versions API: `listVersions`, `getVersion`, `updateVersion` (name and comment) and `restoreVersion`.
- `Broadcast` types the send.io fields (`segment_ids`, `exclude_segment_ids`, `audience`, `unsubscribe_scope`, `tracking`, `template_engine`, `version_number`, `updated_at`, `failed_reason`, `hold_reason`, `hold_until`); `name` is nullable and `status` covers every status.
