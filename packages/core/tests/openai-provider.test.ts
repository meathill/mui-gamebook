import { beforeEach, describe, expect, it, vi } from 'vitest';

const { constructorSpy } = vi.hoisted(() => ({ constructorSpy: vi.fn() }));

vi.mock('openai', () => ({
  default: class {
    chat = { completions: { create: vi.fn() } };
    constructor(options: unknown) {
      constructorSpy(options);
    }
  },
}));

import { OpenAiProvider } from '../lib/openai-provider';

describe('OpenAiProvider headers（AI Gateway 鉴权场景）', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('配置 headers 时透传为 defaultHeaders，未配置时不传该字段', () => {
    new OpenAiProvider('sk-test', {}, { headers: { 'cf-aig-authorization': 'Bearer cf-token' } });
    expect(constructorSpy).toHaveBeenLastCalledWith({
      apiKey: 'sk-test',
      defaultHeaders: { 'cf-aig-authorization': 'Bearer cf-token' },
    });

    new OpenAiProvider('sk-test');
    expect(constructorSpy).toHaveBeenLastCalledWith({ apiKey: 'sk-test' });

    new OpenAiProvider('sk-test', {}, { headers: {} });
    expect(constructorSpy).toHaveBeenLastCalledWith({ apiKey: 'sk-test' });
  });
});
