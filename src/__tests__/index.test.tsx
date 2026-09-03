import { describe, expect, it } from '@jest/globals';

import type { NotiveraConfig } from '../types';

describe('Notivera types', () => {
  it('accepts a valid config shape', () => {
    const config: NotiveraConfig = {
      apiKey: 'key',
      apiSecret: 'secret',
      appVersion: '1.0.0',
      tenantId: 'tenant',
    };
    expect(config.apiKey).toBe('key');
  });
});
