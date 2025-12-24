import type { AICharacter } from '@mui-gamebook/parser/src/types';

export interface MentionInputProps {
  /** 原始文本值（包含 @角色ID） */
  value: string;
  /** 值变化回调 */
  onChange: (value: string) => void;
  /** 可引用的角色列表 */
  characters: Record<string, AICharacter>;
  /** 占位符文本 */
  placeholder?: string;
  /** 自定义样式类名 */
  className?: string;
  /** 是否禁用 */
  disabled?: boolean;
}

export interface CharacterDropdownProps {
  /** 角色列表 */
  characters: Array<{ id: string; character: AICharacter }>;
  /** 选中回调 */
  onSelect: (id: string) => void;
  /** 关闭回调 */
  onClose: () => void;
  /** 搜索关键词 */
  searchTerm: string;
  /** 当前选中的索引 */
  selectedIndex: number;
  /** 下拉框位置 */
  position: { top: number; left: number };
}

export interface CharacterTagProps {
  /** 角色 ID */
  id: string;
  /** 角色名称 */
  name: string;
}

export interface MentionPosition {
  start: number;
  end: number;
}
