import { useId, type ReactNode } from 'react';

export const FIELD_CLASS =
  'w-full min-w-0 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100 disabled:bg-gray-100';

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
    className: FIELD_CLASS,
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
        <textarea
          {...props}
          rows={3}
        />
      ) : (
        <input {...props} />
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
      <select
        id={id}
        className={FIELD_CLASS}
        value={value}
        required={required}
        onChange={(event) => onChange(event.target.value)}>
        {children}
      </select>
    </label>
  );
}
