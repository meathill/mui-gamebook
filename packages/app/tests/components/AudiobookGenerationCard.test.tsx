import { fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Game } from '@mui-gamebook/parser/src/types';
import AudiobookGenerationCard from '@/components/editor/AudiobookGenerationCard';

const fetchMock = vi.fn<typeof fetch>();

function makeGame(sceneIds: string[]): Game {
  return {
    slug: 'test-game',
    title: 'Test Game',
    initialState: {},
    ai: {},
    scenes: Object.fromEntries(sceneIds.map((id) => [id, { id, nodes: [] }])),
  };
}

function okResponse(body: unknown = {}) {
  return { ok: true, json: () => Promise.resolve(body) } as Response;
}

function errorResponse(status: number, body: unknown = { error: '出错了' }) {
  return { ok: false, status, json: () => Promise.resolve(body) } as Response;
}

describe('AudiobookGenerationCard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('点击触发按钮打开弹窗，展示场景数量', () => {
    render(
      <AudiobookGenerationCard
        gameId="1"
        game={makeGame(['start', 'end'])}
      />,
    );

    fireEvent.click(screen.getByText('一键生成有声书'));

    expect(screen.getByText(/将为全书 2 个场景/)).toBeInTheDocument();
  });

  it('开始生成后按场景顺序依次调用接口，全部成功后显示完成状态', async () => {
    fetchMock.mockResolvedValue(okResponse({ sceneId: 'start', clips: [] }));

    render(
      <AudiobookGenerationCard
        gameId="1"
        game={makeGame(['start', 'end'])}
      />,
    );
    fireEvent.click(screen.getByText('一键生成有声书'));
    fireEvent.click(screen.getByText('开始生成'));

    await vi.waitFor(() => expect(screen.getByText(/已完成/)).toBeInTheDocument());
    expect(screen.getByText(/2 \/ 2 个场景/)).toBeInTheDocument();

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      '/api/cms/games/1/audiobook/generate-scene',
      expect.objectContaining({ method: 'POST', body: JSON.stringify({ sceneId: 'start' }) }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      '/api/cms/games/1/audiobook/generate-scene',
      expect.objectContaining({ body: JSON.stringify({ sceneId: 'end' }) }),
    );
  });

  it('某个场景失败时记录错误并继续处理下一个场景', async () => {
    fetchMock.mockResolvedValueOnce(errorResponse(500, { error: 'TTS 挂了' })).mockResolvedValueOnce(okResponse());

    render(
      <AudiobookGenerationCard
        gameId="1"
        game={makeGame(['start', 'end'])}
      />,
    );
    fireEvent.click(screen.getByText('一键生成有声书'));
    fireEvent.click(screen.getByText('开始生成'));

    await vi.waitFor(() => expect(screen.getByText(/已完成/)).toBeInTheDocument());

    expect(screen.getByText(/1 个失败/)).toBeInTheDocument();
    expect(screen.getByText('TTS 挂了')).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('点击"取消剩余"后不再调用后续场景的接口', async () => {
    let resolveFirst: (value: Response) => void = () => {};
    fetchMock.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveFirst = resolve;
        }),
    );

    render(
      <AudiobookGenerationCard
        gameId="1"
        game={makeGame(['start', 'end', 'third'])}
      />,
    );
    fireEvent.click(screen.getByText('一键生成有声书'));
    fireEvent.click(screen.getByText('开始生成'));

    await vi.waitFor(() => expect(screen.getByText('取消剩余')).toBeInTheDocument());
    fireEvent.click(screen.getByText('取消剩余'));
    resolveFirst(okResponse());

    await vi.waitFor(() => expect(screen.getByText(/已完成/)).toBeInTheDocument());
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(screen.getByText(/1 \/ 3 个场景/)).toBeInTheDocument();
  });

  it('生成过程中隐藏关闭按钮，完成后可以关闭弹窗', async () => {
    fetchMock.mockResolvedValue(okResponse());

    render(
      <AudiobookGenerationCard
        gameId="1"
        game={makeGame(['start'])}
      />,
    );
    fireEvent.click(screen.getByText('一键生成有声书'));

    const dialog = screen.getByRole('dialog');
    fireEvent.click(within(dialog).getByText('开始生成'));

    expect(screen.queryByLabelText('关闭')).not.toBeInTheDocument();

    await vi.waitFor(() => expect(screen.getByText(/已完成/)).toBeInTheDocument());
    fireEvent.click(screen.getByText('关闭'));

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});
