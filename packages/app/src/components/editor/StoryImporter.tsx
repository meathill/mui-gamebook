import { LightbulbIcon, SparkleIcon, SpinnerIcon, XIcon } from '@phosphor-icons/react/dist/ssr';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useDialog } from '@/components/Dialog';
import { AI_PROVIDER_LABELS, useAiPermissions } from '@/lib/editor/useAiPermissions';
import { STORY_PROMPTS } from './storyPrompts';
import { MAX_CLARIFY_ROUNDS, useClarifyFlow } from './useClarifyFlow';
import { PHASE_LABELS, useGenerateScriptStream } from './useGenerateScriptStream';

interface Props {
  id: string;
  initialStory?: string;
  /** 当前游戏已有的剧本内容（DSL 全文）。有值时代表已经是"实质性"剧本，需要先确认生成方式 */
  existingScript?: string;
  onImport: (script: string) => void;
  onClose: () => void;
  onSaveStory?: (story: string) => void;
}

type ScriptMode = 'unset' | 'regenerate' | 'revise';

export default function StoryImporter({ id, initialStory, existingScript, onImport, onClose, onSaveStory }: Props) {
  const [story, setStory] = useState(initialStory || '');
  const dialog = useDialog();
  const reasoningBoxRef = useRef<HTMLDivElement>(null);

  // 已有剧本时，点击生成前先让用户选择"重新生成"还是"在现有剧本基础上修改"
  const [scriptMode, setScriptMode] = useState<ScriptMode>('unset');
  const [showScriptModeChoice, setShowScriptModeChoice] = useState(false);

  // 用户被授权多个 AI 时可切换，默认用户自选模型对应的供应商（付费），否则第一项
  const { providers, userDefaultProvider, userDefaultModel } = useAiPermissions();
  const [selectedProvider, setSelectedProvider] = useState<string>('');
  const activeProvider = selectedProvider || userDefaultProvider || providers[0];
  const activeModel = activeProvider === userDefaultProvider ? userDefaultModel : null;

  const { phase, reasoningText, writtenChars, generate, cancel: cancelGeneration } = useGenerateScriptStream();
  const clarify = useClarifyFlow({ gameId: id, provider: activeProvider, model: activeModel });
  const loading = phase !== 'idle';

  // 随机选择一个提示
  const randomPrompt = useMemo(() => {
    const index = Math.floor(Math.random() * STORY_PROMPTS.length);
    return STORY_PROMPTS[index];
  }, []);

  // 思考内容持续追加时自动滚动到底部，方便实时查看进度
  useEffect(() => {
    if (reasoningBoxRef.current) {
      reasoningBoxRef.current.scrollTop = reasoningBoxRef.current.scrollHeight;
    }
  }, [reasoningText]);

  function buildFullStory(qa: string): string {
    return qa ? `${story}\n\n补充信息：\n${qa}` : story;
  }

  // 评估通过后进入正式生成；追问展示由 useClarifyFlow 内部处理
  async function assessAndProceed(qa: string, round: number, mode: ScriptMode) {
    const fullStory = buildFullStory(qa);
    if ((await clarify.assess(fullStory, round)) === 'generate') {
      await runGeneration(fullStory, mode);
    }
  }

  function proceedToGeneration(mode: ScriptMode) {
    clarify.reset();
    void assessAndProceed('', 0, mode);
  }

  async function handleGenerateClick() {
    if (!story.trim()) return;
    if (existingScript && scriptMode === 'unset') {
      setShowScriptModeChoice(true);
      return;
    }
    proceedToGeneration(scriptMode);
  }

  function handleChooseRegenerate() {
    setScriptMode('regenerate');
    setShowScriptModeChoice(false);
    proceedToGeneration('regenerate');
  }

  function handleChooseRevise() {
    setScriptMode('revise');
    setShowScriptModeChoice(false);
    proceedToGeneration('revise');
  }

  // 用户主动要求"别问了，直接生成"：把当前轮已经填的答案一并带上，但不再评估
  function handleForceGenerate() {
    const newQaHistory = clarify.submitRoundAnswers();
    void runGeneration(buildFullStory(newQaHistory), scriptMode);
  }

  function handleSubmitClarifyAnswers() {
    const newQaHistory = clarify.submitRoundAnswers();
    void assessAndProceed(newQaHistory, clarify.round, scriptMode);
  }

  async function runGeneration(finalStory: string, mode: ScriptMode) {
    // 先保存原始输入（不含追问拼接内容），确保用户输入不丢失
    if (onSaveStory) {
      onSaveStory(story);
    }

    await generate(
      {
        gameId: id,
        story: finalStory,
        provider: activeProvider,
        model: activeModel,
        existingScript: mode === 'revise' ? existingScript : undefined,
      },
      {
        onDone: (script) => {
          onImport(script);
          onClose();
        },
        onError: (message) => {
          void dialog.error(message);
        },
      },
    );
  }

  function handleUseExample() {
    setStory(randomPrompt.example);
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <SparkleIcon className="text-purple-500" />
            AI 故事导入器
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700">
            <XIcon size={24} />
          </button>
        </div>

        {/* 创作引导 */}
        <div className="bg-linear-to-r from-purple-50 to-blue-50 rounded-lg p-4 mb-4 border border-purple-100">
          <div className="flex items-start gap-3">
            <LightbulbIcon
              className="text-purple-500 shrink-0 mt-0.5"
              size={20}
            />
            <div className="flex-1">
              <h3 className="font-semibold text-purple-900 mb-1">{randomPrompt.title}</h3>
              <p className="text-sm text-purple-700 mb-3">{randomPrompt.description}</p>
              <button
                onClick={handleUseExample}
                className="text-xs text-purple-600 hover:text-purple-800 underline">
                使用此示例开始创作 →
              </button>
            </div>
          </div>
        </div>

        <p className="text-sm text-gray-600 mb-4">
          在下方输入你的故事大纲或完整故事。AI 会将其转换为可玩的互动游戏脚本，包含场景、选项和分支剧情。
        </p>

        <textarea
          value={story}
          onChange={(e) => setStory(e.target.value)}
          className="w-full h-64 p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 resize-none mb-4"
          placeholder="在这里输入你的故事..."
        />

        {loading && (
          <div className="mb-4 rounded-md border border-purple-200 bg-purple-50/50 p-3">
            <div className="flex items-center gap-2 text-sm text-purple-900">
              <SpinnerIcon className="animate-spin size-4 shrink-0" />
              <span className="font-medium">{PHASE_LABELS[phase]}</span>
              {phase === 'writing' && writtenChars > 0 && (
                <span className="text-xs text-purple-500">已写 {writtenChars} 字</span>
              )}
              <button
                onClick={cancelGeneration}
                className="ml-auto text-xs text-gray-500 hover:text-red-600 underline shrink-0"
                type="button">
                取消
              </button>
            </div>
            {reasoningText && (
              <details className="mt-2">
                <summary className="text-xs text-gray-500 cursor-pointer hover:text-gray-700">查看 AI 思考过程</summary>
                <div
                  ref={reasoningBoxRef}
                  className="mt-1 max-h-32 overflow-y-auto rounded-md border border-gray-200 bg-gray-50 p-3 text-xs text-gray-500 whitespace-pre-wrap">
                  {reasoningText}
                </div>
              </details>
            )}
          </div>
        )}

        {showScriptModeChoice ? (
          <div className="mb-4 rounded-lg border border-purple-200 bg-purple-50 p-4">
            <p className="text-sm text-purple-900 font-medium mb-3">这个游戏已经有剧本内容了，你想：</p>
            <div className="flex flex-col gap-2">
              <button
                onClick={handleChooseRevise}
                className="text-left px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700"
                type="button">
                在现有剧本基础上修改（保留现有场景/角色，按新信息调整）
              </button>
              <button
                onClick={handleChooseRegenerate}
                className="text-left px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
                type="button">
                完全重新生成（不使用现有剧本）
              </button>
            </div>
          </div>
        ) : clarify.questions.length > 0 ? (
          <div className="mb-4 rounded-lg border border-purple-200 bg-purple-50 p-4">
            <p className="text-sm text-purple-900 font-medium mb-3">
              故事信息还不太完整，回答几个小问题能帮 AI 生成更贴合的剧本（也可以跳过）
              <span className="text-purple-400 font-normal">{`（第 ${clarify.round}/${MAX_CLARIFY_ROUNDS} 轮）`}</span>
              ：
            </p>
            <div className="space-y-3">
              {clarify.questions.map((q, i) => (
                <div key={q}>
                  <label className="text-xs text-purple-700 mb-1 block">{q}</label>
                  <input
                    type="text"
                    value={clarify.answers[i] ?? ''}
                    onChange={(e) => clarify.setAnswer(i, e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500"
                    placeholder="可留空"
                  />
                </div>
              ))}
            </div>
            <div className="flex justify-end gap-3 mt-4">
              <button
                onClick={handleForceGenerate}
                className="text-sm text-gray-500 hover:text-gray-700"
                type="button">
                跳过，直接生成
              </button>
              <button
                onClick={handleSubmitClarifyAnswers}
                className="flex items-center gap-2 px-6 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700"
                type="button">
                提交
              </button>
            </div>
          </div>
        ) : (
          <div className="flex justify-end items-center gap-3">
            {providers.length > 1 && (
              <select
                value={activeProvider}
                onChange={(e) => setSelectedProvider(e.target.value)}
                className="text-sm text-gray-600 border border-gray-300 rounded-md px-2 py-2 outline-none focus:border-purple-500"
                title="选择 AI 提供者">
                {providers.map((provider) => (
                  <option
                    key={provider}
                    value={provider}>
                    {AI_PROVIDER_LABELS[provider]}
                  </option>
                ))}
              </select>
            )}
            <button
              onClick={handleGenerateClick}
              disabled={loading || clarify.loading || !story.trim()}
              className="flex items-center gap-2 px-6 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:opacity-50"
              type="button">
              {(loading || clarify.loading) && <SpinnerIcon className="animate-spin size-4" />}
              {clarify.loading
                ? `正在分析故事（第 ${clarify.round + 1}/${MAX_CLARIFY_ROUNDS} 轮）...`
                : PHASE_LABELS[phase]}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
