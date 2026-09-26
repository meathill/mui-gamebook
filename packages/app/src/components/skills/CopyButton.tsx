'use client';

import { useState } from 'react';
import { CheckIcon, CopyIcon } from '@phosphor-icons/react';

interface CopyButtonProps {
  text: string;
  copyLabel: string;
  copiedLabel: string;
  variant?: 'primary' | 'secondary';
}

export default function CopyButton({ text, copyLabel, copiedLabel, variant = 'secondary' }: CopyButtonProps) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // clipboard API 不可用时降级：建临时 textarea 选中复制
      const el = document.createElement('textarea');
      el.value = text;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const style =
    variant === 'primary'
      ? 'bg-stone-900 text-white hover:bg-stone-700'
      : 'bg-white text-stone-900 border border-stone-200 hover:bg-stone-50';

  return (
    <button
      type="button"
      onClick={handleCopy}
      className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-bold transition-colors ${style}`}>
      {copied ? <CheckIcon className="w-4 h-4" /> : <CopyIcon className="w-4 h-4" />}
      {copied ? copiedLabel : copyLabel}
    </button>
  );
}
