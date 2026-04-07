import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { ArrowRightIcon } from 'lucide-react';

export default async function CtaSection() {
  const t = await getTranslations('home');

  return (
    <section className="py-16 bg-white border-t border-gray-200">
      <div className="max-w-3xl mx-auto px-4 text-center">
        <h2 className="text-2xl sm:text-3xl font-bold text-gray-900">{t('cta.title')}</h2>
        <p className="mt-3 text-gray-600">{t('cta.subtitle')}</p>
        <Link
          href="/my/dashboard"
          className="mt-8 inline-flex items-center gap-2 px-6 py-3 bg-orange-500 text-white font-medium rounded-lg hover:bg-orange-600 transition-colors">
          {t('cta.button')}
          <ArrowRightIcon className="w-4 h-4" />
        </Link>
      </div>
    </section>
  );
}
