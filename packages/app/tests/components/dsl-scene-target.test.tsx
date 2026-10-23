import { useState } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import ContentFields from '@/components/editor/dsl-tools/content-fields';
import { createDslDraft, type DslToolKind } from '@/lib/editor/dsl-tools/types';

function Harness({
  kind,
  target = 'room',
  scenes = ['start', 'room', '森林'],
}: {
  kind: DslToolKind;
  target?: string;
  scenes?: string[];
}) {
  const [draft, setDraft] = useState({ ...createDslDraft(kind), target });
  return (
    <ContentFields
      draft={draft}
      onChange={(update) => setDraft((previous) => ({ ...previous, ...update }))}
      scenes={scenes}
      variables={[]}
      characters={{}}
    />
  );
}

describe('目标场景选择', () => {
  it.each(['choice', 'redirect'] as const)('%s 提供实际下拉框，已有值不隐藏其他候选', (kind) => {
    render(<Harness kind={kind} />);
    const select = screen.getByRole('combobox', { name: '目标场景' });
    expect(select.tagName).toBe('SELECT');
    expect(select).toHaveValue('room');
    for (const name of ['start', 'room', '森林']) expect(screen.getByRole('option', { name })).toBeInTheDocument();
    fireEvent.change(select, { target: { value: '森林' } });
    expect(select).toHaveValue('森林');
  });

  it('新建模式使用空白名称输入框，切回选择模式不留下未创建的名称', () => {
    render(<Harness kind="choice" />);
    fireEvent.click(screen.getByLabelText('新建目标场景并连接'));
    const input = screen.getByRole('textbox', { name: '新场景名称' });
    expect(input).toHaveValue('');
    fireEvent.change(input, { target: { value: '书房' } });
    fireEvent.click(screen.getByLabelText('新建目标场景并连接'));
    expect(screen.getByRole('combobox', { name: '目标场景' })).toHaveValue('');
    expect(screen.queryByRole('option', { name: '书房' })).toBeNull();
  });

  it('不存在的旧目标明确显示，不静默替换为其他场景', () => {
    render(
      <Harness
        kind="choice"
        target="missing"
      />,
    );
    expect(screen.getByRole('combobox', { name: '目标场景' })).toHaveValue('missing');
    expect(screen.getByRole('option', { name: 'missing（场景不存在，请重新选择）' })).toBeDisabled();
  });
});
