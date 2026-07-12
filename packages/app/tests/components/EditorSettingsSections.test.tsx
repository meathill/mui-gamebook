import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { PlaybackModeSection, SiteTemplateSection } from '@/components/editor/EditorSettingsSections';

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
});

describe('SiteTemplateSection', () => {
  it('默认模版时不显示二级域名字段', () => {
    render(
      <SiteTemplateSection
        game={{}}
        onChange={vi.fn()}
      />,
    );

    expect(screen.queryByText('二级域名前缀')).not.toBeInTheDocument();
  });

  it('切换到视觉小说模版时显示二级域名字段', () => {
    render(
      <SiteTemplateSection
        game={{ site_template: 'visual-novel' }}
        onChange={vi.fn()}
      />,
    );

    expect(screen.getByText('二级域名前缀')).toBeInTheDocument();
  });

  it('二级域名输入会被清洗为小写字母数字和连字符', () => {
    const onChange = vi.fn();
    render(
      <SiteTemplateSection
        game={{ site_template: 'visual-novel' }}
        onChange={onChange}
      />,
    );

    fireEvent.change(screen.getByPlaceholderText('如：55'), { target: { value: 'My Site_55!' } });

    expect(onChange).toHaveBeenCalledWith('subdomain', 'mysite55');
  });

  it('点击模版类型选项调用 onChange', () => {
    const onChange = vi.fn();
    render(
      <SiteTemplateSection
        game={{}}
        onChange={onChange}
      />,
    );

    fireEvent.click(screen.getByText('视觉小说'));

    expect(onChange).toHaveBeenCalledWith('site_template', 'visual-novel');
  });
});
