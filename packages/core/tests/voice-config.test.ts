import { describe, expect, it } from 'vitest';
import {
  DEFAULT_GOOGLE_VOICE,
  DEFAULT_MIMO_VOICE,
  DEFAULT_OPENAI_VOICE,
  GOOGLE_VOICES,
  MIMO_VOICES,
  OPENAI_VOICES,
  getAvailableVoiceIds,
  getAvailableVoices,
  getDefaultVoice,
  getVoiceById,
  isValidVoiceId,
} from '../lib/voice-config';

describe('voice-config 三选一分发（google/openai/mimo）', () => {
  it('getAvailableVoices 按 provider 返回对应数组', () => {
    expect(getAvailableVoices('google')).toBe(GOOGLE_VOICES);
    expect(getAvailableVoices('openai')).toBe(OPENAI_VOICES);
    expect(getAvailableVoices('mimo')).toBe(MIMO_VOICES);
  });

  it('getAvailableVoiceIds 与对应数组的 id 一致', () => {
    expect(getAvailableVoiceIds('mimo')).toEqual(MIMO_VOICES.map((v) => v.id));
  });

  it('isValidVoiceId 只认对应 provider 的音色，不同 provider 之间不串音', () => {
    expect(isValidVoiceId('mimo_default', 'mimo')).toBe(true);
    expect(isValidVoiceId('mimo_default', 'google')).toBe(false);
    expect(isValidVoiceId('Aoede', 'google')).toBe(true);
    expect(isValidVoiceId('Aoede', 'mimo')).toBe(false);
  });

  it('getVoiceById 在三个 provider 的音色库里全局查找', () => {
    expect(getVoiceById('marin')?.id).toBe('marin');
    expect(getVoiceById('mimo_default')?.id).toBe('mimo_default');
    expect(getVoiceById('Aoede')?.id).toBe('Aoede');
    expect(getVoiceById('not-a-real-voice')).toBeUndefined();
  });

  it('getDefaultVoice 按 provider 返回默认音色', () => {
    expect(getDefaultVoice('google')).toBe(DEFAULT_GOOGLE_VOICE);
    expect(getDefaultVoice('openai')).toBe(DEFAULT_OPENAI_VOICE);
    expect(getDefaultVoice('mimo')).toBe(DEFAULT_MIMO_VOICE);
  });

  it('MiMo 音色 ID 与 Google/OpenAI 音色 ID 不重复（getVoiceById 全局查找不会取错）', () => {
    const mimoIds = new Set(MIMO_VOICES.map((v) => v.id));
    const otherIds = [...GOOGLE_VOICES, ...OPENAI_VOICES].map((v) => v.id);
    for (const id of otherIds) {
      expect(mimoIds.has(id)).toBe(false);
    }
  });
});
