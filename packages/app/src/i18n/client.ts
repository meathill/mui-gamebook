'use client';

import { createContext, useContext } from 'react';
import { locales, type Locale } from './config';

type LocaleContextValue = {
  setLocale: (locale: Locale) => void;
  isPending: boolean;
  locales: typeof locales;
};

export const LocaleContext = createContext<LocaleContextValue | null>(null);

export function useLocale() {
  const ctx = useContext(LocaleContext);
  if (!ctx) {
    throw new Error('useLocale 必须在 LocaleProvider 内使用');
  }
  return ctx;
}
