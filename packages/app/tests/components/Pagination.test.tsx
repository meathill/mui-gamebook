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
    expect(screen.getByLabelText('Previous page')).toHaveAttribute('href', '/games');
    expect(screen.getByLabelText('Next page')).toHaveAttribute('href', '/games/p/3');
  });
});
