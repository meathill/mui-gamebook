import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { PlaybackModeSection } from '@/components/editor/EditorSettingsSections';

describe('PlaybackModeSection', () => {
  it('默认按经典模式渲染，不显示沉浸模式专属字段', () => {
    render(
      <PlaybackModeSection
        game={{}}
        onChange={vi.fn()}
      />,
    );

    expect(screen.queryByText('文字框默认位置')).not.toBeInTheDocument();
  });

  it('点击沉浸模式后显示文字框位置和逐字速度字段', () => {
    const onChange = vi.fn();
    render(
      <PlaybackModeSection
        game={{ display_mode: 'classic' }}
        onChange={onChange}
      />,
    );

    fireEvent.click(screen.getByText('沉浸（视觉小说）'));

    expect(onChange).toHaveBeenCalledWith('display_mode', 'immersive');
  });

  it('已经是沉浸模式时显示文字框位置和逐字速度字段', () => {
    render(
      <PlaybackModeSection
        game={{ display_mode: 'immersive' }}
        onChange={vi.fn()}
      />,
    );

    expect(screen.getByText('文字框默认位置')).toBeInTheDocument();
    expect(screen.getByText('逐字速度（毫秒/字）')).toBeInTheDocument();
  });

  it('点击文字框位置选项调用 onChange', () => {
    const onChange = vi.fn();
    render(
      <PlaybackModeSection
        game={{ display_mode: 'immersive' }}
        onChange={onChange}
      />,
    );

    fireEvent.click(screen.getByText('顶部'));

    expect(onChange).toHaveBeenCalledWith('text_box_position', 'top');
  });

  it('标题页模版缺省为传统，点击全屏调用 onChange', () => {
    const onChange = vi.fn();
    render(
      <PlaybackModeSection
        game={{}}
        onChange={onChange}
      />,
    );

    expect(screen.getByText('标题页模版')).toBeInTheDocument();
    fireEvent.click(screen.getByText('全屏（封面底 + 毛玻璃卡）'));

    expect(onChange).toHaveBeenCalledWith('title_layout', 'fullscreen');
  });
});
