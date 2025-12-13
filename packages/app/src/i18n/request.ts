import { getRequestConfig } from 'next-intl/server';
import { cookies, headers } from 'next/headers';
import { locales, type Locale } from './config';

export default getRequestConfig(async () => {
  // 优先从 cookie 获取语言设置
  const cookieStore = await cookies();
  let locale = cookieStore.get('locale')?.value as Locale | undefined;

  // 如果 cookie 中没有，则从 Accept-Language header 获取
  if (!locale || !locales.includes(locale)) {
    const headersList = await headers();
    const acceptLanguage = headersList.get('accept-language') || '';
    
    // 简单解析 Accept-Language
    if (acceptLanguage.includes('zh')) {
      locale = 'zh';
    } else {
      locale = 'en';
    }
  }

  return {
    locale,
    messages: (await import(`./messages/${locale}.json`)).default
  };
});
