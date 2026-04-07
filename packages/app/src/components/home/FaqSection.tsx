'use client';

import { useTranslations } from 'next-intl';
import * as Accordion from '@radix-ui/react-accordion';
import { ChevronDownIcon } from 'lucide-react';

export default function FaqSection() {
  const t = useTranslations('home');

  const faqKeys = ['whatIs', 'howCreate', 'pricing', 'export', 'aiRole'];

  return (
    <section className="py-16 bg-gray-50 border-y border-gray-200">
      <div className="max-w-3xl mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900">{t('faq.title')}</h2>
          <p className="mt-3 text-gray-600">{t('faq.subtitle')}</p>
        </div>

        <Accordion.Root
          type="single"
          collapsible
          className="space-y-2">
          {faqKeys.map((key) => (
            <Accordion.Item
              key={key}
              value={key}
              className="bg-white rounded-lg border border-gray-200">
              <Accordion.Header>
                <Accordion.Trigger className="w-full flex items-center justify-between px-5 py-4 text-left font-medium text-gray-900 hover:bg-gray-50 rounded-lg transition-colors group">
                  <span className="text-sm">{t(`faq.${key}.question`)}</span>
                  <ChevronDownIcon className="w-4 h-4 text-gray-400 shrink-0 transition-transform duration-200 group-data-[state=open]:rotate-180" />
                </Accordion.Trigger>
              </Accordion.Header>
              <Accordion.Content className="px-5 pb-4 text-sm text-gray-600 leading-relaxed data-[state=open]:animate-accordion-down data-[state=closed]:animate-accordion-up overflow-hidden">
                {t(`faq.${key}.answer`)}
              </Accordion.Content>
            </Accordion.Item>
          ))}
        </Accordion.Root>
      </div>
    </section>
  );
}
