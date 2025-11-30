import { Metadata } from 'next';
import Terms from './terms.mdx';

export const metadata: Metadata = {
  title: '服务条款',
  description: '姆伊游戏书服务条款 - 了解使用本平台的权利和责任。',
};

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto bg-white rounded-lg shadow-md p-8">
        <Terms />
      </div>
    </div>
  );
}
