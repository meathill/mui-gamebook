'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { authClient } from '@/lib/auth-client';
import Button from '@/components/Button';
import {
  buildAntigravityConfig,
  buildClaudeCodeCommand,
  buildGenericMcpConfig,
  buildOpenCodeConfig,
  MCP_ENDPOINT,
} from '@/lib/skills/setup';

interface ApiKeyRow {
  id: string;
  name: string | null;
  start: string | null;
  prefix: string | null;
  enabled: boolean;
  expiresAt: Date | string | null;
  lastRequest: Date | string | null;
  createdAt: Date | string;
  metadata?: Record<string, unknown> | string | null;
}

interface McpExample {
  id: string;
  label: string;
  paths: string;
  code: string;
}

function formatDate(value: Date | string | null | undefined): string {
  if (!value) return '—';
  const date = typeof value === 'string' ? new Date(value) : value;
  return date.toLocaleString('zh-CN');
}

function readTail(metadata: ApiKeyRow['metadata']): string | null {
  if (!metadata) return null;
  if (typeof metadata === 'string') {
    try {
      const parsed: unknown = JSON.parse(metadata);
      if (parsed && typeof parsed === 'object' && 'tail' in parsed) {
        const tail = (parsed as { tail?: unknown }).tail;
        return typeof tail === 'string' ? tail : null;
      }
    } catch {
      return null;
    }
    return null;
  }
  const tail = metadata.tail;
  return typeof tail === 'string' ? tail : null;
}

function formatKeyLabel(item: ApiKeyRow): string {
  const head = item.start || item.prefix || 'mgb_';
  const tail = readTail(item.metadata);
  return tail ? `${head}…${tail}` : `${head}…`;
}

const EXPIRY_OPTIONS = [
  { value: '0', label: '不过期（推荐）', seconds: 0 },
  { value: '30', label: '30 天', seconds: 60 * 60 * 24 * 30 },
  { value: '90', label: '90 天', seconds: 60 * 60 * 24 * 90 },
  { value: '365', label: '365 天', seconds: 60 * 60 * 24 * 365 },
] as const;

export default function ApiKeysPage() {
  const [keys, setKeys] = useState<ApiKeyRow[]>([]);
  const [name, setName] = useState('mui-gamebook-mcp');
  const [expiry, setExpiry] = useState<string>('0');
  const [newKey, setNewKey] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [exampleId, setExampleId] = useState('generic');
  const [copiedExample, setCopiedExample] = useState(false);

  const examples = useMemo<McpExample[]>(() => {
    const key = newKey || '<YOUR_API_KEY>';
    return [
      {
        id: 'generic',
        label: '通用 mcpServers',
        paths: 'Claude Code · Cursor · Windsurf · 多数支持 HTTP 的 MCP 客户端',
        code: buildGenericMcpConfig(key),
      },
      {
        id: 'claude',
        label: 'Claude Code',
        paths: '终端命令，或写入项目 .mcp.json 的 mcpServers',
        code: buildClaudeCodeCommand(key),
      },
      {
        id: 'mimo',
        label: 'MiMoCode',
        paths: '项目 .mimocode/mimocode.jsonc → mcp 节',
        code: buildGenericMcpConfig(key).replace('"url"', '"type": "remote", "url"'),
      },
      {
        id: 'opencode',
        label: 'OpenCode',
        paths: '项目 opencode.json 或 ~/.config/opencode/opencode.json',
        code: buildOpenCodeConfig(key),
      },
      {
        id: 'antigravity',
        label: 'Antigravity',
        paths: '~/.gemini/config/mcp_config.json 或工作区 .agents/mcp_config.json',
        code: buildAntigravityConfig(key),
      },
    ];
  }, [newKey]);

  const activeExample = examples.find((e) => e.id === exampleId) ?? examples[0];

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
    const expirySeconds = EXPIRY_OPTIONS.find((o) => o.value === expiry)?.seconds ?? 0;
    const createPayload: Parameters<typeof authClient.apiKey.create>[0] = {
      name: name.trim(),
      metadata: {},
    };
    // 默认不过期；仅在用户显式选择时限时传 expiresIn
    if (expirySeconds > 0) createPayload.expiresIn = expirySeconds;
    const { data, error: createError } = await authClient.apiKey.create(createPayload);
    if (!createError && data?.key) {
      const tail = data.key.slice(-6);
      await authClient.apiKey.update({
        keyId: data.id,
        metadata: { tail },
      });
    }
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

  async function handleCopyExample() {
    await navigator.clipboard.writeText(activeExample.code);
    setCopiedExample(true);
    window.setTimeout(() => setCopiedExample(false), 2000);
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-gray-900">API 密钥</h1>
        <p className="mt-1 text-sm text-gray-500">
          供本地 AI Agent / MCP 客户端调用 <code className="bg-gray-100 px-1 rounded">{MCP_ENDPOINT}</code>
          。密钥绑定你的账号，只能管理你的游戏，可随时吊销。
        </p>
      </header>

      {error ? <div className="rounded-lg bg-red-50 text-red-700 px-4 py-3 text-sm">{error}</div> : null}

      {newKey ? (
        <div className="rounded-xl border border-green-200 bg-green-50 p-4 space-y-3">
          <p className="text-sm font-medium text-green-800">密钥已创建，请立即复制（只显示这一次）：</p>
          <code className="block break-all bg-white border border-green-200 rounded px-3 py-2 text-sm">{newKey}</code>
          <div className="flex flex-wrap gap-2">
            <Button
              size="md"
              color="green"
              onClick={handleCopy}>
              {copied ? '已复制 Bearer' : '复制 Bearer 头'}
            </Button>
            <Button
              size="md"
              color="gray"
              variant="soft"
              onClick={() => setNewKey(null)}>
              我已保存
            </Button>
          </div>
        </div>
      ) : null}

      <section className="rounded-xl border border-gray-200 bg-white p-4 space-y-3">
        <h2 className="font-semibold text-gray-900">创建密钥</h2>
        <div className="flex flex-wrap items-stretch gap-2">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="密钥名称，如 mui-gamebook-mcp"
            className="flex-1 min-w-[200px] h-10 rounded-lg border border-gray-300 px-3 text-sm"
          />
          <select
            value={expiry}
            onChange={(e) => setExpiry(e.target.value)}
            className="h-10 rounded-lg border border-gray-300 px-3 text-sm text-gray-700 bg-white">
            {EXPIRY_OPTIONS.map((opt) => (
              <option
                key={opt.value}
                value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <Button
            size="lg"
            color="blue"
            onClick={handleCreate}
            disabled={submitting}>
            {submitting ? '创建中…' : '创建'}
          </Button>
        </div>
        <p className="text-xs text-gray-500">默认不过期。创建后请立即保存完整密钥，列表只会显示前缀与末尾 6 位。</p>
      </section>

      <section className="rounded-xl border border-gray-200 bg-white p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="font-semibold text-gray-900">MCP 接入范例</h2>
            <p className="text-xs text-gray-500">把 &lt;YOUR_API_KEY&gt; 换成你的密钥（新密钥会自动填入）</p>
          </div>
          <Button
            size="sm"
            color="gray"
            variant="soft"
            onClick={handleCopyExample}>
            {copiedExample ? '已复制' : '复制配置'}
          </Button>
        </div>
        <div className="flex flex-wrap gap-2">
          {examples.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setExampleId(item.id)}
              className={`rounded-full px-3 py-1.5 text-xs transition-colors ${
                item.id === exampleId ? 'bg-violet-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}>
              {item.label}
            </button>
          ))}
        </div>
        <p className="text-xs text-gray-500">{activeExample.paths}</p>
        <pre className="overflow-x-auto rounded-lg bg-gray-900 text-gray-100 px-3 py-3 text-xs leading-relaxed">
          <code>{activeExample.code}</code>
        </pre>
      </section>

      <section className="rounded-xl border border-gray-200 bg-white overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left text-gray-500">
            <tr>
              <th className="px-4 py-3">名称</th>
              <th className="px-4 py-3">密钥</th>
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
                  <td className="px-4 py-3 font-mono text-xs text-gray-600">{formatKeyLabel(item)}</td>
                  <td className="px-4 py-3 text-gray-600">{formatDate(item.createdAt)}</td>
                  <td className="px-4 py-3 text-gray-600">{formatDate(item.lastRequest)}</td>
                  <td className="px-4 py-3 text-gray-600">{item.expiresAt ? formatDate(item.expiresAt) : '不过期'}</td>
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
                      variant="solid"
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
