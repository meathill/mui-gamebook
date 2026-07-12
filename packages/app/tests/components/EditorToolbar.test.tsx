import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('next/link', () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => <a href={href}>{children}</a>,
}));

import EditorToolbar from '@/components/editor/EditorToolbar';
import { useEditorStore } from '@/lib/editor/store';

const baseProps = {
  slug: 'my-game',
  saving: false,
  onAddScene: vi.fn(),
  onLayout: vi.fn(),
  onSave: vi.fn(),
  leftSidebarOpen: true,
  onToggleLeftSidebar: vi.fn(),
};

describe('EditorToolbar', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useEditorStore.setState({ activeTab: 'story', chatOpen: false });
  });

  it('显示游戏标题', () => {
    render(
      <EditorToolbar
        {...baseProps}
        title="我的游戏"
      />,
    );

    expect(screen.getByText('我的游戏')).toBeInTheDocument();
  });

  it('点击 tab 按钮调用 store 的 setActiveTab', () => {
    render(<EditorToolbar {...baseProps} />);

    fireEvent.click(screen.getByText('流程图'));

    expect(useEditorStore.getState().activeTab).toBe('flowchart');
  });

  it('flowchart tab 下显示新增场景和自动布局按钮，story tab 下不显示', () => {
    useEditorStore.setState({ activeTab: 'flowchart' });
    const { rerender } = render(<EditorToolbar {...baseProps} />);
    expect(screen.getByTitle('添加场景')).toBeInTheDocument();
    expect(screen.getByTitle('自动布局')).toBeInTheDocument();

    useEditorStore.setState({ activeTab: 'story' });
    rerender(<EditorToolbar {...baseProps} />);
    expect(screen.queryByTitle('添加场景')).not.toBeInTheDocument();
  });

  it('点击新增场景/自动布局按钮调用对应回调', () => {
    useEditorStore.setState({ activeTab: 'flowchart' });
    const onAddScene = vi.fn();
    const onLayout = vi.fn();
    render(
      <EditorToolbar
        {...baseProps}
        onAddScene={onAddScene}
        onLayout={onLayout}
      />,
    );

    fireEvent.click(screen.getByTitle('添加场景'));
    fireEvent.click(screen.getByTitle('自动布局'));

    expect(onAddScene).toHaveBeenCalledTimes(1);
    expect(onLayout).toHaveBeenCalledTimes(1);
  });

  it('settings tab 下不显示左侧栏切换和 AI 助手按钮', () => {
    useEditorStore.setState({ activeTab: 'settings' });
    render(<EditorToolbar {...baseProps} />);

    expect(screen.queryByTitle('变量/角色面板')).not.toBeInTheDocument();
    expect(screen.queryByTitle('AI 助手')).not.toBeInTheDocument();
  });

  it('点击 AI 助手按钮调用 store 的 toggleChatOpen', () => {
    render(<EditorToolbar {...baseProps} />);

    fireEvent.click(screen.getByTitle('AI 助手'));

    expect(useEditorStore.getState().chatOpen).toBe(true);
  });

  it('保存中时保存按钮禁用且文案变化，不显示保存状态文字', () => {
    render(
      <EditorToolbar
        {...baseProps}
        saving
      />,
    );

    expect(screen.getByText('保存中...').closest('button')).toBeDisabled();
    expect(screen.queryByText('已保存')).not.toBeInTheDocument();
  });

  it('未保存/已保存状态正确显示文案', () => {
    const { rerender } = render(
      <EditorToolbar
        {...baseProps}
        saveStatus="unsaved"
      />,
    );
    expect(screen.getByText('未保存')).toBeInTheDocument();

    rerender(
      <EditorToolbar
        {...baseProps}
        saveStatus="saved"
      />,
    );
    expect(screen.getByText('已保存')).toBeInTheDocument();
  });

  it('点击保存按钮调用 onSave', () => {
    const onSave = vi.fn();
    render(
      <EditorToolbar
        {...baseProps}
        onSave={onSave}
      />,
    );

    fireEvent.click(screen.getByText('保存'));

    expect(onSave).toHaveBeenCalledTimes(1);
  });

  it('预览链接拼接 previewUrl 和 slug', () => {
    render(
      <EditorToolbar
        {...baseProps}
        previewUrl="https://muistory.com"
        slug="my-game"
      />,
    );

    expect(screen.getByTitle('预览').closest('a')).toHaveAttribute('href', 'https://muistory.com/play/my-game');
  });
});
