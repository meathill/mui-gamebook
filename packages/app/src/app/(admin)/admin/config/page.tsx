'use client';

import { ArrowLeftIcon, FloppyDiskIcon } from '@phosphor-icons/react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { type FormEvent, useEffect, useState } from 'react';
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
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  选择默认用于文本和图片生成的 AI 提供者。视频生成始终使用 Google GenAI。
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">默认 TTS 音色</label>
                <input
                  type="text"
                  value={formData.defaultTtsVoice}
                  onChange={(e) => updateField('defaultTtsVoice', e.target.value)}
                  placeholder="Aoede"
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 border p-2"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Google TTS 可选音色：Aoede, Charon, Fenrir, Kore, Puck, Zephyr 等<br />
                  OpenAI TTS 可选音色：marin，cedar
                </p>
              </div>
            </div>
          </section>

          {/* Google AI 模型配置 */}
          <section className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-lg font-semibold mb-4 border-b pb-2">Google GenAI 模型</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">文本模型</label>
                <input
                  type="text"
                  value={formData.googleTextModel}
                  onChange={(e) => updateField('googleTextModel', e.target.value)}
                  placeholder="gemini-2.5-flash"
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 border p-2"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">图片模型</label>
                <input
                  type="text"
                  value={formData.googleImageModel}
                  onChange={(e) => updateField('googleImageModel', e.target.value)}
                  placeholder="gemini-3-pro-image-preview"
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 border p-2"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">TTS 模型</label>
                <input
                  type="text"
                  value={formData.googleTtsModel}
                  onChange={(e) => updateField('googleTtsModel', e.target.value)}
                  placeholder="gemini-2.5-flash-preview-tts"
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 border p-2"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">视频模型</label>
                <input
                  type="text"
                  value={formData.googleVideoModel}
                  onChange={(e) => updateField('googleVideoModel', e.target.value)}
                  placeholder="veo-3.1-fast-generate-preview"
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 border p-2"
                />
              </div>
            </div>
          </section>

          {/* OpenAI 模型配置 */}
          <section className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-lg font-semibold mb-4 border-b pb-2">OpenAI 模型</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">文本模型</label>
                <input
                  type="text"
                  value={formData.openaiTextModel}
                  onChange={(e) => updateField('openaiTextModel', e.target.value)}
                  placeholder="gpt-4o"
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 border p-2"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">图片模型</label>
                <input
                  type="text"
                  value={formData.openaiImageModel}
                  onChange={(e) => updateField('openaiImageModel', e.target.value)}
                  placeholder="gpt-image-1"
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 border p-2"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">TTS 模型</label>
                <input
                  type="text"
                  value={formData.openaiTtsModel}
                  onChange={(e) => updateField('openaiTtsModel', e.target.value)}
                  placeholder="tts-1"
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 border p-2"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">视频模型</label>
                <input
                  type="text"
                  value={formData.openaiVideoModel}
                  onChange={(e) => updateField('openaiVideoModel', e.target.value)}
                  placeholder="sora-1"
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 border p-2"
                />
              </div>
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
