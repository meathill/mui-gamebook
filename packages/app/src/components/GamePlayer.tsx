'use client';

import { useState } from 'react';
import type { Game } from '@mui-gamebook/parser/src/types'; // Ensure we can import types

export default function GamePlayer({ game }: { game: Game }) {
  const [currentSceneId, setCurrentSceneId] = useState<string>('start'); // Default start scene
  const [gameState, setGameState] = useState(game.initialState);

  // Find the current scene object
  const currentScene = game.scenes.get(currentSceneId);

  if (!currentScene) {
    return <div className="p-4 text-red-500">Scene not found: {currentSceneId}</div>;
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">{game.title}</h1>
      <div className="space-y-4">
        <p className="text-gray-600">Current Scene: {currentSceneId}</p>
        
        {/* Placeholder for scene content */}
        <div className="border p-4 rounded bg-gray-50">
          {currentScene.nodes.map((node, index) => (
            <div key={index} className="mb-2">
              {node.type === 'text' && <p>{node.content}</p>}
              {node.type === 'choice' && (
                <button 
                  className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                  onClick={() => setCurrentSceneId(node.nextSceneId)}
                >
                  {node.text}
                </button>
              )}
              {/* Add other node types here */}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
