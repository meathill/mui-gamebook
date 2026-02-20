'use client';

import { useEffect, useRef } from 'react';

type Props = {
  postId: string;
};

const SITE_ID = process.env.NEXT_PUBLIC_AWESOME_COMMENT_SITE_ID;

export default function Comment({ postId }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const initializedRef = useRef(false);

  async function loadAndInit() {
    // 动态加载 CSS
    const cssUrl = 'https://unpkg.com/@roudanio/awesome-comment@0.10.5/dist/style.css';
    if (!document.querySelector(`link[href="${cssUrl}"]`)) {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = cssUrl;
      document.head.appendChild(link);
    }

    try {
      // 使用 ESM 动态导入
      const [authModule, commentModule] = await Promise.all([
        import(/* webpackIgnore: true */ 'https://unpkg.com/@roudanio/awesome-auth@0.1.5/dist/awesome-auth.js'),
        import(/* webpackIgnore: true */ 'https://unpkg.com/@roudanio/awesome-comment@0.10.5/dist/awesome-comment.js'),
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
      ref={containerRef}
      className="mt-8 px-4 sm:px-0 min-h-50"
    />
  );
}
