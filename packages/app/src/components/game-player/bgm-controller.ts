import type { PlayableSceneNode } from "@roudanio/parser/src/types";

/** 换场景时 BGM 淡出时长 */
export const BGM_FADE_OUT_MS = 1000;
/** 新场景 BGM 淡入时长 */
export const BGM_FADE_IN_MS = 600;
const STEP_MS = 50;

/** 取场景的背景音乐 URL（第一个有 url 的 background_music 节点） */
export function getSceneBgmUrl(
  nodes: PlayableSceneNode[] | undefined,
): string | null {
  if (!nodes) return null;
  for (const node of nodes) {
    if (
      node.type === "ai_audio" &&
      node.audioType === "background_music" &&
      node.url
    )
      return node.url;
  }
  return null;
}

/** 整部作品是否有任何背景音乐（决定是否显示音乐开关） */
export function gameHasBgm(
  scenes: Record<string, { nodes?: PlayableSceneNode[] }> | undefined,
): boolean {
  if (!scenes) return false;
  return Object.values(scenes).some((scene) => !!getSceneBgmUrl(scene.nodes));
}

type AudioFactory = (url: string) => HTMLAudioElement;

/**
 * 背景音乐控制器：一次只保留一条音轨。
 * - 场景内循环（loop）
 * - 换场景：旧音轨淡出后停止，新场景有 BGM 则淡入；没有就保持静音
 * - 快速切换：取消未完成的淡入淡出，正在淡出的旧轨直接停掉，绝不叠音
 */
export class BgmController {
  private current: HTMLAudioElement | null = null;
  private currentUrl: string | null = null;
  private fadingOut: {
    audio: HTMLAudioElement;
    timer: ReturnType<typeof setInterval>;
  } | null = null;
  private fadeInTimer: ReturnType<typeof setInterval> | null = null;
  private volume: number;
  private suspended = false;
  private enabled = true;

  constructor(
    volume = 0.8,
    private createAudio: AudioFactory = (url) => new Audio(url),
  ) {
    this.volume = clamp(volume);
  }

  get url() {
    return this.currentUrl;
  }

  /** 切到某个场景的 BGM；url 为 null 表示该场景无 BGM */
  setTrack(url: string | null) {
    if (url === this.currentUrl) return;
    this.fadeOutCurrent();
    this.currentUrl = url;
    this.startCurrentTrack();
  }

  get isEnabled() {
    return this.enabled;
  }

  /**
   * 用户的音乐开关。关：当前音轨立刻淡出停止；开：恢复当前场景的音轨。
   * 建议在点击事件里同步调用，借用户手势解锁移动端自动播放。
   */
  setEnabled(enabled: boolean) {
    if (enabled === this.enabled) return;
    this.enabled = enabled;
    if (enabled) this.startCurrentTrack();
    else this.fadeOutCurrent();
  }

  private startCurrentTrack() {
    const url = this.currentUrl;
    if (!url || !this.enabled || this.current) return;
    const audio = this.createAudio(url);
    audio.loop = true;
    audio.volume = 0;
    this.current = audio;
    if (!this.suspended) this.startFadeIn(audio);
  }

  /** 音量 0-1；为 0 时相当于静音 */
  setVolume(volume: number) {
    this.volume = clamp(volume);
    if (this.current && !this.fadeInTimer) this.current.volume = this.volume;
  }

  /** 离开游戏画面（标题页/结束页）时挂起，回来时恢复 */
  setSuspended(suspended: boolean) {
    if (suspended === this.suspended) return;
    this.suspended = suspended;
    if (!this.current) return;
    if (suspended) {
      this.clearFadeIn();
      this.current.pause();
    } else {
      this.startFadeIn(this.current);
    }
  }

  /** 立即停止全部（卸载时调用） */
  dispose() {
    this.clearFadeIn();
    this.stopFadingOut();
    if (this.current) stopAudio(this.current);
    this.current = null;
    this.currentUrl = null;
  }

  private startFadeIn(audio: HTMLAudioElement) {
    this.clearFadeIn();
    audio.volume = 0;
    const playing = audio.play();
    if (playing && typeof playing.catch === "function") {
      // 移动端自动播放限制：失败就算了，保持原有行为
      playing.catch(() => {});
    }
    const steps = Math.max(1, Math.round(BGM_FADE_IN_MS / STEP_MS));
    let i = 0;
    this.fadeInTimer = setInterval(() => {
      i += 1;
      audio.volume = clamp((this.volume * i) / steps);
      if (i >= steps) this.clearFadeIn();
    }, STEP_MS);
  }

  private clearFadeIn() {
    if (this.fadeInTimer) clearInterval(this.fadeInTimer);
    this.fadeInTimer = null;
  }

  private fadeOutCurrent() {
    this.clearFadeIn();
    this.stopFadingOut();
    const audio = this.current;
    this.current = null;
    if (!audio) return;
    if (audio.paused || audio.volume === 0) {
      stopAudio(audio);
      return;
    }
    const start = audio.volume;
    const steps = Math.max(1, Math.round(BGM_FADE_OUT_MS / STEP_MS));
    let i = 0;
    const timer = setInterval(() => {
      i += 1;
      audio.volume = clamp(start * (1 - i / steps));
      if (i >= steps) this.stopFadingOut();
    }, STEP_MS);
    this.fadingOut = { audio, timer };
  }

  private stopFadingOut() {
    if (!this.fadingOut) return;
    clearInterval(this.fadingOut.timer);
    stopAudio(this.fadingOut.audio);
    this.fadingOut = null;
  }
}

function clamp(v: number) {
  return Math.min(1, Math.max(0, v));
}

function stopAudio(audio: HTMLAudioElement) {
  audio.pause();
  audio.removeAttribute("src");
  try {
    audio.load();
  } catch {
    // jsdom 等环境未实现 load
  }
}
