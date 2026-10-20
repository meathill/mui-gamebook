import type { Game, Scene, SceneChoiceNode } from '@roudanio/parser/src/types';

export function getScene(game: Game, sceneId: string): Scene {
  const scene = game.scenes[sceneId];
  if (!scene) throw new Error(`场景不存在: ${sceneId}`);
  return scene;
}

export function choiceNodes(scene: Scene): SceneChoiceNode[] {
  return scene.nodes.filter((node): node is SceneChoiceNode => node.type === 'choice');
}
