'use client';

import { useState } from 'react';
import CopyButton from '@/components/skills/CopyButton';
import type { McpClient } from '@/lib/skills/setup';

interface SetupConfigTabsProps {
  clients: { id: McpClient; label: string; filePaths: string[]; config: string; note: string }[];
  copyLabel: string;
  copiedLabel: string;
}

export default function SetupConfigTabs({ clients, copyLabel, copiedLabel }: SetupConfigTabsProps) {
  const [active, setActive] = useState<McpClient>(clients[0].id);
  const current = clients.find((c) => c.id === active) ?? clients[0];

  return (
    <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden">
      <div className="flex border-b border-stone-200">
        {clients.map((client) => (
          <button
            key={client.id}
            type="button"
            onClick={() => setActive(client.id)}
            className={`flex-1 px-4 py-3 text-sm font-bold transition-colors ${
              client.id === active
                ? 'bg-stone-900 text-white'
                : 'bg-stone-50 text-stone-500 hover:bg-stone-100 hover:text-stone-800'
            }`}>
            {client.label}
          </button>
        ))}
      </div>
      <div className="p-6">
        <ul className="text-sm text-stone-600 mb-4 space-y-1">
          {current.filePaths.map((path) => (
            <li key={path}>
              <code className="bg-stone-100 px-1.5 py-0.5 rounded text-xs">{path}</code>
            </li>
          ))}
        </ul>
        <pre className="bg-stone-900 text-stone-100 text-xs leading-relaxed p-4 rounded-xl overflow-x-auto mb-4">
          {current.config}
        </pre>
        <p className="text-sm text-stone-500 mb-4">{current.note}</p>
        <CopyButton
          text={current.config}
          copyLabel={copyLabel}
          copiedLabel={copiedLabel}
        />
      </div>
    </div>
  );
}
