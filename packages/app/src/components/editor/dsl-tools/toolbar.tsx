import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import {
  PlusIcon,
  GitBranchIcon,
  ArrowRightIcon,
  CaretDownIcon,
  ArrowCounterClockwiseIcon,
  ArrowClockwiseIcon,
} from '@phosphor-icons/react';
import { DSL_TOOL_LABELS, type DslToolKind } from '@/lib/editor/dsl-tools/types';

const INSERT_TOOLS: DslToolKind[] = ['dialogue', 'variable', 'conditional', 'image', 'audio', 'video', 'minigame'];
const BUTTON_CLASS =
  'flex items-center gap-1.5 rounded-md px-2.5 py-2 text-sm text-gray-700 hover:bg-gray-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 disabled:opacity-30';

export default function DslToolbar({
  onOpen,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
}: {
  onOpen: (kind: DslToolKind) => void;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
}) {
  return (
    <div
      role="toolbar"
      aria-label="剧情快速工具"
      className="flex shrink-0 flex-wrap items-center gap-0.5 border-b border-gray-200 bg-gray-50 px-2 py-1.5">
      <button
        type="button"
        className={BUTTON_CLASS}
        onClick={() => onOpen('scene')}>
        <PlusIcon size={16} />
        新建场景
      </button>
      <button
        type="button"
        className={BUTTON_CLASS}
        onClick={() => onOpen('choice')}>
        <GitBranchIcon size={16} />
        添加选项
      </button>
      <button
        type="button"
        className={BUTTON_CLASS}
        onClick={() => onOpen('redirect')}>
        <ArrowRightIcon size={16} />
        场景跳转
      </button>
      <DropdownMenu.Root>
        <DropdownMenu.Trigger className={BUTTON_CLASS}>
          插入
          <CaretDownIcon size={14} />
        </DropdownMenu.Trigger>
        <DropdownMenu.Portal>
          <DropdownMenu.Content
            align="start"
            sideOffset={6}
            className="z-50 min-w-40 rounded-lg border border-gray-200 bg-white p-1 shadow-lg">
            {INSERT_TOOLS.map((kind) => (
              <DropdownMenu.Item
                key={kind}
                className="cursor-pointer rounded px-3 py-2 text-sm text-gray-700 outline-none focus:bg-orange-50 focus:text-orange-800"
                onSelect={() => onOpen(kind)}>
                {DSL_TOOL_LABELS[kind]}
              </DropdownMenu.Item>
            ))}
          </DropdownMenu.Content>
        </DropdownMenu.Portal>
      </DropdownMenu.Root>
      <div className="mx-1 h-5 w-px bg-gray-300" />
      <button
        type="button"
        className={BUTTON_CLASS}
        onClick={onUndo}
        disabled={!canUndo}
        title="撤销 (Ctrl+Z)"
        aria-label="撤销">
        <ArrowCounterClockwiseIcon size={16} />
      </button>
      <button
        type="button"
        className={BUTTON_CLASS}
        onClick={onRedo}
        disabled={!canRedo}
        title="重做 (Ctrl+Shift+Z)"
        aria-label="重做">
        <ArrowClockwiseIcon size={16} />
      </button>
    </div>
  );
}
