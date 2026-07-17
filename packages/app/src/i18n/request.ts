import { getRequestConfig } from 'next-intl/server';
import { cookies, headers } from 'next/headers';
import { defaultLocale, locales, type Locale } from './config';

export default getRequestConfig(async () => {
  // 优先从 cookie 获取语言设置
  const cookieStore = await cookies();
  let locale = cookieStore.get('locale')?.value as Locale | undefined;

  // 如果 cookie 中没有，则从 Accept-Language header 获取
  if (!locale || !locales.includes(locale)) {
    const headersList = await headers();
    const acceptLanguage = headersList.get('accept-language');

    if (!acceptLanguage) {
      // 没有任何语言信号（搜索引擎爬虫、curl 等）：用站点默认语言，
      // 保证爬虫抓到的正文和中文 meta/关键词一致（issue #5）
      locale = defaultLocale;
    } else if (acceptLanguage.includes('zh')) {
      locale = 'zh';
    } else {
      locale = 'en';
    }
  }

  return {
    locale,
    messages: (await import(`./messages/${locale}.json`)).default,
  };
});
