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
    VariableList: (props: {
      variables: Array<[string, unknown]>;
      onSelect: (name: string) => void;
      onDelete: (name: string) => void;
    }) => (
      <div data-testid="variable-list">
        {props.variables.map(([name]) => (
          <div key={name}>
            <button onClick={() => props.onSelect(name)}>{name}</button>
            <button onClick={() => props.onDelete(name)}>删除{name}</button>
          </div>
        ))}
      </div>
    ),
    VariableForm: (props: {
      formData: { name: string };
      onUpdate: (updates: Record<string, unknown>) => void;
      onSave: () => void;
    }) => (
      <div data-testid="variable-form">
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

import SidebarVariables from '@/components/editor/sidebar/SidebarVariables';

const scenes = { start: { id: 'start' } };

describe('SidebarVariables', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('列出所有变量', () => {
    render(
      <SidebarVariables
        state={{ gold: 100, has_key: false }}
        scenes={scenes}
        onChange={vi.fn()}
      />,
    );

    expect(screen.getByText('gold')).toBeInTheDocument();
    expect(screen.getByText('has_key')).toBeInTheDocument();
  });

  it('按搜索词过滤变量列表', () => {
    render(
      <SidebarVariables
        state={{ gold: 100, has_key: false }}
        scenes={scenes}
        onChange={vi.fn()}
      />,
    );

    fireEvent.change(screen.getByPlaceholderText('搜索...'), { target: { value: 'gold' } });

    expect(screen.getByText('gold')).toBeInTheDocument();
    expect(screen.queryByText('has_key')).not.toBeInTheDocument();
  });

  it('点击变量条目进入编辑表单，回填名称和值', () => {
    render(
      <SidebarVariables
        state={{ gold: 100 }}
        scenes={scenes}
        onChange={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByText('gold'));

    expect(screen.getByTestId('variable-form')).toBeInTheDocument();
    expect(screen.getByTestId('form-name-input')).toHaveValue('gold');
  });

  it('点击返回列表退出编辑', () => {
    render(
      <SidebarVariables
        state={{ gold: 100 }}
        scenes={scenes}
        onChange={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByText('gold'));

    fireEvent.click(screen.getByText('返回列表'));

    expect(screen.queryByTestId('variable-form')).not.toBeInTheDocument();
    expect(screen.getByTestId('variable-list')).toBeInTheDocument();
  });

  it('新建变量时生成一个默认的临时变量名', () => {
    render(
      <SidebarVariables
        state={{}}
        scenes={scenes}
        onChange={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByTitle('新建'));

    const input = screen.getByTestId('form-name-input') as HTMLInputElement;
    expect(input.value).toMatch(/^var_\d{4}$/);
  });

  it('保存时变量名为空则报错，不调用 onChange', async () => {
    const onChange = vi.fn();
    render(
      <SidebarVariables
        state={{}}
        scenes={scenes}
        onChange={onChange}
      />,
    );
    fireEvent.click(screen.getByTitle('新建'));
    fireEvent.change(screen.getByTestId('form-name-input'), { target: { value: '' } });

    fireEvent.click(screen.getByText('保存'));

    expect(dialog.alert).toHaveBeenCalledWith('变量名不能为空');
    expect(onChange).not.toHaveBeenCalled();
  });

  it('新建变量成功后调用 onChange 写入新状态', () => {
    const onChange = vi.fn();
    render(
      <SidebarVariables
        state={{}}
        scenes={scenes}
        onChange={onChange}
      />,
    );
    fireEvent.click(screen.getByTitle('新建'));
    fireEvent.change(screen.getByTestId('form-name-input'), { target: { value: 'gold' } });

    fireEvent.click(screen.getByText('保存'));

    expect(onChange).toHaveBeenCalledWith({ gold: 0 });
  });

  it('新建变量名与已有变量重名时报错，不调用 onChange', () => {
    const onChange = vi.fn();
    render(
      <SidebarVariables
        state={{ gold: 100 }}
        scenes={scenes}
        onChange={onChange}
      />,
    );
    fireEvent.click(screen.getByTitle('新建'));
    fireEvent.change(screen.getByTestId('form-name-input'), { target: { value: 'gold' } });

    fireEvent.click(screen.getByText('保存'));

    expect(dialog.alert).toHaveBeenCalledWith('变量名已存在');
    expect(onChange).not.toHaveBeenCalled();
  });

  it('删除变量前需要确认，取消则不调用 onChange', async () => {
    dialog.confirm.mockResolvedValue(false);
    const onChange = vi.fn();
    render(
      <SidebarVariables
        state={{ gold: 100 }}
        scenes={scenes}
        onChange={onChange}
      />,
    );

    fireEvent.click(screen.getByText('删除gold'));

    await vi.waitFor(() => expect(dialog.confirm).toHaveBeenCalled());
    expect(onChange).not.toHaveBeenCalled();
  });

  it('确认删除后调用 onChange 移除该变量', async () => {
    dialog.confirm.mockResolvedValue(true);
    const onChange = vi.fn();
    render(
      <SidebarVariables
        state={{ gold: 100, has_key: false }}
        scenes={scenes}
        onChange={onChange}
      />,
    );

    fireEvent.click(screen.getByText('删除gold'));

    await vi.waitFor(() => expect(onChange).toHaveBeenCalledWith({ has_key: false }));
  });
});
