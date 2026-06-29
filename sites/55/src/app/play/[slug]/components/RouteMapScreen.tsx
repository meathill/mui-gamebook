'use client';

import { XIcon, LockIcon, CheckCircleIcon, PlayIcon } from 'lucide-react';
import type { RouteMapNode } from '@mui-gamebook/site-common/game-player';

interface Props {
  nodes: RouteMapNode[];
  onSelectNode: (sceneId: string) => void;
  onClose: () => void;
}

/**
 * 路线图界面
 * 显示所有场景节点，已解锁的节点可以点击进入
 */
export default function RouteMapScreen({ nodes, onSelectNode, onClose }: Props) {
  return (
    <div className="panel-overlay">
      <div className="panel w-full max-w-lg mx-4 p-6 max-h-[80vh] flex flex-col animate-fade-in">
        {/* 头部 */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold">路线图</h2>
          <button
            onClick={onClose}
            className="hud-btn">
            <XIcon size={20} />
          </button>
        </div>

        {/* 节点列表 */}
        <div className="flex-1 overflow-y-auto space-y-2 pr-1">
          {nodes.map((node) => (
            <div
              key={node.sceneId}
              onClick={() => node.isUnlocked && onSelectNode(node.sceneId)}
              className={`route-node ${
                node.isUnlocked
                  ? `route-node--unlocked ${node.isVisited ? 'route-node--visited' : ''}`
                  : 'route-node--locked'
              }`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 min-w-0">
                  {node.isUnlocked ? (
                    node.isVisited ? (
                      <CheckCircleIcon
                        size={16}
                        className="text-success flex-shrink-0"
                      />
                    ) : (
                      <PlayIcon
                        size={16}
                        className="text-primary-light flex-shrink-0"
                      />
                    )
                  ) : (
                    <LockIcon
                      size={16}
                      className="text-muted flex-shrink-0"
                    />
                  )}
                  <span className="font-medium truncate">{node.label}</span>
                </div>
              </div>

              {node.isUnlocked && node.description && (
                <p className="text-sm text-muted mt-1.5 ml-6">{node.description}</p>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
