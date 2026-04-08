'use client';

import { useState, useMemo, useCallback } from 'react';
import yaml from 'js-yaml';
import {
  BookOpenIcon,
  TagIcon,
  DatabaseIcon,
  PencilIcon,
  CheckIcon,
  XIcon,
  ChevronDownIcon,
  ChevronUpIcon,
} from 'lucide-react';

interface GameMeta {
  title?: string;
  description?: string;
  backgroundStory?: string;
  tags?: string[];
  cover_image?: string;
  cover_prompt?: string;
  published?: boolean;
  state?: Record<string, unknown>;
  ai?: Record<string, unknown>;
  [key: string]: unknown;
}

interface GameMetaCardProps {
  /** 原始 frontmatter 字符串（含 --- 包裹） */
  frontmatter: string;
  /** frontmatter 修改后回调 */
  onFrontmatterChange: (newFrontmatter: string) => void;
}

/** 解析 frontmatter YAML（去掉 --- 包裹） */
function parseFrontmatter(raw: string): GameMeta {
  const inner = raw.replace(/^---\n/, '').replace(/\n---\n?$/, '');
  if (!inner.trim()) return {};
  try {
    return (yaml.load(inner) as GameMeta) || {};
  } catch {
    return {};
  }
}

/** 序列化回 frontmatter 字符串（加 --- 包裹） */
function serializeFrontmatter(meta: GameMeta): string {
  const yamlStr = yaml.dump(meta, { indent: 2, lineWidth: -1, noRefs: true }).trim();
  return `---\n${yamlStr}\n---\n`;
}

type EditingField = 'title' | 'description' | 'tags' | null;

export default function GameMetaCard({ frontmatter, onFrontmatterChange }: GameMetaCardProps) {
  const meta = useMemo(() => parseFrontmatter(frontmatter), [frontmatter]);
  const [editing, setEditing] = useState<EditingField>(null);
  const [draft, setDraft] = useState('');
  const [collapsed, setCollapsed] = useState(false);

  const stateVarCount = meta.state ? Object.keys(meta.state).length : 0;
  const charCount =
    meta.ai && typeof meta.ai === 'object' && 'characters' in meta.ai
      ? Object.keys(meta.ai.characters as Record<string, unknown>).length
      : 0;

  function startEdit(field: EditingField) {
    if (!field) return;
    if (field === 'tags') {
      setDraft((meta.tags || []).join(', '));
    } else {
      setDraft((meta[field] as string) || '');
    }
    setEditing(field);
  }

  const saveEdit = useCallback(() => {
    if (!editing) return;
    const updated = { ...meta };
    if (editing === 'tags') {
      updated.tags = draft
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
    } else {
      (updated as Record<string, unknown>)[editing] = draft || undefined;
    }
    onFrontmatterChange(serializeFrontmatter(updated));
    setEditing(null);
  }, [editing, draft, meta, onFrontmatterChange]);

  if (!frontmatter.trim()) return null;

  return (
    <div className="game-meta-card">
      {/* 标题栏 */}
      <div className="game-meta-header">
        <div className="game-meta-header-left">
          <BookOpenIcon size={14} />
          <span className="game-meta-header-title">{meta.title || '未命名游戏'}</span>
          {meta.published && <span className="game-meta-badge game-meta-badge-green">已发布</span>}
        </div>
        <button
          type="button"
          className="game-meta-collapse"
          onClick={() => setCollapsed(!collapsed)}
          title={collapsed ? '展开' : '收起'}>
          {collapsed ? <ChevronDownIcon size={14} /> : <ChevronUpIcon size={14} />}
        </button>
      </div>

      {!collapsed && (
        <div className="game-meta-body">
          {/* 标题 */}
          <div className="game-meta-row">
            <span className="game-meta-label">标题</span>
            {editing === 'title' ? (
              <div className="game-meta-edit-row">
                <input
                  className="game-meta-input"
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  autoFocus
                  onKeyDown={(e) => e.key === 'Enter' && saveEdit()}
                />
                <button
                  type="button"
                  className="game-meta-icon-btn"
                  onClick={saveEdit}>
                  <CheckIcon size={12} />
                </button>
                <button
                  type="button"
                  className="game-meta-icon-btn"
                  onClick={() => setEditing(null)}>
                  <XIcon size={12} />
                </button>
              </div>
            ) : (
              <div className="game-meta-value-row">
                <span className="game-meta-value">{meta.title || '—'}</span>
                <button
                  type="button"
                  className="game-meta-icon-btn"
                  onClick={() => startEdit('title')}>
                  <PencilIcon size={11} />
                </button>
              </div>
            )}
          </div>

          {/* 简介 */}
          <div className="game-meta-row">
            <span className="game-meta-label">简介</span>
            {editing === 'description' ? (
              <div className="game-meta-edit-row">
                <textarea
                  className="game-meta-input game-meta-textarea"
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  autoFocus
                  rows={2}
                />
                <button
                  type="button"
                  className="game-meta-icon-btn"
                  onClick={saveEdit}>
                  <CheckIcon size={12} />
                </button>
                <button
                  type="button"
                  className="game-meta-icon-btn"
                  onClick={() => setEditing(null)}>
                  <XIcon size={12} />
                </button>
              </div>
            ) : (
              <div className="game-meta-value-row">
                <span className="game-meta-value game-meta-desc">{meta.description || '—'}</span>
                <button
                  type="button"
                  className="game-meta-icon-btn"
                  onClick={() => startEdit('description')}>
                  <PencilIcon size={11} />
                </button>
              </div>
            )}
          </div>

          {/* 标签 */}
          <div className="game-meta-row">
            <span className="game-meta-label">
              <TagIcon size={11} />
              标签
            </span>
            {editing === 'tags' ? (
              <div className="game-meta-edit-row">
                <input
                  className="game-meta-input"
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  autoFocus
                  placeholder="逗号分隔"
                  onKeyDown={(e) => e.key === 'Enter' && saveEdit()}
                />
                <button
                  type="button"
                  className="game-meta-icon-btn"
                  onClick={saveEdit}>
                  <CheckIcon size={12} />
                </button>
                <button
                  type="button"
                  className="game-meta-icon-btn"
                  onClick={() => setEditing(null)}>
                  <XIcon size={12} />
                </button>
              </div>
            ) : (
              <div className="game-meta-value-row">
                {meta.tags && meta.tags.length > 0 ? (
                  <div className="game-meta-tags">
                    {meta.tags.map((t) => (
                      <span
                        key={t}
                        className="game-meta-tag">
                        {t}
                      </span>
                    ))}
                  </div>
                ) : (
                  <span className="game-meta-value">—</span>
                )}
                <button
                  type="button"
                  className="game-meta-icon-btn"
                  onClick={() => startEdit('tags')}>
                  <PencilIcon size={11} />
                </button>
              </div>
            )}
          </div>

          {/* 统计信息 */}
          <div className="game-meta-stats">
            {stateVarCount > 0 && (
              <span className="game-meta-stat">
                <DatabaseIcon size={11} />
                {stateVarCount} 个变量
              </span>
            )}
            {charCount > 0 && <span className="game-meta-stat">{charCount} 个角色</span>}
          </div>
        </div>
      )}
    </div>
  );
}
