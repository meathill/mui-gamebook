'use client';

import { useState } from 'react';
import CopyButton from '@/components/skills/CopyButton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { McpClient } from '@/lib/skills/setup';

interface SetupConfigTabsProps {
  clients: { id: McpClient; label: string; filePaths: string[]; config: string; note: string }[];
  copyLabel: string;
  copiedLabel: string;
}

export default function SetupConfigTabs({ clients, copyLabel, copiedLabel }: SetupConfigTabsProps) {
  const [active, setActive] = useState<McpClient>(clients[0].id);

  return (
    <div className="overflow-hidden rounded-2xl border border-stone-200 bg-white">
      <Tabs
        value={active}
        onValueChange={(value) => setActive(value as McpClient)}>
        <TabsList className="h-auto w-full rounded-none border-b border-stone-200 bg-stone-50 p-0">
          {clients.map((client) => (
            <TabsTrigger
              key={client.id}
              value={client.id}
              className="h-auto flex-1 flex-none rounded-none px-4 py-3 text-sm font-bold data-[state=active]:bg-stone-900 data-[state=active]:text-white">
              {client.label}
            </TabsTrigger>
          ))}
        </TabsList>
        {clients.map((client) => (
          <TabsContent
            key={client.id}
            value={client.id}
            className="p-6">
            <ul className="mb-4 space-y-1 text-sm text-stone-600">
              {client.filePaths.map((path) => (
                <li key={path}>
                  <code className="rounded bg-stone-100 px-1.5 py-0.5 text-xs">{path}</code>
                </li>
              ))}
            </ul>
            <pre className="mb-4 overflow-x-auto rounded-xl bg-stone-900 p-4 text-xs leading-relaxed text-stone-100">
              {client.config}
            </pre>
            <p className="mb-4 text-sm text-stone-500">{client.note}</p>
            <CopyButton
              text={client.config}
              copyLabel={copyLabel}
              copiedLabel={copiedLabel}
            />
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
