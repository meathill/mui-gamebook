'use client';

import { ArrowLeftIcon, FloppyDiskIcon } from '@phosphor-icons/react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { type FormEvent, useEffect, useState } from 'react';
import { type AdminConfigDraft, createAdminConfigDraft, parseAdminConfigDraft } from '@/lib/admin-config-draft';
import { authClient } from '@/lib/auth-client';
import type { AppConfig } from '@/lib/config';
import { PROVIDER_SECTIONS, ProviderSection } from './sections';

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
          {PROVIDER_SECTIONS.map((section) => (
            <ProviderSection
              key={section.title}
              section={section}
              formData={formData}
              updateField={updateField}
            />
          ))}

          {/* 用量限制：number 输入 + 校验错误提示，不进通用分组骨架 */}
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
