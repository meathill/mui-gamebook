import { getTranslations } from 'next-intl/server';
import { BookOpenIcon, WandSparklesIcon, GitBranchIcon, Share2Icon } from 'lucide-react';

const features = [
  { key: 'editor', Icon: BookOpenIcon },
  { key: 'aiAssistant', Icon: WandSparklesIcon },
  { key: 'interactive', Icon: GitBranchIcon },
  { key: 'publish', Icon: Share2Icon },
];

export default async function FeaturesSection() {
  const t = await getTranslations('home');

  return (
    <section className="py-16 bg-white">
      <div className="max-w-6xl mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900">{t('features.title')}</h2>
          <p className="mt-3 text-gray-600">{t('features.subtitle')}</p>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {features.map(({ key, Icon }) => (
            <div
              key={key}
              className="p-6 border border-gray-200 rounded-lg hover:border-gray-300 hover:shadow-sm transition-all">
              <Icon className="w-6 h-6 text-gray-900 mb-4" />
              <h3 className="text-base font-semibold text-gray-900 mb-2">{t(`features.${key}.title`)}</h3>
              <p className="text-sm text-gray-600 leading-relaxed">{t(`features.${key}.description`)}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
