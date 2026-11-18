/** biome-ignore-all lint/style/noNonNullAssertion: test code */
import type { Polly } from '@pollyjs/core';
import { Sendio } from '../sendio';
import { setupPolly } from '../test-utils/polly-setup';

describe('API Keys Integration Tests', () => {
  let polly: Polly;
  let sendio: Sendio;

  beforeEach(() => {
    polly = setupPolly();
    sendio = new Sendio(process.env.SENDIO_API_KEY || 'mx_fake_key');
  });

  afterEach(async () => {
    await polly.stop();
  });

  describe('create', () => {
    it('creates an API key with full access', async () => {
      const result = await sendio.apiKeys.create({
        name: 'Integration Test Key',
        permission: 'full_access',
      });

      expect(result.data?.id).toBeTruthy();
      expect(result.data?.token).toBeTruthy();
      const keyId = result.data!.id;

      const removeResult = await sendio.apiKeys.remove(keyId);
      expect(removeResult.data).toBeTruthy();
    });

    it('creates an API key with sending access', async () => {
      const result = await sendio.apiKeys.create({
        name: 'Integration Test Sending Key',
        permission: 'sending_access',
      });

      expect(result.data?.id).toBeTruthy();
      expect(result.data?.token).toBeTruthy();
      const keyId = result.data!.id;

      const removeResult = await sendio.apiKeys.remove(keyId);
      expect(removeResult.data).toBeTruthy();
    });

    it('allows creating an API key with an empty name', async () => {
      const result = await sendio.apiKeys.create({
        name: '',
      });

      expect(result.data?.id).toBeTruthy();
      expect(result.data?.token).toBeTruthy();
      const keyId = result.data!.id;

      const removeResult = await sendio.apiKeys.remove(keyId);
      expect(removeResult.data).toBeTruthy();
    });
  });

  describe('remove', () => {
    it('removes an API key', async () => {
      const createResult = await sendio.apiKeys.create({
        name: 'Integration Test Key to Remove',
      });

      expect(createResult.data?.id).toBeTruthy();
      const keyId = createResult.data!.id;

      const removeResult = await sendio.apiKeys.remove(keyId);

      expect(removeResult.data).toBeTruthy();
    });

    it('returns error for non-existent API key', async () => {
      const result = await sendio.apiKeys.remove(
        '00000000-0000-0000-0000-000000000000',
      );

      expect(result.error?.name).toBe('not_found');
    });
  });
});
