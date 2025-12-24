import type { SceneNode, AICharacter } from '@mui-gamebook/parser';

export interface MediaAssetItemProps {
  /** 资源数据 */
  asset: SceneNode;
  /** 游戏 ID，用于上传和生成 */
  gameId: string;
  /** 显示模式：featured 大尺寸（封面），compact 紧凑（素材列表） */
  variant?: 'featured' | 'compact';
  /** 是否显示删除按钮 */
  showDelete?: boolean;
  /** AI 样式提示词，用于增强生成效果 */
  aiStylePrompt?: string;
  /** AI 配置的角色列表，用于 @ 提及功能 */
  aiCharacters?: Record<string, AICharacter>;
  /** 资源变更回调 */
  onAssetChange: (field: string, value: string) => void;
  /** 删除回调 */
  onAssetDelete?: () => void;
}

export interface MediaGeneratorProps {
  prompt: string;
  aspectRatio: string;
  isImage: boolean;
  isGenerating: boolean;
  aspectRatios: { value: string; label: string }[];
  /** AI 配置的角色列表，用于 @ 提及功能 */
  characters?: Record<string, AICharacter>;
  onPromptChange: (value: string) => void;
  onAspectRatioChange: (value: string) => void;
  onGenerate: () => void;
  variant?: 'featured' | 'compact';
}

export interface MediaPreviewProps {
  url: string;
  isImage: boolean;
  isAudio: boolean;
  isVideo: boolean;
  isMinigame: boolean;
  isPending: boolean;
  variant?: 'featured' | 'compact';
}

export interface TypeIconProps {
  isImage: boolean;
  isAudio: boolean;
  isVideo: boolean;
  isMinigame: boolean;
  size: number;
}
