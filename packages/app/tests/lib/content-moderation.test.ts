import { beforeEach, describe, expect, it, vi } from 'vitest';

const { createAiMock } = vi.hoisted(() => ({
  createAiMock: vi.fn(),
}));

vi.mock('@/lib/ai-provider-factory', () => ({
  resolveTextProviderType: vi.fn(async () => 'google'),
  createAiProvider: createAiMock,
}));

import {
  checkBannedWords,
  moderateGameContent,
  ModerationError,
  moderatePublishIfNeeded,
} from '@/lib/content-moderation';

function mockAiText(text: string) {
  createAiMock.mockReset();
  createAiMock.mockResolvedValue({
    generateText: vi.fn(async () => ({ text, usage: {}, model: 'test-model' })),
  });
}

describe('checkBannedWords', () => {
  it('命中明确违禁词', () => {
    expect(checkBannedWords('这是一个口交场景的故事')).toEqual(['口交']);
  });

  it('干净文本不命中', () => {
    expect(checkBannedWords('勇者踏上旅途，讨伐恶龙')).toEqual([]);
  });

  it('大小写不敏感', () => {
    expect(checkBannedWords('some HENTAI content')).toEqual(['hentai']);
  });

  it('最多返回 5 个命中词', () => {
    const text = '口交 肛交 乳交 手淫 自慰 精液';
    expect(checkBannedWords(text)).toHaveLength(5);
  });
});

describe('moderateGameContent', () => {
  beforeEach(() => {
    createAiMock.mockReset();
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  it('违禁词命中直接拒绝，不调用 LLM', async () => {
    const verdict = await moderateGameContent({
      title: '测试',
      description: null,
      backgroundStory: null,
      content: '包含乱伦情节',
    });
    expect(verdict.pass).toBe(false);
    expect(verdict.source).toBe('banned-words');
    expect(verdict.reason).toContain('乱伦');
    expect(createAiMock).not.toHaveBeenCalled();
  });

  it('LLM 判定 pass 时通过', async () => {
    mockAiText('{"verdict":"pass","reason":null}');
    const verdict = await moderateGameContent({
      title: '测试',
      description: null,
      backgroundStory: null,
      content: '正常冒险故事',
    });
    expect(verdict.pass).toBe(true);
    expect(verdict.source).toBe('ai');
  });

  it('LLM 判定 reject 时拒绝并给出理由', async () => {
    mockAiText('{"verdict":"reject","reason":"包含露骨色情描写"}');
    const verdict = await moderateGameContent({
      title: '测试',
      description: null,
      backgroundStory: null,
      content: '正文',
    });
    expect(verdict.pass).toBe(false);
    expect(verdict.reason).toContain('露骨色情');
  });

  it('LLM 输出无法解析时 fail-open', async () => {
    mockAiText('抱歉，我无法判断这段内容。');
    const verdict = await moderateGameContent({
      title: '测试',
      description: null,
      backgroundStory: null,
      content: '正文',
    });
    expect(verdict.pass).toBe(true);
    expect(verdict.source).toBe('skipped');
  });

  it('LLM 调用抛错时 fail-open', async () => {
    createAiMock.mockRejectedValue(new Error('API key missing'));
    const verdict = await moderateGameContent({
      title: '测试',
      description: null,
      backgroundStory: null,
      content: '正文',
    });
    expect(verdict.pass).toBe(true);
    expect(verdict.source).toBe('skipped');
  });

  it('LLM 输出带 code fence 也能解析', async () => {
    mockAiText('```json\n{"verdict":"reject","reason":"色情内容"}\n```');
    const verdict = await moderateGameContent({
      title: '测试',
      description: null,
      backgroundStory: null,
      content: '正文',
    });
    expect(verdict.pass).toBe(false);
    expect(verdict.reason).toBe('色情内容');
  });
});

describe('moderatePublishIfNeeded', () => {
  const cleanBase = {
    published: true,
    title: '冒险故事',
    description: null,
    backgroundStory: null,
  };

  beforeEach(() => {
    createAiMock.mockReset();
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  it('草稿不审查，不调用 LLM', async () => {
    mockAiText('{"verdict":"reject","reason":"x"}');
    await moderatePublishIfNeeded({
      next: { ...cleanBase, published: false, content: '任何内容' },
      current: { published: false, title: null, description: null, backgroundStory: null, content: null },
    });
    expect(createAiMock).not.toHaveBeenCalled();
  });

  it('首次发布触发审查，reject 抛 ModerationError', async () => {
    mockAiText('{"verdict":"reject","reason":"色情"}');
    await expect(
      moderatePublishIfNeeded({
        next: { ...cleanBase, content: '正文' },
        current: { published: false, title: null, description: null, backgroundStory: null, content: null },
      }),
    ).rejects.toThrow(ModerationError);
  });

  it('已发布且内容无变化的重存不审查（自动保存免费）', async () => {
    await moderatePublishIfNeeded({
      next: { ...cleanBase, content: '同样正文' },
      current: { published: true, title: '冒险故事', description: null, backgroundStory: null, content: '同样正文' },
    });
    expect(createAiMock).not.toHaveBeenCalled();
  });

  it('已发布作品正文变更触发审查', async () => {
    mockAiText('{"verdict":"pass","reason":null}');
    await moderatePublishIfNeeded({
      next: { ...cleanBase, content: '新正文' },
      current: { published: true, title: '冒险故事', description: null, backgroundStory: null, content: '旧正文' },
    });
    expect(createAiMock).toHaveBeenCalledTimes(1);
  });

  it('已发布作品元数据变更触发审查（正文不变）', async () => {
    mockAiText('{"verdict":"pass","reason":null}');
    await moderatePublishIfNeeded({
      next: { ...cleanBase, title: '新标题', content: '旧正文' },
      current: { published: true, title: '冒险故事', description: null, backgroundStory: null, content: '旧正文' },
    });
    expect(createAiMock).toHaveBeenCalledTimes(1);
  });
});
