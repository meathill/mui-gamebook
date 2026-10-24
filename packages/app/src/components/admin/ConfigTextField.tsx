import type { ReactNode } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface ConfigTextFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  hint?: ReactNode;
}

/**
 * 管理后台配置页的通用文本字段（label + input + 说明文字）
 */
export function ConfigTextField({ label, value, onChange, placeholder, hint }: ConfigTextFieldProps) {
  return (
    <div>
      <Label className="mb-1 text-gray-700">{label}</Label>
      <Input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
      />
      {hint && <p className="text-xs text-gray-500 mt-1">{hint}</p>}
    </div>
  );
}
