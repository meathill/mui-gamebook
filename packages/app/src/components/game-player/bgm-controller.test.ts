import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  BgmController,
  getSceneBgmUrl,
  gameHasBgm,
  BGM_FADE_OUT_MS,
  BGM_FADE_IN_MS,
} from "./bgm-controller";

function fakeAudio(url: string) {
  const a = {
    src: url,
    loop: false,
    volume: 1,
    paused: true,
    play: vi.fn(() => {
      a.paused = false;
      return Promise.resolve();
    }),
    pause: vi.fn(() => {
      a.paused = true;
    }),
    removeAttribute: vi.fn(),
    load: vi.fn(),
  };
  return a as unknown as HTMLAudioElement & typeof a;
}

describe("getSceneBgmUrl", () => {
  it("只取 background_music", () => {
    expect(
      getSceneBgmUrl([
        { type: "ai_audio", audioType: "sfx", url: "s" },
      ] as never),
    ).toBeNull();
    expect(
      getSceneBgmUrl([
        { type: "ai_audio", audioType: "background_music", url: "b" },
      ] as never),
    ).toBe("b");
    expect(getSceneBgmUrl(undefined)).toBeNull();
  });
});

describe("BgmController", () => {
  let made: ReturnType<typeof fakeAudio>[];
  let c: BgmController;
  beforeEach(() => {
    vi.useFakeTimers();
    made = [];
    c = new BgmController(0.5, (u) => {
      const a = fakeAudio(u);
      made.push(a);
      return a;
    });
  });
  afterEach(() => vi.useRealTimers());

  it("循环播放并淡入到设置音量", () => {
    c.setTrack("a");
    expect(made[0].loop).toBe(true);
    expect(made[0].play).toHaveBeenCalled();
    vi.advanceTimersByTime(BGM_FADE_IN_MS + 100);
    expect(made[0].volume).toBeCloseTo(0.5);
  });

  it("同一首不重新开始", () => {
    c.setTrack("a");
    c.setTrack("a");
    expect(made).toHaveLength(1);
  });

  it("换到无 BGM 场景：淡出后停止", () => {
    c.setTrack("a");
    vi.advanceTimersByTime(BGM_FADE_IN_MS + 100);
    c.setTrack(null);
    vi.advanceTimersByTime(BGM_FADE_OUT_MS / 2);
    expect(made[0].volume).toBeGreaterThan(0);
    expect(made[0].paused).toBe(false);
    vi.advanceTimersByTime(BGM_FADE_OUT_MS);
    expect(made[0].paused).toBe(true);
  });

  it("快速切换不叠音", () => {
    c.setTrack("a");
    vi.advanceTimersByTime(BGM_FADE_IN_MS + 100);
    c.setTrack("b");
    c.setTrack("c");
    // a 正在淡出时被直接停掉，b 还在淡入就被停掉
    expect(made[0].paused).toBe(true);
    expect(made[1].paused).toBe(true);
    expect(made[2].paused).toBe(false);
    vi.advanceTimersByTime(BGM_FADE_IN_MS + 100);
    expect(made[2].volume).toBeCloseTo(0.5);
  });

  it("音量为 0 与 dispose", () => {
    c.setTrack("a");
    vi.advanceTimersByTime(BGM_FADE_IN_MS + 100);
    c.setVolume(0);
    expect(made[0].volume).toBe(0);
    c.dispose();
    expect(made[0].paused).toBe(true);
  });

  it("挂起时暂停，恢复时续播", () => {
    c.setTrack("a");
    c.setSuspended(true);
    expect(made[0].paused).toBe(true);
    c.setSuspended(false);
    expect(made[0].paused).toBe(false);
  });

  it("关闭音乐：当前音轨淡出停止，换场景也不再播放", () => {
    c.setTrack("a");
    vi.advanceTimersByTime(BGM_FADE_IN_MS + 100);
    c.setEnabled(false);
    expect(c.isEnabled).toBe(false);
    vi.advanceTimersByTime(BGM_FADE_OUT_MS + 100);
    expect(made[0].paused).toBe(true);
    c.setTrack("b");
    expect(made).toHaveLength(1);
    expect(c.url).toBe("b");
  });

  it("重新开启：恢复当前场景的音轨", () => {
    c.setEnabled(false);
    c.setTrack("b");
    c.setEnabled(true);
    expect(made).toHaveLength(1);
    expect(made[0].src).toBe("b");
    expect(made[0].play).toHaveBeenCalled();
    vi.advanceTimersByTime(BGM_FADE_IN_MS + 100);
    expect(made[0].volume).toBeCloseTo(0.5);
  });

  it("开启时当前场景无 BGM 则保持安静", () => {
    c.setEnabled(false);
    c.setEnabled(true);
    expect(made).toHaveLength(0);
  });
});

describe("gameHasBgm", () => {
  it("任一场景有 background_music 即为 true", () => {
    const bgm = {
      type: "ai_audio",
      audioType: "background_music",
      url: "x.mp3",
    } as never;
    expect(gameHasBgm({ a: { nodes: [] }, b: { nodes: [bgm] } })).toBe(true);
    expect(gameHasBgm({ a: { nodes: [] } })).toBe(false);
    expect(gameHasBgm(undefined)).toBe(false);
  });
});
