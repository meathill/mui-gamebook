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
          <div key={id}>
            <button onClick={() => props.onSelect(id)}>{id}</button>
            <button onClick={() => props.onDelete(id)}>删除{id}</button>
          </div>
        ))}
      </div>
    ),
    CharacterForm: (props: {
      formData: { id: string; name: string };
      onUpdate: (updates: Record<string, unknown>) => void;
      onSave: () => void;
    }) => (
      <div data-testid="character-form">
        <input
          data-testid="form-id-input"
          value={props.formData.id}
          onChange={(e) => props.onUpdate({ id: e.target.value })}
        />
        <input
          data-testid="form-name-input"
          value={props.formData.name}
          onChange={(e) => props.onUpdate({ name: e.target.value })}
        />
        <button onClick={props.onSave}>保存</button>
      </div>
    ),
  };
});

import SidebarCharacters from '@/components/editor/sidebar/SidebarCharacters';

const HERO = { name: '英雄', description: '', image_prompt: '', image_url: '' };

describe('SidebarCharacters', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('列出所有角色', () => {
    render(
      <SidebarCharacters
        characters={{ hero: HERO }}
        onChange={vi.fn()}
        gameId="g1"
      />,
    );

    expect(screen.getByText('hero')).toBeInTheDocument();
  });

  it('按 ID 或名称过滤角色列表', () => {
    render(
      <SidebarCharacters
        characters={{ hero: HERO, villain: { ...HERO, name: '反派' } }}
        onChange={vi.fn()}
        gameId="g1"
      />,
    );

    fireEvent.change(screen.getByPlaceholderText('搜索...'), { target: { value: '英雄' } });

    expect(screen.getByText('hero')).toBeInTheDocument();
    expect(screen.queryByText('villain')).not.toBeInTheDocument();
  });

  it('保存时缺少 ID 或名称会报错', async () => {
    const onChange = vi.fn();
    render(
      <SidebarCharacters
        characters={{}}
        onChange={onChange}
        gameId="g1"
      />,
    );
    fireEvent.click(screen.getByTitle('新建'));
    fireEvent.change(screen.getByTestId('form-name-input'), { target: { value: '' } });

    fireEvent.click(screen.getByText('保存'));

    expect(dialog.alert).toHaveBeenCalledWith('角色名称不能为空');
    expect(onChange).not.toHaveBeenCalled();
  });

  it('新建角色成功后调用 onChange', () => {
    const onChange = vi.fn();
    render(
      <SidebarCharacters
        characters={{}}
        onChange={onChange}
        gameId="g1"
      />,
    );
    fireEvent.click(screen.getByTitle('新建'));
    fireEvent.change(screen.getByTestId('form-id-input'), { target: { value: 'hero' } });
    fireEvent.change(screen.getByTestId('form-name-input'), { target: { value: '英雄' } });

    fireEvent.click(screen.getByText('保存'));

    expect(onChange).toHaveBeenCalledWith({ hero: expect.objectContaining({ name: '英雄' }) });
  });

  it('新建角色 ID 与已有角色重复时报错', () => {
    const onChange = vi.fn();
    render(
      <SidebarCharacters
        characters={{ hero: HERO }}
        onChange={onChange}
        gameId="g1"
      />,
    );
    fireEvent.click(screen.getByTitle('新建'));
    fireEvent.change(screen.getByTestId('form-id-input'), { target: { value: 'hero' } });
    fireEvent.change(screen.getByTestId('form-name-input'), { target: { value: '另一个英雄' } });

    fireEvent.click(screen.getByText('保存'));

    expect(dialog.alert).toHaveBeenCalledWith('角色 ID 已存在');
    expect(onChange).not.toHaveBeenCalled();
  });

  it('确认删除后调用 onChange 移除该角色', async () => {
    dialog.confirm.mockResolvedValue(true);
    const onChange = vi.fn();
    render(
      <SidebarCharacters
        characters={{ hero: HERO }}
        onChange={onChange}
        gameId="g1"
      />,
    );

    fireEvent.click(screen.getByText('删除hero'));

    await vi.waitFor(() => expect(onChange).toHaveBeenCalledWith({}));
  });

  it('取消删除确认时不调用 onChange', async () => {
    dialog.confirm.mockResolvedValue(false);
    const onChange = vi.fn();
    render(
      <SidebarCharacters
        characters={{ hero: HERO }}
        onChange={onChange}
        gameId="g1"
      />,
    );

    fireEvent.click(screen.getByText('删除hero'));

    await vi.waitFor(() => expect(dialog.confirm).toHaveBeenCalled());
    expect(onChange).not.toHaveBeenCalled();
  });
});
