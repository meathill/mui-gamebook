'use client';

import { useRef, useEffect } from 'react';
import { CheckIcon, XIcon } from '@phosphor-icons/react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { NativeSelect } from '@/components/ui/native-select';

/**
 * 场景元数据卡片的通用表单组件
 */

export function FormField({
  label,
  value,
  onChange,
  multiline,
  autoFocus,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  multiline?: boolean;
  autoFocus?: boolean;
}) {
  const ref = useRef<HTMLTextAreaElement | HTMLInputElement>(null);
  useEffect(() => {
    if (autoFocus) ref.current?.focus();
  }, [autoFocus]);

  return (
    <div className="smc-field">
      <label className="smc-field-label">{label}</label>
      {multiline ? (
        <Textarea
          ref={ref as React.RefObject<HTMLTextAreaElement>}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={2}
        />
      ) : (
        <Input
          ref={ref as React.RefObject<HTMLInputElement>}
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      )}
    </div>
  );
}

export function SelectField({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <div className="smc-field">
      <label className="smc-field-label">{label}</label>
      <NativeSelect
        value={value}
        onChange={(e) => onChange(e.target.value)}>
        {options.map((o) => (
          <option
            key={o.value}
            value={o.value}>
            {o.label}
          </option>
        ))}
      </NativeSelect>
    </div>
  );
}

export function FormActions({ onSave, onCancel }: { onSave: () => void; onCancel: () => void }) {
  return (
    <div className="smc-form-actions">
      <button
        type="button"
        className="smc-btn smc-btn-primary"
        onClick={onSave}>
        <CheckIcon size={12} />
        保存
      </button>
      <button
        type="button"
        className="smc-btn smc-btn-ghost"
        onClick={onCancel}>
        <XIcon size={12} />
        取消
      </button>
    </div>
  );
}
