'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import type { Game } from '@mui-gamebook/parser/src/types';
import { evaluateCondition, executeSet } from '@/lib/evaluator';

export default function GamePlayer({ game, slug }: { game: Game; slug: string }) {
  const [currentSceneId, setCurrentSceneId] = useState<string>(game.startSceneId || 'start');
  const [gameState, setGameState] = useState(game.initialState);
  const [isLoaded, setIsLoaded] = useState(false);
  const [currentImageUrl, setCurrentImageUrl] = useState<string | undefined>(undefined);
  const [imageLoading, setImageLoading] = useState(false);

  // Load progress from localStorage on mount
  useEffect(() => {
    const savedProgress = localStorage.getItem(`game_progress_${slug}`);
    if (savedProgress) {
      try {
        const { sceneId, state, imageUrl } = JSON.parse(savedProgress);
        if (game.scenes.has(sceneId)) {
          setCurrentSceneId(sceneId);
        }
        setGameState(state);
        if (imageUrl) setCurrentImageUrl(imageUrl);
      } catch (e) {
        console.error('Failed to load progress', e);
      }
    } else {
        // Initialize first image if start scene has one
        const startScene = game.scenes.get(game.startSceneId || 'start');
        const firstImage = startScene?.nodes.find(n => n.type === 'static_image' || n.type === 'ai_image');
        if (firstImage && 'url' in firstImage && firstImage.url) {
            setCurrentImageUrl(firstImage.url);
        }
    }
    setIsLoaded(true);
  }, [slug, game.scenes, game.startSceneId]);

  // Find the current scene object
  const currentScene = game.scenes.get(currentSceneId);

  // Update image when scene changes, if new scene has an image
  useEffect(() => {
    if (currentScene) {
      const newImageNode = currentScene.nodes.find(n => n.type === 'static_image' || n.type === 'ai_image');
      if (newImageNode && 'url' in newImageNode && newImageNode.url) {
        if (newImageNode.url !== currentImageUrl) {
            setImageLoading(true);
            setCurrentImageUrl(newImageNode.url);
        }
      }
    }
  }, [currentSceneId, currentScene, currentImageUrl]);

  // Save progress whenever state changes
  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem(`game_progress_${slug}`, JSON.stringify({
        sceneId: currentSceneId,
        state: gameState,
        imageUrl: currentImageUrl
      }));
    }
  }, [currentSceneId, gameState, slug, isLoaded, currentImageUrl]);

  const handleRestart = () => {
    if (confirm('Are you sure you want to restart? Your progress will be lost.')) {
      localStorage.removeItem(`game_progress_${slug}`);
      setCurrentSceneId(game.startSceneId || 'start');
      setGameState(game.initialState);
      setCurrentImageUrl(undefined);
      
      // Reset image to start scene's image
      const startScene = game.scenes.get(game.startSceneId || 'start');
      const firstImage = startScene?.nodes.find(n => n.type === 'static_image' || n.type === 'ai_image');
      if (firstImage && 'url' in firstImage && firstImage.url) {
          setCurrentImageUrl(firstImage.url);
      }
    }
  };

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

      {/* Persistent Image Display */}
      {currentImageUrl && (
        <div className="w-full aspect-video relative overflow-hidden bg-gray-100">
           {/* eslint-disable-next-line @next/next/no-img-element */}
           <img
            src={currentImageUrl}
            alt="Scene"
            className={`object-cover w-full h-full transition-opacity duration-500 ${imageLoading ? 'opacity-50' : 'opacity-100'}`}
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
                return <p key={index} className="text-lg leading-relaxed text-gray-800">{node.content}</p>;
              
              // Image nodes are now handled by the persistent display above, so we skip rendering them here
              case 'static_image':
              case 'ai_image':
                return null;
              
              case 'choice':
                // Check condition
                if (!evaluateCondition(node.condition, gameState)) {
                  return null;
                }

                return (
                  <button 
                    key={index}
                    className="w-full text-left p-4 border-2 border-blue-100 rounded-xl hover:border-blue-500 hover:bg-blue-50 transition-all group"
                    onClick={() => {
                      // Update state if 'set' is present
                      if (node.set) {
                        const newState = executeSet(node.set, gameState);
                        setGameState(newState);
                      }
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