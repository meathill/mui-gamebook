'use client';

import { useTranslations } from 'next-intl';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

export default function FaqSection({ faqKeys }: { faqKeys: string[] }) {
  const t = useTranslations('home');

  return (
    <section className="border-y border-gray-200 bg-gray-50 py-16">
      <div className="mx-auto max-w-3xl px-4">
        <div className="mb-12 text-center">
          <h2 className="text-2xl font-bold text-gray-900 sm:text-3xl">{t('faq.title')}</h2>
          <p className="mt-3 text-gray-600">{t('faq.subtitle')}</p>
        </div>

        <Accordion
          type="single"
          collapsible
          className="space-y-2">
          {faqKeys.map((key) => (
            <AccordionItem
              key={key}
              value={key}
              className="rounded-lg border border-gray-200 bg-white px-5 last:border-b">
              <AccordionTrigger className="py-4 text-sm font-medium text-gray-900 hover:no-underline">
                {t(`faq.${key}.question`)}
              </AccordionTrigger>
              <AccordionContent className="pb-4 leading-relaxed text-gray-600">
                {t(`faq.${key}.answer`)}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  );
}
