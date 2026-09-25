'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { AI_PROVIDER_LABELS } from '@/lib/editor/useAiPermissions';

interface TextModelPreset {
  value: string;
  label: string;
  description?: string;
}

interface AiSettingsResponse {
  isPaid: boolean;
  preference: { provider: string; model: string } | null;
  providers: string[];
  systemDefaultProvider: string;
  systemDefaultModel: string;
  presets: Record<string, TextModelPreset[]>;
}

const PROVIDER_HINTS: Record<string, string> = {
  openai: '走 OpenAI 原厂',
  google: '走 Google 原厂（Gemini）',
  mimo: '走 MiMo 原厂',
  anthropic: '走 Anthropic 原厂（Claude）',
  opencode: '走 OpenCode 聚合网关（其它文本模型填这里）',
};

export default function SettingsPage() {
  const queryClient = useQueryClient();
  const { data, isLoading, error } = useQuery<AiSettingsResponse>({
    queryKey: ['user', 'ai-settings'],
    queryFn: async () => {
      const res = await fetch('/api/user/ai-settings');
      if (!res.ok) throw new Error('获取设置失败');
      return res.json();
    },
  });

  const [provider, setProvider] = useState('');
  const [model, setModel] = useState('');
  const [customMode, setCustomMode] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    if (data) {
      const initialProvider = data.preference?.provider ?? data.systemDefaultProvider;
      const initialModel = data.preference?.model ?? data.systemDefaultModel;
      setProvider(initialProvider);
      setModel(initialModel);
      const presets = data.presets[initialProvider] ?? [];
      setCustomMode(!presets.some((item) => item.value === initialModel));
    }
  }, [data]);

  const presetOptions = useMemo(() => (provider ? (data?.presets[provider] ?? []) : []), [data, provider]);
  const isCustomValue = useMemo(
    () => (model ? !presetOptions.some((item) => item.value === model) : false),
    [model, presetOptions],
  );

  useEffect(() => {
    if (isCustomValue) setCustomMode(true);
  }, [isCustomValue]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/user/ai-settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider, model: model.trim() }),
      });
      const payload = (await res.json().catch(() => null)) as { error?: string } | null;
      if (!res.ok) throw new Error(payload?.error || '保存失败');
      return payload;
    },
    onSuccess: () => {
      setSaveError(null);
      void queryClient.invalidateQueries({ queryKey: ['user', 'ai-settings'] });
      void queryClient.invalidateQueries({ queryKey: ['cms-config'] });
    },
    onError: (e: Error) => setSaveError(e.message),
  });

  const resetMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/user/ai-settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider: null }),
      });
      if (!res.ok) throw new Error('重置失败');
    },
    onSuccess: () => {
      setSaveError(null);
      void queryClient.invalidateQueries({ queryKey: ['user', 'ai-settings'] });
      void queryClient.invalidateQueries({ queryKey: ['cms-config'] });
    },
    onError: (e: Error) => setSaveError(e.message),
  });

  if (isLoading) {
    return <div className="flex items-center justify-center h-64 text-gray-500">加载设置中...</div>;
  }
  if (error || !data) {
    return <div className="bg-red-50 text-red-600 p-4 rounded-lg">加载设置失败，请稍后重试。</div>;
  }

  const selectableProviders = data.providers.length > 0 ? data.providers : [data.systemDefaultProvider];
  const showCustomInput = customMode || isCustomValue;

  return (
    <div>
      <header className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">设定</h1>
        <p className="text-gray-500 mt-1">选择写故事、对话助手使用的 AI 模型</p>
      </header>

      {!data.isPaid ? (
        <section className="bg-amber-50 border border-amber-200 rounded-lg p-5 mb-6">
          <p className="text-sm text-amber-800 font-medium">
            当前为免费档，AI 模型锁定为系统默认（{data.systemDefaultModel}）。
          </p>
          <p className="text-sm text-amber-700 mt-1">
            订阅 Pro / Pro+ 后可自选全部供应商的模型。
            <Link
              href="/pricing"
              className="ml-1 font-medium text-orange-600 hover:underline">
              查看套餐 →
            </Link>
          </p>
          <div className="mt-4 grid gap-3 text-sm text-gray-600">
            <label className="block">
              <span className="block text-xs font-medium text-gray-500 mb-1">供应商（锁定）</span>
              <input
                disabled
                value={
                  (AI_PROVIDER_LABELS as Record<string, string>)[data.systemDefaultProvider] ??
                  data.systemDefaultProvider
                }
                className="w-full rounded-md border border-gray-200 bg-gray-100 px-3 py-2 text-gray-500"
              />
            </label>
            <label className="block">
              <span className="block text-xs font-medium text-gray-500 mb-1">模型（锁定）</span>
              <input
                disabled
                value={data.systemDefaultModel}
                className="w-full rounded-md border border-gray-200 bg-gray-100 px-3 py-2 text-gray-500"
              />
            </label>
          </div>
        </section>
      ) : (
        <section className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-base font-semibold text-gray-900 mb-1">文本模型</h2>
          <p className="text-sm text-gray-500 mb-5">
            OpenAI / Gemini / MiMo / Claude 走原厂通道；其它文本模型请选择 OpenCode 并填写模型 ID。
          </p>

          <div className="space-y-5">
            <div>
              <span className="block text-sm font-medium text-gray-700 mb-2">供应商</span>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {selectableProviders.map((item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => {
                      setProvider(item);
                      const presets = data.presets[item] ?? [];
                      setModel(presets[0]?.value ?? '');
                      setCustomMode(false);
                      setSaveError(null);
                    }}
                    className={`rounded-lg border px-3 py-2.5 text-left transition-colors ${
                      provider === item
                        ? 'border-blue-500 bg-blue-50 text-blue-800'
                        : 'border-gray-200 text-gray-700 hover:border-gray-300 hover:bg-gray-50'
                    }`}>
                    <span className="block text-sm font-medium">
                      {(AI_PROVIDER_LABELS as Record<string, string>)[item] ?? item}
                    </span>
                    <span className="block text-xs text-gray-500 mt-0.5">{PROVIDER_HINTS[item] ?? ''}</span>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label
                htmlFor="ai-model-preset"
                className="block text-sm font-medium text-gray-700 mb-1">
                模型
              </label>
              <select
                id="ai-model-preset"
                value={showCustomInput ? '__custom__' : model}
                onChange={(e) => {
                  if (e.target.value === '__custom__') {
                    setCustomMode(true);
                    return;
                  }
                  setCustomMode(false);
                  setModel(e.target.value);
                  setSaveError(null);
                }}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-blue-500 outline-none">
                {presetOptions.map((item) => (
                  <option
                    key={item.value}
                    value={item.value}>
                    {item.label}
                  </option>
                ))}
                <option value="__custom__">自定义输入…</option>
              </select>
              {showCustomInput && (
                <input
                  value={model}
                  onChange={(e) => {
                    setModel(e.target.value);
                    setSaveError(null);
                  }}
                  placeholder="手动输入模型 ID，以 opencode 官方文档为准"
                  className="mt-2 w-full rounded-md border border-gray-300 px-3 py-2 text-sm font-mono focus:border-blue-500 focus:ring-blue-500 outline-none"
                />
              )}
              <p className="text-xs text-gray-500 mt-1">
                1-128 字符，仅允许字母数字及 . _ - / :，保存后即刻对新对话生效。
              </p>
            </div>

            {saveError && <p className="text-sm text-red-600">{saveError}</p>}
            {saveMutation.isSuccess && !saveError && (
              <p className="text-sm text-green-700">已保存，新发起的生成与对话将使用该模型。</p>
            )}

            <div className="flex items-center gap-3">
              <button
                type="button"
                disabled={saveMutation.isPending || !provider || !model.trim()}
                onClick={() => saveMutation.mutate()}
                className="rounded-md bg-blue-600 px-5 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50">
                {saveMutation.isPending ? '保存中...' : '保存'}
              </button>
              {data.preference && (
                <button
                  type="button"
                  disabled={resetMutation.isPending}
                  onClick={() => resetMutation.mutate()}
                  className="rounded-md border border-gray-300 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-50">
                  恢复系统默认
                </button>
              )}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
