import { fireEvent, render, screen } from '@testing-library/react';
import { parse } from '@roudanio/parser';
import { describe, expect, it, vi } from 'vitest';
import EditorSettingsTab from '@/components/editor/EditorSettingsTab';

vi.mock('@uiw/react-md-editor', () => ({ default: () => null }));
vi.mock('@/components/QQGroupInvite', () => ({ default: () => null }));
vi.mock('@/components/editor/AudiobookGenerationCard', () => ({ default: () => null }));
vi.mock('@/components/editor/IpRegistrationCard', () => ({ default: () => null }));
vi.mock('@/components/editor/MediaAssetItem', () => ({ default: () => null }));
vi.mock('@/components/editor/media-assistance-setting', () => ({ default: () => null }));

describe('EditorSettingsTab 主站作品配置', () => {
  it.each([
    '',
    'site_template: visual-novel\nsubdomain: "11"',
  ])('不再显示子站配置，历史元数据不影响播放模式设置：%s', (legacy) => {
    const result = parse(`---\ntitle: 测试作品\n${legacy}\n---\n# start\n故事正文`);
    if (!result.success) throw new Error(result.error);
    const onChange = vi.fn();

    render(
      <EditorSettingsTab
        game={result.data}
        id="1"
        slug="1-0771"
        onChange={onChange}
        onSlugChange={vi.fn()}
      />,
    );

    expect(screen.queryByText('站点模版')).not.toBeInTheDocument();
    expect(screen.queryByText('二级域名前缀')).not.toBeInTheDocument();
    expect(screen.queryByPlaceholderText('如：55')).not.toBeInTheDocument();
    fireEvent.click(screen.getByText('沉浸（视觉小说）'));
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ display_mode: 'immersive' }));
  });
});
