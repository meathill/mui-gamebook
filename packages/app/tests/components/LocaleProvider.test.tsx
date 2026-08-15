import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { useTranslations } from 'next-intl';
import LocaleProvider from '@/i18n/locale-provider';
import { useLocale } from '@/i18n/client';

const zhMessages = {
  footer: { privacy: '隐私政策' },
};

function Probe() {
  const t = useTranslations('footer');
  const { setLocale } = useLocale();
  return (
    <div>
      <span>{t('privacy')}</span>
      <button
        type="button"
        onClick={() => setLocale('en')}>
        en
      </button>
    </div>
  );
}

describe('LocaleProvider', () => {
  it('客户端切语言时更新文案，不依赖 router.refresh', async () => {
    render(
      <LocaleProvider
        initialLocale="zh"
        initialMessages={zhMessages}>
        <Probe />
      </LocaleProvider>,
    );

    expect(screen.getByText('隐私政策')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'en' }));

    await waitFor(() => {
      expect(screen.getByText('Privacy Policy')).toBeInTheDocument();
    });
    expect(document.cookie).toContain('locale=en');
  });
});
