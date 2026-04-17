'use client';

import { useState } from 'react';
import type { RuntimeState, VariableMeta } from '@mui-gamebook/parser/src/types';
import { ChevronLeft, ChevronRight, Gauge } from 'lucide-react';

interface FloatingVariablePanelProps {
  variables: { key: string; meta: VariableMeta }[];
  runtimeState: RuntimeState;
}

function renderRow(key: string, meta: VariableMeta, value: RuntimeState[string]) {
  const label = meta.label || key;
  const display = meta.display || 'value';

  if (display === 'progress') {
    const max = meta.max || 100;
    const pct = Math.max(0, Math.min(100, (Number(value) / max) * 100));
    const color = pct < 30 ? 'bg-red-400' : pct < 60 ? 'bg-yellow-400' : 'bg-green-400';
    return (
      <div className="space-y-1">
        <div className="flex items-center justify-between text-xs">
          <span className="text-white/80">{label}</span>
          <span className="text-white/60 tabular-nums">
            {value}/{max}
          </span>
        </div>
        <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
          <div
            className={`h-full transition-all duration-300 ${color}`}
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>
    );
  }

  if (display === 'icon') {
    const active = Boolean(value);
    return (
      <div className="flex items-center gap-2">
        <span className={`text-base ${active ? 'opacity-100' : 'opacity-30 grayscale'}`}>{meta.icon || '❤️'}</span>
        <span className="text-xs text-white/80">{label}</span>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between gap-2 text-xs">
      <span className="text-white/70">{label}</span>
      <span className="font-medium text-white tabular-nums">{String(value)}</span>
    </div>
  );
}

/**
 * 沉浸模式变量侧栏：
 * - 桌面 (md+)：固定左侧，悬浮，半透明深色背景，可折叠
 * - 移动 (<md)：左边缘一个小按钮，点开抽屉
 */
export default function FloatingVariablePanel({ variables, runtimeState }: FloatingVariablePanelProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  if (variables.length === 0) return null;

  const body = (
    <div className="space-y-3">
      {variables.map(({ key, meta }) => (
        <div key={key}>{renderRow(key, meta, runtimeState[key])}</div>
      ))}
    </div>
  );

  return (
    <>
      {/* 桌面端 */}
      <div className="hidden md:block fixed left-4 top-1/2 -translate-y-1/2 z-30">
        {collapsed ? (
          <button
            onClick={() => setCollapsed(false)}
            className="w-10 h-10 rounded-full bg-black/50 backdrop-blur-md text-white/90 flex items-center justify-center ring-1 ring-white/10 hover:bg-black/70 transition"
            aria-label="展开变量面板">
            <ChevronRight size={18} />
          </button>
        ) : (
          <div className="w-56 bg-black/50 backdrop-blur-md ring-1 ring-white/10 rounded-xl p-4 text-white shadow-xl">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-white/60">
                <Gauge size={14} />
                变量
              </div>
              <button
                onClick={() => setCollapsed(true)}
                className="text-white/60 hover:text-white/90"
                aria-label="折叠">
                <ChevronLeft size={16} />
              </button>
            </div>
            {body}
          </div>
        )}
      </div>

      {/* 移动端按钮 */}
      <button
        onClick={() => setMobileOpen(true)}
        className="md:hidden fixed left-2 top-1/2 -translate-y-1/2 z-30 w-9 h-9 rounded-full bg-black/60 backdrop-blur-md text-white flex items-center justify-center ring-1 ring-white/10"
        aria-label="查看变量">
        <Gauge size={16} />
      </button>

      {/* 移动端抽屉 */}
      {mobileOpen && (
        <div
          className="md:hidden fixed inset-0 z-40 bg-black/60"
          onClick={() => setMobileOpen(false)}>
          <div
            className="absolute left-0 top-0 bottom-0 w-64 bg-zinc-900/95 backdrop-blur-md text-white p-5 shadow-2xl"
            onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <div className="text-sm uppercase tracking-wider text-white/70 flex items-center gap-2">
                <Gauge size={14} /> 变量
              </div>
              <button
                onClick={() => setMobileOpen(false)}
                className="text-white/60 hover:text-white"
                aria-label="关闭">
                ×
              </button>
            </div>
            {body}
          </div>
        </div>
      )}
    </>
  );
}
