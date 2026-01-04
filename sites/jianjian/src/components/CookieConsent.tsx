'use client';

import { useState, useEffect } from 'react';

/**
 * GDPR Cookie 同意横幅
 * 告知用户统计数据收集并提供选择
 */
export default function CookieConsent() {
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    // 检查是否已经做出选择
    const consent = localStorage.getItem('analytics_consent');
    if (!consent) {
      setShowBanner(true);
    }
  }, []);

  function handleAccept() {
    localStorage.setItem('analytics_consent', 'accepted');
    setShowBanner(false);
  }

  function handleDecline() {
    localStorage.setItem('analytics_consent', 'declined');
    setShowBanner(false);
  }

  if (!showBanner) return null;

  return (
    <div className="fixed bottom-0 inset-x-0 z-50 p-4 bg-card-bg border-t-[3px] border-card-border shadow-lg">
      <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center gap-4">
        <div className="flex-1 text-center sm:text-left">
          <p className="text-sm text-foreground">
            🍪 我们使用匿名统计来改善您的体验。这些数据包括：您访问的页面、使用的设备类型和访问来源。 我们
            <strong>不会</strong>收集任何个人信息。
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={handleDecline}
            className="px-4 py-2 text-sm text-foreground/70 hover:text-foreground border border-card-border rounded-full hover:bg-gray-100 transition-colors">
            拒绝
          </button>
          <button
            onClick={handleAccept}
            className="px-4 py-2 text-sm bg-primary text-white rounded-full hover:bg-primary/90 transition-colors font-medium">
            接受
          </button>
        </div>
      </div>
    </div>
  );
}
