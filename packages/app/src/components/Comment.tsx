'use client';

import { useEffect, useRef } from 'react';

type Props = {
  postId: string;
};

const SITE_ID = process.env.NEXT_PUBLIC_AWESOME_COMMENT_SITE_ID;
// awesomecomment.org 的 Turnstile 站点密钥（公开值）；传入后未登录用户可通过人机验证匿名评论
const TURNSTILE_SITE_KEY = '0x4AAAAAAEaTL6EjMBTPYdSS';

const CSS_URL = 'https://unpkg.com/@roudanio/awesome-comment@0.12.1/dist/style.css';
const CSS_STYLE_ID = 'awesome-comment-style';
// 组件自带 .ac-textarea 宽度是 clamp(3rem,20rem,100%)，固定约 20rem；改为占满容器
const COMMENT_CSS_OVERRIDES = `
#comment .awesome-comment { color-scheme: light; }
#comment .awesome-comment .ac-textarea { width: 100%; }
#comment .awesome-comment textarea { width: 100%; resize: vertical; }
`;

export default function Comment({ postId }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const initializedRef = useRef(false);

  async function loadAndInit() {
    // 动态加载 CSS。站点没有暗色模式：拉取样式文本后把 prefers-color-scheme:dark 媒体查询改成永不匹配，
    // 让组件始终用浅色主题（组件的暗色规则散落在 daisyUI 变量和 dark: 工具类里，逐条覆盖不可靠）
    if (!document.getElementById(CSS_STYLE_ID)) {
      const style = document.createElement('style');
      style.id = CSS_STYLE_ID;
      document.head.appendChild(style);
      try {
        const css = await fetch(CSS_URL).then((res) => res.text());
        style.textContent =
          css.replace(/prefers-color-scheme:\s*dark/g, 'prefers-color-scheme:no-dark') + COMMENT_CSS_OVERRIDES;
      } catch (error) {
        console.error('Failed to load Awesome Comment styles:', error);
      }
    }

    try {
      // 使用 ESM 动态导入
      const [authModule, commentModule] = await Promise.all([
        import(/* webpackIgnore: true */ 'https://unpkg.com/@roudanio/awesome-auth@0.1.5/dist/awesome-auth.js'),
        import(/* webpackIgnore: true */ 'https://unpkg.com/@roudanio/awesome-comment@0.12.1/dist/awesome-comment.js'),
      ]);

      const auth = authModule.getInstance({
        googleId: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID as string,
        root: 'https://awesomecomment.org/api/site/auth',
        prefix: 'acSaas',
      });

      if (containerRef.current) {
        commentModule.default.init(containerRef.current, {
          postId,
          siteId: SITE_ID as string,
          apiUrl: 'https://awesomecomment.org',
          awesomeAuth: auth,
          turnstileSiteKey: TURNSTILE_SITE_KEY,
          locale: navigator.language,
        });
      }
    } catch (error) {
      console.error('Failed to load Awesome Comment:', error);
    }
  }

  useEffect(() => {
    if (initializedRef.current || !containerRef.current) return;

    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) {
        observer.disconnect();
        initializedRef.current = true;
        loadAndInit();
      }
    });
    observer.observe(containerRef.current);

    return () => observer.disconnect();
  }, [postId]);

  return (
    <div
      id="comment"
      data-theme="light"
      ref={containerRef}
      className="mt-8 w-full min-h-50"
    />
  );
}
