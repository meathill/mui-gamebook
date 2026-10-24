'use client';

import * as React from 'react';
import { CaretDownIcon } from '@phosphor-icons/react';

import { cn } from '@/lib';

/**
 * 样式化原生 select：保留原生行为（IME、移动端滚轮、表单语义），
 * 仅统一外观。不使用 radix Select，避免编辑器表单行为变化。
 */
function NativeSelect({ className, children, ...props }: React.ComponentProps<'select'>) {
  return (
    <div
      data-slot="native-select-wrapper"
      className="relative w-full has-[select:disabled]:opacity-50">
      <select
        data-slot="native-select"
        className={cn(
          'placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:ring-destructive/20 aria-invalid:border-destructive h-9 w-full appearance-none rounded-md border bg-transparent px-3 py-2 pr-9 text-sm transition-[color,box-shadow] outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed',
          className,
        )}
        {...props}>
        {children}
      </select>
      <CaretDownIcon
        aria-hidden
        className="text-muted-foreground pointer-events-none absolute top-1/2 right-3.5 size-4 -translate-y-1/2"
      />
    </div>
  );
}

export { NativeSelect };
