import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { useState } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AICharacter, Game } from '@mui-gamebook/parser/src/types';
import CharacterMentionTextarea from '@/components/editor/CharacterMentionTextarea';
import ChatPanel from '@/components/editor/ChatPanel';
import EditorSettingsTab from '@/components/editor/EditorSettingsTab';
import MentionInput from '@/components/editor/MentionInput';
import MiniGameSelector from '@/components/editor/MiniGameSelector';

const chatbotMocks = vi.hoisted(() => ({
  sendMessage: vi.fn(),
  clearMessages: vi.fn(),
  cancelRequest: vi.fn(),
}));

vi.mock('@/components/editor/ChatPanel/useChatbot', () => ({
  useChatbot: () => ({
    messages: [],
    loading: false,
    error: null,
    ...chatbotMocks,
  }),
}));

vi.mock('@uiw/react-md-editor', () => ({
  default: () => <div data-testid="markdown-editor" />,
}));

vi.mock('@/components/editor/MediaAssetItem', () => ({
  default: () => <div data-testid="media-asset-item" />,
}));

vi.mock('@/components/Dialog', () => ({
  useDialog: () => ({
    confirm: vi.fn().mockResolvedValue(true),
    success: vi.fn(),
    error: vi.fn(),
  }),
}));

const CHARACTERS = {
  hero: { name: '主角' },
  villain: { name: '反派' },
} as Record<string, AICharacter>;

function ControlledMentionInput({ onValueChange }: { onValueChange?: (value: string) => void }) {
  const [value, setValue] = useState('');

  function handleChange(nextValue: string) {
    setValue(nextValue);
    onValueChange?.(nextValue);
  }

  return (
    <MentionInput
      value={value}
      onChange={handleChange}
      characters={CHARACTERS}
      placeholder="mention input"
    />
  );
}

function ControlledCharacterMentionTextarea({
  initialValue = '',
  onValueChange,
}: {
  initialValue?: string;
  onValueChange?: (value: string) => void;
}) {
  const [value, setValue] = useState(initialValue);

  function handleChange(nextValue: string) {
    setValue(nextValue);
    onValueChange?.(nextValue);
  }

  return (
    <CharacterMentionTextarea
      value={value}
      onChange={handleChange}
      characters={CHARACTERS}
      placeholder="character mention textarea"
    />
  );
}

describe('编辑器输入框的 IME 键盘保护', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Element.prototype.scrollIntoView = vi.fn();
    global.fetch = vi.fn(async (input) => {
      const url = String(input);
      if (url.includes('/api/cms/minigames')) {
        return {
          ok: true,
          json: async () => ({
            minigames: [
              {
                id: 1,
                name: '小游戏',
                description: null,
                prompt: '测试',
                status: 'completed',
                createdAt: 1,
              },
            ],
          }),
        } as Response;
      }

      return {
        ok: true,
        json: async () => ({ registered: false }),
      } as Response;
    });
  });

  it('ChatPanel 组合输入时 Enter 不发送，组合结束后才发送', () => {
    // ChatPanel 内部使用 useAiPermissions（react-query），需要 QueryClientProvider
    render(
      <QueryClientProvider client={new QueryClient()}>
        <ChatPanel
          gameId="game-1"
          isOpen
          onClose={vi.fn()}
          dsl=""
          onFunctionCall={vi.fn()}
        />
      </QueryClientProvider>,
    );

    const textarea = screen.getByPlaceholderText('输入你的请求...');
    fireEvent.change(textarea, { target: { value: '你好' } });

    const wasNotCancelled = fireEvent.keyDown(textarea, { key: 'Enter', isComposing: true });
    expect(wasNotCancelled).toBe(true);
    expect(chatbotMocks.sendMessage).not.toHaveBeenCalled();

    fireEvent.keyDown(textarea, { key: 'Enter' });
    expect(chatbotMocks.sendMessage).toHaveBeenCalledTimes(1);
  });

  it('标签组合输入时 Enter 不创建标签，组合结束后才创建', () => {
    const onChange = vi.fn();
    const game = { title: '测试游戏', tags: [] } as unknown as Game;

    render(
      <EditorSettingsTab
        game={game}
        id="game-1"
        onChange={onChange}
        onSlugChange={vi.fn()}
        slug="test-game"
      />,
    );

    const input = screen.getByPlaceholderText('输入后按回车...');
    fireEvent.change(input, { target: { value: '中文标签' } });

    const wasNotCancelled = fireEvent.keyDown(input, { key: 'Enter', isComposing: true });
    expect(wasNotCancelled).toBe(true);
    expect(onChange).not.toHaveBeenCalled();
    expect(input).toHaveValue('中文标签');

    fireEvent.keyDown(input, { key: 'Enter' });
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ tags: ['中文标签'] }));
  });

  it('小游戏搜索组合输入时 Enter 不搜索，组合结束后才搜索', async () => {
    render(
      <MiniGameSelector
        onSelect={vi.fn()}
        onGenerate={vi.fn()}
      />,
    );

    await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(1));
    const input = screen.getByPlaceholderText('搜索小游戏...');
    fireEvent.change(input, { target: { value: '中文搜索' } });

    const wasNotCancelled = fireEvent.keyDown(input, { key: 'Enter', isComposing: true });
    expect(wasNotCancelled).toBe(true);
    expect(global.fetch).toHaveBeenCalledTimes(1);

    fireEvent.keyDown(input, { key: 'Enter' });
    await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(2));
  });

  it.each(['ArrowDown', 'ArrowUp', 'Enter', 'Tab', 'Escape'])('MentionInput 组合输入时忽略 %s', (key) => {
    const onValueChange = vi.fn();
    render(<ControlledMentionInput onValueChange={onValueChange} />);

    const textarea = screen.getByPlaceholderText('mention input');
    fireEvent.change(textarea, { target: { value: '@' } });
    onValueChange.mockClear();

    const wasNotCancelled = fireEvent.keyDown(textarea, { key, isComposing: true });
    expect(wasNotCancelled).toBe(true);
    expect(onValueChange).not.toHaveBeenCalled();
    expect(textarea).toHaveValue('@');
    expect(screen.getByText('主角')).toBeInTheDocument();
  });

  it('MentionInput 在组合结束后的 Enter 才选择角色', () => {
    render(<ControlledMentionInput />);

    const textarea = screen.getByPlaceholderText('mention input');
    fireEvent.change(textarea, { target: { value: '@' } });
    fireEvent.keyDown(textarea, { key: 'Enter', isComposing: true });
    expect(textarea).toHaveValue('@');

    fireEvent.keyDown(textarea, { key: 'Enter' });
    expect(textarea).toHaveValue('@hero ');
  });

  it.each(['ArrowDown', 'ArrowUp', 'Enter', 'Tab', 'Escape'])('CharacterMentionTextarea 组合输入时忽略 %s', (key) => {
    const onValueChange = vi.fn();
    render(<ControlledCharacterMentionTextarea onValueChange={onValueChange} />);

    const textarea = screen.getByPlaceholderText('character mention textarea');
    fireEvent.change(textarea, { target: { value: '@' } });
    onValueChange.mockClear();

    const wasNotCancelled = fireEvent.keyDown(textarea, { key, isComposing: true });
    expect(wasNotCancelled).toBe(true);
    expect(onValueChange).not.toHaveBeenCalled();
    expect(textarea).toHaveValue('@');
    expect(screen.getByText('主角')).toBeInTheDocument();
  });

  it('CharacterMentionTextarea 在组合结束后的 Enter 才选择角色', () => {
    render(<ControlledCharacterMentionTextarea />);

    const textarea = screen.getByPlaceholderText('character mention textarea');
    fireEvent.change(textarea, { target: { value: '@' } });
    fireEvent.keyDown(textarea, { key: 'Enter', isComposing: true });
    expect(textarea).toHaveValue('@');

    fireEvent.keyDown(textarea, { key: 'Enter' });
    expect(textarea).toHaveValue('@hero ');
  });
});

describe('CharacterMentionTextarea 快捷 mention 光标', () => {
  it.each([
    { initialValue: '结尾', cursorPosition: 0, expectedValue: '@hero 结尾', expectedCursor: 6 },
    { initialValue: '前后', cursorPosition: 1, expectedValue: '前@hero 后', expectedCursor: 7 },
  ])('在位置 $cursorPosition 插入后把光标放到 mention 后面', async (testCase) => {
    render(<ControlledCharacterMentionTextarea initialValue={testCase.initialValue} />);

    const textarea = screen.getByPlaceholderText('character mention textarea') as HTMLTextAreaElement;
    textarea.focus();
    textarea.setSelectionRange(testCase.cursorPosition, testCase.cursorPosition);
    fireEvent.click(screen.getByRole('button', { name: '@hero' }));

    await waitFor(() => {
      expect(textarea).toHaveValue(testCase.expectedValue);
      expect(textarea.selectionStart).toBe(testCase.expectedCursor);
      expect(textarea.selectionEnd).toBe(testCase.expectedCursor);
      expect(document.activeElement).toBe(textarea);
    });
  });
});
