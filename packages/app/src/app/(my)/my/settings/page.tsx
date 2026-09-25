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

interface ModalityPreference {
  provider: string;
  model: string;
}

interface AiSettingsResponse {
  isPaid: boolean;
  preference: ModalityPreference | null;
  preferences: Record<'text' | 'image' | 'tts' | 'video', ModalityPreference | null>;
  providers: string[];
  services: { image: boolean; tts: boolean; music: boolean; video: boolean };
  systemDefaultProvider: string;
  systemDefaultModel: string;
  systemDefaults: Record<'text' | 'image' | 'tts' | 'video', ModalityPreference>;
  presets: Record<string, TextModelPreset[]>;
  modalityPresets: {
    image: Record<string, TextModelPreset[]>;
    tts: Record<string, TextModelPreset[]>;
    video: Record<string, TextModelPreset[]>;
  };
  modalityProviders: Record<string, string[]>;
}

type Modality = 'text' | 'image' | 'tts' | 'video';

const MODALITY_META: Record<Modality, { title: string; hint: string; lockedHint: string }> = {
  text: {
    title: '文本模型',
    hint: 'OpenAI / Gemini / MiMo / Claude 走原厂通道；其它文本模型请选择 OpenCode 并填写模型 ID。',
    lockedHint: '写故事、对话助手使用的模型',
  },
  image: {
    title: '图片模型',
    hint: '角色立绘、场景插画与封面生图使用的模型。',
    lockedHint: '生图使用的模型',
  },
  tts: {
    title: '语音合成模型',
    hint: '角色对白、旁白与音色试听使用的模型（音色另在编辑器里选）。',
    lockedHint: '语音合成使用的模型',
  },
  video: {
    title: '视频模型',
    hint: '场景视频与动画生成使用的模型。',
    lockedHint: '视频生成使用的模型',
  },
};

const PROVIDER_HINTS: Record<string, string> = {
  openai: '走 OpenAI 原厂',
  google: '走 Google 原厂',
  mimo: '走 MiMo 原厂',
  anthropic: '走 Anthropic 原厂（Claude）',
  opencode: '走 OpenCode 聚合网关',
};

function ModalitySection({
  modality,
  data,
  locked,
  lockedReason,
}: {
  modality: Modality;
  data: AiSettingsResponse;
  locked: boolean;
  lockedReason?: string;
}) {
  const queryClient = useQueryClient();
  const meta = MODALITY_META[modality];
  const sysDefault = data.systemDefaults[modality];
  const saved = data.preferences[modality];
  const providerOptions = modality === 'text' ? data.providers : (data.modalityProviders[modality] ?? []);
  const presetsByProvider =
    modality === 'text' ? data.presets : (data.modalityPresets[modality] ?? ({} as Record<string, TextModelPreset[]>));

  const [provider, setProvider] = useState(saved?.provider ?? sysDefault.provider);
  const [model, setModel] = useState(saved?.model ?? sysDefault.model);
  const [customMode, setCustomMode] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    const p = saved?.provider ?? sysDefault.provider;
    const m = saved?.model ?? sysDefault.model;
    setProvider(p);
    setModel(m);
    setCustomMode(!(presetsByProvider[p] ?? []).some((item) => item.value === m));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [saved?.provider, saved?.model, sysDefault.provider, sysDefault.model]);

  const presetOptions = useMemo(() => presetsByProvider[provider] ?? [], [presetsByProvider, provider]);
  const isCustomValue = useMemo(
    () => (model ? !presetOptions.some((item) => item.value === model) : presetOptions.length === 0),
    [model, presetOptions],
  );
  const showCustomInput = customMode || isCustomValue;

  useEffect(() => {
    if (isCustomValue) setCustomMode(true);
  }, [isCustomValue]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/user/ai-settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ modality, provider, model: model.trim() }),
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
        body: JSON.stringify({ modality, provider: null }),
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

  if (locked) {
    return (
      <section className="bg-white rounded-lg shadow p-6">
        <h2 className="text-base font-semibold text-gray-900 mb-1">{meta.title}</h2>
        <p className="text-sm text-gray-500 mb-4">
          {lockedReason ?? `当前无权自选，${meta.lockedHint}锁定为系统默认（${sysDefault.model}）。`}
        </p>
        <div className="grid gap-3 text-sm text-gray-600">
          <label className="block">
            <span className="block text-xs font-medium text-gray-500 mb-1">供应商（锁定）</span>
            <input
              disabled
              value={(AI_PROVIDER_LABELS as Record<string, string>)[sysDefault.provider] ?? sysDefault.provider}
              className="w-full rounded-md border border-gray-200 bg-gray-100 px-3 py-2 text-gray-500"
            />
          </label>
          <label className="block">
            <span className="block text-xs font-medium text-gray-500 mb-1">模型（锁定）</span>
            <input
              disabled
              value={sysDefault.model}
              className="w-full rounded-md border border-gray-200 bg-gray-100 px-3 py-2 text-gray-500"
            />
          </label>
        </div>
      </section>
    );
  }

  return (
    <section className="bg-white rounded-lg shadow p-6">
      <h2 className="text-base font-semibold text-gray-900 mb-1">{meta.title}</h2>
      <p className="text-sm text-gray-500 mb-5">{meta.hint}</p>

      <div className="space-y-5">
        <div>
          <span className="block text-sm font-medium text-gray-700 mb-2">供应商</span>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {providerOptions.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => {
                  setProvider(item);
                  const presets = presetsByProvider[item] ?? [];
                  setModel(presets[0]?.value ?? '');
                  setCustomMode(presets.length === 0);
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
            htmlFor={`ai-model-${modality}`}
            className="block text-sm font-medium text-gray-700 mb-1">
            模型
          </label>
          {presetOptions.length > 0 ? (
            <select
              id={`ai-model-${modality}`}
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
          ) : (
            <p className="text-xs text-gray-500 mb-1">该供应商暂无预设，请手动输入模型 ID。</p>
          )}
          {showCustomInput && (
            <input
              value={model}
              onChange={(e) => {
                setModel(e.target.value);
                setSaveError(null);
              }}
              placeholder="手动输入模型 ID，以官方文档为准"
              className="mt-2 w-full rounded-md border border-gray-300 px-3 py-2 text-sm font-mono focus:border-blue-500 focus:ring-blue-500 outline-none"
            />
          )}
          <p className="text-xs text-gray-500 mt-1">1-128 字符，仅允许字母数字及 . _ - / :，保存后即刻对新任务生效。</p>
        </div>

        {saveError && <p className="text-sm text-red-600">{saveError}</p>}
        {saveMutation.isSuccess && !saveError && (
          <p className="text-sm text-green-700">已保存，新发起的任务将使用该模型。</p>
        )}

        <div className="flex items-center gap-3">
          <button
            type="button"
            disabled={saveMutation.isPending || !provider || !model.trim()}
            onClick={() => saveMutation.mutate()}
            className="rounded-md bg-blue-600 px-5 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50">
            {saveMutation.isPending ? '保存中...' : '保存'}
          </button>
          {saved && (
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
  );
}

export default function SettingsPage() {
  const { data, isLoading, error } = useQuery<AiSettingsResponse>({
    queryKey: ['user', 'ai-settings'],
    queryFn: async () => {
      const res = await fetch('/api/user/ai-settings');
      if (!res.ok) throw new Error('获取设置失败');
      return res.json();
    },
  });

  if (isLoading) {
    return <div className="flex items-center justify-center h-64 text-gray-500">加载设置中...</div>;
  }
  if (error || !data) {
    return <div className="bg-red-50 text-red-600 p-4 rounded-lg">加载设置失败，请稍后重试。</div>;
  }

  return (
    <div>
      <header className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">设定</h1>
        <p className="text-gray-500 mt-1">选择各模态使用的 AI 供应商与模型</p>
      </header>

      {!data.isPaid && (
        <section className="bg-amber-50 border border-amber-200 rounded-lg p-5 mb-6">
          <p className="text-sm text-amber-800 font-medium">当前为免费档，AI 模型全部锁定为系统默认。</p>
          <p className="text-sm text-amber-700 mt-1">
            订阅 Pro / Pro+ 后可自选各模态的模型。
            <Link
              href="/pricing"
              className="ml-1 font-medium text-orange-600 hover:underline">
              查看套餐 →
            </Link>
          </p>
        </section>
      )}

      <div className="space-y-6">
        <ModalitySection
          modality="text"
          data={data}
          locked={!data.isPaid}
        />
        <ModalitySection
          modality="image"
          data={data}
          locked={!data.isPaid || !data.services.image}
          lockedReason={!data.services.image ? '当前账号无图片生成权限，锁定为系统默认。' : undefined}
        />
        <ModalitySection
          modality="tts"
          data={data}
          locked={!data.isPaid || !data.services.tts}
          lockedReason={!data.services.tts ? '当前账号无语音合成权限，锁定为系统默认。' : undefined}
        />
        <ModalitySection
          modality="video"
          data={data}
          locked={!data.isPaid || !data.services.video}
          lockedReason={!data.services.video ? '视频生成为 Pro+ 专属，当前账号无权限，锁定为系统默认。' : undefined}
        />
      </div>
    </div>
  );
}
