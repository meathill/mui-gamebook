import { getRequestConfig } from 'next-intl/server';
import { defaultLocale } from './config';

export default getRequestConfig(async () => {
  // 服务端固定默认语言，避免 cookies()/headers() 把整站钉成动态渲染（issue #15）。
  // 爬虫与 ISR 首屏都是中文，和 issue #5 口径一致；英文切换只在客户端进行。
  return {
    locale: defaultLocale,
    messages: (await import(`./messages/${defaultLocale}.json`)).default,
  };
});
