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
      <div className="flex items-center gap-2">
        <span className="text-xs text-gray-600 min-w-[60px]">{label}</span>
        <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
          <div 
            className={`h-full transition-all duration-300 ${percentage < 30 ? 'bg-red-500' : percentage < 60 ? 'bg-yellow-500' : 'bg-green-500'}`}
            style={{ width: `${percentage}%` }}
          />
        </div>
        <span className="text-xs text-gray-500 min-w-[40px] text-right">{currentValue}/{max}</span>
      </div>
    );
  }

  if (display === 'icon') {
    const isActive = Boolean(currentValue);
    const icon = meta.icon || '❤️';
    return (
      <div className="flex items-center gap-1">
        <span className={`text-lg ${isActive ? 'opacity-100' : 'opacity-30 grayscale'}`}>{icon}</span>
        <span className="text-xs text-gray-600">{label}</span>
      </div>
    );
  }

  // value display
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-gray-600">{label}:</span>
      <span className="text-sm font-medium text-gray-900">{String(currentValue)}</span>
    </div>
  );
}
