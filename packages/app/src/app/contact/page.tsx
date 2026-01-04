import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { Metadata } from 'next';
import { MailIcon, GithubIcon, TwitterIcon, MessageCircleIcon } from 'lucide-react';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('contact');
  return {
    title: t('pageTitle'),
    description: t('pageDescription'),
  };
}

export default async function ContactPage() {
  const t = await getTranslations('contact');

  const contactMethods = [
    {
      key: 'email',
      icon: MailIcon,
      href: 'mailto:meathill@gmail.com',
      value: 'meathill@gmail.com',
    },
    {
      key: 'github',
      icon: GithubIcon,
      href: 'https://github.com/meathill/mui-gamebook',
      value: 'meathill/mui-gamebook',
    },
    {
      key: 'twitter',
      icon: TwitterIcon,
      href: 'https://x.com/meathill1',
      value: '@meathill1',
    },
  ];

  return (
    <div className="min-h-screen bg-stone-50">
      {/* Hero */}
      <section className="bg-gradient-to-br from-orange-500 via-amber-500 to-yellow-400 text-white py-16 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl font-extrabold mb-4">{t('heroTitle')}</h1>
          <p className="text-lg text-white/90">{t('heroSubtitle')}</p>
        </div>
      </section>

      {/* Contact Methods */}
      <section className="py-16 px-4">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold text-gray-900 mb-8 text-center">{t('contactTitle')}</h2>
          <div className="grid gap-6 md:grid-cols-3">
            {contactMethods.map(({ key, icon: Icon, href, value }) => (
              <a
                key={key}
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="flex flex-col items-center p-6 bg-white rounded-2xl shadow-md hover:shadow-lg transition-shadow group">
                <div className="w-14 h-14 rounded-full bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <Icon className="w-7 h-7 text-white" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-1">{t(`methods.${key}.title`)}</h3>
                <p className="text-orange-600 text-sm">{value}</p>
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* Open Source */}
      <section className="py-16 px-4 bg-white">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">{t('openSourceTitle')}</h2>
            <p className="text-gray-600">{t('openSourceSubtitle')}</p>
          </div>

          <div className="bg-gradient-to-br from-orange-50 to-amber-50 rounded-2xl p-8 border border-orange-100">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-gray-900 flex items-center justify-center flex-shrink-0">
                <GithubIcon className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-semibold text-gray-900 mb-2">meathill/mui-gamebook</h3>
                <p className="text-gray-600 mb-4">{t('repoDescription')}</p>
                <div className="flex flex-wrap gap-2 mb-4">
                  <span className="px-3 py-1 bg-orange-100 text-orange-700 rounded-full text-sm font-medium">
                    TypeScript
                  </span>
                  <span className="px-3 py-1 bg-orange-100 text-orange-700 rounded-full text-sm font-medium">
                    Next.js
                  </span>
                  <span className="px-3 py-1 bg-orange-100 text-orange-700 rounded-full text-sm font-medium">
                    Cloudflare
                  </span>
                  <span className="px-3 py-1 bg-orange-100 text-orange-700 rounded-full text-sm font-medium">
                    MIT License
                  </span>
                </div>
                <a
                  href="https://github.com/meathill/mui-gamebook"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-6 py-3 bg-gray-900 text-white rounded-xl hover:bg-gray-800 transition-colors font-medium">
                  <GithubIcon className="w-5 h-5" />
                  {t('viewOnGithub')}
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Contributing */}
      <section className="py-16 px-4">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold text-gray-900 mb-8 text-center">{t('contributingTitle')}</h2>
          <div className="grid gap-6 md:grid-cols-2">
            <div className="bg-white rounded-2xl p-6 shadow-md">
              <MessageCircleIcon className="w-8 h-8 text-orange-500 mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">{t('contributing.issues.title')}</h3>
              <p className="text-gray-600 text-sm mb-4">{t('contributing.issues.description')}</p>
              <a
                href="https://github.com/meathill/mui-gamebook/issues"
                target="_blank"
                rel="noopener noreferrer"
                className="text-orange-600 hover:text-orange-700 text-sm font-medium">
                {t('contributing.issues.link')} →
              </a>
            </div>
            <div className="bg-white rounded-2xl p-6 shadow-md">
              <GithubIcon className="w-8 h-8 text-orange-500 mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">{t('contributing.pullRequests.title')}</h3>
              <p className="text-gray-600 text-sm mb-4">{t('contributing.pullRequests.description')}</p>
              <a
                href="https://github.com/meathill/mui-gamebook/pulls"
                target="_blank"
                rel="noopener noreferrer"
                className="text-orange-600 hover:text-orange-700 text-sm font-medium">
                {t('contributing.pullRequests.link')} →
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 px-4 bg-gradient-to-br from-stone-800 to-stone-900 text-white">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-2xl font-bold mb-4">{t('ctaTitle')}</h2>
          <p className="text-gray-300 mb-6">{t('ctaContent')}</p>
          <Link
            href="/"
            className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-gradient-to-r from-orange-500 to-amber-500 text-white font-bold rounded-xl hover:from-orange-600 hover:to-amber-600 transition-all">
            {t('ctaButton')}
          </Link>
        </div>
      </section>
    </div>
  );
}
