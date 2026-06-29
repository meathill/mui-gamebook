'use client';

import { useState, useCallback, useMemo, useEffect } from 'react';
import type { PlayableGame } from '@mui-gamebook/parser/src/types';

export interface RouteMapNode {
  sceneId: string;
  label: string;
  description?: string;
  isUnlocked: boolean;
  isVisited: boolean;
}

function buildStorageKey(gameSlug: string): string {
  return `mgb_route_${gameSlug}`;
}

function loadVisitedScenes(gameSlug: string): Set<string> {
  if (typeof window === 'undefined') return new Set();
  const raw = localStorage.getItem(buildStorageKey(gameSlug));
  if (!raw) return new Set();
  try {
    return new Set(JSON.parse(raw) as string[]);
  } catch {
    return new Set();
  }
}

function persistVisitedScenes(gameSlug: string, scenes: Set<string>): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(buildStorageKey(gameSlug), JSON.stringify(Array.from(scenes)));
}

/**
 * 从 scene ID 生成默认标签
 * 将 kebab-case 或 snake_case 转为可读文本
 */
function defaultLabel(sceneId: string): string {
  return sceneId.replace(/[-_]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

export interface UseRouteMapReturn {
  nodes: RouteMapNode[];
  visitedScenes: Set<string>;
  isNodeUnlocked(sceneId: string): boolean;
  markVisited(sceneId: string): void;
  resetProgress(): void;
}

/**
 * 路线图 Hook
 * 从 PlayableGame.scenes 提取路线图节点
 * 已访问的 scene 自动解锁，起始场景始终解锁
 *
 * 节点解锁逻辑：
 * - 起始场景始终解锁
 * - 已访问过的场景自动解锁
 * - 被已访问场景的 choice 指向的场景也解锁（可达性）
 */
export function useRouteMap(game: PlayableGame, gameSlug: string): UseRouteMapReturn {
  const [visitedScenes, setVisitedScenes] = useState<Set<string>>(() => new Set());

  useEffect(() => {
    setVisitedScenes(loadVisitedScenes(gameSlug));
  }, [gameSlug]);

  // 计算可达场景（从已访问场景的 choice 可直接到达的场景）
  const reachableScenes = useMemo(() => {
    const reachable = new Set<string>();
    for (const sceneId of visitedScenes) {
      const scene = game.scenes[sceneId];
      if (!scene) continue;
      for (const node of scene.nodes) {
        if (node.type === 'choice') {
          reachable.add(node.nextSceneId);
        }
      }
    }
    return reachable;
  }, [visitedScenes, game.scenes]);

  const startSceneId = game.startSceneId || 'start';

  const isNodeUnlocked = useCallback(
    (sceneId: string): boolean => {
      return sceneId === startSceneId || visitedScenes.has(sceneId) || reachableScenes.has(sceneId);
    },
    [startSceneId, visitedScenes, reachableScenes],
  );

  // 构建路线图节点列表
  const nodes = useMemo<RouteMapNode[]>(() => {
    return Object.entries(game.scenes).map(([sceneId, scene]) => ({
      sceneId,
      label: scene.label || defaultLabel(sceneId),
      description: scene.description,
      isUnlocked: isNodeUnlocked(sceneId),
      isVisited: visitedScenes.has(sceneId),
    }));
  }, [game.scenes, visitedScenes, isNodeUnlocked]);

  const markVisited = useCallback(
    (sceneId: string) => {
      setVisitedScenes((prev) => {
        if (prev.has(sceneId)) return prev;
        const next = new Set(prev);
        next.add(sceneId);
        persistVisitedScenes(gameSlug, next);
        return next;
      });
    },
    [gameSlug],
  );

  const resetProgress = useCallback(() => {
    const empty = new Set<string>();
    setVisitedScenes(empty);
    persistVisitedScenes(gameSlug, empty);
  }, [gameSlug]);

  return {
    nodes,
    visitedScenes,
    isNodeUnlocked,
    markVisited,
    resetProgress,
  };
}
