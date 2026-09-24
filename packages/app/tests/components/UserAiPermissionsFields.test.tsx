import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { parseUserAiPermissions, UserAiPermissionsFields } from '@/components/admin/UserAiPermissionsFields';

const ALL_PERMISSIONS = {
  providers: ['opencode', 'mimo', 'anthropic', 'google', 'openai'] as const,
  canGenerateImage: false,
  canGenerateTts: false,
  canGenerateMusic: false,
  canGenerateVideo: false,
};

describe('parseUserAiPermissions', () => {
  it('null/undefined/空串输入返回 null（表示跟随套餐默认）', () => {
    expect(parseUserAiPermissions(null)).toBeNull();
    expect(parseUserAiPermissions(undefined)).toBeNull();
    expect(parseUserAiPermissions('')).toBeNull();
  });

  it('非法 JSON 返回 null', () => {
    expect(parseUserAiPermissions('{not json')).toBeNull();
  });

  it('合法 JSON 按字段解析，providers 缺失时默认 [opencode]', () => {
    expect(parseUserAiPermissions(JSON.stringify({ canGenerateImage: true }))).toEqual({
      providers: ['opencode'],
      canGenerateImage: true,
      canGenerateTts: false,
      canGenerateMusic: false,
      canGenerateVideo: false,
    });
  });

  it('providers 不是数组时回退为 [opencode]', () => {
    expect(parseUserAiPermissions(JSON.stringify({ providers: 'opencode' }))).toEqual({
      providers: ['opencode'],
      canGenerateImage: false,
      canGenerateTts: false,
      canGenerateMusic: false,
      canGenerateVideo: false,
    });
  });

  it('完整合法数据原样解析', () => {
    expect(
      parseUserAiPermissions(
        JSON.stringify({
          providers: ['anthropic', 'google'],
          canGenerateImage: true,
          canGenerateTts: true,
          canGenerateMusic: true,
          canGenerateVideo: true,
        }),
      ),
    ).toEqual({
      providers: ['anthropic', 'google'],
      canGenerateImage: true,
      canGenerateTts: true,
      canGenerateMusic: true,
      canGenerateVideo: true,
    });
  });
});

describe('UserAiPermissionsFields', () => {
  it('value 为 null 时说明跟随套餐默认，并提供"手动指定"入口', () => {
    render(
      <UserAiPermissionsFields
        value={null}
        onChange={vi.fn()}
        planLabel="Pro"
      />,
    );

    expect(screen.getByText(/跟随套餐默认（当前：Pro）/)).toBeInTheDocument();
    expect(screen.getByText('手动指定')).toBeInTheDocument();
  });

  it('点击"手动指定"时以全开 provider、全关生成服务调用 onChange', () => {
    const onChange = vi.fn();
    render(
      <UserAiPermissionsFields
        value={null}
        onChange={onChange}
        planLabel="免费档"
      />,
    );

    fireEvent.click(screen.getByText('手动指定'));

    expect(onChange).toHaveBeenCalledWith({
      providers: ['opencode', 'mimo', 'anthropic', 'google', 'openai'],
      canGenerateImage: false,
      canGenerateTts: false,
      canGenerateMusic: false,
      canGenerateVideo: false,
    });
  });

  it('value 非空时渲染 provider 与服务复选框并反映选中状态', () => {
    render(
      <UserAiPermissionsFields
        value={{ ...ALL_PERMISSIONS, providers: ['opencode', 'anthropic'], canGenerateImage: true }}
        onChange={vi.fn()}
        planLabel="免费档"
      />,
    );

    expect(screen.getByLabelText('OpenCode Go（DeepSeek 默认）')).toBeChecked();
    expect(screen.getByLabelText('Claude（高级）')).toBeChecked();
    expect(screen.getByLabelText('Gemini')).not.toBeChecked();
    expect(screen.getByLabelText(/^图片生成/)).toBeChecked();
    expect(screen.getByLabelText(/^视频生成/)).not.toBeChecked();
  });

  it('勾选新的 provider 触发 onChange 追加', () => {
    const onChange = vi.fn();
    render(
      <UserAiPermissionsFields
        value={{ ...ALL_PERMISSIONS, providers: ['opencode'] }}
        onChange={onChange}
        planLabel="免费档"
      />,
    );

    fireEvent.click(screen.getByLabelText('Gemini'));

    expect(onChange).toHaveBeenCalledWith({
      ...ALL_PERMISSIONS,
      providers: ['opencode', 'google'],
    });
  });

  it('取消勾选已有 provider 触发 onChange 移除', () => {
    const onChange = vi.fn();
    render(
      <UserAiPermissionsFields
        value={{ ...ALL_PERMISSIONS, providers: ['opencode', 'anthropic'] }}
        onChange={onChange}
        planLabel="免费档"
      />,
    );

    fireEvent.click(screen.getByLabelText('Claude（高级）'));

    expect(onChange).toHaveBeenCalledWith({
      ...ALL_PERMISSIONS,
      providers: ['opencode'],
    });
  });

  it('只剩最后一个 provider 时不允许取消勾选（至少保留一个）', () => {
    const onChange = vi.fn();
    render(
      <UserAiPermissionsFields
        value={{ ...ALL_PERMISSIONS, providers: ['opencode'] }}
        onChange={onChange}
        planLabel="免费档"
      />,
    );

    fireEvent.click(screen.getByLabelText('OpenCode Go（DeepSeek 默认）'));

    expect(onChange).not.toHaveBeenCalled();
  });

  it('勾选视频生成开关触发 onChange', () => {
    const onChange = vi.fn();
    render(
      <UserAiPermissionsFields
        value={{ ...ALL_PERMISSIONS, providers: ['opencode'] }}
        onChange={onChange}
        planLabel="免费档"
      />,
    );

    fireEvent.click(screen.getByLabelText(/^视频生成/));

    expect(onChange).toHaveBeenCalledWith({
      ...ALL_PERMISSIONS,
      providers: ['opencode'],
      canGenerateVideo: true,
    });
  });

  it('点击"跟随套餐默认"时以 null 调用 onChange', () => {
    const onChange = vi.fn();
    render(
      <UserAiPermissionsFields
        value={{ ...ALL_PERMISSIONS, providers: ['opencode'] }}
        onChange={onChange}
        planLabel="免费档"
      />,
    );

    fireEvent.click(screen.getByText('跟随套餐默认'));

    expect(onChange).toHaveBeenCalledWith(null);
  });
});
