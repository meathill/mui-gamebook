'use client';

import ReactMarkdown from 'react-markdown';
import type { PlayableSceneNode, RuntimeState } from '@mui-gamebook/parser/src/types';
import { evaluateCondition, interpolateVariables } from '@mui-gamebook/site-common/utils';
import { SpeakerHighIcon } from '@phosphor-icons/react';
import AudioControls from './AudioControls';
import MiniGamePlayer from './MiniGamePlayer';
import type { UseAudioPlayerReturn } from './useAudioPlayer';

interface SceneNodesProps {
  nodes: PlayableSceneNode[];
  runtimeState: RuntimeState;
  hasMinigame: boolean;
  minigameCompleted: boolean;
  hasReadAll: boolean;
  hasImage: boolean;
  audioPlayer: UseAudioPlayerReturn;
  onChoice: (nextSceneId: string, setInstruction?: string, choiceIndex?: number) => void;
  onMiniGameComplete: (updatedVars: Record<string, number | string | boolean>) => void;
}

/**
 * 渲染当前场景的节点列表（文字/小游戏/选项）
 */
export default function SceneNodes({
  nodes,
  runtimeState,
  hasMinigame,
  minigameCompleted,
  hasReadAll,
  hasImage,
  audioPlayer,
  onChoice,
  onMiniGameComplete,
}: SceneNodesProps) {
  return (
    <>
      {nodes.map((node, index) => {
        switch (node.type) {
          case 'text': {
            const hasTextAudio = 'audio_url' in node && !!node.audio_url;
            return (
              <div
                key={index}
                className="sm:space-y-2">
                <div className={`prose prose-lg max-w-none ${hasImage ? 'prose-invert sm:prose-gray' : 'prose-gray'}`}>
                  <ReactMarkdown>{interpolateVariables(node.content, runtimeState)}</ReactMarkdown>
                </div>
                {hasTextAudio && (
                  <AudioControls
                    audioPlayer={audioPlayer}
                    hasAudio={hasTextAudio}
                  />
                )}
              </div>
            );
          }

          case 'static_image':
          case 'ai_image':
            return null;

          case 'minigame':
            if (!node.url) return null;
            return (
              <MiniGamePlayer
                key={index}
                url={node.url}
                variables={node.variables || []}
                runtimeState={runtimeState}
                onComplete={onMiniGameComplete}
              />
            );

          case 'choice':
            if (hasMinigame && !minigameCompleted) {
              return null;
            }
            if (!evaluateCondition(node.condition, runtimeState)) {
              return null;
            }
            // 移动端：阅读完才显示；桌面端：始终显示
            if (!hasReadAll && hasImage) {
              return null;
            }
            const hasChoiceAudio = 'audio_url' in node && !!node.audio_url;
            return (
              <button
                key={index}
                className={`w-full text-left px-4 py-2 sm:py-4 border-2 rounded-xl transition-all group shadow-sm hover:shadow-md flex items-center gap-3 ${hasImage ? 'bg-white/90 backdrop-blur-sm border-white/50 hover:bg-white hover:border-orange-400 sm:bg-transparent sm:backdrop-blur-none sm:border-amber-100' : 'border-amber-100'} hover:border-orange-400 hover:bg-orange-50`}
                onClick={() => onChoice(node.nextSceneId, node.set, index)}>
                {hasChoiceAudio && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      audioPlayer.play((node as { audio_url: string }).audio_url);
                    }}
                    className="p-2 rounded-full bg-orange-100 hover:bg-orange-200 text-orange-600 transition-colors flex-shrink-0"
                    title="播放语音">
                    <SpeakerHighIcon size={16} />
                  </button>
                )}
                <span className="font-medium text-amber-800 group-hover:text-orange-700 text-lg flex-1">
                  {interpolateVariables(node.text, runtimeState)}
                </span>
              </button>
            );

          default:
            return null;
        }
      })}
    </>
  );
}
