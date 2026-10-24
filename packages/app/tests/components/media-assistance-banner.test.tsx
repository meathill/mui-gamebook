import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import MediaAssistanceBanner from '@/components/editor/media-assistance-banner';
import { useEditorStore } from '@/lib/editor/store';
import type { EditorGame } from '@/lib/editor/useEditorData';

function makeGame(overrides: Partial<EditorGame> = {}): EditorGame {
  return {
    canEnableMediaAssistance: true,
    mediaAssistanceEnabled: false,
    ...overrides,
  } as unknown as EditorGame;
}

describe('素材协助邀请 banner', () => {
  beforeEach(() => {
    useEditorStore.setState({ activeTab: 'story' });
  });

  it('可开启且未开启时展示，点击「了解详情」弹出完整说明', async () => {
    render(<MediaAssistanceBanner game={makeGame()} />);

    expect(screen.getByText(/站方 AI 素材协助/)).toBeInTheDocument();

    fireEvent.click(screen.getByText('了解详情'));
    expect(await screen.findByRole('dialog')).toHaveTextContent('不会替换你已有的素材');
  });

  it('已开启、无权限或权限未知时不渲染', () => {
    const { rerender } = render(<MediaAssistanceBanner game={makeGame({ mediaAssistanceEnabled: true })} />);
    expect(screen.queryByText(/站方 AI 素材协助/)).not.toBeInTheDocument();

    rerender(<MediaAssistanceBanner game={makeGame({ canEnableMediaAssistance: false })} />);
    expect(screen.queryByText(/站方 AI 素材协助/)).not.toBeInTheDocument();

    rerender(<MediaAssistanceBanner game={makeGame({ canEnableMediaAssistance: undefined })} />);
    expect(screen.queryByText(/站方 AI 素材协助/)).not.toBeInTheDocument();
  });

  it('点击「去设置开启」关闭弹窗并切换到设置 tab', async () => {
    render(<MediaAssistanceBanner game={makeGame()} />);

    fireEvent.click(screen.getByText('了解详情'));
    fireEvent.click(await screen.findByRole('button', { name: '去设置开启' }));

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(useEditorStore.getState().activeTab).toBe('settings');
  });
});
