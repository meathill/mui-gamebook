import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { parseUserAiPermissions, UserAiPermissionsFields } from '@/components/admin/UserAiPermissionsFields';

describe('parseUserAiPermissions', () => {
  it('null/undefined 输入返回 null（表示默认权限）', () => {
    expect(parseUserAiPermissions(null)).toBeNull();
    expect(parseUserAiPermissions(undefined)).toBeNull();
    expect(parseUserAiPermissions('')).toBeNull();
  });

  it('非法 JSON 返回 null', () => {
    expect(parseUserAiPermissions('{not json')).toBeNull();
  });

  it('合法 JSON 按字段解析，providers 缺失时默认 [mimo]', () => {
    expect(parseUserAiPermissions(JSON.stringify({ canGenerateImage: true }))).toEqual({
      providers: ['mimo'],
      canGenerateImage: true,
      canGenerateVideo: false,
    });
  });

  it('providers 不是数组时回退为 [mimo]', () => {
    expect(parseUserAiPermissions(JSON.stringify({ providers: 'mimo' }))).toEqual({
      providers: ['mimo'],
      canGenerateImage: false,
      canGenerateVideo: false,
    });
  });

  it('完整合法数据原样解析', () => {
    expect(
      parseUserAiPermissions(
        JSON.stringify({ providers: ['anthropic', 'google'], canGenerateImage: true, canGenerateVideo: true }),
      ),
    ).toEqual({
      providers: ['anthropic', 'google'],
      canGenerateImage: true,
      canGenerateVideo: true,
    });
  });
});

describe('UserAiPermissionsFields', () => {
  it('value 为 null 时显示默认权限说明和"自定义"按钮', () => {
    render(
      <UserAiPermissionsFields
        value={null}
        onChange={vi.fn()}
      />,
    );

    expect(screen.getByText('默认权限：仅可用 MiMo，不可生成图片/视频')).toBeInTheDocument();
    expect(screen.getByText('自定义')).toBeInTheDocument();
  });

  it('点击"自定义"时以默认值调用 onChange', () => {
    const onChange = vi.fn();
    render(
      <UserAiPermissionsFields
        value={null}
        onChange={onChange}
      />,
    );

    fireEvent.click(screen.getByText('自定义'));

    expect(onChange).toHaveBeenCalledWith({ providers: ['mimo'], canGenerateImage: false, canGenerateVideo: false });
  });

  it('value 非空时渲染 provider 复选框并反映选中状态', () => {
    render(
      <UserAiPermissionsFields
        value={{ providers: ['mimo', 'anthropic'], canGenerateImage: true, canGenerateVideo: false }}
        onChange={vi.fn()}
      />,
    );

    expect(screen.getByLabelText('MiMo（默认，低成本）')).toBeChecked();
    expect(screen.getByLabelText('Claude（高级）')).toBeChecked();
    expect(screen.getByLabelText('Gemini')).not.toBeChecked();
    expect(screen.getByLabelText('图片生成')).toBeChecked();
    expect(screen.getByLabelText('视频生成')).not.toBeChecked();
  });

  it('勾选新的 provider 触发 onChange 追加', () => {
    const onChange = vi.fn();
    render(
      <UserAiPermissionsFields
        value={{ providers: ['mimo'], canGenerateImage: false, canGenerateVideo: false }}
        onChange={onChange}
      />,
    );

    fireEvent.click(screen.getByLabelText('Gemini'));

    expect(onChange).toHaveBeenCalledWith({
      providers: ['mimo', 'google'],
      canGenerateImage: false,
      canGenerateVideo: false,
    });
  });

  it('取消勾选已有 provider 触发 onChange 移除', () => {
    const onChange = vi.fn();
    render(
      <UserAiPermissionsFields
        value={{ providers: ['mimo', 'anthropic'], canGenerateImage: false, canGenerateVideo: false }}
        onChange={onChange}
      />,
    );

    fireEvent.click(screen.getByLabelText('Claude（高级）'));

    expect(onChange).toHaveBeenCalledWith({
      providers: ['mimo'],
      canGenerateImage: false,
      canGenerateVideo: false,
    });
  });

  it('只剩最后一个 provider 时不允许取消勾选（至少保留一个）', () => {
    const onChange = vi.fn();
    render(
      <UserAiPermissionsFields
        value={{ providers: ['mimo'], canGenerateImage: false, canGenerateVideo: false }}
        onChange={onChange}
      />,
    );

    fireEvent.click(screen.getByLabelText('MiMo（默认，低成本）'));

    expect(onChange).not.toHaveBeenCalled();
  });

  it('切换图片/视频生成开关触发 onChange', () => {
    const onChange = vi.fn();
    render(
      <UserAiPermissionsFields
        value={{ providers: ['mimo'], canGenerateImage: false, canGenerateVideo: false }}
        onChange={onChange}
      />,
    );

    fireEvent.click(screen.getByLabelText('视频生成'));

    expect(onChange).toHaveBeenCalledWith({
      providers: ['mimo'],
      canGenerateImage: false,
      canGenerateVideo: true,
    });
  });

  it('点击"恢复默认"时以 null 调用 onChange', () => {
    const onChange = vi.fn();
    render(
      <UserAiPermissionsFields
        value={{ providers: ['mimo'], canGenerateImage: false, canGenerateVideo: false }}
        onChange={onChange}
      />,
    );

    fireEvent.click(screen.getByText('恢复默认'));

    expect(onChange).toHaveBeenCalledWith(null);
  });
});
