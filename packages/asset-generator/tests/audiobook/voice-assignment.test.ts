import { describe, it, expect } from 'vitest';
import type { Game } from '@mui-gamebook/parser';
import { MIMO_VOICE_IDS } from '@mui-gamebook/core/lib/voice-config';
import { resolveVoiceForSpeaker } from '../../src/lib/audiobook/voice-assignment';

const CHARACTER_FALLBACK_VOICE_IDS = ['冰糖', '茉莉', '苏打', '白桦'];

function makeGame(characters?: Game['ai']['characters']): Game {
  return {
    slug: 'test-game',
    title: 'Test Game',
    initialState: {},
    ai: { characters },
    scenes: {},
  };
}

describe('resolveVoiceForSpeaker', () => {
  it('returns the same voice for the same characterId across repeated calls', () => {
    const game = makeGame();
    const first = resolveVoiceForSpeaker('wolf', game);
    const second = resolveVoiceForSpeaker('wolf', game);
    const third = resolveVoiceForSpeaker('wolf', game);
    expect(first).toBe(second);
    expect(second).toBe(third);
  });

  it('prefers an explicit voice_name over the hash fallback', () => {
    const game = makeGame({ wolf: { name: '大灰狼', voice_name: 'Dean' } });
    expect(resolveVoiceForSpeaker('wolf', game)).toBe('Dean');
  });

  it('ignores an invalid explicit voice_name and falls back to the hash pool', () => {
    const game = makeGame({ wolf: { name: '大灰狼', voice_name: 'not-a-real-voice' } });
    expect(CHARACTER_FALLBACK_VOICE_IDS).toContain(resolveVoiceForSpeaker('wolf', game));
  });

  it('honors game.ai.characters.narrator.voice_name for the narrator', () => {
    const game = makeGame({ narrator: { name: '旁白', voice_name: '白桦' } });
    expect(resolveVoiceForSpeaker('narrator', game)).toBe('白桦');
  });

  it('falls back to mimo_default for the narrator when no override exists', () => {
    const game = makeGame();
    expect(resolveVoiceForSpeaker('narrator', game)).toBe('mimo_default');
  });

  it('falls back to mimo_default for the narrator when the override voice_name is invalid', () => {
    const game = makeGame({ narrator: { name: '旁白', voice_name: 'not-a-real-voice' } });
    expect(resolveVoiceForSpeaker('narrator', game)).toBe('mimo_default');
  });

  it('never assigns the narrator into the character fallback pool', () => {
    // 即使没有配置 narrator，也不能落到冰糖/茉莉/苏打/白桦，必须是 mimo_default
    const game = makeGame();
    const voice = resolveVoiceForSpeaker('narrator', game);
    expect(voice).toBe('mimo_default');
    expect(CHARACTER_FALLBACK_VOICE_IDS).not.toContain(voice);
  });

  it('keeps unconfigured-character fallback within the four Chinese-tagged voices only', () => {
    const game = makeGame();
    const englishVoices = ['Mia', 'Chloe', 'Milo', 'Dean'];
    // 抽样一批不同的 speakerId，确保回退池里从不出现英文音色
    const speakerIds = ['wolf', 'lrrh', 'mom', 'grandma', 'zhang_daxia', 'a', 'b', 'c', 'd', 'e'];
    for (const speakerId of speakerIds) {
      const voice = resolveVoiceForSpeaker(speakerId, game);
      expect(CHARACTER_FALLBACK_VOICE_IDS).toContain(voice);
      expect(englishVoices).not.toContain(voice);
      expect(MIMO_VOICE_IDS as readonly string[]).toContain(voice);
    }
  });
});
