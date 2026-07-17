'use client';

import {
  MapTrifoldIcon,
  GearIcon,
  FloppyDiskIcon,
  FolderOpenIcon,
  PlayIcon,
  FastForwardIcon,
  ArrowLeftIcon,
} from '@phosphor-icons/react';
import type { useSfx } from '@mui-gamebook/site-common/game-player';

interface Props {
  sfx: ReturnType<typeof useSfx>;
  isAutoPlaying: boolean;
  isSkipping: boolean;
  onToggleAutoPlay: () => void;
  onToggleSkip: () => void;
  onOpenSave: () => void;
  onOpenLoad: () => void;
  onOpenRouteMap: () => void;
  onOpenSettings: () => void;
  onReturnToTitle: () => void;
}

/**
 * 游戏主画面底部 HUD 栏：返回标题、路线图、自动/跳过切换、存档/读档/设置
 */
export default function GameHudBar({
  sfx,
  isAutoPlaying,
  isSkipping,
  onToggleAutoPlay,
  onToggleSkip,
  onOpenSave,
  onOpenLoad,
  onOpenRouteMap,
  onOpenSettings,
  onReturnToTitle,
}: Props) {
  return (
    <div className="hud-bar justify-between border-t border-border">
      <div className="flex items-center gap-1">
        <button
          onMouseEnter={sfx.playHover}
          onClick={() => {
            sfx.playClick();
            onReturnToTitle();
          }}
          className="hud-btn"
          title="返回标题">
          <ArrowLeftIcon size={16} />
        </button>
        <button
          onMouseEnter={sfx.playHover}
          onClick={() => {
            sfx.playClick();
            onOpenRouteMap();
          }}
          className="hud-btn"
          title="路线图">
          <MapTrifoldIcon size={16} />
          <span className="hidden sm:inline">路线图</span>
        </button>
      </div>

      <div className="flex items-center gap-1">
        <button
          onMouseEnter={sfx.playHover}
          onClick={() => {
            sfx.playClick();
            onToggleAutoPlay();
          }}
          className={`hud-btn ${isAutoPlaying ? 'hud-btn--active' : ''}`}
          title="自动">
          <PlayIcon size={16} />
          <span className="hidden sm:inline">自动</span>
        </button>
        <button
          onMouseEnter={sfx.playHover}
          onClick={() => {
            sfx.playClick();
            onToggleSkip();
          }}
          className={`hud-btn ${isSkipping ? 'hud-btn--active' : ''}`}
          title="跳过">
          <FastForwardIcon size={16} />
          <span className="hidden sm:inline">跳过</span>
        </button>
      </div>

      <div className="flex items-center gap-1">
        <button
          onMouseEnter={sfx.playHover}
          onClick={() => {
            sfx.playClick();
            onOpenSave();
          }}
          className="hud-btn"
          title="存档">
          <FloppyDiskIcon size={16} />
          <span className="hidden sm:inline">存档</span>
        </button>
        <button
          onMouseEnter={sfx.playHover}
          onClick={() => {
            sfx.playClick();
            onOpenLoad();
          }}
          className="hud-btn"
          title="读档">
          <FolderOpenIcon size={16} />
          <span className="hidden sm:inline">读档</span>
        </button>
        <button
          onMouseEnter={sfx.playHover}
          onClick={() => {
            sfx.playClick();
            onOpenSettings();
          }}
          className="hud-btn"
          title="设置">
          <GearIcon size={16} />
        </button>
      </div>
    </div>
  );
}
