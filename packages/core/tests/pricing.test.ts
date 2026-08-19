import { describe, expect, it } from 'vitest';
import { calculateBilledTokens, calculateCostUsd, getModelPricingRate } from '../lib/pricing';

describe('pricing.ts 计费核算模块', () => {
  describe('getModelPricingRate', () => {
    it('精准匹配已知模型费率', () => {
      const ds = getModelPricingRate('deepseek-v4-flash');
      expect(ds.inputPricePerMillion).toBe(0.3);
      expect(ds.outputPricePerMillion).toBe(0.9);

      const luna = getModelPricingRate('gpt-5.6-luna');
      expect(luna.inputPricePerMillion).toBe(0.2);
      expect(luna.outputPricePerMillion).toBe(0.8);

      const sonnet = getModelPricingRate('claude-sonnet-5');
      expect(sonnet.inputPricePerMillion).toBe(3.0);
      expect(sonnet.outputPricePerMillion).toBe(15.0);
    });

    it('根据模态提供 fallback', () => {
      const img = getModelPricingRate('unknown-image-model', 'image_generation');
      expect(img.pricePerCall).toBe(0.03);

      const vid = getModelPricingRate('unknown-video-model', 'video_generation');
      expect(vid.pricePerCall).toBe(0.35);
    });
  });

  describe('calculateCostUsd & calculateBilledTokens', () => {
    it('DeepSeek V4 Flash: 1000 input tokens + 2000 output tokens', () => {
      const usage = {
        type: 'text_generation',
        model: 'deepseek-v4-flash',
        promptTokens: 1000,
        completionTokens: 2000,
      };
      // Cost = (1000 * 0.30 + 2000 * 0.90) / 1,000,000 = (300 + 1800) / 1,000,000 = $0.0021 USD
      const cost = calculateCostUsd(usage);
      expect(cost).toBeCloseTo(0.0021, 6);

      // Billed Tokens = cost * 1,000,000 = 2100 tokens
      const tokens = calculateBilledTokens(usage);
      expect(tokens).toBe(2100);
    });

    it('GPT-5.6 Luna: 1000 input tokens + 2000 output tokens', () => {
      const usage = {
        type: 'text_generation',
        model: 'gpt-5.6-luna',
        promptTokens: 1000,
        completionTokens: 2000,
      };
      // Cost = (1000 * 0.20 + 2000 * 0.80) / 1,000,000 = (200 + 1600) / 1,000,000 = $0.0018 USD
      const cost = calculateCostUsd(usage);
      expect(cost).toBeCloseTo(0.0018, 6);

      // Billed Tokens = cost * 1,000,000 = 1800 tokens
      const tokens = calculateBilledTokens(usage);
      expect(tokens).toBe(1800);
    });

    it('Claude Sonnet 5: 1000 input tokens + 1000 output tokens', () => {
      const usage = {
        type: 'text_generation',
        model: 'claude-sonnet-5',
        promptTokens: 1000,
        completionTokens: 1000,
      };
      // Cost = (1000 * 3.0 + 1000 * 15.0) / 1,000,000 = 18000 / 1,000,000 = $0.018 USD
      const cost = calculateCostUsd(usage);
      expect(cost).toBeCloseTo(0.018, 6);

      // Billed Tokens = 18,000 tokens (18k tokens, 准确体现比轻量模型昂贵的实际成本)
      const tokens = calculateBilledTokens(usage);
      expect(tokens).toBe(18000);
    });

    it('生图: Gemini Flash Lite Image 单次生成', () => {
      const usage = {
        type: 'image_generation',
        model: 'gemini-3.1-flash-lite-image',
      };
      // Cost = $0.03 USD -> Billed Tokens = 30,000 tokens (0.03 M tokens)
      expect(calculateCostUsd(usage)).toBe(0.03);
      expect(calculateBilledTokens(usage)).toBe(30000);
    });

    it('生图: GPT Image 1.5 单次生成', () => {
      const usage = {
        type: 'image_generation',
        model: 'gpt-image-1.5',
      };
      // Cost = $0.04 USD -> Billed Tokens = 40,000 tokens (0.04 M tokens)
      expect(calculateCostUsd(usage)).toBe(0.04);
      expect(calculateBilledTokens(usage)).toBe(40000);
    });

    it('TTS: MiMo TTS 1000 字符', () => {
      const usage = {
        type: 'audio_generation',
        model: 'mimo-v2.5-tts',
        promptTokens: 1000, // 1000 字符
      };
      // Cost = 1000 * 0.14 / 1,000,000 = $0.00014 USD
      // Billed Tokens = 140 tokens
      expect(calculateCostUsd(usage)).toBeCloseTo(0.00014, 6);
      expect(calculateBilledTokens(usage)).toBe(140);
    });

    it('TTS: OpenAI TTS 1000 字符', () => {
      const usage = {
        type: 'audio_generation',
        model: 'gpt-4o-mini-tts',
        promptTokens: 1000,
      };
      // Cost = 1000 * 15.0 / 1,000,000 = $0.015 USD
      // Billed Tokens = 15,000 tokens
      expect(calculateCostUsd(usage)).toBeCloseTo(0.015, 6);
      expect(calculateBilledTokens(usage)).toBe(15000);
    });

    it('视频生成: Veo 单次生成', () => {
      const usage = {
        type: 'video_generation',
        model: 'veo-3.1-fast-generate-preview',
      };
      // Cost = $0.35 USD -> Billed Tokens = 350,000 tokens (0.35 M tokens)
      expect(calculateCostUsd(usage)).toBe(0.35);
      expect(calculateBilledTokens(usage)).toBe(350000);
    });

    it('音乐生成: Suno v4 单次生成', () => {
      const usage = {
        type: 'music_generation',
        model: 'suno-v4',
      };
      // Cost = $0.10 USD -> Billed Tokens = 100,000 tokens (0.1 M tokens)
      expect(calculateCostUsd(usage)).toBe(0.1);
      expect(calculateBilledTokens(usage)).toBe(100000);
    });

    it('音效生成: ElevenLabs SFX 单次生成', () => {
      const usage = {
        type: 'sfx_generation',
        model: 'eleven-sfx-v1',
      };
      // Cost = $0.05 USD -> Billed Tokens = 50,000 tokens (0.05 M tokens)
      expect(calculateCostUsd(usage)).toBe(0.05);
      expect(calculateBilledTokens(usage)).toBe(50000);
    });
  });
});
