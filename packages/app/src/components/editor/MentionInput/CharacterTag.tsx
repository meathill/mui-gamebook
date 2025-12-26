import type { CharacterTagProps } from './types';

/**
 * 角色标签组件
 * 在输入框中显示高亮的角色名称
 */
export default function CharacterTag({ name }: CharacterTagProps) {
  return (
    <span
      className="inline-flex items-center px-1.5 py-0.5 mx-0.5 bg-purple-100 text-purple-700 rounded text-xs font-medium cursor-default select-none"
      contentEditable={false}>
      @{name}
    </span>
  );
}
