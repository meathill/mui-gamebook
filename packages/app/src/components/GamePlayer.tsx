'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import type { Game } from '@mui-gamebook/parser/src/types';
import { evaluateCondition, executeSet } from '@/lib/evaluator';

export default function GamePlayer({ game, slug }: { game: Game; slug: string }) {
  const [currentSceneId, setCurrentSceneId] = useState<string>(game.startSceneId || 'start');
  const [gameState, setGameState] = useState(game.initialState);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isGameStarted, setIsGameStarted] = useState(false);
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
          setIsGameStarted(true); // If progress exists, we are started
        }
        setGameState(state);
        if (imageUrl) setCurrentImageUrl(imageUrl);
      } catch (e) {
        console.error('Failed to load progress', e);
      }
    } else {
        // Initialize first image if start scene has one (for title screen background if desired, or just prep)
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
        state: gameState,
        imageUrl: currentImageUrl
      }));
    }
  }, [currentSceneId, gameState, slug, isLoaded, currentImageUrl, isGameStarted]);

  const handleStartGame = () => {
    setIsGameStarted(true);
    // Ensure we start from the beginning if no progress was loaded
    if (!localStorage.getItem(`game_progress_${slug}`)) {
        setCurrentSceneId(game.startSceneId || 'start');
        setGameState(game.initialState);
    }
  };

  const handleRestart = () => {
    if (confirm('Are you sure you want to restart? Your progress will be lost.')) {
      localStorage.removeItem(`game_progress_${slug}`);
      setCurrentSceneId(game.startSceneId || 'start');
      setGameState(game.initialState);
      setCurrentImageUrl(undefined);
      setIsGameStarted(false);
      
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

  // --- Title Screen ---
  if (!isGameStarted) {
    return (
      <div className="flex flex-col min-h-[600px] bg-white">
        <div className="relative w-full h-64 md:h-80 bg-gray-200 overflow-hidden">
          {game.cover_image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img 
              src={game.cover_image} 
              alt={game.title}
              className="object-cover w-full h-full"
            />
          ) : (
            <div className="flex items-center justify-center h-full text-gray-400">
              <span className="text-4xl font-bold opacity-20">{game.title}</span>
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-end">
            <div className="p-6 md:p-8 text-white">
              <h1 className="text-3xl md:text-4xl font-bold mb-2">{game.title}</h1>
              {game.tags && (
                <div className="flex gap-2">
                  {game.tags.map(tag => (
                    <span key={tag} className="px-2 py-1 bg-white/20 backdrop-blur-sm rounded text-xs">
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
        
        <div className="flex-1 p-6 md:p-8 flex flex-col items-center text-center">
          <p className="text-gray-600 text-lg mb-8 max-w-xl leading-relaxed">
            {game.description || 'An interactive adventure awaits.'}
          </p>
          
          <button
            onClick={handleStartGame}
            className="px-8 py-3 bg-blue-600 text-white text-lg font-semibold rounded-full shadow-lg hover:bg-blue-700 hover:shadow-xl transition-all transform hover:-translate-y-0.5"
          >
            Start Adventure
          </button>
          
          <Link href="/" className="mt-6 text-sm text-gray-500 hover:text-gray-800 underline">
            Back to Library
          </Link>
        </div>
      </div>
    );
  }

  if (!currentScene) {
    return (
      <div className="p-8 text-center">
        <h2 className="text-xl font-bold text-red-600 mb-4">Scene Not Found</h2>
        <p className="mb-6">Could not find scene: {currentSceneId}</p>
        <div className="flex justify-center gap-4">
          <button 
            onClick={handleRestart}
            className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300"
          >
            Back to Title
          </button>
        </div>
      </div>
    );
  }

  // Check if it's an end scene (no choices visible)
  const visibleChoices = currentScene.nodes.filter(node => 
    node.type === 'choice' && evaluateCondition(node.condition, gameState)
  );
  const hasChoices = visibleChoices.length > 0;

  return (
    <div className="flex flex-col min-h-[600px]">
      {/* Header */}
      <div className="bg-white border-b p-4 flex justify-between items-center sticky top-0 z-10 bg-opacity-90 backdrop-blur-sm">
        <h1 className="text-lg font-bold truncate text-gray-800">{game.title}</h1>
        <div className="flex gap-2 text-sm">
          <button 
            onClick={handleRestart}
            className="px-3 py-1.5 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
          >
            Quit
          </button>
        </div>
      </div>

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
                return <p key={index} className="text-lg leading-relaxed text-gray-800 font-serif">{node.content}</p>;
              
              // Images handled by persistent header
              case 'static_image':
              case 'ai_image':
                return null;
              
              case 'choice':
                if (!evaluateCondition(node.condition, gameState)) {
                  return null;
                }
                return (
                  <button 
                    key={index}
                    className="w-full text-left p-4 border-2 border-blue-100 rounded-xl hover:border-blue-500 hover:bg-blue-50 transition-all group shadow-sm hover:shadow-md"
                    onClick={() => {
                      if (node.set) {
                        const newState = executeSet(node.set, gameState);
                        setGameState(newState);
                      }
                      setCurrentSceneId(node.nextSceneId);
                    }}
                  >
                    <span className="font-medium text-blue-700 group-hover:text-blue-900 text-lg">{node.text}</span>
                  </button>
                );
                
              default:
                return null;
            }
          })}

          {/* End Screen Actions */}
          {!hasChoices && (
            <div className="mt-12 p-6 bg-gray-50 rounded-xl border border-gray-200 text-center animate-fade-in">
              <h3 className="text-2xl font-bold text-gray-800 mb-2">The End</h3>
              <p className="text-gray-500 mb-6">Thank you for playing!</p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <button
                  onClick={handleRestart}
                  className="px-6 py-3 bg-blue-600 text-white rounded-full hover:bg-blue-700 shadow transition-transform hover:-translate-y-0.5 font-medium"
                >
                  Play Again
                </button>
                <Link 
                  href="/"
                  className="px-6 py-3 bg-white text-gray-700 border border-gray-300 rounded-full hover:bg-gray-50 shadow-sm transition-transform hover:-translate-y-0.5 font-medium"
                >
                  Back to Library
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
