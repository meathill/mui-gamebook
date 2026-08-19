'use client';

import { ArrowLeftIcon, FloppyDiskIcon } from '@phosphor-icons/react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { type FormEvent, useEffect, useState } from 'react';
import { ConfigTextField } from '@/components/admin/ConfigTextField';
import { type AdminConfigDraft, createAdminConfigDraft, parseAdminConfigDraft } from '@/lib/admin-config-draft';
import { authClient } from '@/lib/auth-client';
import type { AppConfig } from '@/lib/config';

interface UpdateConfigResponse {
  message: string;
  config: AppConfig;
}

export default function AdminConfigPage() {
  const { data: session, isPending: isAuthPending } = authClient.useSession();
  const router = useRouter();
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState<AdminConfigDraft | null>(null);
  const [isDirty, setIsDirty] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  const {
    data: config,
    isLoading,
    error,
  } = useQuery<AppConfig>({
    queryKey: ['admin-config'],
    queryFn: async () => {
      const res = await fetch('/api/admin/config');
      if (!res.ok) {
        if (res.status === 403) {
          throw new Error('无权限访问');
        }
        throw new Error('获取配置失败');
      }
      return res.json();
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (data: AppConfig): Promise<UpdateConfigResponse> => {
      const res = await fetch('/api/admin/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('保存配置失败');
      return (await res.json()) as UpdateConfigResponse;
    },
    onSuccess: ({ config: savedConfig }) => {
      queryClient.setQueryData<AppConfig>(['admin-config'], savedConfig);
      setFormData(createAdminConfigDraft(savedConfig));
      setIsDirty(false);
      setValidationError(null);
    },
  });

  useEffect(() => {
    if (config && !isDirty) {
      setFormData(createAdminConfigDraft(config));
    }
  }, [config, isDirty]);

  useEffect(() => {
    if (!isAuthPending && !session) {
      router.push('/sign-in');
    }
  }, [isAuthPending, session, router]);

  if (isAuthPending || isLoading) {
    return <div className="p-8 text-center">加载中...</div>;
  }

  if (!session) {
    return null;
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 py-12 px-4">
        <div className="max-w-3xl mx-auto">
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">{error.message}</div>
          <Link
            href="/admin"
            className="mt-4 inline-flex items-center gap-2 text-blue-600 hover:text-blue-800">
            <ArrowLeftIcon size={18} /> 返回
          </Link>
        </div>
      </div>
    );
  }

  if (!formData) {
    return <div className="p-8 text-center">加载中...</div>;
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!formData) return;

    const result = parseAdminConfigDraft(formData);
    if (!result.success) {
      setValidationError(result.error);
      return;
    }

    setValidationError(null);
    saveMutation.mutate(result.config);
  }

  function updateField<Field extends keyof AdminConfigDraft>(field: Field, value: AdminConfigDraft[Field]) {
    setFormData((previous) => (previous ? { ...previous, [field]: value } : previous));
    setIsDirty(true);
    if (field === 'dailyTokenLimit') {
      setValidationError(null);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <header className="flex items-center gap-4 mb-8">
          <Link
            href="/admin"
            className="text-gray-500 hover:text-gray-700">
            <ArrowLeftIcon size={24} />
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">系统配置</h1>
            <p className="text-gray-500 mt-1">按生成类型管理 AI 模态、模型及系统全局配置</p>
          </div>
        </header>

        <form
          onSubmit={handleSubmit}
          noValidate
          className="space-y-8">
          {/* 1. 文本生成 (Text / LLM) */}
          <section className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-lg font-semibold mb-4 border-b pb-2 flex items-center gap-2">
              <span>📝</span>
              <span>文本生成 (Text / LLM)</span>
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">默认文本提供者</label>
                <select
                  value={formData.defaultTextProvider}
                  onChange={(e) =>
                    updateField('defaultTextProvider', e.target.value as AdminConfigDraft['defaultTextProvider'])
                  }
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 border p-2">
                  <option value="opencode">OpenCode Go（DeepSeek 默认）</option>
                  <option value="mimo">小米 MiMo</option>
                  <option value="google">Google GenAI</option>
                  <option value="openai">OpenAI</option>
                  <option value="anthropic">Anthropic Claude</option>
                </select>
                <p className="text-xs text-gray-500 mt-1">剧本生成、对话助手（Chat）、故事评估等文本任务的默认引擎。</p>
              </div>

              <div className="pt-2 border-t space-y-4">
                <h3 className="text-sm font-semibold text-gray-600">各提供商文本模型</h3>

                <ConfigTextField
                  label="OpenCode 文本模型"
                  value={formData.opencodeTextModel}
                  onChange={(value) => updateField('opencodeTextModel', value)}
                  placeholder="deepseek-v4-flash"
                  hint="OpenCode Go 默认模型"
                />

                <ConfigTextField
                  label="OpenCode base URL"
                  value={formData.opencodeBaseUrl}
                  onChange={(value) => updateField('opencodeBaseUrl', value)}
                  placeholder="https://opencode.ai/zen/go/v1"
                  hint="OpenCode 官方端点"
                />

                <ConfigTextField
                  label="小米 MiMo 文本模型"
                  value={formData.mimoTextModel}
                  onChange={(value) => updateField('mimoTextModel', value)}
                  placeholder="mimo-v2.5-pro"
                />

                <ConfigTextField
                  label="小米 MiMo base URL"
                  value={formData.mimoBaseUrl}
                  onChange={(value) => updateField('mimoBaseUrl', value)}
                  placeholder="https://token-plan-cn.xiaomimimo.com/v1"
                  hint="Token Plan 订阅端点；按量付费可改为 https://api.xiaomimimo.com/v1"
                />

                <ConfigTextField
                  label="Anthropic Claude 文本模型"
                  value={formData.anthropicTextModel}
                  onChange={(value) => updateField('anthropicTextModel', value)}
                  placeholder="claude-sonnet-5"
                  hint="仅授权用户可用"
                />

                <ConfigTextField
                  label="Google GenAI 文本模型"
                  value={formData.googleTextModel}
                  onChange={(value) => updateField('googleTextModel', value)}
                  placeholder="gemini-3.7-flash"
                />

                <ConfigTextField
                  label="OpenAI 文本模型"
                  value={formData.openaiTextModel}
                  onChange={(value) => updateField('openaiTextModel', value)}
                  placeholder="gpt-5.6-luna"
                />
              </div>
            </div>
          </section>

          {/* 2. 角色台词与语音合成 (TTS / Voice) */}
          <section className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-lg font-semibold mb-4 border-b pb-2 flex items-center gap-2">
              <span>🎙️</span>
              <span>语音合成 (TTS / Voice)</span>
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">默认 TTS 语音合成提供者</label>
                <select
                  value={formData.defaultTtsProvider}
                  onChange={(e) =>
                    updateField('defaultTtsProvider', e.target.value as AdminConfigDraft['defaultTtsProvider'])
                  }
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 border p-2">
                  <option value="mimo">小米 MiMo（推荐）</option>
                  <option value="google">Google GenAI</option>
                  <option value="openai">OpenAI</option>
                </select>
                <p className="text-xs text-gray-500 mt-1">角色对白、旁白与音色试听合成提供者。</p>
              </div>

              <div className="pt-2 border-t space-y-4">
                <h3 className="text-sm font-semibold text-gray-600">各提供商 TTS 模型</h3>

                <ConfigTextField
                  label="小米 MiMo TTS 模型"
                  value={formData.mimoTtsModel}
                  onChange={(value) => updateField('mimoTtsModel', value)}
                  placeholder="mimo-v2.5-tts"
                  hint="预置丰富音色；在默认 TTS 选 MiMo 时生效"
                />

                <ConfigTextField
                  label="Google GenAI TTS 模型"
                  value={formData.googleTtsModel}
                  onChange={(value) => updateField('googleTtsModel', value)}
                  placeholder="gemini-3.1-flash-tts-preview"
                />

                <ConfigTextField
                  label="OpenAI TTS 模型"
                  value={formData.openaiTtsModel}
                  onChange={(value) => updateField('openaiTtsModel', value)}
                  placeholder="gpt-4o-mini-tts"
                />
              </div>
            </div>
          </section>

          {/* 3. 图像生成 (Image) */}
          <section className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-lg font-semibold mb-4 border-b pb-2 flex items-center gap-2">
              <span>🖼️</span>
              <span>图像生成 (Image)</span>
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">默认图片生成提供者</label>
                <select
                  value={formData.defaultImageProvider}
                  onChange={(e) =>
                    updateField('defaultImageProvider', e.target.value as AdminConfigDraft['defaultImageProvider'])
                  }
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 border p-2">
                  <option value="google">Google GenAI（推荐）</option>
                  <option value="openai">OpenAI</option>
                </select>
                <p className="text-xs text-gray-500 mt-1">角色立绘、场景插画与背景生图引擎。</p>
              </div>

              <div className="pt-2 border-t space-y-4">
                <h3 className="text-sm font-semibold text-gray-600">各提供商图像模型</h3>

                <ConfigTextField
                  label="Google GenAI 图片模型"
                  value={formData.googleImageModel}
                  onChange={(value) => updateField('googleImageModel', value)}
                  placeholder="gemini-3.1-flash-lite-image"
                />

                <ConfigTextField
                  label="OpenAI 图片模型"
                  value={formData.openaiImageModel}
                  onChange={(value) => updateField('openaiImageModel', value)}
                  placeholder="gpt-image-1.5"
                />
              </div>
            </div>
          </section>

          {/* 4. 视频生成 (Video) */}
          <section className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-lg font-semibold mb-4 border-b pb-2 flex items-center gap-2">
              <span>🎬</span>
              <span>视频生成 (Video)</span>
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">默认视频生成提供者</label>
                <select
                  value={formData.defaultVideoProvider}
                  onChange={(e) =>
                    updateField('defaultVideoProvider', e.target.value as AdminConfigDraft['defaultVideoProvider'])
                  }
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 border p-2">
                  <option value="google">Google GenAI (Veo)</option>
                </select>
                <p className="text-xs text-gray-500 mt-1">场景视频与动画生成（未来支持接入 Kie / Fal 等）。</p>
              </div>

              <div className="pt-2 border-t space-y-4">
                <h3 className="text-sm font-semibold text-gray-600">视频模型配置</h3>

                <ConfigTextField
                  label="Google GenAI 视频模型"
                  value={formData.googleVideoModel}
                  onChange={(value) => updateField('googleVideoModel', value)}
                  placeholder="veo-3.1-fast-generate-preview"
                />

                <ConfigTextField
                  label="OpenAI 视频模型"
                  value={formData.openaiVideoModel}
                  onChange={(value) => updateField('openaiVideoModel', value)}
                  placeholder="（暂不可用）"
                  hint="Sora 2 已下线，未来将扩展支持 Kie / Fal 等"
                />
              </div>
            </div>
          </section>

          {/* 5. 音乐音效生成 (Music / SFX) */}
          <section className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-lg font-semibold mb-4 border-b pb-2 flex items-center gap-2">
              <span>🎵</span>
              <span>音乐与音效 (Music / SFX)</span>
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">默认背景音乐 (BGM) 提供者</label>
                <select
                  value={formData.defaultMusicProvider}
                  onChange={(e) =>
                    updateField('defaultMusicProvider', e.target.value as AdminConfigDraft['defaultMusicProvider'])
                  }
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 border p-2">
                  <option value="internal">内置精选素材库（默认）</option>
                  <option value="suno">Suno AI（即将接入）</option>
                  <option value="udio">Udio（即将接入）</option>
                  <option value="elevenlabs">ElevenLabs（即将接入）</option>
                </select>
                <p className="text-xs text-gray-500 mt-1">互动小说与游戏章节背景音乐 (BGM) 生成引擎。</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">默认音效 (SFX) 提供者</label>
                <select
                  value={formData.defaultSfxProvider}
                  onChange={(e) =>
                    updateField('defaultSfxProvider', e.target.value as AdminConfigDraft['defaultSfxProvider'])
                  }
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 border p-2">
                  <option value="internal">内置音效库（默认）</option>
                  <option value="elevenlabs">ElevenLabs Sound Effects（即将接入）</option>
                  <option value="stable-audio">Stable Audio（即将接入）</option>
                </select>
                <p className="text-xs text-gray-500 mt-1">按键音、交互反馈及场景环境音效 (SFX) 生成引擎。</p>
              </div>

              <div className="pt-2 border-t space-y-4">
                <h3 className="text-sm font-semibold text-gray-600">音乐与音效模型配置</h3>

                <ConfigTextField
                  label="音乐生成模型"
                  value={formData.musicModel}
                  onChange={(value) => updateField('musicModel', value)}
                  placeholder="suno-v4"
                  hint="AI 音乐生成服务调用模型"
                />

                <ConfigTextField
                  label="音效生成模型"
                  value={formData.sfxModel}
                  onChange={(value) => updateField('sfxModel', value)}
                  placeholder="eleven-sfx-v1"
                  hint="AI 短音效/环境音生成模型"
                />
              </div>
            </div>
          </section>

          {/* 6. 语音识别 (STT) */}
          <section className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-lg font-semibold mb-4 border-b pb-2 flex items-center gap-2">
              <span>👂</span>
              <span>语音识别 (STT)</span>
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">默认 STT 语音识别提供者</label>
                <select
                  value={formData.defaultSttProvider}
                  onChange={(e) =>
                    updateField('defaultSttProvider', e.target.value as AdminConfigDraft['defaultSttProvider'])
                  }
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 border p-2">
                  <option value="openai">OpenAI (Whisper)</option>
                  <option value="google">Google GenAI</option>
                </select>
                <p className="text-xs text-gray-500 mt-1">语音输入与录音转写引擎。</p>
              </div>
            </div>
          </section>

          {/* 7. 网关与网络连接 (AI Gateway) */}
          <section className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-lg font-semibold mb-4 border-b pb-2 flex items-center gap-2">
              <span>🌐</span>
              <span>网关与网络连接 (AI Gateway)</span>
            </h2>

            <div className="space-y-4">
              <ConfigTextField
                label="Cloudflare AI Gateway 地址"
                value={formData.cfAiGatewayBaseUrl}
                onChange={(value) => updateField('cfAiGatewayBaseUrl', value)}
                placeholder="https://gateway.ai.cloudflare.com/v1/{account}/{gateway}"
                hint="Claude/Gemini/OpenAI 的密钥存储在网关（BYOK），经它转发调用；OpenCode 与 MiMo 直连官方。"
              />
            </div>
          </section>

          {/* 8. 用量限制配置 */}
          <section className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-lg font-semibold mb-4 border-b pb-2 flex items-center gap-2">
              <span>📊</span>
              <span>用量限制</span>
            </h2>

            <div className="space-y-4">
              <div>
                <label
                  htmlFor="daily-token-limit"
                  className="block text-sm font-medium text-gray-700 mb-1">
                  每日 Token 限制
                </label>
                <input
                  id="daily-token-limit"
                  type="number"
                  min={0}
                  step={1}
                  value={formData.dailyTokenLimit}
                  aria-invalid={validationError ? true : undefined}
                  aria-describedby={validationError ? 'daily-token-limit-error' : undefined}
                  onChange={(e) => updateField('dailyTokenLimit', e.target.value)}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 border p-2"
                />
                {validationError && (
                  <p
                    id="daily-token-limit-error"
                    className="text-xs text-red-600 mt-1">
                    {validationError}
                  </p>
                )}
                <p className="text-xs text-gray-500 mt-1">
                  普通用户每日可使用的标准计费 Token 上限（$1.00 USD = 1,000,000 Tokens）
                </p>
              </div>
            </div>
          </section>

          {/* 9. 白名单与访问控制 */}
          <section className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-lg font-semibold mb-4 border-b pb-2 flex items-center gap-2">
              <span>🔒</span>
              <span>访问控制</span>
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">视频生成白名单</label>
                <textarea
                  value={formData.videoWhitelist}
                  onChange={(e) => updateField('videoWhitelist', e.target.value)}
                  placeholder="每行一个邮箱地址"
                  rows={4}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 border p-2"
                />
                <p className="text-xs text-gray-500 mt-1">只有白名单中的用户才能使用视频生成功能</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">管理员用户 ID</label>
                <textarea
                  value={formData.adminUserIds}
                  onChange={(e) => updateField('adminUserIds', e.target.value)}
                  placeholder="每行一个用户 ID"
                  rows={4}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 border p-2"
                />
                <p className="text-xs text-gray-500 mt-1">管理员用户不受 Token 限制</p>
              </div>
            </div>
          </section>

          {/* 保存按钮 */}
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={saveMutation.isPending}
              className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2">
              <FloppyDiskIcon size={18} />
              {saveMutation.isPending ? '保存中...' : '保存配置'}
            </button>
          </div>

          {saveMutation.isSuccess && (
            <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded">配置已保存</div>
          )}

          {saveMutation.isError && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">保存失败，请重试</div>
          )}
        </form>
      </div>
    </div>
  );
}
