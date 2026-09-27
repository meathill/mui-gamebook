import { describe, it, expect } from 'vitest';
import { resolveConfig } from '../src/utils/config';

describe('resolveConfig', () => {
  it('正确解析默认端点与传入参数', () => {
    const cfg = resolveConfig({
      apiKey: 'mgb_test_key_123',
    });
    expect(cfg.apiKey).toBe('mgb_test_key_123');
    expect(cfg.endpoint).toBe('https://muistory.com/api/mcp');
  });

  it('显式 endpoint 参数覆盖默认值', () => {
    const cfg = resolveConfig({
      endpoint: 'https://staging.muistory.com/api/mcp',
    });
    expect(cfg.endpoint).toBe('https://staging.muistory.com/api/mcp');
  });
});
