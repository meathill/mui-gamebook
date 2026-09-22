import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

const push = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push }),
}));

import PricingClient from '@/components/pricing/PricingClient';

describe('PricingClient', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('默认选中年付，并展示推荐年付', () => {
    render(<PricingClient isAuthenticated />);

    expect(screen.getByRole('button', { name: '年付 · 省 17%' })).toHaveAttribute(
      'class',
      expect.stringContaining('bg-stone-900'),
    );
    expect(screen.getAllByText('推荐年付').length).toBeGreaterThan(0);
    expect(screen.getAllByText(/\/ 年/).length).toBeGreaterThan(0);
  });

  it('未登录点订阅跳转登录页', () => {
    render(<PricingClient isAuthenticated={false} />);

    fireEvent.click(screen.getAllByRole('button', { name: '立即订阅' })[0]);
    expect(push).toHaveBeenCalledWith('/sign-in?redirect=/pricing');
  });

  it('可切回月付', () => {
    render(<PricingClient isAuthenticated />);
    fireEvent.click(screen.getByRole('button', { name: '月付' }));
    expect(screen.getAllByText(/\/ 月/).length).toBeGreaterThan(0);
  });
});
