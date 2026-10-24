import { useId, type ReactNode } from 'react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { NativeSelect } from '@/components/ui/native-select';

export function TextField({
  label,
  value,
  onChange,
  multiline = false,
  required = false,
  disabled = false,
  hint,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  multiline?: boolean;
  required?: boolean;
  disabled?: boolean;
  hint?: string;
  placeholder?: string;
}) {
  const id = useId();
  const props = {
    id,
    value,
    onChange: (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => onChange(event.target.value),
    required,
    disabled,
    placeholder,
    'aria-describedby': hint ? id + '-hint' : undefined,
  };
  return (
    <div className="space-y-1.5">
      <label
        htmlFor={id}
        className="block text-sm font-medium text-gray-800">
        {label}
      </label>
      {multiline ? (
        <Textarea
          {...props}
          rows={3}
        />
      ) : (
        <Input {...props} />
      )}
      {hint && (
        <p
          id={id + '-hint'}
          className="text-xs leading-5 text-gray-500">
          {hint}
        </p>
      )}
    </div>
  );
}

export function SelectField({
  label,
  value,
  onChange,
  children,
  required = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  children: ReactNode;
  required?: boolean;
}) {
  const id = useId();
  return (
    <label
      htmlFor={id}
      className="block space-y-1.5 text-sm font-medium text-gray-800">
      <span>{label}</span>
      <NativeSelect
        id={id}
        value={value}
        required={required}
        onChange={(event) => onChange(event.target.value)}>
        {children}
      </NativeSelect>
    </label>
  );
}
