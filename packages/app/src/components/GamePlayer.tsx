'use client';

import { useState, useEffect, useCallback } from 'react';
import type { PlayableGame, RuntimeState } from '@mui-gamebook/parser/src/types';
import { isVariableMeta, extractRuntimeState, getVisibleVariables } from '@mui-gamebook/parser/src/types';
import { evaluateCondition, executeSet, interpolateVariables } from '@/lib/evaluator';
import { useDialog } from '@/components/Dialog';
import ShareButton from '@/components/ShareButton';
import { TitleScreen, EndScreen, VariableIndicator } from '@/components/game-player';

export default function GamePlayer({ game, slug }: { game: PlayableGame; slug: string }) {
  const [currentSceneId, setCurrentSceneId] = useState<string>(game.startSceneId || 'start');
  const [runtimeState, setRuntimeState] = useState<RuntimeState>(() => extractRuntimeState(game.initialState));
  const [isLoaded, setIsLoaded] = useState(false);
  const [isGameStarted, setIsGameStarted] = useState(false);
  const [currentImageUrl, setCurrentImageUrl] = useState<string | undefined>(undefined);
  const [imageLoading, setImageLoading] = useState(false);
  const dialog = useDialog();

  const visibleVariables = getVisibleVariables(game.initialState);

  // 检查变量触发器
  const checkTriggers = useCallback((state: RuntimeState): string | null => {
    for (const [key, val] of Object.entries(game.initialState)) {
      if (isVariableMeta(val) && val.trigger) {
        const currentValue = state[ key ];
        const condition = `${currentValue} ${val.trigger.condition}`;
        if (evaluateCondition(condition, {})) {
          return val.trigger.scene;
        }
      }
    }
    return null;
  }, [game.initialState]);

  // Load progress from localStorage on mount
  useEffect(() => {
    const savedProgress = localStorage.getItem(`game_progress_${slug}`);
    if (savedProgress) {
      try {
        const { sceneId, state, imageUrl } = JSON.parse(savedProgress);
        if (game.scenes.has(sceneId)) {
          setCurrentSceneId(sceneId);
          setIsGameStarted(true);
        }
        setRuntimeState(state);
        if (imageUrl) setCurrentImageUrl(imageUrl);
      } catch (e) {
        console.error('Failed to load progress', e);
      }
    } else {
      const startScene = game.scenes.get(game.startSceneId || 'start');
      const firstImage = startScene?.nodes.find(n => n.type === 'static_image' || n.type === 'ai_image');
      if (firstImage && 'url' in firstImage && firstImage.url) {
        setCurrentImageUrl(firstImage.url);
      }
    }
    setIsLoaded(true);
  }, [slug, game.scenes, game.startSceneId]);

  const currentScene = game.scenes.get(currentSceneId);

  // Update image when scene changes
  useEffect(() => {
    if (isGameStarted && currentScene) {
      const newImageNode = currentScene.nodes.find(n => n.type === 'static_image' || n.type === 'ai_image');
      if (newImageNode && 'url' in newImageNode && newImageNode.url) {
        if (newImageNode.url !== currentImageUrl) {
          setImageLoading(true);
          setCurrentImageUrl(newImageNode.url);
        }
      }
    }
  }, [currentSceneId, currentScene, currentImageUrl, isGameStarted]);

  // Save progress whenever state changes
  useEffect(() => {
    if (isLoaded && isGameStarted) {
      localStorage.setItem(`game_progress_${slug}`, JSON.stringify({
        sceneId: currentSceneId,
        state: runtimeState,
        imageUrl: currentImageUrl
      }));
    }
  }, [currentSceneId, runtimeState, slug, isLoaded, currentImageUrl, isGameStarted]);

  const handleStartGame = () => {
    setIsGameStarted(true);
    if (!localStorage.getItem(`game_progress_${slug}`)) {
      setCurrentSceneId(game.startSceneId || 'start');
      setRuntimeState(extractRuntimeState(game.initialState));
    }
  };

  const handleRestart = async () => {
    const confirmed = await dialog.confirm('确定要重新开始吗？游戏进度将会丢失。');
    if (confirmed) {
      localStorage.removeItem(`game_progress_${slug}`);
      setCurrentSceneId(game.startSceneId || 'start');
      setRuntimeState(extractRuntimeState(game.initialState));
      setCurrentImageUrl(undefined);
      setIsGameStarted(false);
      
      const startScene = game.scenes.get(game.startSceneId || 'start');
      const firstImage = startScene?.nodes.find(n => n.type === 'static_image' || n.type === 'ai_image');
      if (firstImage && 'url' in firstImage && firstImage.url) {
        setCurrentImageUrl(firstImage.url);
      }
    }
  };

  const handleChoice = (nextSceneId: string, setInstruction?: string) => {
    let newState = runtimeState;
    if (setInstruction) {
      newState = executeSet(setInstruction, runtimeState);
      setRuntimeState(newState);
    }
    
    const triggerScene = checkTriggers(newState);
    if (triggerScene && game.scenes.has(triggerScene)) {
      setCurrentSceneId(triggerScene);
    } else {
      setCurrentSceneId(nextSceneId);
    }
  };

  if (!isLoaded) {
    return <div className="p-8 text-center">加载中...</div>;
  }

  if (!isGameStarted) {
    return <TitleScreen game={game} onStart={handleStartGame} />;
  }

  if (!currentScene) {
    return (
      <div className="p-8 text-center">
        <h2 className="text-xl font-bold text-red-600 mb-4">场景未找到</h2>
        <p className="mb-6">找不到场景：{currentSceneId}</p>
        <button 
          onClick={handleRestart}
          className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300"
        >
          返回标题
        </button>
      </div>
    );
  }

  const availableChoices = currentScene.nodes.filter(node => 
    node.type === 'choice' && evaluateCondition(node.condition, runtimeState)
  );
  const hasChoices = availableChoices.length > 0;
  const shareUrl = typeof window !== 'undefined' ? window.location.href : '';

  return (
    <div className="flex flex-col min-h-[600px]">
      {/* Header */}
      <div className="bg-white border-b p-4 flex justify-between items-center sticky top-0 z-10 bg-opacity-90 backdrop-blur-sm">
        <h1 className="text-lg font-bold truncate text-gray-800">{game.title}</h1>
        <div className="flex gap-2 text-sm items-center">
          <ShareButton title={game.title} url={shareUrl} />
          <button 
            onClick={handleRestart}
            className="px-3 py-1.5 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
          >
            退出
          </button>
        </div>
      </div>

      {/* 可见变量状态栏 */}
      {visibleVariables.length > 0 && (
        <div className="bg-gray-50 border-b px-4 py-2">
          <div className="max-w-2xl mx-auto flex flex-wrap gap-4">
            {visibleVariables.map(({ key, meta }) => (
              <VariableIndicator 
                key={key}
                varKey={key}
                meta={meta}
                currentValue={runtimeState[ key ]}
              />
            ))}
          </div>
        </div>
      )}

      {/* Persistent Image Display */}
      {currentImageUrl && (
        <div className="w-full aspect-video relative overflow-hidden bg-gray-100 shadow-inner">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={currentImageUrl}
            alt="Scene"
            className={`object-cover w-full h-full transition-opacity duration-700 ease-in-out ${imageLoading ? 'opacity-50 blur-sm' : 'opacity-100 blur-0'}`}
            onLoad={() => setImageLoading(false)}
          />
        </div>
      )}

      {/* Scene Content */}
      <div className="flex-1 p-6 md:p-8 max-w-2xl mx-auto w-full">
        <div className="space-y-6">
          {currentScene.nodes.map((node, index) => {
            switch (node.type) {
              case 'text':
                return <p key={index} className="text-lg leading-relaxed text-gray-800 font-serif">{interpolateVariables(node.content, runtimeState)}</p>;
              
              case 'static_image':
              case 'ai_image':
                return null;
              
              case 'choice':
                if (!evaluateCondition(node.condition, runtimeState)) {
                  return null;
                }
                return (
                  <button 
                    key={index}
                    className="w-full text-left p-4 border-2 border-blue-100 rounded-xl hover:border-blue-500 hover:bg-blue-50 transition-all group shadow-sm hover:shadow-md"
                    onClick={() => handleChoice(node.nextSceneId, node.set)}
                  >
                    <span className="font-medium text-blue-700 group-hover:text-blue-900 text-lg">{interpolateVariables(node.text, runtimeState)}</span>
                  </button>
                );
                
              default:
                return null;
            }
          })}

          {/* End Screen */}
          {!hasChoices && (
            <EndScreen 
              title={game.title}
              shareUrl={shareUrl}
              onRestart={handleRestart}
            />
          )}
        </div>
      </div>
    </div>
  );
}
