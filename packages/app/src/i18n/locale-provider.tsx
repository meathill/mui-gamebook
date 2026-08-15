'use client';

import { NextIntlClientProvider } from 'next-intl';
import { ReactNode, useCallback, useEffect, useMemo, useState } from 'react';
import { LocaleContext } from './client';
import { defaultLocale, locales, type Locale } from './config';

const messageLoaders: Record<Locale, () => Promise<{ default: Record<string, unknown> }>> = {
  zh: () => import('./messages/zh.json'),
  en: () => import('./messages/en.json'),
};

function readLocaleCookie(): Locale | null {
  const match = document.cookie.match(/(?:^|; )locale=([^;]*)/);
  const value = match?.[1];
  if (value && locales.includes(value as Locale)) {
    return value as Locale;
  }
  return null;
}

type LocaleProviderProps = {
  initialLocale: Locale;
  initialMessages: Record<string, unknown>;
  children: ReactNode;
};

export default function LocaleProvider({ initialLocale, initialMessages, children }: LocaleProviderProps) {
  const [locale, setLocaleState] = useState<Locale>(initialLocale);
  const [messages, setMessages] = useState(initialMessages);
  const [isPending, setIsPending] = useState(false);

  const applyLocale = useCallback(async (next: Locale) => {
    if (!locales.includes(next)) return;
    setIsPending(true);
    try {
      document.cookie = `locale=${next};path=/;max-age=31536000`;
      const loaded = await messageLoaders[next]();
      setLocaleState(next);
      setMessages(loaded.default);
      document.documentElement.lang = next;
    } finally {
      setIsPending(false);
    }
  }, []);

  useEffect(() => {
    const fromCookie = readLocaleCookie();
    if (fromCookie && fromCookie !== initialLocale) {
      void applyLocale(fromCookie);
    }
  }, [applyLocale, initialLocale]);

  const contextValue = useMemo(
    () => ({
      setLocale: (next: Locale) => {
        void applyLocale(next);
      },
      isPending,
      locales,
    }),
    [applyLocale, isPending],
  );

  return (
    <NextIntlClientProvider
      locale={locale}
      messages={messages}>
      <LocaleContext.Provider value={contextValue}>{children}</LocaleContext.Provider>
    </NextIntlClientProvider>
  );
}
