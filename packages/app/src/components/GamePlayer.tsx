'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import type { Game } from '@mui-gamebook/parser/src/types';

export default function GamePlayer({ game, slug }: { game: Game; slug: string }) {
  // Initialize with default values, actual loading happens in useEffect
  const [currentSceneId, setCurrentSceneId] = useState<string>('start');
  const [gameState, setGameState] = useState(game.initialState);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load progress from localStorage on mount
  useEffect(() => {
    const savedProgress = localStorage.getItem(`game_progress_${slug}`);
    if (savedProgress) {
      try {
        const { sceneId, state } = JSON.parse(savedProgress);
        if (game.scenes.has(sceneId)) {
          setCurrentSceneId(sceneId);
        }
        setGameState(state);
      } catch (e) {
        console.error('Failed to load progress', e);
      }
    }
    setIsLoaded(true);
  }, [slug, game.scenes]);

  // Save progress whenever state changes
  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem(`game_progress_${slug}`, JSON.stringify({
        sceneId: currentSceneId,
        state: gameState
      }));
    }
  }, [currentSceneId, gameState, slug, isLoaded]);

  const handleRestart = () => {
    if (confirm('Are you sure you want to restart? Your progress will be lost.')) {
      localStorage.removeItem(`game_progress_${slug}`);
      setCurrentSceneId('start');
      setGameState(game.initialState);
    }
  };

  // Find the current scene object
  const currentScene = game.scenes.get(currentSceneId);

  if (!isLoaded) {
    return <div className="p-8 text-center">Loading...</div>;
  }

  if (!currentScene) {
    return (
      <div className="p-8 text-center">
        <h2 className="text-xl font-bold text-red-600 mb-4">Scene Not Found</h2>
        <p className="mb-6">Could not find scene: {currentSceneId}</p>
        <div className="flex justify-center gap-4">
          <Link href="/" className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300">
            Return Home
          </Link>
          <button 
            onClick={handleRestart}
            className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
          >
            Restart Game
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-[600px]">
      {/* Header */}
      <div className="bg-white border-b p-4 flex justify-between items-center sticky top-0 z-10">
        <h1 className="text-xl font-bold truncate">{game.title}</h1>
        <div className="flex gap-2 text-sm">
          <Link href="/" className="px-3 py-1.5 text-gray-600 hover:bg-gray-100 rounded">
            Home
          </Link>
          <button 
            onClick={handleRestart}
            className="px-3 py-1.5 text-red-600 hover:bg-red-50 rounded"
          >
            Restart
          </button>
        </div>
      </div>

      {/* Scene Content */}
      <div className="flex-1 p-6 md:p-8 max-w-2xl mx-auto w-full">
        <div className="space-y-6">
          {currentScene.nodes.map((node, index) => {
            switch (node.type) {
              case 'text':
                return <p key={index} className="text-lg leading-relaxed text-gray-800">{node.content}</p>;
              
              case 'static_image':
              case 'ai_image':
                return (
                  <div key={index} className="relative w-full aspect-video rounded-lg overflow-hidden shadow-md my-4">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img 
                      src={node.url} 
                      alt={node.type === 'static_image' ? node.alt : node.prompt}
                      className="object-cover w-full h-full"
                    />
                  </div>
                );
              
              case 'choice':
                // TODO: Implement condition check logic here using gameState
                // For now, we show all choices
                return (
                  <button 
                    key={index}
                    className="w-full text-left p-4 border-2 border-blue-100 rounded-xl hover:border-blue-500 hover:bg-blue-50 transition-all group"
                    onClick={() => {
                      // TODO: Implement state update logic (set:) here
                      setCurrentSceneId(node.nextSceneId);
                    }}
                  >
                    <span className="font-medium text-blue-700 group-hover:text-blue-900">{node.text}</span>
                  </button>
                );
                
              default:
                return null;
            }
          })}
        </div>
      </div>
    </div>
  );
}
