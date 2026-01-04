import { getTranslations } from 'next-intl/server';
import { SparklesIcon, MessageCircleIcon, VariableIcon, Gamepad2Icon, LayersIcon, GlobeIcon } from 'lucide-react';

const featureIcons = [SparklesIcon, MessageCircleIcon, VariableIcon, Gamepad2Icon, LayersIcon, GlobeIcon];

const featureColors = [
  'from-yellow-400 to-orange-400',
  'from-orange-500 to-amber-500',
  'from-amber-400 to-yellow-300',
  'from-red-500 to-orange-400',
  'from-rose-500 to-pink-400',
  'from-orange-600 to-red-500',
];

export default async function FeaturesSection() {
  const t = await getTranslations('home');

  const features = [
    { key: 'aiAssist', icon: 0, color: 0 },
    { key: 'aiChatbot', icon: 1, color: 1 },
    { key: 'variables', icon: 2, color: 2 },
    { key: 'minigames', icon: 3, color: 3 },
    { key: 'richInteractive', icon: 4, color: 4 },
    { key: 'crossPlatform', icon: 5, color: 5 },
  ];

  return (
    <section className="py-16 bg-gray-50">
      <div className="max-w-6xl mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">{t('features.title')}</h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">{t('features.subtitle')}</p>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {features.map(({ key, icon, color }) => {
            const Icon = featureIcons[icon];
            return (
              <div
                key={key}
                className="bg-white rounded-2xl p-6 shadow-md hover:shadow-xl transition-shadow duration-300 group">
                <div
                  className={`w-12 h-12 rounded-xl bg-gradient-to-br ${featureColors[color]} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                  <Icon className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">{t(`features.${key}.title`)}</h3>
                <p className="text-gray-600 text-sm">{t(`features.${key}.description`)}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
