import { Metadata } from 'next';
import { privacyMetadata } from '@/lib/legal-metadata';
import Privacy from './privacy.mdx';

export const metadata: Metadata = {
  ...privacyMetadata,
  alternates: { canonical: '/privacy' },
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
