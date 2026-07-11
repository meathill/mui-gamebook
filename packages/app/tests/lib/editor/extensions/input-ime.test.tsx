import { fireEvent, render } from '@testing-library/react';
import { Schema } from '@tiptap/pm/model';
import { EditorState, TextSelection } from '@tiptap/pm/state';
import type { EditorView } from '@tiptap/pm/view';
import type { SuggestionKeyDownProps } from '@tiptap/suggestion';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import SlashCommandMenu from '@/components/editor/SlashCommandMenu';
import { Autocomplete } from '@/lib/editor/extensions/autocomplete';
import { slashCommandRender } from '@/lib/editor/extensions/slash-command-render';
import type { SlashCommandItem } from '@/lib/editor/extensions/slash-commands';

function createSlashCommandItem(title: string): SlashCommandItem {
  return {
    title,
    description: `${title} description`,
    icon: '•',
    command: vi.fn(),
  };
}

function createKeyboardEvent(key: string, init: KeyboardEventInit = {}) {
  return new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true, ...init });
}

function createSafariKeyboardEvent(key: string) {
  const event = createKeyboardEvent(key);
  Object.defineProperty(event, 'keyCode', { value: 229 });
  return event;
}

describe('编辑器扩展的 IME 键盘保护', () => {
  beforeEach(() => {
    Element.prototype.scrollIntoView = vi.fn();
  });

  afterEach(() => {
    document.querySelectorAll('.dsl-autocomplete-menu').forEach((element) => element.remove());
  });

  it('SlashCommandMenu 的 document 监听器在组合输入时不移动或执行选项', () => {
    const first = createSlashCommandItem('第一项');
    const second = createSlashCommandItem('第二项');
    const command = vi.fn();
    render(
      <SlashCommandMenu
        items={[first, second]}
        command={command}
      />,
    );

    expect(fireEvent.keyDown(document, { key: 'ArrowDown', isComposing: true })).toBe(true);
    expect(fireEvent.keyDown(document, { key: 'Enter', isComposing: true })).toBe(true);
    expect(command).not.toHaveBeenCalled();

    fireEvent.keyDown(document, { key: 'Enter' });
    expect(command).toHaveBeenCalledWith(first);
  });

  it.each([
    { label: '事件处于组合态', event: createKeyboardEvent('Enter', { isComposing: true }), viewComposing: false },
    { label: 'Safari keyCode 229', event: createSafariKeyboardEvent('ArrowDown'), viewComposing: false },
    { label: 'TipTap view 处于组合态', event: createKeyboardEvent('Escape'), viewComposing: true },
  ])('slash command renderer 在$label时返回 false', ({ event, viewComposing }) => {
    const renderer = slashCommandRender();
    const props = {
      event,
      view: { composing: viewComposing },
      range: { from: 1, to: 1 },
    } as unknown as SuggestionKeyDownProps;

    expect(renderer.onKeyDown(props)).toBe(false);
    expect(event.defaultPrevented).toBe(false);
  });

  it('slash command renderer 在普通快捷键上维持既有处理', () => {
    const renderer = slashCommandRender();
    const props = {
      event: createKeyboardEvent('Enter'),
      view: { composing: false },
      range: { from: 1, to: 1 },
    } as unknown as SuggestionKeyDownProps;

    expect(renderer.onKeyDown(props)).toBe(true);
  });

  it('TipTap autocomplete 在 event 或 view 组合期间不接管 Enter', () => {
    const extension = Autocomplete.configure({ sceneIds: ['scene-a'], variableNames: [] });
    const addPlugins = extension.config.addProseMirrorPlugins;
    if (!addPlugins) throw new Error('Autocomplete 缺少 addProseMirrorPlugins');

    const plugins = addPlugins.call({ options: extension.options } as ThisParameterType<typeof addPlugins>);
    const plugin = plugins[0];
    const schema = new Schema({
      nodes: {
        doc: { content: 'paragraph+' },
        paragraph: { content: 'text*' },
        text: {},
      },
    });
    const doc = schema.node('doc', undefined, [schema.node('paragraph', undefined, [schema.text('-> ')])]);
    const state = EditorState.create({
      schema,
      doc,
      selection: TextSelection.atEnd(doc),
      plugins,
    });
    const dispatch = vi.fn();
    const viewState = {
      state,
      composing: false,
      coordsAtPos: () => ({ left: 0, right: 0, top: 0, bottom: 10 }),
      dispatch,
      focus: vi.fn(),
    };
    const view = viewState as unknown as EditorView;
    const pluginView = plugin.spec.view?.(view);
    pluginView?.update?.(view, state);
    expect(document.querySelector('.dsl-autocomplete-menu')).not.toBeNull();

    const handleKeyDown = plugin.props.handleKeyDown;
    if (!handleKeyDown) throw new Error('Autocomplete 缺少 handleKeyDown');

    const composingEvent = createKeyboardEvent('Enter', { isComposing: true });
    expect(handleKeyDown.call(plugin, view, composingEvent)).toBe(false);
    expect(composingEvent.defaultPrevented).toBe(false);
    expect(dispatch).not.toHaveBeenCalled();

    viewState.composing = true;
    const viewComposingEvent = createKeyboardEvent('Enter');
    expect(handleKeyDown.call(plugin, view, viewComposingEvent)).toBe(false);
    expect(viewComposingEvent.defaultPrevented).toBe(false);
    expect(dispatch).not.toHaveBeenCalled();

    viewState.composing = false;
    expect(handleKeyDown.call(plugin, view, createKeyboardEvent('Enter'))).toBe(true);
    expect(dispatch).toHaveBeenCalledTimes(1);
    pluginView?.destroy?.();
  });
});
