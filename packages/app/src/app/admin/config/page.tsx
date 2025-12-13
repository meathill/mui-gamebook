'use client';

import { useState, useEffect } from 'react';
import { authClient } from '@/lib/auth-client';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Save, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

interface AppConfig {
  dailyTokenLimit: number;
  adminUserIds: string[];
  videoWhitelist: string[];
  defaultAiProvider: 'google' | 'openai';
  googleTextModel: string;
  googleImageModel: string;
  googleVideoModel: string;
  openaiTextModel: string;
  openaiImageModel: string;
}

export default function AdminConfigPage() {
  const { data: session, isPending: isAuthPending } = authClient.useSession();
  const router = useRouter();
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState<Partial<AppConfig>>({});

  const { data: config, isLoading, error } = useQuery<AppConfig>({
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
    mutationFn: async (data: Partial<AppConfig>) => {
      const res = await fetch('/api/admin/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('保存配置失败');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-config'] });
    },
  });

  useEffect(() => {
    if (config) {
      setFormData(config);
    }
  }, [config]);

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
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
            {error.message}
          </div>
          <Link href="/admin" className="mt-4 inline-flex items-center gap-2 text-blue-600 hover:text-blue-800">
            <ArrowLeft size={18} /> 返回
          </Link>
        </div>
      </div>
    );
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    saveMutation.mutate(formData);
  };

  const updateField = (field: keyof AppConfig, value: unknown) => {
    setFormData(prev => ({ ...prev, [ field ]: value }));
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <header className="flex items-center gap-4 mb-8">
          <Link href="/admin" className="text-gray-500 hover:text-gray-700">
            <ArrowLeft size={24} />
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">系统配置</h1>
            <p className="text-gray-500 mt-1">管理全局设置和 AI 模型配置</p>
          </div>
        </header>

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* AI 提供者配置 */}
          <section className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-lg font-semibold mb-4 border-b pb-2">AI 提供者配置</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  默认 AI 提供者
                </label>
                <select
                  value={formData.defaultAiProvider || 'google'}
                  onChange={e => updateField('defaultAiProvider', e.target.value)}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 border p-2"
                >
                  <option value="google">Google GenAI</option>
                  <option value="openai">OpenAI</option>
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  选择默认用于文本和图片生成的 AI 提供者。视频生成始终使用 Google GenAI。
                </p>
              </div>
            </div>
          </section>

          {/* Google AI 模型配置 */}
          <section className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-lg font-semibold mb-4 border-b pb-2">Google GenAI 模型</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  文本模型
                </label>
                <input
                  type="text"
                  value={formData.googleTextModel || ''}
                  onChange={e => updateField('googleTextModel', e.target.value)}
                  placeholder="gemini-2.5-flash"
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 border p-2"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  图片模型
                </label>
                <input
                  type="text"
                  value={formData.googleImageModel || ''}
                  onChange={e => updateField('googleImageModel', e.target.value)}
                  placeholder="gemini-3-pro-image-preview"
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 border p-2"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  视频模型
                </label>
                <input
                  type="text"
                  value={formData.googleVideoModel || ''}
                  onChange={e => updateField('googleVideoModel', e.target.value)}
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
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  文本模型
                </label>
                <input
                  type="text"
                  value={formData.openaiTextModel || ''}
                  onChange={e => updateField('openaiTextModel', e.target.value)}
                  placeholder="gpt-4o"
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 border p-2"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  图片模型
                </label>
                <input
                  type="text"
                  value={formData.openaiImageModel || ''}
                  onChange={e => updateField('openaiImageModel', e.target.value)}
                  placeholder="gpt-image-1"
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
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  每日 Token 限制
                </label>
                <input
                  type="number"
                  value={formData.dailyTokenLimit || 100000}
                  onChange={e => updateField('dailyTokenLimit', parseInt(e.target.value) || 100000)}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 border p-2"
                />
                <p className="text-xs text-gray-500 mt-1">
                  普通用户每日可使用的 AI Token 上限
                </p>
              </div>
            </div>
          </section>

          {/* 白名单配置 */}
          <section className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-lg font-semibold mb-4 border-b pb-2">访问控制</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  视频生成白名单
                </label>
                <textarea
                  value={(formData.videoWhitelist || []).join('\n')}
                  onChange={e => updateField('videoWhitelist', e.target.value.split('\n').map(s => s.trim()).filter(Boolean))}
                  placeholder="每行一个邮箱地址"
                  rows={4}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 border p-2"
                />
                <p className="text-xs text-gray-500 mt-1">
                  只有白名单中的用户才能使用视频生成功能
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  管理员用户 ID
                </label>
                <textarea
                  value={(formData.adminUserIds || []).join('\n')}
                  onChange={e => updateField('adminUserIds', e.target.value.split('\n').map(s => s.trim()).filter(Boolean))}
                  placeholder="每行一个用户 ID"
                  rows={4}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 border p-2"
                />
                <p className="text-xs text-gray-500 mt-1">
                  管理员用户不受 Token 限制
                </p>
              </div>
            </div>
          </section>

          {/* 保存按钮 */}
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={saveMutation.isPending}
              className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
            >
              <Save size={18} />
              {saveMutation.isPending ? '保存中...' : '保存配置'}
            </button>
          </div>

          {saveMutation.isSuccess && (
            <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded">
              配置已保存
            </div>
          )}

          {saveMutation.isError && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              保存失败，请重试
            </div>
          )}
        </form>
      </div>
    </div>
  );
}
