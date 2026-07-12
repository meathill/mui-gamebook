import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useGameSettings, DEFAULT_SETTINGS } from '../src/game-player/use-game-settings';

describe('useGameSettings', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('没有持久化数据时返回默认设置', async () => {
    const { result } = renderHook(() => useGameSettings('settings-a'));

    await waitFor(() => expect(result.current.settings).toEqual(DEFAULT_SETTINGS));
  });

  it('updateSetting 更新单项设置并持久化', async () => {
    const { result, unmount } = renderHook(() => useGameSettings('settings-b'));
    await waitFor(() => expect(result.current.settings).toEqual(DEFAULT_SETTINGS));

    act(() => result.current.updateSetting('bgmVolume', 30));

    expect(result.current.settings.bgmVolume).toBe(30);
    expect(result.current.settings.sfxVolume).toBe(DEFAULT_SETTINGS.sfxVolume);

    unmount();
    const { result: result2 } = renderHook(() => useGameSettings('settings-b'));
    await waitFor(() => expect(result2.current.settings.bgmVolume).toBe(30));
  });

  it('resetSettings 恢复默认设置', async () => {
    const { result } = renderHook(() => useGameSettings('settings-c'));
    await waitFor(() => expect(result.current.settings).toEqual(DEFAULT_SETTINGS));
    act(() => result.current.updateSetting('textSpeed', 10));

    act(() => result.current.resetSettings());

    expect(result.current.settings).toEqual(DEFAULT_SETTINGS);
  });

  it('损坏的持久化数据回退到默认设置', async () => {
    localStorage.setItem('mgb_settings_settings-d', 'not json');

    const { result } = renderHook(() => useGameSettings('settings-d'));

    await waitFor(() => expect(result.current.settings).toEqual(DEFAULT_SETTINGS));
  });

  it('不同 gameSlug 的设置互不干扰', async () => {
    const { result: a } = renderHook(() => useGameSettings('settings-e'));
    await waitFor(() => expect(a.current.settings).toEqual(DEFAULT_SETTINGS));
    act(() => a.current.updateSetting('voiceVolume', 50));

    const { result: b } = renderHook(() => useGameSettings('settings-f'));
    await waitFor(() => expect(b.current.settings).toEqual(DEFAULT_SETTINGS));

    expect(b.current.settings.voiceVolume).toBe(DEFAULT_SETTINGS.voiceVolume);
  });
});
