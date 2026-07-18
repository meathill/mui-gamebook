import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import StoryImporter from '@/components/editor/StoryImporter';

const dialogMock = {
  alert: vi.fn(),
  confirm: vi.fn(),
  success: vi.fn(),
  error: vi.fn(),
};

vi.mock('@/components/Dialog', () => ({
  useDialog: () => dialogMock,
}));

const aiPermissionsState = {
  providers: ['mimo'] as string[],
};

vi.mock('@/lib/editor/useAiPermissions', () => ({
  AI_PROVIDER_LABELS: { mimo: 'MiMo', anthropic: 'Claude', google: 'Gemini', openai: 'GPT' },
  useAiPermissions: () => aiPermissionsState,
}));

const fetchMock = vi.fn<typeof fetch>();

/** 构造一个假的 SSE Response，body 依次吐出给定的事件 */
function makeSseResponse(events: Record<string, unknown>[]): Response {
  const encoder = new TextEncoder();
  const body = new ReadableStream<Uint8Array>({
    start(controller) {
      for (const event of events) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
      }
      controller.close();
    },
  });
  return { ok: true, body } as unknown as Response;
}

/**
 * 构造一个吐出 reasoning 增量后故意不发 done、不 close 的 SSE Response，
 * 让组件稳定停留在"思考中"状态，避免断言一个转瞬即逝的中间态导致测试时序不稳定
 */
function makeStuckThinkingResponse(delta: string): Response {
  const encoder = new TextEncoder();
  const body = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'phase', phase: 'thinking' })}\n\n`));
      controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'reasoning', delta })}\n\n`));
    },
  });
  return { ok: true, body } as unknown as Response;
}

/** 构造 clarify-story 接口的普通 JSON 响应 */
function makeAssessResponse(body: { ready: boolean; questions: string[] }): Response {
  return { ok: true, json: () => Promise.resolve(body) } as unknown as Response;
}

function baseProps(overrides: Record<string, unknown> = {}) {
  return {
    id: 'game-1',
    onImport: vi.fn(),
    onClose: vi.fn(),
    ...overrides,
  };
}

describe('StoryImporter', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('fetch', fetchMock);
    aiPermissionsState.providers = ['mimo'];
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('回显 initialStory，为空时生成按钮禁用', () => {
    render(<StoryImporter {...baseProps({ initialStory: '一个既有的故事' })} />);

    expect(screen.getByDisplayValue('一个既有的故事')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '生成游戏脚本' })).not.toBeDisabled();
  });

  it('没有输入故事时生成按钮禁用', () => {
    render(<StoryImporter {...baseProps()} />);

    expect(screen.getByRole('button', { name: '生成游戏脚本' })).toBeDisabled();
  });

  it('点击"使用此示例开始创作"填充文本框', () => {
    render(<StoryImporter {...baseProps()} />);

    fireEvent.click(screen.getByText('使用此示例开始创作 →'));

    const textarea = screen.getByPlaceholderText('在这里输入你的故事...') as HTMLTextAreaElement;
    expect(textarea.value.length).toBeGreaterThan(0);
  });

  it('只有一个 provider 时不显示选择器', () => {
    render(<StoryImporter {...baseProps({ initialStory: 'x' })} />);

    expect(screen.queryByTitle('选择 AI 提供者')).not.toBeInTheDocument();
  });

  it('多个 provider 时显示选择器', () => {
    aiPermissionsState.providers = ['mimo', 'anthropic'];
    render(<StoryImporter {...baseProps({ initialStory: 'x' })} />);

    expect(screen.getByTitle('选择 AI 提供者')).toBeInTheDocument();
  });

  it('点击关闭按钮触发 onClose', () => {
    const onClose = vi.fn();
    const { container } = render(<StoryImporter {...baseProps({ onClose })} />);

    // 关闭按钮只包含图标、无文本，按 DOM 顺序取第一个 button（标题栏右上角的 X）
    const closeButton = container.querySelectorAll('button')[0];
    fireEvent.click(closeButton);

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  const STORY = '我的故事：一个关于勇气与冒险的旅程，主角必须穿越迷雾森林才能找到失散的家人';

  it('生成前总会先做一次评估；已就绪时直接保存草稿、生成、导入并关闭', async () => {
    const onSaveStory = vi.fn();
    const onImport = vi.fn();
    const onClose = vi.fn();
    fetchMock
      .mockResolvedValueOnce(makeAssessResponse({ ready: true, questions: [] }))
      .mockResolvedValueOnce(makeSseResponse([{ type: 'done', script: 'title: 测试\n---\n场景内容' }]));
    render(<StoryImporter {...baseProps({ initialStory: STORY, onSaveStory, onImport, onClose })} />);

    fireEvent.click(screen.getByRole('button', { name: '生成游戏脚本' }));

    await vi.waitFor(() => expect(onImport).toHaveBeenCalledWith('title: 测试\n---\n场景内容'));
    expect(onSaveStory).toHaveBeenCalledWith(STORY);
    expect(onClose).toHaveBeenCalledTimes(1);

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      '/api/cms/games/game-1/clarify-story',
      expect.objectContaining({ body: JSON.stringify({ story: STORY, provider: 'mimo' }) }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      '/api/cms/games/game-1/generate-script',
      expect.objectContaining({ body: JSON.stringify({ story: STORY, provider: 'mimo' }) }),
    );
  });

  it('评估接口失败时也不阻塞，直接进入正式生成', async () => {
    const onImport = vi.fn();
    fetchMock
      .mockResolvedValueOnce({ ok: false } as Response)
      .mockResolvedValueOnce(makeSseResponse([{ type: 'done', script: 'title: 测试\n---\n场景内容' }]));
    render(<StoryImporter {...baseProps({ initialStory: STORY, onImport })} />);

    fireEvent.click(screen.getByRole('button', { name: '生成游戏脚本' }));

    await vi.waitFor(() => expect(onImport).toHaveBeenCalledWith('title: 测试\n---\n场景内容'));
  });

  it('正式生成失败时弹出错误提示且不关闭弹窗', async () => {
    const onClose = vi.fn();
    fetchMock.mockResolvedValueOnce(makeAssessResponse({ ready: true, questions: [] })).mockResolvedValueOnce({
      ok: false,
      json: () => Promise.resolve({ error: '生成脚本失败' }),
    } as Response);
    render(<StoryImporter {...baseProps({ initialStory: STORY, onClose })} />);

    fireEvent.click(screen.getByRole('button', { name: '生成游戏脚本' }));

    await vi.waitFor(() => expect(dialogMock.error).toHaveBeenCalledWith('生成脚本失败'));
    expect(onClose).not.toHaveBeenCalled();
  });

  it('流式返回 reasoning 增量时实时展示思考内容', async () => {
    fetchMock
      .mockResolvedValueOnce(makeAssessResponse({ ready: true, questions: [] }))
      .mockResolvedValueOnce(makeStuckThinkingResponse('正在构思情节...'));
    render(<StoryImporter {...baseProps({ initialStory: STORY })} />);

    fireEvent.click(screen.getByRole('button', { name: '生成游戏脚本' }));

    await vi.waitFor(() => expect(screen.getByText('正在构思情节...')).toBeInTheDocument());
    expect(screen.getByRole('button', { name: 'AI 思考中...' })).toBeDisabled();
  });

  describe('已有剧本时的生成方式选择', () => {
    const EXISTING_SCRIPT = '# start\n这是已有的剧本内容';

    it('点击生成时先展示"重新生成/修改老剧本"选择，不立即请求', () => {
      render(<StoryImporter {...baseProps({ initialStory: STORY, existingScript: EXISTING_SCRIPT })} />);

      fireEvent.click(screen.getByRole('button', { name: '生成游戏脚本' }));

      expect(screen.getByText('这个游戏已经有剧本内容了，你想：')).toBeInTheDocument();
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it('选择"完全重新生成"后按原有流程生成，请求体不带 existingScript', async () => {
      const onImport = vi.fn();
      fetchMock
        .mockResolvedValueOnce(makeAssessResponse({ ready: true, questions: [] }))
        .mockResolvedValueOnce(makeSseResponse([{ type: 'done', script: 'title: 测试\n---\n场景内容' }]));

      render(<StoryImporter {...baseProps({ initialStory: STORY, existingScript: EXISTING_SCRIPT, onImport })} />);

      fireEvent.click(screen.getByRole('button', { name: '生成游戏脚本' }));
      fireEvent.click(screen.getByRole('button', { name: '完全重新生成（不使用现有剧本）' }));

      await vi.waitFor(() => expect(onImport).toHaveBeenCalledWith('title: 测试\n---\n场景内容'));
      const [, generateInit] = fetchMock.mock.calls[1];
      const body = JSON.parse(generateInit?.body as string);
      expect(body).not.toHaveProperty('existingScript');
    });

    it('选择"在现有剧本基础上修改"后请求体带上 existingScript', async () => {
      const onImport = vi.fn();
      fetchMock
        .mockResolvedValueOnce(makeAssessResponse({ ready: true, questions: [] }))
        .mockResolvedValueOnce(makeSseResponse([{ type: 'done', script: 'title: 测试\n---\n场景内容' }]));

      render(<StoryImporter {...baseProps({ initialStory: STORY, existingScript: EXISTING_SCRIPT, onImport })} />);

      fireEvent.click(screen.getByRole('button', { name: '生成游戏脚本' }));
      fireEvent.click(screen.getByRole('button', { name: '在现有剧本基础上修改（保留现有场景/角色，按新信息调整）' }));

      await vi.waitFor(() => expect(onImport).toHaveBeenCalledWith('title: 测试\n---\n场景内容'));
      const [, generateInit] = fetchMock.mock.calls[1];
      const body = JSON.parse(generateInit?.body as string);
      expect(body.existingScript).toBe(EXISTING_SCRIPT);
    });
  });

  describe('信息不够清晰时的多轮追问', () => {
    const SHORT_STORY = '一个女孩的故事';

    it('展示追问与当前轮次；回答后重新评估，若已就绪则把问答拼进故事生成', async () => {
      const onImport = vi.fn();
      fetchMock
        .mockResolvedValueOnce(
          makeAssessResponse({ ready: false, questions: ['主角是谁？', '故事发生在什么背景下？'] }),
        )
        .mockResolvedValueOnce(makeAssessResponse({ ready: true, questions: [] }))
        .mockResolvedValueOnce(makeSseResponse([{ type: 'done', script: 'title: 测试\n---\n场景内容' }]));

      render(<StoryImporter {...baseProps({ initialStory: SHORT_STORY, onImport })} />);

      fireEvent.click(screen.getByRole('button', { name: '生成游戏脚本' }));

      await vi.waitFor(() => expect(screen.getByText('主角是谁？')).toBeInTheDocument());
      expect(screen.getByText('（第 1/5 轮）')).toBeInTheDocument();

      const inputs = screen.getAllByPlaceholderText('可留空');
      fireEvent.change(inputs[0], { target: { value: '一个勇敢的女孩' } });
      fireEvent.click(screen.getByRole('button', { name: '提交' }));

      await vi.waitFor(() => expect(onImport).toHaveBeenCalledWith('title: 测试\n---\n场景内容'));
      expect(fetchMock).toHaveBeenNthCalledWith(
        2,
        '/api/cms/games/game-1/clarify-story',
        expect.objectContaining({
          body: JSON.stringify({
            story: `${SHORT_STORY}\n\n补充信息：\nQ: 主角是谁？\nA: 一个勇敢的女孩`,
            provider: 'mimo',
          }),
        }),
      );
      expect(fetchMock).toHaveBeenNthCalledWith(
        3,
        '/api/cms/games/game-1/generate-script',
        expect.objectContaining({
          body: JSON.stringify({
            story: `${SHORT_STORY}\n\n补充信息：\nQ: 主角是谁？\nA: 一个勇敢的女孩`,
            provider: 'mimo',
          }),
        }),
      );
    });

    it('仍不够清晰时继续追问第二轮', async () => {
      fetchMock
        .mockResolvedValueOnce(makeAssessResponse({ ready: false, questions: ['主角是谁？'] }))
        .mockResolvedValueOnce(makeAssessResponse({ ready: false, questions: ['故事的结局倾向是什么？'] }));

      render(<StoryImporter {...baseProps({ initialStory: SHORT_STORY })} />);

      fireEvent.click(screen.getByRole('button', { name: '生成游戏脚本' }));
      await vi.waitFor(() => expect(screen.getByText('主角是谁？')).toBeInTheDocument());

      fireEvent.click(screen.getByRole('button', { name: '提交' }));

      await vi.waitFor(() => expect(screen.getByText('故事的结局倾向是什么？')).toBeInTheDocument());
      expect(screen.getByText('（第 2/5 轮）')).toBeInTheDocument();
    });

    it('点击"跳过，直接生成"时不再评估，直接用已有问答生成', async () => {
      const onImport = vi.fn();
      fetchMock
        .mockResolvedValueOnce(makeAssessResponse({ ready: false, questions: ['主角是谁？'] }))
        .mockResolvedValueOnce(makeSseResponse([{ type: 'done', script: 'title: 测试\n---\n场景内容' }]));

      render(<StoryImporter {...baseProps({ initialStory: SHORT_STORY, onImport })} />);

      fireEvent.click(screen.getByRole('button', { name: '生成游戏脚本' }));
      await vi.waitFor(() => expect(screen.getByText('主角是谁？')).toBeInTheDocument());

      fireEvent.click(screen.getByRole('button', { name: '跳过，直接生成' }));

      await vi.waitFor(() => expect(onImport).toHaveBeenCalledWith('title: 测试\n---\n场景内容'));
      // 跳过不会触发第三次调用（不再评估），总共只有 评估 + 生成 两次
      expect(fetchMock).toHaveBeenCalledTimes(2);
      expect(fetchMock).toHaveBeenLastCalledWith(
        '/api/cms/games/game-1/generate-script',
        expect.objectContaining({ body: JSON.stringify({ story: SHORT_STORY, provider: 'mimo' }) }),
      );
    });

    it('跳过时会带上当前轮已经填写但未提交的答案', async () => {
      const onImport = vi.fn();
      fetchMock
        .mockResolvedValueOnce(makeAssessResponse({ ready: false, questions: ['主角是谁？'] }))
        .mockResolvedValueOnce(makeSseResponse([{ type: 'done', script: 'title: 测试\n---\n场景内容' }]));

      render(<StoryImporter {...baseProps({ initialStory: SHORT_STORY, onImport })} />);

      fireEvent.click(screen.getByRole('button', { name: '生成游戏脚本' }));
      await vi.waitFor(() => expect(screen.getByText('主角是谁？')).toBeInTheDocument());

      fireEvent.change(screen.getByPlaceholderText('可留空'), { target: { value: '一个勇敢的女孩' } });
      fireEvent.click(screen.getByRole('button', { name: '跳过，直接生成' }));

      await vi.waitFor(() => expect(onImport).toHaveBeenCalledWith('title: 测试\n---\n场景内容'));
      expect(fetchMock).toHaveBeenLastCalledWith(
        '/api/cms/games/game-1/generate-script',
        expect.objectContaining({
          body: JSON.stringify({
            story: `${SHORT_STORY}\n\n补充信息：\nQ: 主角是谁？\nA: 一个勇敢的女孩`,
            provider: 'mimo',
          }),
        }),
      );
    });

    it('达到最多 5 轮追问后不再评估，直接进入正式生成', async () => {
      const onImport = vi.fn();
      for (let round = 1; round <= 5; round++) {
        fetchMock.mockResolvedValueOnce(makeAssessResponse({ ready: false, questions: [`追问${round}`] }));
      }
      fetchMock.mockResolvedValueOnce(makeSseResponse([{ type: 'done', script: 'title: 测试\n---\n场景内容' }]));

      render(<StoryImporter {...baseProps({ initialStory: SHORT_STORY, onImport })} />);

      fireEvent.click(screen.getByRole('button', { name: '生成游戏脚本' }));

      for (let round = 1; round <= 5; round++) {
        await vi.waitFor(() => expect(screen.getByText(`追问${round}`)).toBeInTheDocument());
        fireEvent.change(screen.getByPlaceholderText('可留空'), { target: { value: `回答${round}` } });
        fireEvent.click(screen.getByRole('button', { name: '提交' }));
      }

      await vi.waitFor(() => expect(onImport).toHaveBeenCalledWith('title: 测试\n---\n场景内容'));
      // 5 轮评估 + 1 次正式生成 = 6 次调用，第 5 轮提交后不会再有第 6 次评估
      expect(fetchMock).toHaveBeenCalledTimes(6);
      expect(fetchMock).toHaveBeenLastCalledWith('/api/cms/games/game-1/generate-script', expect.anything());
    });
  });
});
