import type { RuntimeState, VariableMeta } from '@roudanio/parser/src/types';

interface VariableIndicatorProps {
  varKey: string;
  meta: VariableMeta;
  currentValue: RuntimeState[string] | undefined;
}

export default function VariableIndicator({ varKey, meta, currentValue }: VariableIndicatorProps) {
  const label = meta.label || varKey;
  const display = meta.display || 'value';

  if (display === 'progress') {
    const max = meta.max || 100;
    const val = typeof currentValue === 'number' ? currentValue : Number(currentValue) || 0;
    const percentage = Math.max(0, Math.min(100, (val / max) * 100));
    return (
      <div className="w-full min-w-0 space-y-1 sm:w-48">
        <div className="flex items-center justify-between gap-2 text-xs">
          <span
            className="text-gray-600 truncate"
            title={label}>
            {label}
          </span>
          <span className="shrink-0 font-medium tabular-nums">
            {val}/{max}
          </span>
        </div>
        <div
          role="progressbar"
          aria-label={label}
          aria-valuemin={0}
          aria-valuemax={max}
          aria-valuenow={Math.max(0, Math.min(max, val))}
          className="h-1.5 rounded-full bg-gray-200 overflow-hidden">
          <div
            className={`h-full rounded-full transition-[width] duration-200 motion-reduce:transition-none ${percentage < 30 ? 'bg-red-500' : percentage < 60 ? 'bg-yellow-500' : 'bg-green-500'}`}
            style={{ width: `${percentage}%` }}
          />
        </div>
      </div>
    );
  }

  if (display === 'icon') {
    const isActive = Boolean(currentValue);
    const icon = meta.icon || '❤️';
    return (
      <div className="flex items-center gap-1.5 text-xs py-0.5 w-full sm:w-auto">
        <span className={`text-base ${isActive ? 'opacity-100' : 'opacity-30 grayscale'}`}>{icon}</span>
        <span className="text-gray-600 truncate">{label}</span>
      </div>
    );
  }

  // value display
  return (
    <div className="flex items-center gap-1.5 text-xs py-0.5 w-full sm:w-auto">
      <span className="text-gray-600">{label}:</span>
      <span className="font-semibold text-gray-900">{currentValue !== undefined ? String(currentValue) : '-'}</span>
    </div>
  );
}
