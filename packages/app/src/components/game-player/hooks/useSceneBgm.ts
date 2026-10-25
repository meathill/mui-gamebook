"use client";

import { useEffect, useRef } from "react";
import type { PlayableScene } from "@roudanio/parser/src/types";
import { useGameSettings } from "@mui-gamebook/site-common/game-player";
import { BgmController, getSceneBgmUrl } from "../bgm-controller";

interface UseSceneBgmOptions {
  slug: string;
  currentScene: PlayableScene | undefined;
  /** 只有在游戏画面里才播放 */
  isPlaying: boolean;
}

/**
 * 场景背景音乐：场景内循环，换场景淡出；音量取设置里的 bgmVolume
 */
export function useSceneBgm({
  slug,
  currentScene,
  isPlaying,
}: UseSceneBgmOptions) {
  const { settings, updateSetting } = useGameSettings(slug);
  const controllerRef = useRef<BgmController | null>(null);

  function getController() {
    if (!controllerRef.current)
      controllerRef.current = new BgmController(settings.bgmVolume / 100);
    return controllerRef.current;
  }

  useEffect(() => {
    return () => {
      controllerRef.current?.dispose();
      controllerRef.current = null;
    };
  }, []);

  useEffect(() => {
    getController().setVolume(settings.bgmVolume / 100);
  }, [settings.bgmVolume]);

  useEffect(() => {
    getController().setEnabled(settings.bgmEnabled);
  }, [settings.bgmEnabled]);

  const url = isPlaying ? getSceneBgmUrl(currentScene?.nodes) : null;
  useEffect(() => {
    getController().setTrack(url);
  }, [url]);

  // 切到后台标签页时暂停，回来恢复
  useEffect(() => {
    function onVisibility() {
      getController().setSuspended(document.visibilityState === "hidden");
    }
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, []);

  /** 点击开关：在用户手势里同步开/关，顺便解锁移动端自动播放 */
  function toggleBgm() {
    const next = !settings.bgmEnabled;
    getController().setEnabled(next);
    updateSetting("bgmEnabled", next);
  }

  return { bgmEnabled: settings.bgmEnabled, toggleBgm };
}
