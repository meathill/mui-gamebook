export { useGamePlayer } from './use-game-player';
export { useSaveSystem } from './use-save-system';
export { useGameControls } from './use-game-controls';
export { useGameSettings } from './use-game-settings';
export { useRouteMap } from './use-route-map';
export { useSfx } from './use-sfx';
export { createSaveManager } from './save-manager';
export { evaluateCondition, executeSet, interpolateVariables } from '../utils/evaluator';

export type { GamePlayerState, GamePlayerActions, UseGamePlayerOptions } from './use-game-player';
export type { SaveData, SaveSlot, SaveSlotId } from './save-manager';
export type { UseSaveSystemReturn } from './use-save-system';
export type { GameControlsState, GameControlsActions, UseGameControlsOptions } from './use-game-controls';
export type { GameSettings, UseGameSettingsReturn } from './use-game-settings';
export type { RouteMapNode, UseRouteMapReturn } from './use-route-map';
