import { describe, it, expect } from 'vitest';
import { MIMO_VOICE_IDS } from '../../lib/voice-config';
import { resolveVoiceForSpeaker } from '../../lib/audiobook/voice-assignment';
import type { CharacterRoster } from '../../lib/audiobook/types';

const CHARACTER_FALLBACK_VOICE_IDS = ['冰糖', '茉莉', '苏打', '白桦'];

describe('resolveVoiceForSpeaker', () => {
  it('returns the same voice for the same characterId across repeated calls', () => {
    const roster: CharacterRoster = {};
    const first = resolveVoiceForSpeaker('wolf', roster);
    const second = resolveVoiceForSpeaker('wolf', roster);
    expect(first).toBe(second);
  });

  it('prefers an explicit voice_name over the hash fallback', () => {
    const roster: CharacterRoster = { wolf: { name: '大灰狼', voice_name: 'Dean' } };
    expect(resolveVoiceForSpeaker('wolf', roster)).toBe('Dean');
  });

  it('ignores an invalid explicit voice_name and falls back to the hash pool', () => {
    const roster: CharacterRoster = { wolf: { name: '大灰狼', voice_name: 'not-a-real-voice' } };
    expect(CHARACTER_FALLBACK_VOICE_IDS).toContain(resolveVoiceForSpeaker('wolf', roster));
  });

  it('honors roster.narrator.voice_name for the narrator', () => {
    const roster: CharacterRoster = { narrator: { name: '旁白', voice_name: '白桦' } };
    expect(resolveVoiceForSpeaker('narrator', roster)).toBe('白桦');
  });

  it('falls back to mimo_default for the narrator when no override exists', () => {
    expect(resolveVoiceForSpeaker('narrator', {})).toBe('mimo_default');
  });

  it('never assigns the narrator into the character fallback pool', () => {
    const voice = resolveVoiceForSpeaker('narrator', {});
    expect(voice).toBe('mimo_default');
    expect(CHARACTER_FALLBACK_VOICE_IDS).not.toContain(voice);
  });

  it('keeps unconfigured-character fallback within the four Chinese-tagged voices only', () => {
    const englishVoices = ['Mia', 'Chloe', 'Milo', 'Dean'];
    const speakerIds = ['wolf', 'lrrh', 'mom', 'grandma', 'zhang_daxia', 'a', 'b', 'c', 'd', 'e'];
    for (const speakerId of speakerIds) {
      const voice = resolveVoiceForSpeaker(speakerId, {});
      expect(CHARACTER_FALLBACK_VOICE_IDS).toContain(voice);
      expect(englishVoices).not.toContain(voice);
      expect(MIMO_VOICE_IDS as readonly string[]).toContain(voice);
    }
  });
});
