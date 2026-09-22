'use client';

import { useCallback, useEffect, useState } from 'react';
import { authClient } from '@/lib/auth-client';
import Button from '@/components/Button';

interface ApiKeyRow {
  id: string;
  name: string | null;
  start: string | null;
  prefix: string | null;
  enabled: boolean;
  expiresAt: Date | string | null;
  lastRequest: Date | string | null;
  createdAt: Date | string;
}

function formatDate(value: Date | string | null | undefined): string {
  if (!value) return '—';
  const date = typeof value === 'string' ? new Date(value) : value;
  return date.toLocaleString('zh-CN');
}

export default function ApiKeysPage() {
  const [keys, setKeys] = useState<ApiKeyRow[]>([]);
  const [name, setName] = useState('mui-gamebook-mcp');
  const [newKey, setNewKey] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const loadKeys = useCallback(async () => {
    setLoading(true);
    const { data, error: listError } = await authClient.apiKey.list();
    if (listError) {
      setError(listError.message || '加载失败');
    } else {
      setKeys((data?.apiKeys as ApiKeyRow[]) || []);
      setError(null);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void loadKeys();
  }, [loadKeys]);

  async function handleCreate() {
    if (!name.trim()) {
      setError('请填写密钥名称');
      return;
    }
    setSubmitting(true);
    setError(null);
    const { data, error: createError } = await authClient.apiKey.create({
      name: name.trim(),
      expiresIn: 60 * 60 * 24 * 90,
    });
    setSubmitting(false);
    if (createError || !data?.key) {
      setError(createError?.message || '创建失败');
      return;
    }
    setNewKey(data.key);
    await loadKeys();
  }

  async function handleRevoke(id: string) {
    if (!window.confirm('确定吊销这把密钥？正在使用它的 Agent 会立刻失效。')) return;
    setError(null);
    const { error: deleteError } = await authClient.apiKey.delete({ keyId: id });
    if (deleteError) {
      setError(deleteError.message || '删除失败');
      return;
    }
    await loadKeys();
  }

  async function handleCopy() {
    if (!newKey) return;
    await navigator.clipboard.writeText(`Bearer ${newKey}`);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-gray-900">API 密钥</h1>
        <p className="mt-1 text-sm text-gray-500">
          供本地 AI Agent / MCP 使用。密钥绑定你的账号，只能管理你的游戏；可随时吊销。填入{' '}
          <code className="bg-gray-100 px-1 rounded">.mimocode/mimocode.jsonc</code> 的{' '}
          <code className="bg-gray-100 px-1 rounded">Authorization: Bearer …</code>。
        </p>
      </header>

      {error ? <div className="rounded-lg bg-red-50 text-red-700 px-4 py-3 text-sm">{error}</div> : null}

      {newKey ? (
        <div className="rounded-xl border border-green-200 bg-green-50 p-4 space-y-3">
          <p className="text-sm font-medium text-green-800">密钥已创建，请立即复制（只显示这一次）：</p>
          <code className="block break-all bg-white border border-green-200 rounded px-3 py-2 text-sm">{newKey}</code>
          <div className="flex gap-2">
            <Button
              size="sm"
              color="green"
              onClick={handleCopy}>
              {copied ? '已复制 Bearer' : '复制 Bearer 头'}
            </Button>
            <Button
              size="sm"
              color="gray"
              variant="ghost"
              onClick={() => setNewKey(null)}>
              我已保存
            </Button>
          </div>
        </div>
      ) : null}

      <section className="rounded-xl border border-gray-200 bg-white p-4 space-y-3">
        <h2 className="font-semibold text-gray-900">创建密钥</h2>
        <div className="flex flex-wrap gap-2">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="密钥名称，如 mui-gamebook-mcp"
            className="flex-1 min-w-[200px] rounded-lg border border-gray-300 px-3 py-2 text-sm"
          />
          <Button
            size="sm"
            color="blue"
            onClick={handleCreate}
            disabled={submitting}>
            {submitting ? '创建中…' : '创建'}
          </Button>
        </div>
        <p className="text-xs text-gray-500">默认 90 天过期。创建后请立即保存完整密钥。</p>
      </section>

      <section className="rounded-xl border border-gray-200 bg-white overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left text-gray-500">
            <tr>
              <th className="px-4 py-3">名称</th>
              <th className="px-4 py-3">前缀</th>
              <th className="px-4 py-3">创建时间</th>
              <th className="px-4 py-3">最近使用</th>
              <th className="px-4 py-3">过期</th>
              <th className="px-4 py-3">状态</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td
                  colSpan={7}
                  className="px-4 py-8 text-center text-gray-400">
                  加载中…
                </td>
              </tr>
            ) : keys.length === 0 ? (
              <tr>
                <td
                  colSpan={7}
                  className="px-4 py-8 text-center text-gray-400">
                  暂无密钥
                </td>
              </tr>
            ) : (
              keys.map((item) => (
                <tr
                  key={item.id}
                  className="border-t border-gray-100">
                  <td className="px-4 py-3 font-medium text-gray-900">{item.name || '未命名'}</td>
                  <td className="px-4 py-3 font-mono text-xs text-gray-600">{item.start || item.prefix || '…'}</td>
                  <td className="px-4 py-3 text-gray-600">{formatDate(item.createdAt)}</td>
                  <td className="px-4 py-3 text-gray-600">{formatDate(item.lastRequest)}</td>
                  <td className="px-4 py-3 text-gray-600">{formatDate(item.expiresAt)}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-xs ${
                        item.enabled ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                      }`}>
                      {item.enabled ? '启用' : '停用'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Button
                      size="sm"
                      color="red"
                      variant="ghost"
                      onClick={() => handleRevoke(item.id)}>
                      吊销
                    </Button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </section>
    </div>
  );
}
