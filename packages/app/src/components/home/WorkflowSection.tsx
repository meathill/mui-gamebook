import { getTranslations } from 'next-intl/server';

const steps = [
  { key: 'step1', number: '1' },
  { key: 'step2', number: '2' },
  { key: 'step3', number: '3' },
];

export default async function WorkflowSection() {
  const t = await getTranslations('home');

  return (
    <section className="py-16 bg-gray-50 border-y border-gray-200">
      <div className="max-w-6xl mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900">{t('workflow.title')}</h2>
          <p className="mt-3 text-gray-600">{t('workflow.subtitle')}</p>
        </div>

        <div className="grid sm:grid-cols-3 gap-8 relative">
          {/* Dashed line connecting steps (desktop only) */}
          <div className="hidden sm:block absolute top-8 left-1/6 right-1/6 h-px border-t-2 border-dashed border-gray-300" />

          {steps.map(({ key, number }) => (
            <div
              key={key}
              className="relative text-center">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-lg border-2 border-gray-900 text-gray-900 font-bold text-lg bg-white relative z-10">
                {number}
              </div>
              <h3 className="mt-4 text-base font-semibold text-gray-900">{t(`workflow.${key}.title`)}</h3>
              <p className="mt-2 text-sm text-gray-600 leading-relaxed max-w-xs mx-auto">
                {t(`workflow.${key}.description`)}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
