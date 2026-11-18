import createFetchMock from 'vitest-fetch-mock';
import { Sendio } from '../sendio';
import { mockSuccessResponse } from '../test-utils/mock-fetch';
import type { GetBroadcastStatsResponseSuccess } from './interfaces/broadcast-stats.interface';
import type { BroadcastVersion } from './interfaces/broadcast-versions.interface';
import type { CreateBroadcastOptions } from './interfaces/create-broadcast-options.interface';
import type { GetBroadcastResponseSuccess } from './interfaces/get-broadcast.interface';

const fetchMocker = createFetchMock(vi);
fetchMocker.enableMocks();

const sendio = new Sendio('mx_zKa4RCko_Lhm9ost2YjNCctnPjbLw8Nop');
const id = '559ac32e-9ef5-46fb-82a1-b76b840c0f7b';

/** The URL, method and parsed JSON body of the nth request. */
function request(n = 0) {
  const [url, init] = fetchMock.mock.calls[n] as [string, RequestInit];
  return {
    url,
    method: init.method,
    body: init.body === undefined ? undefined : JSON.parse(init.body as string),
  };
}

describe('Broadcasts (full API)', () => {
  afterEach(() => fetchMock.resetMocks());
  afterAll(() => fetchMocker.disableMocks());

  describe('create', () => {
    it('saves an empty draft', async () => {
      mockSuccessResponse({ id });
      const { data } = await sendio.broadcasts.create({});
      expect(data).toEqual({ id });
      expect(request()).toEqual({
        url: 'https://api.send.io/broadcasts',
        method: 'POST',
        body: {},
      });
    });

    it('saves a draft with only a name', async () => {
      mockSuccessResponse({ id });
      await sendio.broadcasts.create({ name: 'Draft' });
      expect(request().body).toEqual({ name: 'Draft' });
    });

    it('sends every field the API takes', async () => {
      mockSuccessResponse({ id });
      await sendio.broadcasts.create({
        name: 'News',
        from: 'Acme <hi@example.com>',
        subject: 'Hello',
        replyTo: ['r@example.com'],
        html: '<p>Hi</p>',
        text: 'Hi',
        previewText: 'Preheader',
        topicId: 'topic-1',
        segmentId: 'seg-1',
        segmentIds: ['seg-2', 'seg-3'],
        excludeSegmentIds: ['vip'],
        audience: 'segments',
        unsubscribeScope: 'list',
        tracking: false,
        templateEngine: 'handlebars',
        send: true,
        scheduledAt: 'in 1 hour',
      });
      expect(request().body).toEqual({
        name: 'News',
        from: 'Acme <hi@example.com>',
        subject: 'Hello',
        reply_to: ['r@example.com'],
        html: '<p>Hi</p>',
        text: 'Hi',
        preview_text: 'Preheader',
        topic_id: 'topic-1',
        segment_id: 'seg-1',
        segment_ids: ['seg-2', 'seg-3'],
        exclude_segment_ids: ['vip'],
        audience: 'segments',
        unsubscribe_scope: 'list',
        tracking: false,
        template_engine: 'handlebars',
        send: true,
        scheduled_at: 'in 1 hour',
      });
    });

    it('sends tracking: false', async () => {
      mockSuccessResponse({ id });
      await sendio.broadcasts.create({ name: 'x', tracking: false });
      expect(request().body).toEqual({ name: 'x', tracking: false });
    });

    it('sends to every contact with audience: all', async () => {
      mockSuccessResponse({ id });
      await sendio.broadcasts.create({
        from: 'hi@example.com',
        subject: 'Hello',
        text: 'Hi',
        audience: 'all',
        send: true,
      });
      expect(request().body).toEqual({
        from: 'hi@example.com',
        subject: 'Hello',
        text: 'Hi',
        audience: 'all',
        send: true,
      });
    });

    it('sends exactly what an older call sent', async () => {
      mockSuccessResponse({ id });
      await sendio.broadcasts.create({
        from: 'bu@sendio.com',
        audienceId: 'aud-1',
        subject: 'Hello World',
        html: '<h1>Hello world</h1>',
      });
      expect(request().body).toEqual({
        from: 'bu@sendio.com',
        audience_id: 'aud-1',
        subject: 'Hello World',
        html: '<h1>Hello world</h1>',
      });
    });

    it('requires from, subject, a body and an audience only to send', () => {
      const draft: CreateBroadcastOptions = { subject: 'Only a subject' };
      const send: CreateBroadcastOptions = {
        from: 'hi@example.com',
        subject: 'Hello',
        html: '<p>Hi</p>',
        segmentIds: ['seg-1'],
        send: true,
      };
      // @ts-expect-error send: true needs from
      const noFrom: CreateBroadcastOptions = {
        subject: 'Hello',
        html: '<p>Hi</p>',
        segmentId: 'seg-1',
        send: true,
      };
      // @ts-expect-error send: true needs an audience
      const noAudience: CreateBroadcastOptions = {
        from: 'hi@example.com',
        subject: 'Hello',
        html: '<p>Hi</p>',
        send: true,
      };
      // @ts-expect-error scheduledAt needs send: true
      const scheduledDraft: CreateBroadcastOptions = { scheduledAt: 'in 1h' };
      expect([draft, send, noFrom, noAudience, scheduledDraft]).toHaveLength(5);
    });
  });

  describe('update', () => {
    it('puts the id in the path only', async () => {
      mockSuccessResponse({ id });
      await sendio.broadcasts.update(id, { name: 'Renamed' });
      expect(request()).toEqual({
        url: `https://api.send.io/broadcasts/${id}`,
        method: 'PATCH',
        body: { name: 'Renamed' },
      });
    });

    it('sends the send.io fields, tracking: false included', async () => {
      mockSuccessResponse({ id });
      await sendio.broadcasts.update(id, {
        segmentIds: ['seg-1'],
        excludeSegmentIds: [],
        audience: 'segments',
        unsubscribeScope: 'all',
        tracking: false,
        templateEngine: 'simple',
        previewText: 'p',
        topicId: null,
      });
      expect(request().body).toEqual({
        segment_ids: ['seg-1'],
        exclude_segment_ids: [],
        audience: 'segments',
        unsubscribe_scope: 'all',
        tracking: false,
        template_engine: 'simple',
        preview_text: 'p',
        topic_id: null,
      });
    });
  });

  describe('send', () => {
    it('puts the id in the path only', async () => {
      mockSuccessResponse({ id });
      await sendio.broadcasts.send(id, { scheduledAt: 'in 1 hour' });
      expect(request()).toEqual({
        url: `https://api.send.io/broadcasts/${id}/send`,
        method: 'POST',
        body: { scheduled_at: 'in 1 hour' },
      });
    });
  });

  describe('list', () => {
    it('filters by status, segment and search', async () => {
      mockSuccessResponse({ object: 'list', has_more: false, data: [] });
      await sendio.broadcasts.list({
        limit: 10,
        after: 'b0',
        status: 'draft',
        segmentId: 'seg-1',
        search: 'news letter',
      });
      expect(request().url).toBe(
        'https://api.send.io/broadcasts?limit=10&after=b0&status=draft&segment_id=seg-1&search=news+letter',
      );
    });

    it('sends no query without options', async () => {
      mockSuccessResponse({ object: 'list', has_more: false, data: [] });
      await sendio.broadcasts.list();
      expect(request().url).toBe('https://api.send.io/broadcasts');
    });
  });

  describe('get', () => {
    it('reads the send.io fields', async () => {
      const broadcast: GetBroadcastResponseSuccess = {
        object: 'broadcast',
        id,
        name: null,
        segment_id: null,
        audience_id: null,
        from: null,
        subject: null,
        reply_to: null,
        preview_text: null,
        status: 'scheduled',
        created_at: '2026-10-01T10:00:00+00:00',
        scheduled_at: '2026-10-02T10:00:00+00:00',
        sent_at: null,
        updated_at: '2026-10-01T10:00:00+00:00',
        topic_id: null,
        html: null,
        text: null,
        segment_ids: [],
        exclude_segment_ids: [],
        audience: 'all',
        unsubscribe_scope: 'list',
        tracking: false,
        template_engine: 'handlebars',
        version_number: 2,
        failed_reason: null,
        hold_reason: null,
        hold_until: null,
      };
      mockSuccessResponse(broadcast);
      const { data } = await sendio.broadcasts.get(id);
      expect(data).toEqual(broadcast);
    });
  });

  describe('estimate', () => {
    it('posts the audience and reads the estimate', async () => {
      const estimate = {
        object: 'broadcast_estimate',
        recipients: 42,
        skipped: { invalid: 3 },
      };
      mockSuccessResponse(estimate);
      const { data } = await sendio.broadcasts.estimate({
        segmentId: 'seg-1',
        segmentIds: ['seg-2'],
        excludeSegmentIds: ['vip'],
        topicId: 'topic-1',
      });
      expect(data).toEqual(estimate);
      expect(request()).toEqual({
        url: 'https://api.send.io/broadcasts/estimate',
        method: 'POST',
        body: {
          segment_id: 'seg-1',
          segment_ids: ['seg-2'],
          exclude_segment_ids: ['vip'],
          topic_id: 'topic-1',
        },
      });
    });

    it('estimates every contact', async () => {
      mockSuccessResponse({});
      await sendio.broadcasts.estimate({ audience: 'all' });
      expect(request().body).toEqual({ audience: 'all' });
    });
  });

  describe('sendTest', () => {
    it('posts the addresses', async () => {
      mockSuccessResponse({ object: 'broadcast_test', sent: 2 });
      const { data } = await sendio.broadcasts.sendTest(id, {
        to: ['a@example.com', 'b@example.com'],
      });
      expect(data).toEqual({ object: 'broadcast_test', sent: 2 });
      expect(request()).toEqual({
        url: `https://api.send.io/broadcasts/${id}/test`,
        method: 'POST',
        body: { to: ['a@example.com', 'b@example.com'] },
      });
    });
  });

  describe('stats', () => {
    it('gets the stats', async () => {
      const stats: GetBroadcastStatsResponseSuccess = {
        object: 'broadcast_stats',
        status: 'sent',
        recipients: 100,
        sent: 98,
        delivered: 95,
        bounced: 2,
        complained: 1,
        suppressed: 2,
        failed: 0,
        opened: 60,
        unique_opened: 50,
        clicked: 20,
        unique_clicked: 10,
        unsubscribed: 1,
        skipped: { invalid: 4 },
        delivery_rate: 0.9694,
        open_rate: 0.5263,
        click_rate: 0.1053,
        bounce_rate: 0.0204,
        unsubscribe_rate: 0.0105,
        progress: { queued: 98, total: 100 },
      };
      mockSuccessResponse(stats);
      const { data } = await sendio.broadcasts.stats(id);
      expect(data).toEqual(stats);
      expect(request()).toEqual({
        url: `https://api.send.io/broadcasts/${id}/stats`,
        method: 'GET',
        body: undefined,
      });
    });
  });

  describe('versions', () => {
    const version: BroadcastVersion = {
      object: 'broadcast_version',
      id: 'v1',
      broadcast_id: id,
      version_number: 1,
      name: 'First',
      comment: null,
      broadcast_name: 'News',
      subject: 'Hi',
      restored_from: null,
      created_at: '2026-10-01T10:00:00+00:00',
      current: false,
      from: 'hi@example.com',
      reply_to: null,
      preview_text: null,
      html: '<p>Hi</p>',
      text: 'Hi',
      template_engine: 'simple',
      tracking: true,
      topic_id: null,
      segment_ids: ['seg-1'],
      exclude_segment_ids: [],
      audience: 'segments',
      unsubscribe_scope: 'all',
    };

    it('lists versions with pagination', async () => {
      mockSuccessResponse({ object: 'list', has_more: false, data: [] });
      await sendio.broadcasts.listVersions(id, { limit: 5, before: 'v3' });
      expect(request()).toEqual({
        url: `https://api.send.io/broadcasts/${id}/versions?limit=5&before=v3`,
        method: 'GET',
        body: undefined,
      });
    });

    it('lists versions without options', async () => {
      mockSuccessResponse({ object: 'list', has_more: false, data: [] });
      await sendio.broadcasts.listVersions(id);
      expect(request().url).toBe(
        `https://api.send.io/broadcasts/${id}/versions`,
      );
    });

    it('gets a version by number', async () => {
      mockSuccessResponse(version);
      const { data } = await sendio.broadcasts.getVersion(id, 1);
      expect(data).toEqual(version);
      expect(request().url).toBe(
        `https://api.send.io/broadcasts/${id}/versions/1`,
      );
    });

    it('labels a version', async () => {
      mockSuccessResponse(version);
      await sendio.broadcasts.updateVersion(id, 'v1', {
        name: 'Launch copy',
        comment: null,
      });
      expect(request()).toEqual({
        url: `https://api.send.io/broadcasts/${id}/versions/v1`,
        method: 'PATCH',
        body: { name: 'Launch copy', comment: null },
      });
    });

    it('sends only the labels given', async () => {
      mockSuccessResponse(version);
      await sendio.broadcasts.updateVersion(id, 1, { comment: 'Approved' });
      expect(request().body).toEqual({ comment: 'Approved' });
    });

    it('restores a version', async () => {
      mockSuccessResponse({ ...version, id: 'v3', restored_from: 1 });
      const { data } = await sendio.broadcasts.restoreVersion(id, 1);
      expect(data?.restored_from).toBe(1);
      expect(request()).toEqual({
        url: `https://api.send.io/broadcasts/${id}/versions/1/restore`,
        method: 'POST',
        body: undefined,
      });
    });
  });
});
