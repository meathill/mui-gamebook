import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { CaretLeftIcon, CaretRightIcon, DotsThreeIcon } from '@phosphor-icons/react';

import { cn } from '@/lib';
import { buttonVariants } from '@/components/ui/button';

function Pagination({ className, ...props }: React.ComponentProps<'nav'>) {
  return (
    <nav
      role="navigation"
      aria-label="分页"
      data-slot="pagination"
      className={cn('mx-auto flex w-full justify-center', className)}
      {...props}
    />
  );
}

function PaginationContent({ className, ...props }: React.ComponentProps<'ul'>) {
  return (
    <ul
      data-slot="pagination-content"
      className={cn('flex flex-row items-center gap-1', className)}
      {...props}
    />
  );
}

function PaginationItem({ ...props }: React.ComponentProps<'li'>) {
  return (
    <li
      data-slot="pagination-item"
      {...props}
    />
  );
}

type PaginationLinkProps = {
  isActive?: boolean;
  size?: 'default' | 'sm' | 'lg' | 'icon';
  asChild?: boolean;
} & React.ComponentProps<'a'>;

function PaginationLink({ className, isActive, size = 'icon', asChild = false, ...props }: PaginationLinkProps) {
  const Comp = asChild ? Slot : 'a';

  return (
    <Comp
      aria-current={isActive ? 'page' : undefined}
      data-slot="pagination-link"
      data-active={isActive}
      className={cn(
        buttonVariants({
          variant: isActive ? 'outline' : 'ghost',
          size,
        }),
        'cursor-pointer aria-[current=page]:border-ring aria-[current=page]:bg-primary aria-[current=page]:text-primary-foreground',
        className,
      )}
      {...props}
    />
  );
}

function PaginationPrevious({ className, ...props }: React.ComponentProps<typeof PaginationLink>) {
  return (
    <PaginationLink
      aria-label="上一页"
      size="default"
      className={cn('gap-1 px-2.5 sm:pl-2.5', className)}
      {...props}>
      <CaretLeftIcon />
      <span className="hidden sm:block">上一页</span>
    </PaginationLink>
  );
}

function PaginationNext({ className, ...props }: React.ComponentProps<typeof PaginationLink>) {
  return (
    <PaginationLink
      aria-label="下一页"
      size="default"
      className={cn('gap-1 px-2.5 sm:pr-2.5', className)}
      {...props}>
      <span className="hidden sm:block">下一页</span>
      <CaretRightIcon />
    </PaginationLink>
  );
}

function PaginationEllipsis({ className, ...props }: React.ComponentProps<'span'>) {
  return (
    <span
      aria-hidden
      data-slot="pagination-ellipsis"
      className={cn('flex size-9 items-center justify-center', className)}
      {...props}>
      <DotsThreeIcon className="size-4" />
      <span className="sr-only">更多页</span>
    </span>
  );
}

export {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
};
