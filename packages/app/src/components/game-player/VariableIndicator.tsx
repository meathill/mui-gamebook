import type { RuntimeState, VariableMeta } from '@mui-gamebook/parser/src/types';

interface VariableIndicatorProps {
  varKey: string;
  meta: VariableMeta;
  currentValue: RuntimeState[string];
}

export default function VariableIndicator({ varKey, meta, currentValue }: VariableIndicatorProps) {
  const label = meta.label || varKey;
  const display = meta.display || 'value';

  if (display === 'progress') {
    const max = meta.max || 100;
    const percentage = Math.max(0, Math.min(100, (Number(currentValue) / max) * 100));
    return (
      <div className="flex items-center justify-between gap-1">
        <span className="text-xs text-gray-600 min-w-[60px]">{label}</span>
        <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden relative">
          <div
            className={`h-full transition-all duration-300 ${percentage < 30 ? 'bg-red-500' : percentage < 60 ? 'bg-yellow-500' : 'bg-green-500'}`}
            style={{ width: `${percentage}%` }}
          />
          <span className="text-xs text-gray-500 text-right absolute right-0">
            {currentValue}/{max}
          </span>
        </div>
      </div>
    );
  }

  if (display === 'icon') {
    const isActive = Boolean(currentValue);
    const icon = meta.icon || '❤️';
    return (
      <div className="flex items-center justify-between gap-1">
        <span className={`text-lg ${isActive ? 'opacity-100' : 'opacity-30 grayscale'}`}>{icon}</span>
        <span className="text-xs text-gray-600">{label}</span>
      </div>
    );
  }

  // value display
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-xs text-gray-600">{label}:</span>
      <span className="text-sm font-medium text-gray-900">{String(currentValue)}</span>
    </div>
  );
}
