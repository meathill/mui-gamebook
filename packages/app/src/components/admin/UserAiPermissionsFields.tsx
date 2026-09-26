import type { AiProviderType } from '@mui-gamebook/core/lib/ai-provider';
import type { AiPermissions } from '@/lib/ai-permissions';

const PROVIDER_OPTIONS: { value: AiProviderType; label: string }[] = [
  { value: 'opencode', label: 'OpenCode Go（DeepSeek 默认）' },
  { value: 'mimo', label: 'MiMo（低成本）' },
  { value: 'anthropic', label: 'Claude（高级）' },
  { value: 'google', label: 'Gemini' },
  { value: 'openai', label: 'GPT' },
];

/** 受控服务（文本按 provider 细分，见 PROVIDER_OPTIONS） */
const SERVICE_OPTIONS: { key: keyof Omit<AiPermissions, 'providers'>; label: string; hint: string }[] = [
  { key: 'canGenerateImage', label: '图片生成', hint: 'Pro 及以上' },
  { key: 'canGenerateTts', label: '语音合成 (TTS)', hint: 'Pro 及以上' },
  { key: 'canGenerateMusic', label: '音乐与音效', hint: 'Pro 及以上' },
  { key: 'canGenerateVideo', label: '视频生成', hint: 'Pro+ 及以上' },
];

/**
 * 客户端解析用户权限 JSON（宽松版，严格校验在服务端）
 * null/坏数据 → null（表示跟随套餐默认）
 */
export function parseUserAiPermissions(raw: string | null | undefined): AiPermissions | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<AiPermissions>;
    return {
      providers: Array.isArray(parsed.providers) ? (parsed.providers as AiProviderType[]) : ['opencode'],
      canGenerateImage: parsed.canGenerateImage === true,
      canGenerateTts: parsed.canGenerateTts === true,
      canGenerateMusic: parsed.canGenerateMusic === true,
      canGenerateVideo: parsed.canGenerateVideo === true,
    };
  } catch {
    return null;
  }
}

interface UserAiPermissionsFieldsProps {
  // null 表示跟随套餐默认权限
  value: AiPermissions | null;
  onChange: (value: AiPermissions | null) => void;
  /** 当前套餐对应的默认权限描述，用于提示用户「跟随默认」时会得到什么 */
  planLabel: string;
}

/**
 * 用户编辑弹窗中的权限区块：勾选服务，或跟随订阅套餐默认
 */
export function UserAiPermissionsFields({ value, onChange, planLabel }: UserAiPermissionsFieldsProps) {
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
            跟随套餐默认
          </button>
        ) : (
          <button
            type="button"
            onClick={() =>
              onChange({
                providers: ['opencode', 'mimo', 'anthropic', 'google', 'openai'],
                canGenerateImage: false,
                canGenerateTts: false,
                canGenerateMusic: false,
                canGenerateVideo: false,
              })
            }
            className="text-xs text-blue-600 hover:text-blue-800">
            手动指定
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
            <p className="text-xs text-gray-500 mb-1.5">生成服务</p>
            <div className="grid grid-cols-2 gap-1.5">
              {SERVICE_OPTIONS.map((option) => (
                <label
                  key={option.key}
                  className="flex items-center gap-2 text-sm text-gray-700">
                  <input
                    type="checkbox"
                    checked={value[option.key]}
                    onChange={(e) => onChange({ ...value, [option.key]: e.target.checked })}
                    className="rounded border-gray-300"
                  />
                  <span>
                    {option.label}
                    <span className="text-xs text-gray-400 ml-1">({option.hint})</span>
                  </span>
                </label>
              ))}
            </div>
          </div>

          <p className="text-xs text-amber-600">已手动指定：以下勾选覆盖套餐默认，升级套餐不会自动改变这些权限。</p>
        </div>
      ) : (
        <p className="text-xs text-gray-500">
          跟随套餐默认（当前：{planLabel || '免费档'}）。免费档只有文本模型；Pro 加图片/语音/音乐；Pro+ 再加视频。
        </p>
      )}
    </div>
  );
}
