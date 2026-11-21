import Script from 'next/script';

/**
 * Microsoft Clarity 行为分析（热力图 / 会话回放），与 GoogleAnalytics 同策略：
 * 未配置 NEXT_PUBLIC_CLARITY_ID（本地未生成 .env 等）时不渲染。
 * Clarity 自动采集点击、滚动、路由变化，无需埋点；id 本就是公开值，走构建期替换。
 * 使用官方 snippet 而非直接引 src：它先注册 window.clarity 队列，
 * 保证脚本加载完成前的 clarity() 调用（如 identify）不丢失。
 */
export default function Clarity() {
  const clarityId = process.env.NEXT_PUBLIC_CLARITY_ID;
  if (!clarityId) return null;

  return (
    <Script
      id="microsoft-clarity"
      strategy="afterInteractive"
      dangerouslySetInnerHTML={{
        __html: `(function(c,l,a,r,i,t,y){c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);})(window, document, "clarity", "script", "${clarityId}");`,
      }}
    />
  );
}
