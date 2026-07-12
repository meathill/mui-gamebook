import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const dialog = { alert: vi.fn(), confirm: vi.fn(), success: vi.fn(), error: vi.fn() };
vi.mock('@/components/Dialog', () => ({
  useDialog: () => dialog,
}));

vi.mock('@/components/editor/variables', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/components/editor/variables')>();
  return {
    ...actual,
    VariableList: (props: { variables: Array<[string, unknown]>; onSelect: (name: string) => void }) => (
      <div data-testid="variable-list">
        {props.variables.map(([name]) => (
          <button
            key={name}
            onClick={() => props.onSelect(name)}>
            {name}
          </button>
        ))}
      </div>
    ),
    VariableForm: (props: { formData: { name: string }; onSave: () => void }) => (
      <div data-testid="variable-form">编辑：{props.formData.name}</div>
    ),
  };
});

import EditorVariablesTab from '@/components/editor/EditorVariablesTab';

const scenes = { start: { id: 'start' } };

describe('EditorVariablesTab', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('没有选中变量时显示空状态提示', () => {
    render(
      <EditorVariablesTab
        state={{ gold: 100 }}
        onChange={vi.fn()}
        scenes={scenes}
      />,
    );

    expect(screen.getByText('选择左侧变量进行编辑')).toBeInTheDocument();
  });

  it('按搜索词过滤左侧变量列表', () => {
    render(
      <EditorVariablesTab
        state={{ gold: 100, has_key: false }}
        onChange={vi.fn()}
        scenes={scenes}
      />,
    );

    fireEvent.change(screen.getByPlaceholderText('搜索...'), { target: { value: 'gold' } });

    expect(screen.getByText('gold')).toBeInTheDocument();
    expect(screen.queryByText('has_key')).not.toBeInTheDocument();
  });

  it('点击变量进入编辑视图', () => {
    render(
      <EditorVariablesTab
        state={{ gold: 100 }}
        onChange={vi.fn()}
        scenes={scenes}
      />,
    );

    fireEvent.click(screen.getByText('gold'));

    expect(screen.getByTestId('variable-form')).toHaveTextContent('编辑：gold');
  });

  it('点击新建按钮进入创建视图', () => {
    render(
      <EditorVariablesTab
        state={{}}
        onChange={vi.fn()}
        scenes={scenes}
      />,
    );

    fireEvent.click(screen.getByTitle('新建变量'));

    expect(screen.getByTestId('variable-form')).toBeInTheDocument();
  });
});
