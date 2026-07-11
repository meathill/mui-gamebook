import { fireEvent, render, screen } from '@testing-library/react';
import type { NodeViewProps } from '@tiptap/react';
import type { ComponentProps, ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import SceneMetadataBlock from '@/components/editor/SceneMetadataBlock';

vi.mock('@tiptap/react', () => ({
  NodeViewWrapper({ children, ...props }: { children: ReactNode } & ComponentProps<'div'>) {
    return <div {...props}>{children}</div>;
  },
  NodeViewContent() {
    return <div data-testid="node-view-content" />;
  },
}));

interface SceneMetadataBlockTestOptions {
  yaml: string;
  gameId?: string;
}

function createNodeViewProps({ yaml, gameId = '' }: SceneMetadataBlockTestOptions): NodeViewProps {
  return {
    node: {
      attrs: { language: 'yaml' },
      textContent: yaml,
      nodeSize: yaml.length + 2,
    },
    editor: {
      view: {
        state: {
          tr: {
            replaceWith: vi.fn(),
          },
          schema: {
            text: vi.fn(),
          },
        },
        dispatch: vi.fn(),
      },
    },
    getPos: () => 0,
    extension: {
      options: { gameId },
    },
  } as unknown as NodeViewProps;
}

function renderMetadataBlock(options: SceneMetadataBlockTestOptions) {
  return render(<SceneMetadataBlock {...createNodeViewProps(options)} />);
}

describe('SceneMetadataBlock', () => {
  it.each([
    ['图片', 'image', '图片描述'],
    ['音频', 'audio', '音频描述'],
    ['视频', 'video', '视频描述'],
  ])('%s编辑时输入不会重挂载表单', (_name, section, fieldLabel) => {
    const initialValue = '奶奶给的平安符';
    const { container } = renderMetadataBlock({
      yaml: `${section}:\n  prompt: ${initialValue}`,
    });

    fireEvent.click(screen.getByTitle('编辑'));

    const field = screen.getByText(fieldLabel).parentElement?.querySelector('textarea');
    expect(field).toBeInstanceOf(HTMLTextAreaElement);
    if (!(field instanceof HTMLTextAreaElement)) return;

    field.focus();
    field.setSelectionRange(2, 2);
    field.setRangeText('新', 2, 2, 'end');
    fireEvent.input(field);

    const currentField = container.querySelector('textarea');
    expect(currentField).toBe(field);
    expect(currentField).toHaveFocus();
    expect(currentField).toHaveValue('奶奶新给的平安符');
    expect(currentField?.selectionStart).toBe(3);
    expect(currentField?.selectionEnd).toBe(3);
  });

  it('编辑图片地址时不会被描述输入框重新抢走焦点', () => {
    const { container } = renderMetadataBlock({
      yaml: 'image:\n  prompt: 奶奶给的平安符',
    });

    fireEvent.click(screen.getByTitle('编辑'));

    const urlField = screen.getByText('图片地址').parentElement?.querySelector('input');
    expect(urlField).toBeInstanceOf(HTMLInputElement);
    if (!(urlField instanceof HTMLInputElement)) return;

    urlField.focus();
    urlField.setRangeText('https://example.com/image.png', 0, 0, 'end');
    fireEvent.input(urlField);

    const currentUrlField = container.querySelectorAll('input')[0];
    expect(currentUrlField).toBe(urlField);
    expect(currentUrlField).toHaveFocus();
    expect(currentUrlField).toHaveValue('https://example.com/image.png');
  });
});
