/**
 * 斜杠命令菜单的 render 回调
 *
 * 将 TipTap Suggestion 的 render 事件连接到 React 组件。
 * 使用 createRoot 将 SlashCommandMenu 挂载到 DOM。
 */
import { createRoot, type Root } from 'react-dom/client';
import type { SuggestionProps, SuggestionKeyDownProps } from '@tiptap/suggestion';
import SlashCommandMenu from '@/components/editor/SlashCommandMenu';
import type { SlashCommandItem } from './slash-commands';

export function slashCommandRender() {
  let root: Root | null = null;
  let container: HTMLDivElement | null = null;
  let component: { onKeyDown: (event: KeyboardEvent) => boolean } | null = null;

  return {
    onStart(props: SuggestionProps<SlashCommandItem>) {
      container = document.createElement('div');
      container.style.position = 'absolute';
      container.style.zIndex = '50';
      document.body.appendChild(container);

      root = createRoot(container);
      updatePosition(props, container);
      renderMenu(root, props);
    },

    onUpdate(props: SuggestionProps<SlashCommandItem>) {
      if (!root || !container) return;
      updatePosition(props, container);
      renderMenu(root, props);
    },

    onKeyDown(props: SuggestionKeyDownProps) {
      if (props.event.key === 'Escape') {
        return true;
      }
      // ArrowUp/ArrowDown/Enter 由 SlashCommandMenu 内部处理
      if (['ArrowUp', 'ArrowDown', 'Enter'].includes(props.event.key)) {
        return true;
      }
      return false;
    },

    onExit() {
      if (root) {
        root.unmount();
        root = null;
      }
      if (container) {
        container.remove();
        container = null;
      }
    },
  };
}

function updatePosition(props: SuggestionProps<SlashCommandItem>, container: HTMLDivElement) {
  const { clientRect } = props;
  if (!clientRect) return;

  const rect = clientRect();
  if (!rect) return;

  container.style.left = `${rect.left}px`;
  container.style.top = `${rect.bottom + 4}px`;
}

function renderMenu(root: Root, props: SuggestionProps<SlashCommandItem>) {
  root.render(
    <SlashCommandMenu
      items={props.items}
      command={(item) => props.command(item)}
    />,
  );
}
