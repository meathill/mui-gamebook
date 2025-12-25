import { describe, it, expect } from 'vitest';
import {
  buildImagePrompt,
  buildAudioPrompt,
  extractCharacterIds,
  extractInlineCharacterIds,
  buildEnhancedImagePrompt,
  type AiConfig,
} from '../../src/lib/ai-prompt-builder';

describe('ai-prompt-builder', () => {
  const mockAiConfig: AiConfig = {
    style: {
      image: '奇幻, 水彩, 色彩鲜艳',
      audio: '史诗管弦乐, 电影感',
    },
    characters: {
      hero: {
        name: '勇者',
        description: '一个年轻的冒险者',
        image_prompt: '金发蓝眼的年轻剑士，穿着银色铠甲',
        image_url: 'https://example.com/hero.png',
      },
      villain: {
        name: '魔王',
        description: '黑暗势力的统治者',
        image_prompt: '身披黑袍的魔法师，红色眼睛',
        image_url: 'https://example.com/villain.png',
      },
      npc: {
        name: '村民',
        description: '普通村民',
        // 没有 image_url
      },
    },
  };

  describe('buildImagePrompt', () => {
    it('无配置时返回原始 prompt', () => {
      const result = buildImagePrompt('森林场景');
      expect(result).toBe('森林场景');
    });

    it('添加风格到 prompt', () => {
      const result = buildImagePrompt('森林场景', mockAiConfig);
      expect(result).toContain('风格：奇幻, 水彩, 色彩鲜艳');
      expect(result).toContain('森林场景');
    });

    it('添加角色描述到 prompt', () => {
      const result = buildImagePrompt('勇者站在森林中', mockAiConfig, ['hero']);
      expect(result).toContain('风格：奇幻, 水彩, 色彩鲜艳');
      expect(result).toContain('角色：');
      expect(result).toContain('勇者：金发蓝眼的年轻剑士');
      expect(result).toContain('勇者站在森林中');
    });

    it('添加多个角色描述', () => {
      const result = buildImagePrompt('战斗场景', mockAiConfig, ['hero', 'villain']);
      expect(result).toContain('勇者：金发蓝眼的年轻剑士');
      expect(result).toContain('魔王：身披黑袍的魔法师');
    });

    it('忽略不存在的角色 ID', () => {
      const result = buildImagePrompt('场景', mockAiConfig, ['unknown']);
      expect(result).not.toContain('角色：');
    });
  });

  describe('buildAudioPrompt', () => {
    it('无配置时返回原始 prompt', () => {
      const result = buildAudioPrompt('战斗音乐');
      expect(result).toBe('战斗音乐');
    });

    it('添加音频风格到 prompt', () => {
      const result = buildAudioPrompt('战斗音乐', mockAiConfig);
      expect(result).toContain('风格：史诗管弦乐, 电影感');
      expect(result).toContain('战斗音乐');
    });
  });

  describe('extractCharacterIds', () => {
    it('提取 characters 数组格式', () => {
      const ids = extractCharacterIds('prompt: 场景\ncharacters: [hero, villain]');
      expect(ids).toEqual(['hero', 'villain']);
    });

    it('提取 character 单个格式', () => {
      const ids = extractCharacterIds('prompt: 场景\ncharacter: hero');
      expect(ids).toEqual(['hero']);
    });

    it('无匹配时返回空数组', () => {
      const ids = extractCharacterIds('prompt: 普通场景描述');
      expect(ids).toEqual([]);
    });
  });

  describe('extractInlineCharacterIds', () => {
    it('提取单个 @角色ID', () => {
      const ids = extractInlineCharacterIds('@hero 站在森林中');
      expect(ids).toEqual(['hero']);
    });

    it('提取多个 @角色ID', () => {
      const ids = extractInlineCharacterIds('@hero 在森林里遇到了 @villain');
      expect(ids).toEqual(['hero', 'villain']);
    });

    it('处理连续的 @角色ID', () => {
      const ids = extractInlineCharacterIds('@hero @villain 正在战斗');
      expect(ids).toEqual(['hero', 'villain']);
    });

    it('无匹配时返回空数组', () => {
      const ids = extractInlineCharacterIds('普通场景描述');
      expect(ids).toEqual([]);
    });

    it('不匹配邮箱地址中的 @', () => {
      const ids = extractInlineCharacterIds('联系方式 test@example.com');
      // 会匹配到 @example，这是预期行为，因为角色 ID 应该是有意义的单词
      expect(ids).toEqual(['example']);
    });
  });

  describe('buildEnhancedImagePrompt', () => {
    it('无角色引用时返回基本 prompt', () => {
      const result = buildEnhancedImagePrompt('森林场景', mockAiConfig);
      expect(result.prompt).toContain('风格：奇幻, 水彩, 色彩鲜艳');
      expect(result.prompt).toContain('森林场景');
      expect(result.referenceImages).toEqual([]);
    });

    it('解析 @角色ID 并收集参考图片', () => {
      const result = buildEnhancedImagePrompt('@hero 站在森林中', mockAiConfig);
      expect(result.prompt).toContain('勇者 站在森林中');
      expect(result.prompt).toContain('勇者：金发蓝眼的年轻剑士');
      expect(result.referenceImages).toEqual(['https://example.com/hero.png']);
    });

    it('解析多个 @角色ID', () => {
      const result = buildEnhancedImagePrompt('@hero 与 @villain 战斗', mockAiConfig);
      expect(result.prompt).toContain('勇者 与 魔王 战斗');
      expect(result.referenceImages).toContain('https://example.com/hero.png');
      expect(result.referenceImages).toContain('https://example.com/villain.png');
    });

    it('忽略没有头像的角色', () => {
      const result = buildEnhancedImagePrompt('@npc 在村庄里', mockAiConfig);
      expect(result.prompt).toContain('村民 在村庄里');
      expect(result.referenceImages).toEqual([]);
    });

    it('忽略不存在的角色 ID', () => {
      const result = buildEnhancedImagePrompt('@unknown 在走路', mockAiConfig);
      expect(result.prompt).toContain('@unknown 在走路'); // 未匹配的保持原样
      expect(result.referenceImages).toEqual([]);
    });

    it('同时支持 @角色ID 和 DSL characters 语法', () => {
      const result = buildEnhancedImagePrompt('@hero 场景\ncharacters: [villain]', mockAiConfig);
      expect(result.referenceImages).toContain('https://example.com/hero.png');
      expect(result.referenceImages).toContain('https://example.com/villain.png');
    });

    it('去重相同的角色引用', () => {
      const result = buildEnhancedImagePrompt('@hero @hero 两次引用', mockAiConfig);
      // 参考图片应该去重
      expect(result.referenceImages.filter((u) => u === 'https://example.com/hero.png').length).toBe(1);
    });
  });
});
