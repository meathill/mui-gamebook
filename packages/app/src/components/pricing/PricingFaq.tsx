import { PRICING_FAQ } from '@/lib/pricing-content';

export default function PricingFaq() {
  return (
    <section className="max-w-3xl mx-auto px-4 pb-20" aria-labelledby="faq-title">
      <div className="text-center mb-8">
        <h2 id="faq-title" className="text-2xl sm:text-3xl font-extrabold text-stone-900 mb-2">
          常见问题
        </h2>
        <p className="text-stone-600">定价、额度、续订与取消的高频问题。</p>
      </div>

      <div className="space-y-3">
        {PRICING_FAQ.map((item) => (
          <details
            key={item.question}
            className="group rounded-2xl border border-stone-200 bg-white px-5 py-4 open:border-orange-300">
            <summary className="cursor-pointer list-none text-sm sm:text-base font-semibold text-stone-900 flex items-start justify-between gap-3">
              <span>{item.question}</span>
              <span className="text-stone-400 transition-transform group-open:rotate-45 text-lg leading-none">+</span>
            </summary>
            <p className="mt-3 text-sm leading-relaxed text-stone-600">{item.answer}</p>
          </details>
        ))}
      </div>
    </section>
  );
}
