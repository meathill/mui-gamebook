'use client';

import { MusicNotesIcon, MusicNotesMinusIcon } from '@phosphor-icons/react';

interface BgmToggleProps {
  enabled: boolean;
  onToggle: () => void;
  /** standard：白底页头；immersive：沉浸式深色胶囊 */
  variant?: 'standard' | 'immersive';
}

/** 背景音乐开关 */
export default function BgmToggle({ enabled, onToggle, variant = 'standard' }: BgmToggleProps) {
  const label = enabled ? '背景音乐：开（点击关闭）' : '背景音乐：关（点击开启）';
  const className =
    variant === 'immersive'
      ? `p-1.5 rounded-full transition ${enabled ? 'text-white hover:bg-white/10' : 'text-white/40 hover:text-white/70 hover:bg-white/10'}`
      : `p-2 rounded-full transition-colors ${enabled ? 'bg-blue-50 hover:bg-blue-100 text-blue-600' : 'bg-gray-50 hover:bg-gray-100 text-gray-400'}`;
  return (
    <button
      type="button"
      onClick={onToggle}
      className={className}
      aria-label={label}
      aria-pressed={enabled}
      title={label}>
      {enabled ? <MusicNotesIcon size={16} /> : <MusicNotesMinusIcon size={16} />}
    </button>
  );
}
