import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { parse } from '@roudanio/parser';
import { DialogProvider } from '@/components/Dialog';
import MediaAssistanceSetting from '@/components/editor/media-assistance-setting';

const parsed = parse('---\ntitle: 文字作品\n---\n# start\n正文');
if (!parsed.success) throw new Error('invalid fixture');
const game = parsed.data;
const onChange = vi.fn();
beforeEach(() => vi.clearAllMocks());

describe('站方素材协助设置', () => {
  it('默认关闭，说明弹窗不改变授权', async () => {
    render(
      <DialogProvider>
        <MediaAssistanceSetting
          game={game}
          onChange={onChange}
        />
      </DialogProvider>,
    );
    expect(screen.getByRole('checkbox')).not.toBeChecked();
    fireEvent.click(screen.getByRole('button', { name: '了解站方 AI 素材协助' }));
    expect(await screen.findByRole('dialog')).toHaveTextContent('不会替换你已有的素材');
    fireEvent.click(screen.getByRole('button', { name: '确定' }));
    expect(onChange).not.toHaveBeenCalled();
  });

  it('无声明时拒绝保持关闭，明确接受后记录确认', async () => {
    render(
      <DialogProvider>
        <MediaAssistanceSetting
          game={game}
          onChange={onChange}
        />
      </DialogProvider>,
    );
    fireEvent.click(screen.getByRole('checkbox'));
    fireEvent.click(await screen.findByRole('button', { name: '暂不开启' }));
    await waitFor(() => expect(screen.getByRole('checkbox')).toBeEnabled());
    expect(onChange).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('checkbox'));
    fireEvent.click(await screen.findByRole('button', { name: '接受并开启' }));
    await waitFor(() =>
      expect(onChange).toHaveBeenCalledWith(
        expect.objectContaining({ mediaAssistanceEnabled: true, mediaPlanningConfirmed: true }),
      ),
    );
  });

  it('按最新正文检查声明，已有声明可直接开启，关闭无需确认', async () => {
    const { rerender } = render(
      <DialogProvider>
        <MediaAssistanceSetting
          game={game}
          content={'---\ntitle: 文字作品\n---\n# start\n```yaml\nimage:\n  prompt: 场景\n```\n正文'}
          onChange={onChange}
        />
      </DialogProvider>,
    );
    fireEvent.click(screen.getByRole('checkbox'));
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ mediaAssistanceEnabled: true }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    rerender(
      <DialogProvider>
        <MediaAssistanceSetting
          game={{ ...game, mediaAssistanceEnabled: true }}
          onChange={onChange}
        />
      </DialogProvider>,
    );
    fireEvent.click(screen.getByRole('checkbox'));
    expect(onChange).toHaveBeenLastCalledWith(expect.objectContaining({ mediaAssistanceEnabled: false }));
  });
});
