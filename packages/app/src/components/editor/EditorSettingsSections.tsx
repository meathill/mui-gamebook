'use client';

import type { DisplayMode, Game, SiteTemplate, TextBoxPosition } from '@mui-gamebook/parser/src/types';
import TypewriterSpeedField from './TypewriterSpeedField';

type GameFieldChange = (field: string, value: string | number | boolean | Record<string, unknown>) => void;

interface PlaybackModeSectionProps {
  game: Pick<Game, 'display_mode' | 'text_box_position' | 'typewriter_speed'>;
  onChange: GameFieldChange;
}

/**
 * 播放模式设置：展示方式（经典/沉浸）+ 沉浸模式专属的文字框位置与逐字速度
 */
export function PlaybackModeSection({ game, onChange }: PlaybackModeSectionProps) {
  const currentMode = game.display_mode || 'classic';

  return (
    <div className="p-4 bg-amber-50 rounded-lg border border-amber-100 space-y-3">
      <h3 className="text-sm font-medium text-amber-900">播放模式</h3>
      <div>
        <label className="block text-xs text-amber-800 mb-1">展示方式</label>
        <div className="flex gap-2">
          {(
            [
              { value: 'classic', label: '经典（图+文+选项）' },
              { value: 'immersive', label: '沉浸（视觉小说）' },
            ] as { value: DisplayMode; label: string }[]
          ).map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => onChange('display_mode', opt.value)}
              className={`flex-1 px-3 py-2 text-sm rounded border transition ${
                currentMode === opt.value
                  ? 'bg-amber-600 text-white border-amber-600'
                  : 'bg-white text-gray-700 border-gray-300 hover:border-amber-400'
              }`}>
              {opt.label}
            </button>
          ))}
        </div>
      </div>
      {currentMode === 'immersive' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-amber-800 mb-1">文字框默认位置</label>
            <div className="flex gap-1">
              {(
                [
                  { value: 'bottom', label: '底部' },
                  { value: 'center', label: '居中' },
                  { value: 'top', label: '顶部' },
                ] as { value: TextBoxPosition; label: string }[]
              ).map((opt) => {
                const current = game.text_box_position || 'bottom';
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => onChange('text_box_position', opt.value)}
                    className={`flex-1 px-2 py-2 text-sm rounded border transition ${
                      current === opt.value
                        ? 'bg-amber-600 text-white border-amber-600'
                        : 'bg-white text-gray-700 border-gray-300 hover:border-amber-400'
                    }`}>
                    {opt.label}
                  </button>
                );
              })}
            </div>
            <p className="mt-1 text-[11px] text-amber-700/80">读者可在游戏内菜单临时覆盖。</p>
          </div>
          <div>
            <label className="block text-xs text-amber-800 mb-1">逐字速度（毫秒/字）</label>
            <TypewriterSpeedField
              value={game.typewriter_speed ?? 40}
              onChange={(value) => onChange('typewriter_speed', value)}
            />
            <p className="mt-1 text-[11px] text-amber-700/80">默认 40，数值越小越快。</p>
          </div>
        </div>
      )}
    </div>
  );
}

interface SiteTemplateSectionProps {
  game: Pick<Game, 'site_template' | 'subdomain'>;
  onChange: GameFieldChange;
}

/**
 * 站点模版设置：模版类型（默认/视觉小说）+ 视觉小说模版专属的二级域名
 */
export function SiteTemplateSection({ game, onChange }: SiteTemplateSectionProps) {
  return (
    <div className="p-4 bg-emerald-50 rounded-lg border border-emerald-100 space-y-3">
      <h3 className="text-sm font-medium text-emerald-900">站点模版</h3>
      <div>
        <label className="block text-xs text-emerald-800 mb-1">模版类型</label>
        <div className="flex gap-2">
          {(
            [
              { value: 'default', label: '默认' },
              { value: 'visual-novel', label: '视觉小说' },
            ] as { value: SiteTemplate; label: string }[]
          ).map((opt) => {
            const current = game.site_template || 'default';
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => onChange('site_template', opt.value)}
                className={`flex-1 px-3 py-2 text-sm rounded border transition ${
                  current === opt.value
                    ? 'bg-emerald-600 text-white border-emerald-600'
                    : 'bg-white text-gray-700 border-gray-300 hover:border-emerald-400'
                }`}>
                {opt.label}
              </button>
            );
          })}
        </div>
        <p className="mt-1 text-[11px] text-emerald-700/80">视觉小说模版支持路线图、多存档、设置等功能。</p>
      </div>
      {game.site_template === 'visual-novel' && (
        <div>
          <label className="block text-xs text-emerald-800 mb-1">二级域名前缀</label>
          <div className="flex items-center gap-1">
            <input
              type="text"
              value={game.subdomain || ''}
              onChange={(e) => onChange('subdomain', e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
              placeholder="如：55"
              className="w-24 rounded-md border-gray-300 border shadow-sm focus:border-emerald-500 focus:ring-emerald-500 p-2 text-sm"
            />
            <span className="text-sm text-gray-500">.muistory.com</span>
          </div>
          <p className="mt-1 text-[11px] text-emerald-700/80">绑定后主站会自动跳转到子站点。</p>
        </div>
      )}
    </div>
  );
}
