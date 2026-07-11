import { type ChangeEvent, useEffect, useRef, useState } from 'react';

const DEFAULT_TYPEWRITER_SPEED = 40;
const MIN_TYPEWRITER_SPEED = 10;
const MAX_TYPEWRITER_SPEED = 200;

interface Props {
  value?: number;
  onChange: (value: number) => void;
}

export default function TypewriterSpeedField({ value, onChange }: Props) {
  const committedValue = getCommittedValue(value);
  const [rawValue, setRawValue] = useState(String(committedValue));
  const lastCommittedValue = useRef(committedValue);
  const isEditing = useRef(false);

  useEffect(() => {
    lastCommittedValue.current = committedValue;
    if (!isEditing.current) {
      setRawValue(String(committedValue));
    }
  }, [committedValue]);

  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    const nextRawValue = event.target.value;
    setRawValue(nextRawValue);

    const nextValue = parseValue(nextRawValue);
    if (nextValue !== null && nextValue >= MIN_TYPEWRITER_SPEED && nextValue <= MAX_TYPEWRITER_SPEED) {
      lastCommittedValue.current = nextValue;
      onChange(nextValue);
    }
  }

  function handleBlur() {
    isEditing.current = false;
    const parsedValue = parseValue(rawValue);
    const nextValue =
      parsedValue === null
        ? lastCommittedValue.current
        : Math.min(MAX_TYPEWRITER_SPEED, Math.max(MIN_TYPEWRITER_SPEED, parsedValue));

    setRawValue(String(nextValue));
    if (nextValue !== lastCommittedValue.current) {
      lastCommittedValue.current = nextValue;
      onChange(nextValue);
    }
  }

  return (
    <input
      type="number"
      aria-label="逐字速度（毫秒/字）"
      min={MIN_TYPEWRITER_SPEED}
      max={MAX_TYPEWRITER_SPEED}
      step={5}
      value={rawValue}
      onFocus={() => {
        isEditing.current = true;
      }}
      onChange={handleChange}
      onBlur={handleBlur}
      className="block w-full rounded-md border-gray-300 border shadow-sm focus:border-amber-500 focus:ring-amber-500 p-2 text-sm"
    />
  );
}

function getCommittedValue(value: number | undefined): number {
  return Number.isFinite(value) ? (value as number) : DEFAULT_TYPEWRITER_SPEED;
}

function parseValue(rawValue: string): number | null {
  if (rawValue.trim() === '') return null;

  const value = Number(rawValue);
  return Number.isFinite(value) ? value : null;
}
