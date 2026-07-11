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

  if (isAuthPending || isLoading) {
    return <div className="p-8 text-center">加载中...</div>;
  }

  if (!session) {
    router.push('/sign-in');
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
            <p className="text-gray-500 mt-1">管理全局设置和 AI 模型配置</p>
          </div>
        </header>

        <form
          onSubmit={handleSubmit}
          noValidate
          className="space-y-8">
          {/* AI 提供者配置 */}
          <section className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-lg font-semibold mb-4 border-b pb-2">AI 提供者配置</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">默认 AI 提供者</label>
                <select
                  value={formData.defaultAiProvider}
                  onChange={(e) =>
                    updateField('defaultAiProvider', e.target.value as AdminConfigDraft['defaultAiProvider'])
                  }
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 border p-2">
                  <option value="google">Google GenAI</option>
                  <option value="openai">OpenAI</option>
                  <option value="mimo">小米 MiMo</option>
                  <option value="anthropic">Anthropic Claude</option>
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  全局默认文本提供者。MiMo/Claude 只支持文本，图片/TTS/视频会自动回退到 Google。
                </p>
              </div>

              <ConfigTextField
                label="默认 TTS 音色"
                value={formData.defaultTtsVoice}
                onChange={(value) => updateField('defaultTtsVoice', value)}
                placeholder="Aoede"
                hint={
                  <>
                    Google TTS 可选音色：Aoede, Charon, Fenrir, Kore, Puck, Zephyr 等<br />
                    OpenAI TTS 可选音色：marin，cedar
                  </>
                }
              />
            </div>
          </section>

          {/* MiMo / Claude 模型配置 */}
          <section className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-lg font-semibold mb-4 border-b pb-2">MiMo / Claude 模型</h2>

            <div className="space-y-4">
              <ConfigTextField
                label="MiMo 文本模型"
                value={formData.mimoTextModel}
                onChange={(value) => updateField('mimoTextModel', value)}
                placeholder="mimo-v2.5-pro"
                hint="普通用户默认使用的文本模型"
              />

              <ConfigTextField
                label="MiMo base URL"
                value={formData.mimoBaseUrl}
                onChange={(value) => updateField('mimoBaseUrl', value)}
                placeholder="https://token-plan-cn.xiaomimimo.com/v1"
                hint="Token Plan 订阅地址；按量付费可改为 https://api.xiaomimimo.com/v1"
              />

              <ConfigTextField
                label="Claude 文本模型"
                value={formData.anthropicTextModel}
                onChange={(value) => updateField('anthropicTextModel', value)}
                placeholder="claude-sonnet-5"
                hint="仅授权用户可用（在用户管理中按用户开通）"
              />
            </div>
          </section>

          {/* Google AI 模型配置 */}
          <section className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-lg font-semibold mb-4 border-b pb-2">Google GenAI 模型</h2>

            <div className="space-y-4">
              <ConfigTextField
                label="文本模型"
                value={formData.googleTextModel}
                onChange={(value) => updateField('googleTextModel', value)}
                placeholder="gemini-3.1-pro-preview"
              />
              <ConfigTextField
                label="图片模型"
                value={formData.googleImageModel}
                onChange={(value) => updateField('googleImageModel', value)}
                placeholder="gemini-3.1-flash-image"
              />
              <ConfigTextField
                label="TTS 模型"
                value={formData.googleTtsModel}
                onChange={(value) => updateField('googleTtsModel', value)}
                placeholder="gemini-3.1-flash-tts-preview"
              />
              <ConfigTextField
                label="视频模型"
                value={formData.googleVideoModel}
                onChange={(value) => updateField('googleVideoModel', value)}
                placeholder="veo-3.1-generate-preview"
              />
            </div>
          </section>

          {/* OpenAI 模型配置 */}
          <section className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-lg font-semibold mb-4 border-b pb-2">OpenAI 模型</h2>

            <div className="space-y-4">
              <ConfigTextField
                label="文本模型"
                value={formData.openaiTextModel}
                onChange={(value) => updateField('openaiTextModel', value)}
                placeholder="gpt-5.5"
              />
              <ConfigTextField
                label="图片模型"
                value={formData.openaiImageModel}
                onChange={(value) => updateField('openaiImageModel', value)}
                placeholder="gpt-image-1.5"
              />
              <ConfigTextField
                label="TTS 模型"
                value={formData.openaiTtsModel}
                onChange={(value) => updateField('openaiTtsModel', value)}
                placeholder="gpt-4o-mini-tts"
              />
              <ConfigTextField
                label="视频模型"
                value={formData.openaiVideoModel}
                onChange={(value) => updateField('openaiVideoModel', value)}
                placeholder="sora-2"
              />
            </div>
          </section>

          {/* 用量限制配置 */}
          <section className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-lg font-semibold mb-4 border-b pb-2">用量限制</h2>

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
                <p className="text-xs text-gray-500 mt-1">普通用户每日可使用的 AI Token 上限</p>
              </div>
            </div>
          </section>

          {/* 白名单配置 */}
          <section className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-lg font-semibold mb-4 border-b pb-2">访问控制</h2>

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
