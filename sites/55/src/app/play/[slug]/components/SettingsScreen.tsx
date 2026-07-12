'use client';

import { XIcon, ArrowCounterClockwiseIcon } from '@phosphor-icons/react';
import type { GameSettings } from '@mui-gamebook/site-common/game-player';

interface Props {
  settings: GameSettings;
  onUpdateSetting: <K extends keyof GameSettings>(key: K, value: GameSettings[K]) => void;
  onReset: () => void;
  onClose: () => void;
}

/**
 * 设置界面
 * 最小化设置项：文字速度 + 音量控制
 */
export default function SettingsScreen({ settings, onUpdateSetting, onReset, onClose }: Props) {
  return (
    <div className="panel-overlay">
      <div className="panel w-full max-w-md mx-4 p-6 animate-fade-in">
        {/* 头部 */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold">设置</h2>
          <button
            onClick={onClose}
            className="hud-btn">
            <XIcon size={20} />
          </button>
        </div>

        {/* 设置项 */}
        <div className="space-y-5">
          {/* 文字速度 */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium">文字速度</label>
              <span className="text-sm text-muted">{settings.textSpeed} ms/字</span>
            </div>
            <input
              type="range"
              min={10}
              max={120}
              step={5}
              value={settings.textSpeed}
              onChange={(e) => onUpdateSetting('textSpeed', Number(e.target.value))}
              className="w-full"
            />
            <div className="flex justify-between text-[11px] text-muted mt-1">
              <span>快</span>
              <span>慢</span>
            </div>
          </div>

          {/* BGM 音量 */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium">BGM 音量</label>
              <span className="text-sm text-muted">{settings.bgmVolume}%</span>
            </div>
            <input
              type="range"
              min={0}
              max={100}
              step={5}
              value={settings.bgmVolume}
              onChange={(e) => onUpdateSetting('bgmVolume', Number(e.target.value))}
              className="w-full"
            />
          </div>

          {/* 音效音量 */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium">音效音量</label>
              <span className="text-sm text-muted">{settings.sfxVolume}%</span>
            </div>
            <input
              type="range"
              min={0}
              max={100}
              step={5}
              value={settings.sfxVolume}
              onChange={(e) => onUpdateSetting('sfxVolume', Number(e.target.value))}
              className="w-full"
            />
          </div>

          {/* 语音音量 */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium">语音音量</label>
              <span className="text-sm text-muted">{settings.voiceVolume}%</span>
            </div>
            <input
              type="range"
              min={0}
              max={100}
              step={5}
              value={settings.voiceVolume}
              onChange={(e) => onUpdateSetting('voiceVolume', Number(e.target.value))}
              className="w-full"
            />
          </div>
        </div>

        {/* 重置按钮 */}
        <div className="mt-8 pt-4 border-t border-border">
          <button
            onClick={onReset}
            className="btn btn-ghost w-full text-sm">
            <ArrowCounterClockwiseIcon size={14} />
            恢复默认设置
          </button>
        </div>
      </div>
    </div>
  );
}
