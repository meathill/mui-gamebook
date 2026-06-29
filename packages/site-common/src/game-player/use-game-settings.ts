'use client';

import { useState, useCallback, useEffect } from 'react';

/**
 * 游戏设置
 */
export interface GameSettings {
  /** 文字显示速度（毫秒/字），默认 40 */
  textSpeed: number;
  /** BGM 音量 0-100 */
  bgmVolume: number;
  /** 音效音量 0-100 */
  sfxVolume: number;
  /** 语音音量 0-100 */
  voiceVolume: number;
}

const DEFAULT_SETTINGS: GameSettings = {
  textSpeed: 40,
  bgmVolume: 80,
  sfxVolume: 80,
  voiceVolume: 100,
};

function buildStorageKey(gameSlug: string): string {
  return `mgb_settings_${gameSlug}`;
}

function loadSettings(gameSlug: string): GameSettings {
  if (typeof window === 'undefined') return { ...DEFAULT_SETTINGS };
  const raw = localStorage.getItem(buildStorageKey(gameSlug));
  if (!raw) return { ...DEFAULT_SETTINGS };
  try {
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

function persistSettings(gameSlug: string, settings: GameSettings): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(buildStorageKey(gameSlug), JSON.stringify(settings));
}

export interface UseGameSettingsReturn {
  settings: GameSettings;
  updateSetting<K extends keyof GameSettings>(key: K, value: GameSettings[K]): void;
  resetSettings(): void;
}

/**
 * 游戏设置 Hook
 * 最小化设置项，持久化到 localStorage
 */
export function useGameSettings(gameSlug: string): UseGameSettingsReturn {
  const [settings, setSettings] = useState<GameSettings>(DEFAULT_SETTINGS);

  useEffect(() => {
    setSettings(loadSettings(gameSlug));
  }, [gameSlug]);

  const updateSetting = useCallback(
    <K extends keyof GameSettings>(key: K, value: GameSettings[K]) => {
      setSettings((prev) => {
        const next = { ...prev, [key]: value };
        persistSettings(gameSlug, next);
        return next;
      });
    },
    [gameSlug],
  );

  const resetSettings = useCallback(() => {
    const defaults = { ...DEFAULT_SETTINGS };
    setSettings(defaults);
    persistSettings(gameSlug, defaults);
  }, [gameSlug]);

  return { settings, updateSetting, resetSettings };
}

export { DEFAULT_SETTINGS };
