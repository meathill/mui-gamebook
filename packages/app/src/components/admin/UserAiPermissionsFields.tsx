import type { AiProviderType } from '@mui-gamebook/core/lib/ai-provider';
import type { AiPermissions } from '@/lib/ai-permissions';

const PROVIDER_OPTIONS: { value: AiProviderType; label: string }[] = [
  { value: 'mimo', label: 'MiMo（默认，低成本）' },
  { value: 'anthropic', label: 'Claude（高级）' },
  { value: 'google', label: 'Gemini' },
  { value: 'openai', label: 'GPT' },
];

/**
 * 客户端解析用户权限 JSON（宽松版，严格校验在服务端）
 * null/坏数据 → null（表示默认权限）
 */
export function parseUserAiPermissions(raw: string | null | undefined): AiPermissions | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<AiPermissions>;
    return {
      providers: Array.isArray(parsed.providers) ? (parsed.providers as AiProviderType[]) : ['mimo'],
      canGenerateImage: parsed.canGenerateImage === true,
      canGenerateVideo: parsed.canGenerateVideo === true,
    };
  } catch {
    return null;
  }
}

interface UserAiPermissionsFieldsProps {
  // null 表示默认权限（仅 MiMo，无生图/生视频）
  value: AiPermissions | null;
  onChange: (value: AiPermissions | null) => void;
}

/**
 * 用户编辑弹窗中的 AI 权限区块
 */
export function UserAiPermissionsFields({ value, onChange }: UserAiPermissionsFieldsProps) {
  function handleToggleProvider(provider: AiProviderType) {
    if (!value) return;
    const has = value.providers.includes(provider);
    // 至少保留一个提供者
    if (has && value.providers.length === 1) return;
    onChange({
      ...value,
      providers: has ? value.providers.filter((p) => p !== provider) : [...value.providers, provider],
    });
  }

  return (
    <div className="border-t border-gray-200 pt-4">
      <div className="flex items-center justify-between mb-2">
        <span className="block text-sm font-medium text-gray-700">AI 权限</span>
        {value ? (
          <button
            type="button"
            onClick={() => onChange(null)}
            className="text-xs text-blue-600 hover:text-blue-800">
            恢复默认
          </button>
        ) : (
          <button
            type="button"
            onClick={() => onChange({ providers: ['mimo'], canGenerateImage: false, canGenerateVideo: false })}
            className="text-xs text-blue-600 hover:text-blue-800">
            自定义
          </button>
        )}
      </div>

      {value ? (
        <div className="space-y-3">
          <div>
            <p className="text-xs text-gray-500 mb-1.5">可用的文本 AI（按定价分级）</p>
            <div className="grid grid-cols-2 gap-1.5">
              {PROVIDER_OPTIONS.map((option) => (
                <label
                  key={option.value}
                  className="flex items-center gap-2 text-sm text-gray-700">
                  <input
                    type="checkbox"
                    checked={value.providers.includes(option.value)}
                    onChange={() => handleToggleProvider(option.value)}
                    className="rounded border-gray-300"
                  />
                  {option.label}
                </label>
              ))}
            </div>
          </div>

          <div>
            <p className="text-xs text-gray-500 mb-1.5">高成本功能（默认关闭）</p>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={value.canGenerateImage}
                  onChange={(e) => onChange({ ...value, canGenerateImage: e.target.checked })}
                  className="rounded border-gray-300"
                />
                图片生成
              </label>
              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={value.canGenerateVideo}
                  onChange={(e) => onChange({ ...value, canGenerateVideo: e.target.checked })}
                  className="rounded border-gray-300"
                />
                视频生成
              </label>
            </div>
          </div>
        </div>
      ) : (
        <p className="text-xs text-gray-500">默认权限：仅可用 MiMo，不可生成图片/视频</p>
      )}
    </div>
  );
}
