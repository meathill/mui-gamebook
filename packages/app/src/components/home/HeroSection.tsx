import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import {
  ArrowRightIcon,
  PenIcon,
  SparkleIcon,
  ChatCenteredDotsIcon,
  ImageIcon,
  MusicNotesIcon,
  CheckCircleIcon,
} from '@phosphor-icons/react/dist/ssr';

export default async function HeroSection() {
  const t = await getTranslations('home');

  return (
    <section className="bg-white border-b border-gray-200 overflow-hidden relative">
      <div className="max-w-6xl mx-auto px-4 py-16 sm:py-24">
        <div className="grid lg:grid-cols-12 gap-12 items-center">
          {/* Left: Text (7 cols) */}
          <div className="lg:col-span-7">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-gradient-to-r from-orange-50 to-amber-50 border border-orange-200 text-orange-700 text-xs font-semibold mb-6 shadow-sm">
              <SparkleIcon
                weight="fill"
                className="w-4 h-4 text-orange-500"
              />
              <span>{t('hero.freeBadge')}</span>
            </div>

            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-gray-900 leading-tight tracking-tight">
              {t('hero.title')}
            </h1>

            <p className="mt-6 text-base sm:text-lg text-gray-600 leading-relaxed max-w-xl">{t('hero.subtitle')}</p>

            <div className="mt-8 flex flex-col sm:flex-row gap-3">
              <Link
                href="/my/dashboard"
                className="inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-orange-500 text-white font-semibold rounded-xl hover:bg-orange-600 transition-all shadow-md hover:shadow-lg hover:-translate-y-0.5">
                <PenIcon className="w-4 h-4" />
                {t('hero.startCreating')}
              </Link>
              <Link
                href="/games"
                className="inline-flex items-center justify-center gap-2 px-6 py-3.5 border border-gray-300 text-gray-700 font-semibold rounded-xl hover:bg-gray-50 transition-colors">
                {t('hero.browseStories')}
                <ArrowRightIcon className="w-4 h-4" />
              </Link>
            </div>

            {/* Micro Feature List */}
            <div className="mt-8 pt-6 border-t border-gray-100 grid grid-cols-2 gap-3 text-xs sm:text-sm text-gray-500">
              <div className="flex items-center gap-2">
                <CheckCircleIcon
                  weight="fill"
                  className="w-4 h-4 text-emerald-500 shrink-0"
                />
                <span>
                  AI 剧情副驾{' '}
                  <span className="text-orange-600 font-semibold text-[11px] bg-orange-50 px-1.5 py-0.5 rounded border border-orange-200/60">
                    限时免费
                  </span>
                </span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircleIcon
                  weight="fill"
                  className="w-4 h-4 text-emerald-500 shrink-0"
                />
                <span>
                  生图/音乐/配音{' '}
                  <span className="text-orange-600 font-semibold text-[11px] bg-orange-50 px-1.5 py-0.5 rounded border border-orange-200/60">
                    限时免费
                  </span>
                </span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircleIcon
                  weight="fill"
                  className="w-4 h-4 text-emerald-500 shrink-0"
                />
                <span>Markdown 纯文本极简创作</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircleIcon
                  weight="fill"
                  className="w-4 h-4 text-emerald-500 shrink-0"
                />
                <span>Web 即点即玩 · Steam 导出</span>
              </div>
            </div>
          </div>

          {/* Right: Mock UI showing Markdown + AI Co-pilot Chatbot (5 cols) */}
          <div className="lg:col-span-5">
            <div className="border border-gray-200 rounded-2xl overflow-hidden bg-gray-50 shadow-xl">
              {/* Window Title Bar */}
              <div className="flex items-center justify-between px-4 py-2.5 bg-gray-100 border-b border-gray-200 text-xs text-gray-500">
                <div className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-red-400" />
                  <div className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                  <span className="ml-2 font-mono text-gray-600 font-medium">exorcist_story.md</span>
                </div>
                <div className="flex items-center gap-2 font-mono text-[11px] text-orange-600 bg-orange-50 px-2 py-0.5 rounded border border-orange-200/60">
                  <SparkleIcon
                    weight="fill"
                    className="w-3 h-3"
                  />
                  <span>AI Co-pilot</span>
                </div>
              </div>

              {/* Editor Content Mock */}
              <div className="p-5 font-mono text-xs sm:text-sm space-y-3 bg-white">
                <div>
                  <span className="text-gray-400"># </span>
                  <span className="text-gray-900 font-bold">start</span>
                </div>
                <div className="text-gray-600 leading-relaxed bg-gray-50/60 p-2.5 rounded-lg border border-gray-100">
                  <p>深夜，风雪笼罩着豫南小城。王主教的十字架泛起微光...</p>
                </div>
                <div className="space-y-1.5 pt-1 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="text-gray-400">*</span>
                    <span className="text-orange-600 font-medium">[拔出符水警惕上前]</span>
                    <span className="text-gray-400">→</span>
                    <span className="text-blue-600">confront_demon</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-gray-400">*</span>
                    <span className="text-orange-600 font-medium">[悄悄退入阴影呼叫支援]</span>
                    <span className="text-gray-400">→</span>
                    <span className="text-blue-600">call_backup</span>
                  </div>
                </div>
              </div>

              {/* Live AI Chatbot Co-pilot Interaction Box */}
              <div className="p-4 bg-stone-900 text-white border-t border-stone-800 space-y-2.5">
                <div className="flex items-center justify-between text-xs text-stone-400 border-b border-stone-800 pb-2">
                  <div className="flex items-center gap-1.5 text-orange-400 font-semibold">
                    <ChatCenteredDotsIcon
                      weight="fill"
                      className="w-4 h-4"
                    />
                    <span>AI 灵感副驾 · 随时恭候</span>
                  </div>
                  <span className="text-[10px] bg-stone-800 px-1.5 py-0.5 rounded text-emerald-400">在线就绪</span>
                </div>
                <p className="text-xs text-stone-300 leading-relaxed">
                  “已为当前场景生成悬疑雪夜氛围配图与 BGM Prompt，并检查到分支变量{' '}
                  <code className="text-amber-400 bg-stone-800 px-1 rounded">faith ≥ 10</code> 逻辑完备。”
                </p>
                <div className="flex items-center gap-2 pt-1">
                  <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded bg-stone-800 text-blue-300 border border-stone-700">
                    <ImageIcon className="w-3 h-3" /> 场景插画已生成
                  </span>
                  <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded bg-stone-800 text-emerald-300 border border-stone-700">
                    <MusicNotesIcon className="w-3 h-3" /> 悬疑 BGM 匹配
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
