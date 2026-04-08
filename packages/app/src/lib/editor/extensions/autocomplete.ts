/**
 * 自动补全扩展
 *
 * 在输入 `-> ` 后提示场景 ID 列表；在输入 `{{` 后提示变量名列表。
 * 通过 ProseMirror Plugin 监听输入，显示浮动菜单。
 */
import { Extension } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import type { EditorView } from '@tiptap/pm/view';

const pluginKey = new PluginKey('autocomplete');

interface AutocompleteState {
  active: boolean;
  type: 'scene' | 'variable' | null;
  query: string;
  from: number;
  to: number;
}

const INACTIVE: AutocompleteState = { active: false, type: null, query: '', from: 0, to: 0 };

function getAutocompleteState(view: EditorView): AutocompleteState {
  const { state } = view;
  const { $from } = state.selection;
  if (!$from.parent.isTextblock) return INACTIVE;

  const textBefore = $from.parent.textBetween(0, $from.parentOffset, undefined, '\ufffc');

  // 检测 -> 后的输入（场景 ID 补全）
  const arrowMatch = textBefore.match(/->\s*(\w*)$/);
  if (arrowMatch) {
    const query = arrowMatch[1];
    const from = $from.pos - query.length;
    return { active: true, type: 'scene', query, from, to: $from.pos };
  }

  // 检测 {{ 后的输入（变量名补全）
  const varMatch = textBefore.match(/\{\{(\w*)$/);
  if (varMatch) {
    const query = varMatch[1];
    const from = $from.pos - query.length;
    return { active: true, type: 'variable', query, from, to: $from.pos };
  }

  return INACTIVE;
}

function createMenu(items: string[], onSelect: (item: string) => void, selectedIndex: number): HTMLDivElement {
  const menu = document.createElement('div');
  menu.className = 'dsl-autocomplete-menu';

  if (items.length === 0) {
    menu.innerHTML = '<div class="dsl-autocomplete-empty">无匹配项</div>';
    return menu;
  }

  items.forEach((item, i) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = `dsl-autocomplete-item${i === selectedIndex ? ' dsl-autocomplete-selected' : ''}`;
    btn.textContent = item;
    btn.addEventListener('mousedown', (e) => {
      e.preventDefault();
      onSelect(item);
    });
    menu.appendChild(btn);
  });

  return menu;
}

export const Autocomplete = Extension.create({
  name: 'autocomplete',

  addOptions() {
    return {
      sceneIds: [] as string[],
      variableNames: [] as string[],
    };
  },

  addProseMirrorPlugins() {
    const options = this.options;
    let menuEl: HTMLDivElement | null = null;
    let selectedIndex = 0;

    function destroyMenu() {
      if (menuEl) {
        menuEl.remove();
        menuEl = null;
      }
      selectedIndex = 0;
    }

    function showMenu(view: EditorView, acState: AutocompleteState) {
      destroyMenu();

      const items = acState.type === 'scene' ? options.sceneIds : options.variableNames;
      const filtered = acState.query
        ? items.filter((id: string) => id.toLowerCase().includes(acState.query.toLowerCase()))
        : items;

      if (filtered.length === 0) return;

      function selectItem(item: string) {
        const { state } = view;
        let insertText = item;
        // 变量补全需要加 }}
        if (acState.type === 'variable') {
          insertText = item + '}}';
        }
        const tr = state.tr.replaceWith(acState.from, acState.to, state.schema.text(insertText));
        view.dispatch(tr);
        view.focus();
        destroyMenu();
      }

      menuEl = createMenu(filtered, selectItem, selectedIndex);

      // 定位到光标处
      const coords = view.coordsAtPos(acState.to);
      menuEl.style.position = 'fixed';
      menuEl.style.left = `${coords.left}px`;
      menuEl.style.top = `${coords.bottom + 4}px`;
      menuEl.style.zIndex = '100';
      document.body.appendChild(menuEl);
    }

    return [
      new Plugin({
        key: pluginKey,
        props: {
          handleKeyDown(view, event) {
            if (!menuEl) return false;

            if (event.key === 'ArrowDown') {
              event.preventDefault();
              const items = menuEl.querySelectorAll('.dsl-autocomplete-item');
              selectedIndex = (selectedIndex + 1) % items.length;
              items.forEach((el, i) => el.classList.toggle('dsl-autocomplete-selected', i === selectedIndex));
              return true;
            }
            if (event.key === 'ArrowUp') {
              event.preventDefault();
              const items = menuEl.querySelectorAll('.dsl-autocomplete-item');
              selectedIndex = (selectedIndex - 1 + items.length) % items.length;
              items.forEach((el, i) => el.classList.toggle('dsl-autocomplete-selected', i === selectedIndex));
              return true;
            }
            if (event.key === 'Enter' || event.key === 'Tab') {
              const selected = menuEl.querySelector('.dsl-autocomplete-selected') as HTMLButtonElement;
              if (selected) {
                event.preventDefault();
                selected.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
                return true;
              }
            }
            if (event.key === 'Escape') {
              destroyMenu();
              return true;
            }
            return false;
          },
        },
        view() {
          return {
            update(view) {
              const acState = getAutocompleteState(view);
              if (acState.active) {
                showMenu(view, acState);
              } else {
                destroyMenu();
              }
            },
            destroy() {
              destroyMenu();
            },
          };
        },
      }),
    ];
  },
});
