import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const dialog = { alert: vi.fn(), confirm: vi.fn(), success: vi.fn(), error: vi.fn() };
vi.mock('@/components/Dialog', () => ({
  useDialog: () => dialog,
}));

vi.mock('@/components/editor/characters', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/components/editor/characters')>();
  return {
    ...actual,
    CharacterList: (props: {
      characters: Array<[string, { name: string }]>;
      onSelect: (id: string) => void;
      onDelete: (id: string) => void;
    }) => (
      <div data-testid="character-list">
        {props.characters.map(([id]) => (
          <button
            key={id}
            onClick={() => props.onSelect(id)}>
            {id}
          </button>
        ))}
      </div>
    ),
    CharacterForm: (props: { formData: { id: string; name: string }; onSave: () => void }) => (
      <div data-testid="character-form">编辑：{props.formData.id}</div>
    ),
  };
});

import EditorCharactersTab from '@/components/editor/EditorCharactersTab';

const HERO = { name: '英雄', description: '', image_prompt: '', image_url: '' };

describe('EditorCharactersTab', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('没有选中角色时显示空状态提示', () => {
    render(
      <EditorCharactersTab
        characters={{ hero: HERO }}
        onChange={vi.fn()}
        gameId="g1"
      />,
    );

    expect(screen.getByText('选择左侧角色进行编辑')).toBeInTheDocument();
  });

  it('按搜索词过滤左侧角色列表', () => {
    render(
      <EditorCharactersTab
        characters={{ hero: HERO, villain: { ...HERO, name: '反派' } }}
        onChange={vi.fn()}
        gameId="g1"
      />,
    );

    fireEvent.change(screen.getByPlaceholderText('搜索...'), { target: { value: 'hero' } });

    expect(screen.getByText('hero')).toBeInTheDocument();
    expect(screen.queryByText('villain')).not.toBeInTheDocument();
  });

  it('点击角色进入编辑视图', () => {
    render(
      <EditorCharactersTab
        characters={{ hero: HERO }}
        onChange={vi.fn()}
        gameId="g1"
      />,
    );

    fireEvent.click(screen.getByText('hero'));

    expect(screen.getByTestId('character-form')).toHaveTextContent('编辑：hero');
  });

  it('点击新建按钮进入创建视图', () => {
    render(
      <EditorCharactersTab
        characters={{}}
        onChange={vi.fn()}
        gameId="g1"
      />,
    );

    fireEvent.click(screen.getByTitle('新建角色'));

    expect(screen.getByTestId('character-form')).toBeInTheDocument();
  });
});
