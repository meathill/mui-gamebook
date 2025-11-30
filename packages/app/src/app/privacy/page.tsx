import { Metadata } from 'next';
import Privacy from './privacy.mdx';

export const metadata: Metadata = {
  title: '隐私政策',
  description: '姆伊游戏书隐私政策 - 了解我们如何收集、使用和保护您的个人信息。',
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto bg-white rounded-lg shadow-md p-8">
        <Privacy />
      </div>
    </div>
  );
}
