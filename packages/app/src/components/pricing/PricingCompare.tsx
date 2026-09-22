import { Fragment } from 'react';
import { CheckIcon, MinusIcon, XIcon } from '@phosphor-icons/react/dist/ssr';
import { COMPARE_ROWS, type CompareCell } from '@/lib/pricing-content';

function Cell({ value }: { value: CompareCell }) {
  if (value === true) return <CheckIcon className="w-5 h-5 text-emerald-600 mx-auto" aria-label="包含" />;
  if (value === false) return <XIcon className="w-5 h-5 text-stone-300 mx-auto" aria-label="不包含" />;
  if (value === '—') return <MinusIcon className="w-5 h-5 text-stone-300 mx-auto" aria-label="无" />;
  return <span className="text-sm text-stone-700">{value}</span>;
}

export default function PricingCompare() {
  const groups = Array.from(new Set(COMPARE_ROWS.map((row) => row.group)));

  return (
    <section className="max-w-6xl mx-auto px-4 pb-16" aria-labelledby="compare-title">
      <div className="text-center mb-8">
        <h2 id="compare-title" className="text-2xl sm:text-3xl font-extrabold text-stone-900 mb-2">
          能力对比
        </h2>
        <p className="text-stone-600">看清免费 / Pro / Pro+ 的差异，按创作频次选档。</p>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-stone-200 bg-white">
        <table className="w-full min-w-[640px] text-left">
          <thead>
            <tr className="border-b border-stone-200 bg-stone-50">
              <th scope="col" className="px-4 py-3 text-sm font-semibold text-stone-700">
                能力
              </th>
              <th scope="col" className="px-4 py-3 text-center text-sm font-semibold text-stone-700">
                免费
              </th>
              <th scope="col" className="px-4 py-3 text-center text-sm font-semibold text-stone-700">
                Pro
              </th>
              <th scope="col" className="px-4 py-3 text-center text-sm font-semibold text-orange-700 bg-orange-50/50">
                Pro+
              </th>
            </tr>
          </thead>
          <tbody>
            {groups.map((group) => (
              <Fragment key={group}>
                <tr className="bg-stone-50">
                  <td colSpan={4} className="px-4 py-2 text-xs font-bold uppercase tracking-wide text-stone-500">
                    {group}
                  </td>
                </tr>
                {COMPARE_ROWS.filter((row) => row.group === group).map((row) => (
                  <tr key={row.feature} className="border-b border-stone-100 last:border-b-0">
                    <th scope="row" className="px-4 py-3 text-left text-sm font-medium text-stone-800">
                      {row.feature}
                    </th>
                    <td className="px-4 py-3 text-center">
                      <Cell value={row.free} />
                    </td>
                    <td className="px-4 py-3 text-center">
                      <Cell value={row.basic} />
                    </td>
                    <td className="px-4 py-3 text-center bg-orange-50/40">
                      <Cell value={row.pro} />
                    </td>
                  </tr>
                ))}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
