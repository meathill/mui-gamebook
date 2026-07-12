import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { GameSettings } from '@mui-gamebook/site-common/game-player';
import SettingsScreen from './SettingsScreen';

const settings: GameSettings = { textSpeed: 40, bgmVolume: 80, sfxVolume: 60, voiceVolume: 100 };

describe('SettingsScreen', () => {
  it('渲染当前设置值', () => {
    render(
      <SettingsScreen
        settings={settings}
        onUpdateSetting={vi.fn()}
        onReset={vi.fn()}
        onClose={vi.fn()}
      />,
    );

    expect(screen.getByText('40 ms/字')).toBeInTheDocument();
    expect(screen.getByText('80%')).toBeInTheDocument();
    expect(screen.getByText('60%')).toBeInTheDocument();
    expect(screen.getByText('100%')).toBeInTheDocument();
  });

  it('拖动文字速度滑块调用 onUpdateSetting("textSpeed", ...)', () => {
    const onUpdateSetting = vi.fn();
    const { container } = render(
      <SettingsScreen
        settings={settings}
        onUpdateSetting={onUpdateSetting}
        onReset={vi.fn()}
        onClose={vi.fn()}
      />,
    );

    const sliders = container.querySelectorAll('input[type="range"]');
    fireEvent.change(sliders[0], { target: { value: '20' } });

    expect(onUpdateSetting).toHaveBeenCalledWith('textSpeed', 20);
  });

  it('拖动 BGM/音效/语音音量滑块分别调用对应的 key', () => {
    const onUpdateSetting = vi.fn();
    const { container } = render(
      <SettingsScreen
        settings={settings}
        onUpdateSetting={onUpdateSetting}
        onReset={vi.fn()}
        onClose={vi.fn()}
      />,
    );

    const sliders = container.querySelectorAll('input[type="range"]');
    fireEvent.change(sliders[1], { target: { value: '50' } });
    fireEvent.change(sliders[2], { target: { value: '30' } });
    fireEvent.change(sliders[3], { target: { value: '10' } });

    expect(onUpdateSetting).toHaveBeenNthCalledWith(1, 'bgmVolume', 50);
    expect(onUpdateSetting).toHaveBeenNthCalledWith(2, 'sfxVolume', 30);
    expect(onUpdateSetting).toHaveBeenNthCalledWith(3, 'voiceVolume', 10);
  });

  it('点击恢复默认设置调用 onReset', () => {
    const onReset = vi.fn();
    render(
      <SettingsScreen
        settings={settings}
        onUpdateSetting={vi.fn()}
        onReset={onReset}
        onClose={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByText('恢复默认设置'));

    expect(onReset).toHaveBeenCalledTimes(1);
  });

  it('点击关闭按钮调用 onClose', () => {
    const onClose = vi.fn();
    const { container } = render(
      <SettingsScreen
        settings={settings}
        onUpdateSetting={vi.fn()}
        onReset={vi.fn()}
        onClose={onClose}
      />,
    );

    fireEvent.click(container.querySelectorAll('button')[0]);

    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
