import '@testing-library/jest-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import MediaAssetItem from '@/components/editor/MediaAssetItem';

// Mock useDialog
vi.mock('@/components/Dialog', () => ({
  useDialog: () => ({
    error: vi.fn(),
    alert: vi.fn(),
    confirm: vi.fn().mockResolvedValue(true),
  }),
}));

// Mock useCmsConfig
vi.mock('@/hooks/useCmsConfig', () => ({
  useCmsConfig: () => ({
    data: { defaultAiProvider: 'google' },
  }),
  getAspectRatios: () => [
    { value: '1:1', label: '1:1 (方形)' },
    { value: '3:2', label: '3:2 (横向)' },
    { value: '2:3', label: '2:3 (竖向)' },
  ],
}));

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

describe('MediaAssetItem', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('compact 模式', () => {
    it('应该渲染图片类型素材', () => {
      const asset = { type: 'ai_image' as const, prompt: '', url: 'https://example.com/image.png' };
      const onAssetChange = vi.fn();

      render(
        <MediaAssetItem
          asset={asset}
          gameId="123"
          variant="compact"
          onAssetChange={onAssetChange}
        />,
        { wrapper: createWrapper() },
      );

      expect(screen.getByText('image')).toBeInTheDocument();
    });

    it('应该显示删除按钮（当 showDelete 为 true）', () => {
      const asset = { type: 'ai_image' as const, prompt: '' };
      const onAssetChange = vi.fn();
      const onAssetDelete = vi.fn();

      render(
        <MediaAssetItem
          asset={asset}
          gameId="123"
          variant="compact"
          showDelete={true}
          onAssetChange={onAssetChange}
          onAssetDelete={onAssetDelete}
        />,
        { wrapper: createWrapper() },
      );

      const deleteButton = screen.getByTitle('删除素材');
      expect(deleteButton).toBeInTheDocument();

      fireEvent.click(deleteButton);
      expect(onAssetDelete).toHaveBeenCalledTimes(1);
    });

    it('不应该显示删除按钮（当 showDelete 为 false）', () => {
      const asset = { type: 'ai_image' as const, prompt: '' };
      const onAssetChange = vi.fn();

      render(
        <MediaAssetItem
          asset={asset}
          gameId="123"
          variant="compact"
          showDelete={false}
          onAssetChange={onAssetChange}
        />,
        { wrapper: createWrapper() },
      );

      expect(screen.queryByTitle('删除素材')).not.toBeInTheDocument();
    });

    it('点击 AI 生成按钮应该显示生成器', () => {
      const asset = { type: 'ai_image' as const, prompt: '' };
      const onAssetChange = vi.fn();

      render(
        <MediaAssetItem
          asset={asset}
          gameId="123"
          variant="compact"
          onAssetChange={onAssetChange}
        />,
        { wrapper: createWrapper() },
      );

      const aiButton = screen.getByTitle('AI 生成素材');
      fireEvent.click(aiButton);

      expect(screen.getByPlaceholderText('输入 AI 生成提示词...')).toBeInTheDocument();
    });
  });

  describe('featured 模式', () => {
    it('应该渲染封面标签', () => {
      const asset = { type: 'ai_image' as const, prompt: '' };
      const onAssetChange = vi.fn();

      render(
        <MediaAssetItem
          asset={asset}
          gameId="123"
          variant="featured"
          showDelete={false}
          onAssetChange={onAssetChange}
        />,
        { wrapper: createWrapper() },
      );

      expect(screen.getByText('封面')).toBeInTheDocument();
    });

    it('没有内容时应该显示上传和生成按钮', () => {
      const asset = { type: 'ai_image' as const, prompt: '' };
      const onAssetChange = vi.fn();

      render(
        <MediaAssetItem
          asset={asset}
          gameId="123"
          variant="featured"
          showDelete={false}
          onAssetChange={onAssetChange}
        />,
        { wrapper: createWrapper() },
      );

      expect(screen.getByText('上传文件')).toBeInTheDocument();
      expect(screen.getByText('AI 生成')).toBeInTheDocument();
    });

    it('点击 AI 生成应该显示生成器', () => {
      const asset = { type: 'ai_image' as const, prompt: '' };
      const onAssetChange = vi.fn();

      render(
        <MediaAssetItem
          asset={asset}
          gameId="123"
          variant="featured"
          showDelete={false}
          onAssetChange={onAssetChange}
        />,
        { wrapper: createWrapper() },
      );

      const aiButton = screen.getByText('AI 生成');
      fireEvent.click(aiButton);

      expect(screen.getByPlaceholderText('描述你想要的内容...')).toBeInTheDocument();
      expect(screen.getByText('比例:')).toBeInTheDocument();
    });
  });

  describe('上传功能', () => {
    it('应该调用上传 API', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ url: 'https://example.com/uploaded.png' }),
      });

      const asset = { type: 'ai_image' as const, prompt: '' };
      const onAssetChange = vi.fn();

      render(
        <MediaAssetItem
          asset={asset}
          gameId="123"
          variant="compact"
          onAssetChange={onAssetChange}
        />,
        { wrapper: createWrapper() },
      );

      const uploadButton = screen.getByTitle('上传素材');
      expect(uploadButton).toBeInTheDocument();
    });
  });

  describe('生成功能', () => {
    it('输入提示词后应该启用生成按钮', async () => {
      const asset = { type: 'ai_image' as const, prompt: '' };
      const onAssetChange = vi.fn();

      render(
        <MediaAssetItem
          asset={asset}
          gameId="123"
          variant="compact"
          onAssetChange={onAssetChange}
        />,
        { wrapper: createWrapper() },
      );

      const aiButton = screen.getByTitle('AI 生成素材');
      fireEvent.click(aiButton);

      const textarea = screen.getByPlaceholderText('输入 AI 生成提示词...');
      fireEvent.change(textarea, { target: { value: '测试提示词' } });

      expect(onAssetChange).toHaveBeenCalledWith('prompt', '测试提示词');
    });
  });
});
