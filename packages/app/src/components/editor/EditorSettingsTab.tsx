import { useState, useEffect } from 'react';
import type { Game } from '@mui-gamebook/parser/src/types';
import MDEditor from '@uiw/react-md-editor';
import { X, Loader2, Shield, ExternalLink } from 'lucide-react';
import { useDialog } from '@/components/Dialog';
import MediaAssetItem from './MediaAssetItem';

interface IpStatus {
  registered: boolean;
  ipId?: string;
  txHash?: string;
  tokenId?: string;
  registeredAt?: string;
  explorerUrl?: string;
}

interface Props {
  game: Game;
  id: string;
  onChange: (updatedGame: Game) => void;
  onSlugChange: (newSlug: string) => void;
  slug: string;
}

export default function EditorSettingsTab({ game, id, onChange, onSlugChange, slug }: Props) {
  const [ipStatus, setIpStatus] = useState<IpStatus | null>(null);
  const [registeringIp, setRegisteringIp] = useState(false);
  const [loadingIpStatus, setLoadingIpStatus] = useState(true);
  const dialog = useDialog();

  useEffect(() => {
    async function fetchIpStatus() {
      try {
        const res = await fetch(`/api/cms/games/${id}/register-ip`);
        if (res.ok) {
          const data = (await res.json()) as IpStatus;
          setIpStatus(data);
        }
      } catch (e) {
        console.error('获取 IP 状态失败:', e);
      } finally {
        setLoadingIpStatus(false);
      }
    }
    fetchIpStatus();
  }, [id]);

  async function handleRegisterIp() {
    const confirmed = await dialog.confirm(
      '注册 IP 将把您的作品记录在 Story Protocol 区块链上，这个操作不可撤销。确定要继续吗？',
    );
    if (!confirmed) return;

    setRegisteringIp(true);
    try {
      const res = await fetch(`/api/cms/games/${id}/register-ip`, { method: 'POST' });
      const data = (await res.json()) as {
        success?: boolean;
        ipId?: string;
        explorerUrl?: string;
        error?: string;
      };
      if (res.ok && data.success) {
        await dialog.success('IP 注册成功！您的作品已被记录在区块链上。');
        setIpStatus({ registered: true, ipId: data.ipId, explorerUrl: data.explorerUrl });
      } else {
        await dialog.error(data.error || 'IP 注册失败');
      }
    } catch (e) {
      await dialog.error('IP 注册失败：' + (e as Error).message);
    } finally {
      setRegisteringIp(false);
    }
  }

  function handleChange(field: string, value: string | boolean | Record<string, unknown>) {
    onChange({ ...game, [field]: value });
  }

  function handleTagsChange(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      e.preventDefault();
      const val = e.currentTarget.value.trim();
      if (val && !game.tags?.includes(val)) {
        onChange({ ...game, tags: [...(game.tags || []), val] });
        e.currentTarget.value = '';
      }
    }
  }

  function removeTag(tagToRemove: string) {
    onChange({ ...game, tags: (game.tags || []).filter((t) => t !== tagToRemove) });
  }

  return (
    <div className="p-6 max-w-5xl mx-auto bg-white rounded-lg shadow-sm border border-gray-200">
      <h2 className="text-xl font-bold text-gray-900 mb-8 pb-4 border-b">游戏配置</h2>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Meta */}
        <div className="lg:col-span-2 space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">标题</label>
              <input
                type="text"
                value={game.title}
                onChange={(e) => handleChange('title', e.target.value)}
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 border p-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Slug</label>
              <input
                type="text"
                value={slug}
                onChange={(e) => onSlugChange(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'))}
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 border p-2"
                placeholder="game-url-slug"
              />
              <p className="mt-1 text-xs text-gray-500">URL 路径标识，仅支持小写字母、数字和连字符</p>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">描述</label>
            <textarea
              value={game.description || ''}
              onChange={(e) => handleChange('description', e.target.value)}
              rows={3}
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 border p-2 resize-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">标签</label>
            <div className="flex flex-wrap gap-2 p-2 border border-gray-300 rounded-md bg-white">
              {(game.tags || []).map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-blue-100 text-blue-800">
                  {tag}
                  <button
                    onClick={() => removeTag(tag)}
                    className="ml-1 text-blue-600 hover:text-blue-900">
                    <X size={12} />
                  </button>
                </span>
              ))}
              <input
                type="text"
                placeholder="输入后按回车..."
                onKeyDown={handleTagsChange}
                className="flex-1 outline-none text-sm min-w-[80px]"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">背景故事</label>
            <div data-color-mode="light">
              <MDEditor
                value={game.backgroundStory || ''}
                onChange={(val) => handleChange('backgroundStory', val || '')}
                height={300}
                preview="edit"
              />
            </div>
          </div>
        </div>

        {/* Right Column: Cover & Publish */}
        <div className="space-y-6">
          <MediaAssetItem
            asset={{
              type: 'ai_image',
              url: game.cover_image,
              prompt: game.cover_prompt || '',
              aspectRatio: game.cover_aspect_ratio,
            }}
            gameId={id}
            variant="featured"
            showDelete={false}
            aiStylePrompt={game.ai?.style?.image}
            onAssetChange={(field, value) => {
              if (field === 'url') handleChange('cover_image', value);
              else if (field === 'prompt') handleChange('cover_prompt', value);
              else if (field === 'aspectRatio') handleChange('cover_aspect_ratio', value);
            }}
          />

          <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
            <h3 className="text-sm font-medium text-gray-900 mb-3">发布状态</h3>
            <label className="flex items-center gap-3 cursor-pointer">
              <div className="relative">
                <input
                  type="checkbox"
                  className="sr-only peer"
                  checked={game.published || false}
                  onChange={(e) => handleChange('published', e.target.checked)}
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
              </div>
              <span className={`text-sm font-medium ${game.published ? 'text-green-700' : 'text-gray-500'}`}>
                {game.published ? '已发布' : '草稿'}
              </span>
            </label>
            <p className="text-xs text-gray-500 mt-2">已发布的游戏会在首页对所有人可见。</p>
          </div>

          {/* AI Style Config */}
          <div className="p-4 bg-blue-50 rounded-lg border border-blue-100 space-y-3">
            <h3 className="text-sm font-medium text-blue-900">AI 风格（作用于全篇故事）</h3>
            <div>
              <label className="block text-xs text-blue-700 mb-1">图片风格</label>
              <textarea
                value={game.ai?.style?.image || ''}
                onChange={(e) => handleChange('ai', { ...game.ai, style: { ...game.ai.style, image: e.target.value } })}
                placeholder="全局艺术风格提示词（如：水彩画风，奇幻风格）..."
                className="w-full p-2 text-sm border border-blue-200 rounded h-16 resize-none"
              />
            </div>
            <div>
              <label className="block text-xs text-blue-700 mb-1">TTS 语言风格</label>
              <textarea
                value={game.ai?.style?.tts || ''}
                onChange={(e) => handleChange('ai', { ...game.ai, style: { ...game.ai.style, tts: e.target.value } })}
                placeholder="语音朗读风格（如：用讲童话故事的语气，语速适中，温柔亲切）..."
                className="w-full p-2 text-sm border border-blue-200 rounded h-16 resize-none"
              />
            </div>
          </div>

          {/* IP 注册 - Story Protocol */}
          <div className="p-4 bg-gradient-to-br from-purple-50 to-indigo-50 rounded-lg border border-purple-200">
            <h3 className="text-sm font-medium text-purple-900 mb-2 flex items-center gap-2">
              <Shield size={16} />
              IP 版权保护
            </h3>
            {loadingIpStatus ? (
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <Loader2
                  size={14}
                  className="animate-spin"
                />
                加载中...
              </div>
            ) : ipStatus?.registered ? (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                    已注册
                  </span>
                </div>
                <p className="text-xs text-gray-600 break-all">IP ID: {ipStatus.ipId}</p>
                <a
                  href={ipStatus.explorerUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-purple-600 hover:text-purple-800">
                  在区块链浏览器查看 <ExternalLink size={12} />
                </a>
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-xs text-gray-600">
                  通过 Story Protocol 将您的作品注册为 IP Asset，在区块链上永久记录您的版权。
                </p>
                <button
                  onClick={handleRegisterIp}
                  disabled={registeringIp}
                  className="w-full py-2 bg-purple-600 text-white rounded text-sm font-medium hover:bg-purple-700 disabled:opacity-50 flex justify-center items-center gap-2">
                  {registeringIp ? (
                    <>
                      <Loader2
                        size={14}
                        className="animate-spin"
                      />
                      注册中...
                    </>
                  ) : (
                    <>
                      <Shield size={14} />
                      注册 IP 版权
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
