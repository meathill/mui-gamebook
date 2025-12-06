'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import type { PlayableGame, PlayableScene, PlayableSceneNode } from '@mui-gamebook/parser/src/types';

/**
 * 从场景节点中提取所有媒体 URL
 */
export function extractMediaUrls(nodes: PlayableSceneNode[]): string[] {
  const urls: string[] = [];

  for (const node of nodes) {
    switch (node.type) {
      case 'static_image':
      case 'ai_image':
        if (node.url) urls.push(node.url);
        break;
      case 'static_audio':
      case 'ai_audio':
        if (node.url) urls.push(node.url);
        break;
      case 'static_video':
      case 'ai_video':
        if (node.url) urls.push(node.url);
        break;
    }
  }

  return urls;
}

/**
 * 获取场景中所有可能的下一个场景 ID
 */
export function getNextSceneIds(scene: PlayableScene): string[] {
  const ids: string[] = [];

  for (const node of scene.nodes) {
    if (node.type === 'choice' && node.nextSceneId) {
      ids.push(node.nextSceneId);
    }
  }

  return [...new Set(ids)]; // 去重
}

/**
 * 收集需要预加载的 URL 列表（纯函数，便于测试）
 */
export function collectPreloadUrls(
  game: PlayableGame,
  currentSceneId: string,
  processedScenes: Set<string>,
  preloadedUrls: Set<string>
): string[] {
  if (processedScenes.has(currentSceneId)) return [];
  
  const currentScene = game.scenes.get(currentSceneId);
  if (!currentScene) return [];

  const nextSceneIds = getNextSceneIds(currentScene);
  const newUrls: string[] = [];

  for (const sceneId of nextSceneIds) {
    const scene = game.scenes.get(sceneId);
    if (!scene) continue;

    const urls = extractMediaUrls(scene.nodes);
    for (const url of urls) {
      if (!preloadedUrls.has(url)) {
        newUrls.push(url);
      }
    }
  }

  return [...new Set(newUrls)]; // 去重
}

/**
 * 预加载图片
 */
function preloadImage(url: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve();
    img.onerror = () => reject(new Error(`Failed to preload image: ${url}`));
    img.src = url;
  });
}

/**
 * 预加载音频
 */
function preloadAudio(url: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const audio = new Audio();
    audio.oncanplaythrough = () => resolve();
    audio.onerror = () => reject(new Error(`Failed to preload audio: ${url}`));
    audio.preload = 'auto';
    audio.src = url;
  });
}

/**
 * 预加载视频
 */
function preloadVideo(url: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    video.oncanplaythrough = () => resolve();
    video.onerror = () => reject(new Error(`Failed to preload video: ${url}`));
    video.preload = 'auto';
    video.src = url;
  });
}

/**
 * 根据 URL 判断媒体类型并预加载
 */
function preloadMedia(url: string): Promise<void> {
  const lowerUrl = url.toLowerCase();

  // 根据扩展名或 URL 模式判断类型
  if (lowerUrl.match(/\.(jpg|jpeg|png|gif|webp|svg|avif)(\?|$)/i)) {
    return preloadImage(url);
  }
  if (lowerUrl.match(/\.(mp3|wav|ogg|m4a|aac)(\?|$)/i)) {
    return preloadAudio(url);
  }
  if (lowerUrl.match(/\.(mp4|webm|mov|avi)(\?|$)/i)) {
    return preloadVideo(url);
  }

  // 默认当作图片处理（大多数场景媒体是图片）
  return preloadImage(url);
}

/**
 * 预加载下一个可能场景的素材
 */
export function usePreload(game: PlayableGame, currentSceneId: string) {
  // 记录已预加载的 URL，避免重复加载
  const preloadedUrls = useRef<Set<string>>(new Set());
  // 记录已处理的场景 ID
  const processedScenes = useRef<Set<string>>(new Set());
  // 使用 state 跟踪统计信息，避免在渲染时访问 ref
  const [stats, setStats] = useState({ preloadedCount: 0, processedScenesCount: 0 });

  const preloadScene = useCallback((sceneId: string) => {
    const scene = game.scenes.get(sceneId);
    if (!scene) return;

    const urls = extractMediaUrls(scene.nodes);

    for (const url of urls) {
      if (preloadedUrls.current.has(url)) continue;

      preloadedUrls.current.add(url);
      preloadMedia(url).catch(err => {
        // 预加载失败不影响游戏进行，只记录日志
        console.warn('预加载失败:', err.message);
      });
    }
  }, [game.scenes]);

  useEffect(() => {
    // 如果当前场景已处理过，跳过
    if (processedScenes.current.has(currentSceneId)) return;
    processedScenes.current.add(currentSceneId);

    const currentScene = game.scenes.get(currentSceneId);
    if (!currentScene) {
      setStats({
        preloadedCount: preloadedUrls.current.size,
        processedScenesCount: processedScenes.current.size,
      });
      return;
    }

    // 获取所有可能的下一个场景
    const nextSceneIds = getNextSceneIds(currentScene);

    // 预加载所有下一个场景的媒体
    for (const sceneId of nextSceneIds) {
      preloadScene(sceneId);
    }

    // 更新统计信息
    setStats({
      preloadedCount: preloadedUrls.current.size,
      processedScenesCount: processedScenes.current.size,
    });
  }, [currentSceneId, game.scenes, preloadScene]);

  // 返回预加载统计信息（可选，用于调试）
  return stats;
}
