import { describe, it, expect } from 'vitest';
import {
  buildImagePrompt,
  buildAudioPrompt,
  extractCharacterIds,
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
      },
      villain: {
        name: '魔王',
        description: '黑暗势力的统治者',
        image_prompt: '身披黑袍的魔法师，红色眼睛',
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
});
