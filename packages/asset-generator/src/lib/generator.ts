/**
 * 素材生成模块 - 入口
 * 整合图片、TTS、小游戏的生成
 */
import type { Game } from '@mui-gamebook/parser';
import { processGlobalAssets, processNode } from './image-generator';
import { processNodeTTS } from './tts-generator';

// 导出子模块的公共 API
export { uploadToR2, smartUpload } from './uploader';
export { generateImage, processGlobalAssets, processNode, type GenerateImageOptions } from './image-generator';
export { processNodeTTS } from './tts-generator';

/**
 * processGame 的选项
 */
export interface ProcessGameOptions {
  /** 游戏 slug（用于缓存和上传路径） */
  gameSlug: string;
  /** TTS 配置（不配置则不生成 TTS） */
  tts?: {
    /** 是否为场景文本生成语音 */
    sceneText?: boolean;
    /** 是否为选项生成语音 */
    choices?: boolean;
  };
}

/**
 * 处理游戏素材生成的核心逻辑
 */
export async function processGame(game: Game, force: boolean, options: ProcessGameOptions): Promise<boolean> {
  let hasChanged = false;
  const { gameSlug } = options;

  // 统计信息
  const scenes = Object.values(game.scenes);
  const totalScenes = scenes.length;
  const totalNodes = scenes.reduce((sum, scene) => sum + scene.nodes.length, 0);
  let processedNodes = 0;
  let generatedAssets = 0;
  let skippedAssets = 0;

  console.log(`\n📊 素材统计: ${totalScenes} 个场景, ${totalNodes} 个节点`);

  // 处理全局素材（角色头像、封面图等）
  const globalChanged = await processGlobalAssets(game, force, gameSlug);
  if (globalChanged) hasChanged = true;

  // 处理场景素材
  for (let sceneIndex = 0; sceneIndex < scenes.length; sceneIndex++) {
    const scene = scenes[sceneIndex];
    console.log(`\n🎬 [${sceneIndex + 1}/${totalScenes}] 场景: ${scene.id}`);

    for (let i = 0; i < scene.nodes.length; i++) {
      const node = scene.nodes[i];
      processedNodes++;

      // 处理图片/音频/视频素材
      const assetUpdated = await processNode(node, game, force, gameSlug);
      if (assetUpdated) {
        hasChanged = true;
        generatedAssets++;
      } else if (node.type === 'ai_image' || node.type === 'minigame') {
        skippedAssets++;
      }

      // 处理 TTS 语音（仅当配置了 tts 选项时）
      if (options?.tts) {
        const shouldProcessTTS =
          (node.type === 'text' && options.tts.sceneText) || (node.type === 'choice' && options.tts.choices);

        if (shouldProcessTTS) {
          const ttsUpdated = await processNodeTTS(node, game, scene.id, i, force, gameSlug);
          if (ttsUpdated) {
            hasChanged = true;
            generatedAssets++;
          } else {
            skippedAssets++;
          }
        }
      }
    }
  }

  // 最终统计
  console.log(`\n✅ 完成统计:`);
  console.log(`   - 处理节点: ${processedNodes}/${totalNodes}`);
  console.log(`   - 生成素材: ${generatedAssets}`);
  console.log(`   - 跳过素材: ${skippedAssets} (已存在或使用缓存)`);

  return hasChanged;
}
