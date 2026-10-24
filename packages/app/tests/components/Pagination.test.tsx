import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import Pagination from '@/components/Pagination';

describe('Pagination', () => {
  it('第 1 页链到基路径，第 2 页链到 /p/2', () => {
    render(
      <Pagination
        currentPage={2}
        totalPages={3}
        basePath="/games"
      />,
    );

    expect(screen.getByRole('link', { name: '1' })).toHaveAttribute('href', '/games');
    expect(screen.getByRole('link', { name: '2' })).toHaveAttribute('href', '/games/p/2');
    expect(screen.getByRole('link', { name: '3' })).toHaveAttribute('href', '/games/p/3');
    expect(screen.getByLabelText('上一页')).toHaveAttribute('href', '/games');
    expect(screen.getByLabelText('下一页')).toHaveAttribute('href', '/games/p/3');
  });

  it('第 1 页时上一页禁用，最后一页时下一页禁用', () => {
    render(
      <Pagination
        currentPage={1}
        totalPages={2}
        basePath="/games"
      />,
    );

    expect(screen.getByText('上一页').closest('a')).toHaveClass('pointer-events-none');
    expect(screen.getByText('下一页').closest('a')).toHaveAttribute('href', '/games/p/2');
  });
});
