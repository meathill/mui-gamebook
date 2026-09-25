import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { ArrowRightIcon, PlugsConnectedIcon, GameControllerIcon } from '@phosphor-icons/react/dist/ssr';

const cards = [
  { key: 'setup', href: '/skills/setup', icon: PlugsConnectedIcon },
  { key: 'create', href: '/skills/create-game', icon: GameControllerIcon },
] as const;

export default async function SkillsSection() {
  const t = await getTranslations('home');

  return (
    <section className="py-16 px-4 bg-stone-900 text-white">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-2xl sm:text-3xl font-bold">{t('skillsSection.title')}</h2>
          <p className="mt-3 text-stone-300 max-w-2xl mx-auto">{t('skillsSection.subtitle')}</p>
        </div>

        <div className="grid sm:grid-cols-2 gap-6 max-w-4xl mx-auto">
          {cards.map(({ key, href, icon: Icon }) => (
            <Link
              key={key}
              href={href}
              prefetch={false}
              className="group bg-stone-800 border border-stone-700 rounded-2xl p-8 hover:border-amber-400/60 hover:shadow-xl transition-all">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center mb-5">
                <Icon className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-xl font-bold mb-2">{t(`skillsSection.${key}.title`)}</h3>
              <p className="text-stone-300 text-sm leading-relaxed mb-4">{t(`skillsSection.${key}.description`)}</p>
              <span className="inline-flex items-center gap-1 text-amber-400 font-bold text-sm group-hover:gap-2 transition-all">
                {t('skillsSection.cta')}
                <ArrowRightIcon className="w-4 h-4" />
              </span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
