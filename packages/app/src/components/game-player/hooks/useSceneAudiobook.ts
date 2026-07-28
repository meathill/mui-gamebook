import { useEffect, useRef, useState } from 'react';
import type { PlayableScene, PlayableSceneNode } from '@mui-gamebook/parser/src/types';
import type { AudiobookClip } from '@/lib/audiobook-types';
import { useAudioPlayer } from '../useAudioPlayer';

interface UseSceneAudiobookOptions {
  slug: string;
  currentSceneId: string;
  currentScene: PlayableScene | undefined;
  /** 只有真正在游戏里才播放，标题页不发请求 */
  isPlaying: boolean;
  getSceneAudioUrl: (nodes: PlayableSceneNode[]) => string | undefined;
}

/**
 * 场景语音播放：优先播放已生成的分角色有声书（逐句顺序播放），
 * 没有生成过（或请求失败）时回退到旧的单条 audio_url。
 */
export function useSceneAudiobook({
  slug,
  currentSceneId,
  currentScene,
  isPlaying,
  getSceneAudioUrl,
}: UseSceneAudiobookOptions) {
  // clipQueueRef 记录当前场景的 clip 列表，clipIndexRef 记录播放到第几句，
  // onEnded 驱动"这句读完，播放下一句"
  const clipQueueRef = useRef<AudiobookClip[]>([]);
  const clipIndexRef = useRef(0);
  const [hasAudioThisScene, setHasAudioThisScene] = useState(false);

  function playNextClip() {
    const queue = clipQueueRef.current;
    const nextIndex = clipIndexRef.current + 1;
    if (nextIndex < queue.length) {
      clipIndexRef.current = nextIndex;
      audioPlayer.play(queue[nextIndex].url);
    }
  }
  const audioPlayer = useAudioPlayer(playNextClip);

  useEffect(() => {
    if (!isPlaying || !currentScene || !currentSceneId) return;

    let cancelled = false;
    audioPlayer.stop();
    clipQueueRef.current = [];
    clipIndexRef.current = 0;
    setHasAudioThisScene(false);

    function playClassicAudio() {
      if (cancelled || !currentScene) return;
      const audioUrl = getSceneAudioUrl(currentScene.nodes);
      if (audioUrl) {
        setHasAudioThisScene(true);
        setTimeout(() => {
          if (!cancelled) audioPlayer.play(audioUrl);
        }, 500);
      }
    }

    async function loadAudiobook() {
      try {
        const res = await fetch(`/api/games/${slug}/audiobook/${encodeURIComponent(currentSceneId)}`);
        if (cancelled) return;
        if (res.ok) {
          const data = (await res.json()) as { clips: AudiobookClip[] };
          if (!cancelled && data.clips?.length > 0) {
            clipQueueRef.current = data.clips;
            clipIndexRef.current = 0;
            setHasAudioThisScene(true);
            setTimeout(() => {
              if (!cancelled) audioPlayer.play(data.clips[0].url);
            }, 500);
            return;
          }
        }
      } catch {
        // 网络错误等同于"这个场景还没有有声书"，走下面的回退逻辑
      }
      playClassicAudio();
    }

    loadAudiobook();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentSceneId, isPlaying]);

  return { audioPlayer, hasAudioThisScene };
}
