import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import CookieConsent from './CookieConsent';

describe('CookieConsent', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('未做过选择时显示横幅', () => {
    render(<CookieConsent />);

    expect(screen.getByText('接受')).toBeInTheDocument();
    expect(screen.getByText('拒绝')).toBeInTheDocument();
  });

  it('已经接受过时不显示横幅', () => {
    localStorage.setItem('analytics_consent', 'accepted');

    render(<CookieConsent />);

    expect(screen.queryByText('接受')).not.toBeInTheDocument();
  });

  it('已经拒绝过时不显示横幅', () => {
    localStorage.setItem('analytics_consent', 'declined');

    render(<CookieConsent />);

    expect(screen.queryByText('接受')).not.toBeInTheDocument();
  });

  it('点击接受写入 accepted 并隐藏横幅', () => {
    render(<CookieConsent />);

    fireEvent.click(screen.getByText('接受'));

    expect(localStorage.getItem('analytics_consent')).toBe('accepted');
    expect(screen.queryByText('接受')).not.toBeInTheDocument();
  });

  it('点击拒绝写入 declined 并隐藏横幅', () => {
    render(<CookieConsent />);

    fireEvent.click(screen.getByText('拒绝'));

    expect(localStorage.getItem('analytics_consent')).toBe('declined');
    expect(screen.queryByText('拒绝')).not.toBeInTheDocument();
  });
});
