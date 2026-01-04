'use client';

import { useTranslations } from 'next-intl';
import * as Accordion from '@radix-ui/react-accordion';
import { ChevronDownIcon } from 'lucide-react';

export default function FaqSection() {
  const t = useTranslations('home');

  const faqKeys = ['whatIs', 'howCreate', 'pricing', 'variables', 'minigames'];

  return (
    <section className="py-16 bg-white">
      <div className="max-w-3xl mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">{t('faq.title')}</h2>
          <p className="text-lg text-gray-600">{t('faq.subtitle')}</p>
        </div>

        <Accordion.Root
          type="single"
          collapsible
          className="space-y-3">
          {faqKeys.map((key) => (
            <Accordion.Item
              key={key}
              value={key}
              className="bg-orange-50/50 rounded-xl overflow-hidden border border-orange-100">
              <Accordion.Header>
                <Accordion.Trigger className="w-full flex items-center justify-between px-6 py-4 text-left font-medium text-gray-900 hover:bg-gray-100 transition-colors group">
                  <span>{t(`faq.${key}.question`)}</span>
                  <ChevronDownIcon className="w-5 h-5 text-gray-500 transition-transform duration-200 group-data-[state=open]:rotate-180" />
                </Accordion.Trigger>
              </Accordion.Header>
              <Accordion.Content className="px-6 pb-4 text-gray-600 text-sm leading-relaxed data-[state=open]:animate-accordion-down data-[state=closed]:animate-accordion-up overflow-hidden">
                {t(`faq.${key}.answer`)}
              </Accordion.Content>
            </Accordion.Item>
          ))}
        </Accordion.Root>
      </div>
    </section>
  );
}
