import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { SaveSlot } from '@mui-gamebook/site-common/game-player';
import SaveLoadScreen from './SaveLoadScreen';

const slots: SaveSlot[] = [
  { id: 'auto', label: '自动存档', data: { sceneId: 'start', sceneLabel: '开始', runtimeState: {}, timestamp: 0 } },
  { id: 'slot1', label: '存档 1', data: { sceneId: 'scene2', sceneLabel: '第二幕', runtimeState: {}, timestamp: 0 } },
  { id: 'slot2', label: '存档 2', data: null },
];

describe('SaveLoadScreen', () => {
  beforeEach(() => {
    vi.spyOn(window, 'confirm');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('load 模式下标题为"读档"，save 模式下为"存档"', () => {
    const { rerender } = render(
      <SaveLoadScreen
        mode="load"
        slots={slots}
        onLoad={vi.fn()}
        onSave={vi.fn()}
        onDelete={vi.fn()}
        onClose={vi.fn()}
      />,
    );
    expect(screen.getByText('读档')).toBeInTheDocument();

    rerender(
      <SaveLoadScreen
        mode="save"
        slots={slots}
        onLoad={vi.fn()}
        onSave={vi.fn()}
        onDelete={vi.fn()}
        onClose={vi.fn()}
      />,
    );
    expect(screen.getByText('存档')).toBeInTheDocument();
  });

  it('load 模式下点击有存档的槽位调用 onLoad', () => {
    const onLoad = vi.fn();
    render(
      <SaveLoadScreen
        mode="load"
        slots={slots}
        onLoad={onLoad}
        onSave={vi.fn()}
        onDelete={vi.fn()}
        onClose={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByText('存档 1').closest('.save-slot')!);

    expect(onLoad).toHaveBeenCalledWith('slot1');
  });

  it('load 模式下点击空槽位不调用 onLoad', () => {
    const onLoad = vi.fn();
    render(
      <SaveLoadScreen
        mode="load"
        slots={slots}
        onLoad={onLoad}
        onSave={vi.fn()}
        onDelete={vi.fn()}
        onClose={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByText('存档 2').closest('.save-slot')!);

    expect(onLoad).not.toHaveBeenCalled();
  });

  it('save 模式下点击普通槽位调用 onSave，点击自动存档槽不调用', () => {
    const onSave = vi.fn();
    render(
      <SaveLoadScreen
        mode="save"
        slots={slots}
        onLoad={vi.fn()}
        onSave={onSave}
        onDelete={vi.fn()}
        onClose={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByText('自动存档').closest('.save-slot')!);
    expect(onSave).not.toHaveBeenCalled();

    fireEvent.click(screen.getByText('存档 1').closest('.save-slot')!);
    expect(onSave).toHaveBeenCalledWith('slot1');
  });

  it('自动存档槽和空槽不显示删除按钮，有数据的普通槽显示', () => {
    render(
      <SaveLoadScreen
        mode="load"
        slots={slots}
        onLoad={vi.fn()}
        onSave={vi.fn()}
        onDelete={vi.fn()}
        onClose={vi.fn()}
      />,
    );

    expect(screen.getAllByTitle('删除存档')).toHaveLength(1);
  });

  it('确认删除后调用 onDelete，且不触发槽位本身的点击（不冒泡到 onLoad）', () => {
    vi.mocked(window.confirm).mockReturnValue(true);
    const onDelete = vi.fn();
    const onLoad = vi.fn();
    render(
      <SaveLoadScreen
        mode="load"
        slots={slots}
        onLoad={onLoad}
        onSave={vi.fn()}
        onDelete={onDelete}
        onClose={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByTitle('删除存档'));

    expect(onDelete).toHaveBeenCalledWith('slot1');
    expect(onLoad).not.toHaveBeenCalled();
  });

  it('取消确认时不调用 onDelete', () => {
    vi.mocked(window.confirm).mockReturnValue(false);
    const onDelete = vi.fn();
    render(
      <SaveLoadScreen
        mode="load"
        slots={slots}
        onLoad={vi.fn()}
        onSave={vi.fn()}
        onDelete={onDelete}
        onClose={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByTitle('删除存档'));

    expect(onDelete).not.toHaveBeenCalled();
  });

  it('点击关闭按钮触发 onClose', () => {
    const onClose = vi.fn();
    const { container } = render(
      <SaveLoadScreen
        mode="load"
        slots={slots}
        onLoad={vi.fn()}
        onSave={vi.fn()}
        onDelete={vi.fn()}
        onClose={onClose}
      />,
    );

    // 关闭按钮只包含图标、无文本，按 DOM 顺序取第一个 button（标题栏右上角的 X）
    fireEvent.click(container.querySelectorAll('button')[0]);

    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
