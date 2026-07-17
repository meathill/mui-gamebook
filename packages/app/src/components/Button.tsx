import type { ComponentPropsWithRef } from 'react';
import { cn } from '@/lib';

type ButtonVariant = 'solid' | 'soft' | 'ghost';
type ButtonColor = 'violet' | 'gray' | 'red' | 'orange' | 'blue' | 'green';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends Omit<ComponentPropsWithRef<'button'>, 'color'> {
  variant?: ButtonVariant;
  color?: ButtonColor;
  size?: ButtonSize;
  /** 图标按钮：正方形等宽高，去掉水平内边距 */
  iconOnly?: boolean;
}

const VARIANT_COLOR_CLASSES: Record<ButtonVariant, Record<ButtonColor, string>> = {
  solid: {
    violet: 'bg-violet-600 text-white hover:bg-violet-700',
    gray: 'bg-gray-700 text-white hover:bg-gray-800',
    red: 'bg-red-600 text-white hover:bg-red-700',
    orange: 'bg-orange-500 text-white hover:bg-orange-600',
    blue: 'bg-blue-600 text-white hover:bg-blue-700',
    green: 'bg-green-600 text-white hover:bg-green-700',
  },
  soft: {
    violet: 'bg-violet-100 text-violet-700 hover:bg-violet-200',
    gray: 'bg-gray-100 text-gray-700 hover:bg-gray-200',
    red: 'bg-red-100 text-red-700 hover:bg-red-200',
    orange: 'bg-orange-100 text-orange-700 hover:bg-orange-200',
    blue: 'bg-blue-100 text-blue-700 hover:bg-blue-200',
    green: 'bg-green-100 text-green-700 hover:bg-green-200',
  },
  // hover 用半透明底色，深色背景（沉浸模式）下同样可用
  ghost: {
    violet: 'text-violet-600 hover:bg-violet-500/10',
    gray: 'text-gray-600 hover:bg-gray-500/10',
    red: 'text-red-600 hover:bg-red-500/10',
    orange: 'text-orange-600 hover:bg-orange-500/10',
    blue: 'text-blue-600 hover:bg-blue-500/10',
    green: 'text-green-600 hover:bg-green-500/10',
  },
};

const SIZE_CLASSES: Record<ButtonSize, string> = {
  sm: 'h-6 px-2 text-xs gap-1 rounded',
  md: 'h-8 px-3 text-sm gap-1.5 rounded-md',
  lg: 'h-10 px-4 text-base gap-2 rounded-lg',
};

const ICON_SIZE_CLASSES: Record<ButtonSize, string> = {
  sm: 'size-6 rounded',
  md: 'size-8 rounded-md',
  lg: 'size-10 rounded-lg',
};

export default function Button({
  variant = 'solid',
  color = 'violet',
  size = 'md',
  iconOnly = false,
  className,
  type = 'button',
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cn(
        'inline-flex items-center justify-center font-medium whitespace-nowrap cursor-pointer transition-colors',
        'disabled:opacity-50 disabled:pointer-events-none',
        VARIANT_COLOR_CLASSES[variant][color],
        iconOnly ? ICON_SIZE_CLASSES[size] : SIZE_CLASSES[size],
        className,
      )}
      {...rest}
    />
  );
}
