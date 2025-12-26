import { describe, it, expect, vi, beforeEach } from 'vitest';
import type {
  AiProvider,
  FunctionDeclaration,
  ChatMessage,
  ChatWithToolsResult,
  TTSResult,
} from '@mui-gamebook/core/lib/ai-provider';

// 创建 Mock Provider 用于测试接口契约
function createMockProvider(): AiProvider {
  return {
    type: 'google',
    generateText: vi.fn().mockResolvedValue({
      text: '测试文本',
      usage: { promptTokens: 10, completionTokens: 20, totalTokens: 30 },
    }),
    generateImage: vi.fn().mockResolvedValue({
      buffer: Buffer.from('test'),
      type: 'image/png',
      usage: { promptTokens: 10, completionTokens: 20, totalTokens: 30 },
    }),
    generateMiniGame: vi.fn().mockResolvedValue({
      code: 'export default {}',
      usage: { promptTokens: 10, completionTokens: 20, totalTokens: 30 },
    }),
    chatWithTools: vi.fn().mockResolvedValue({
      text: '我来帮你修改',
      functionCalls: [{ name: 'updateScene', args: { sceneId: 'intro', content: '新内容' } }],
      usage: { promptTokens: 10, completionTokens: 20, totalTokens: 30 },
    } as ChatWithToolsResult),
    generateTTS: vi.fn().mockResolvedValue({
      buffer: Buffer.from('audio'),
      mimeType: 'audio/pcm',
    } as TTSResult),
  };
}

describe('AiProvider 接口', () => {
  let provider: AiProvider;

  beforeEach(() => {
    provider = createMockProvider();
  });

  describe('generateText', () => {
    it('返回文本和用量信息', async () => {
      const result = await provider.generateText('测试 prompt');

      expect(result.text).toBe('测试文本');
      expect(result.usage).toEqual({
        promptTokens: 10,
        completionTokens: 20,
        totalTokens: 30,
      });
    });

    it('支持 thinking 选项', async () => {
      await provider.generateText('prompt', { thinking: true });

      expect(provider.generateText).toHaveBeenCalledWith('prompt', { thinking: true });
    });
  });

  describe('generateImage', () => {
    it('返回图片 buffer 和用量信息', async () => {
      const result = await provider.generateImage('生成一张图片');

      expect(result.buffer).toBeInstanceOf(Buffer);
      expect(result.type).toBe('image/png');
      expect(result.usage.totalTokens).toBe(30);
    });

    it('支持宽高比选项', async () => {
      await provider.generateImage('prompt', { aspectRatio: '16:9' });

      expect(provider.generateImage).toHaveBeenCalledWith('prompt', { aspectRatio: '16:9' });
    });
  });

  describe('chatWithTools', () => {
    it('返回文本响应和 function calls', async () => {
      const messages: ChatMessage[] = [{ role: 'user', content: '帮我修改场景' }];
      const tools: FunctionDeclaration[] = [
        {
          name: 'updateScene',
          description: '更新场景',
          parameters: {
            type: 'object',
            properties: { sceneId: { type: 'string' }, content: { type: 'string' } },
            required: ['sceneId', 'content'],
          },
        },
      ];

      const result = await provider.chatWithTools!(messages, tools);

      expect(result.text).toBe('我来帮你修改');
      expect(result.functionCalls).toHaveLength(1);
      expect(result.functionCalls![0].name).toBe('updateScene');
      expect(result.functionCalls![0].args).toEqual({
        sceneId: 'intro',
        content: '新内容',
      });
    });
  });

  describe('generateTTS', () => {
    it('返回音频 buffer 和 MIME 类型', async () => {
      const result = await provider.generateTTS!('你好世界');

      expect(result.buffer).toBeInstanceOf(Buffer);
      expect(result.mimeType).toBe('audio/pcm');
    });

    it('支持语音名称参数', async () => {
      await provider.generateTTS!('文本', 'Aoede');

      expect(provider.generateTTS).toHaveBeenCalledWith('文本', 'Aoede');
    });
  });
});

describe('FunctionDeclaration 格式', () => {
  it('符合统一格式规范', () => {
    const declaration: FunctionDeclaration = {
      name: 'testFunction',
      description: '测试函数',
      parameters: {
        type: 'object',
        properties: {
          param1: { type: 'string', description: '参数1' },
          param2: { type: 'integer', description: '参数2' },
        },
        required: ['param1'],
      },
    };

    expect(declaration.name).toBe('testFunction');
    expect(declaration.parameters.type).toBe('object');
    expect(declaration.parameters.required).toContain('param1');
  });
});

describe('视频生成接口', () => {
  describe('startVideoGeneration', () => {
    it('返回 operationName 和用量信息', async () => {
      const mockProvider: AiProvider = {
        type: 'openai',
        generateText: vi.fn(),
        generateImage: vi.fn(),
        generateMiniGame: vi.fn(),
        startVideoGeneration: vi.fn().mockResolvedValue({
          operationName: 'video-job-123',
          usage: { promptTokens: 0, completionTokens: 0, totalTokens: 100000 },
        }),
        checkVideoGenerationStatus: vi.fn(),
      };

      const result = await mockProvider.startVideoGeneration!('生成一个视频');

      expect(result.operationName).toBe('video-job-123');
      expect(result.usage.totalTokens).toBe(100000);
    });

    it('支持配置参数', async () => {
      const mockProvider: AiProvider = {
        type: 'google',
        generateText: vi.fn(),
        generateImage: vi.fn(),
        generateMiniGame: vi.fn(),
        startVideoGeneration: vi.fn().mockResolvedValue({
          operationName: 'op-456',
          usage: { promptTokens: 0, completionTokens: 0, totalTokens: 50000 },
        }),
      };

      await mockProvider.startVideoGeneration!('prompt', {
        durationSeconds: 10,
        aspectRatio: '16:9',
      });

      expect(mockProvider.startVideoGeneration).toHaveBeenCalledWith('prompt', {
        durationSeconds: 10,
        aspectRatio: '16:9',
      });
    });
  });

  describe('checkVideoGenerationStatus', () => {
    it('返回 pending 状态', async () => {
      const mockProvider: AiProvider = {
        type: 'openai',
        generateText: vi.fn(),
        generateImage: vi.fn(),
        generateMiniGame: vi.fn(),
        checkVideoGenerationStatus: vi.fn().mockResolvedValue({
          done: false,
        }),
      };

      const result = await mockProvider.checkVideoGenerationStatus!('job-123');

      expect(result.done).toBe(false);
      expect(result.uri).toBeUndefined();
    });

    it('返回 completed 状态和视频 URI', async () => {
      const mockProvider: AiProvider = {
        type: 'google',
        generateText: vi.fn(),
        generateImage: vi.fn(),
        generateMiniGame: vi.fn(),
        checkVideoGenerationStatus: vi.fn().mockResolvedValue({
          done: true,
          uri: 'https://storage.example.com/video.mp4',
        }),
      };

      const result = await mockProvider.checkVideoGenerationStatus!('job-456');

      expect(result.done).toBe(true);
      expect(result.uri).toBe('https://storage.example.com/video.mp4');
    });

    it('返回 failed 状态和错误信息', async () => {
      const mockProvider: AiProvider = {
        type: 'openai',
        generateText: vi.fn(),
        generateImage: vi.fn(),
        generateMiniGame: vi.fn(),
        checkVideoGenerationStatus: vi.fn().mockResolvedValue({
          done: true,
          error: '视频生成失败：内容不合规',
        }),
      };

      const result = await mockProvider.checkVideoGenerationStatus!('job-789');

      expect(result.done).toBe(true);
      expect(result.error).toBe('视频生成失败：内容不合规');
    });
  });
});
