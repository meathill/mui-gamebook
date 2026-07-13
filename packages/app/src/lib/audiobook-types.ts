/**
 * 前端驱动的有声书生成/播放共享类型
 * 存储于 R2: audiobook/<gameSlug>/scenes/<sceneId>.json
 */

/** 一个场景内按朗读顺序排列的一句语音 clip */
export interface AudiobookClip {
  speaker: string;
  voice: string;
  text: string;
  url: string;
  mimeType: string;
}

/** 单个场景的有声书数据 */
export interface AudiobookSceneFragment {
  sceneId: string;
  clips: AudiobookClip[];
}
