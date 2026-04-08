import { getTranslations } from 'next-intl/server';
import {
  PenLineIcon,
  ImageIcon,
  LayoutTemplateIcon,
  LockIcon,
  PackageIcon,
  MessageCircleHeartIcon,
} from 'lucide-react';

const highlights = [
  { key: 'focus', Icon: PenLineIcon },
  { key: 'aiMedia', Icon: ImageIcon },
  { key: 'templates', Icon: LayoutTemplateIcon },
  { key: 'private', Icon: LockIcon },
  { key: 'export', Icon: PackageIcon },
  { key: 'openDev', Icon: MessageCircleHeartIcon },
];

export default async function HighlightsSection() {
  const t = await getTranslations('home');

  return (
    <section className="py-16 bg-gray-50 border-y border-gray-200">
      <div className="max-w-6xl mx-auto px-4">
        <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 text-center mb-12">{t('highlights.title')}</h2>

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {highlights.map(({ key, Icon }) => (
            <div
              key={key}
              className="p-6 bg-white border border-gray-200 rounded-lg">
              <Icon className="w-5 h-5 text-gray-900 mb-3" />
              <h3 className="text-base font-semibold text-gray-900 mb-2">{t(`highlights.${key}.title`)}</h3>
              <p className="text-sm text-gray-600 leading-relaxed">{t(`highlights.${key}.description`)}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
