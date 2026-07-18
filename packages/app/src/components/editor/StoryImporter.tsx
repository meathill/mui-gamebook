import { LightbulbIcon, SparkleIcon, SpinnerIcon, XIcon } from '@phosphor-icons/react/dist/ssr';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useDialog } from '@/components/Dialog';
import { AI_PROVIDER_LABELS, useAiPermissions } from '@/lib/editor/useAiPermissions';

type GenerationPhase = 'idle' | 'thinking' | 'writing' | 'correcting';

const PHASE_LABELS: Record<GenerationPhase, string> = {
  idle: '生成游戏脚本',
  thinking: 'AI 思考中...',
  writing: '正在编写剧本...',
  correcting: '正在修正剧本...',
};

type SSEGenerateEvent =
  | { type: 'phase'; phase: 'thinking' | 'correcting' }
  | { type: 'reasoning'; delta: string }
  | { type: 'content'; delta: string }
  | { type: 'done'; script: string }
  | { type: 'error'; content: string };

// 追问最多进行几轮：每轮用轻量模型判断信息是否已经足够清晰，不够就再问 2-3 个问题
const MAX_CLARIFY_ROUNDS = 5;

// AI 故事创作引导提示
const STORY_PROMPTS = [
  {
    title: '经典故事新视角',
    description:
      '以《哈利波特》世界为例，我们可以选择一个不同的视角。比如纳威·隆巴顿，他在霍格沃茨会经历什么？他有没有可能成为找到魔法石的关键人物？或者成为击败伏地魔的英雄？换个主角，一个熟悉的世界会变得截然不同。',
    example:
      '故事设定在霍格沃茨魔法学校，主角是纳威·隆巴顿，一个害羞但勇敢的男孩。当哈利波特忙于追踪伏地魔时，纳威意外发现了一个关于自己父母的秘密...',
  },
  {
    title: '历史关键时刻',
    description:
      '选择一个历史上的关键时刻，让玩家做出不同的选择。比如在三国时期的赤壁之战前夜，如果你是诸葛亮，你会如何说服孙权联盟？不同的对话选择会导致完全不同的历史走向。',
    example:
      '公元208年，曹操率领八十万大军南下。作为刘备的军师诸葛亮，你被派往东吴说服孙权联合抗曹。在江东的朝堂上，你将面对众多质疑者...',
  },
  {
    title: '日常生活冒险',
    description:
      '有时候最好的故事就在我们身边。想象一下：一个普通的上班族在地铁上捡到一个神秘的U盘，里面的内容将彻底改变他的生活。每一个选择都可能让主角走向完全不同的结局。',
    example:
      '周一早晨，你像往常一样挤上拥挤的地铁。突然，你注意到座位上有一个被遗落的U盘。当你把它插进电脑时，屏幕上出现了一段加密视频...',
  },
  {
    title: '生存挑战',
    description:
      '荒野求生类型的故事非常适合互动小说。玩家需要在资源有限的情况下做出艰难的选择：是冒险寻找水源，还是留在原地等待救援？每个决定都关系到生死存亡。',
    example:
      '你的飞机坠毁在一座荒岛上。除了一把小刀和半瓶水，你什么都没有。远处的丛林深处传来了奇怪的声音。太阳即将落山，你必须做出选择...',
  },
  {
    title: '悬疑推理',
    description:
      '一个好的推理故事需要线索、嫌疑人和意想不到的结局。玩家扮演侦探，通过询问证人、检查现场来寻找真相。错误的推理可能会让真凶逍遥法外，甚至让无辜者蒙冤。',
    example:
      '豪华别墅的书房里，著名收藏家被发现死在自己的椅子上。门窗紧锁，没有任何暴力痕迹。作为被请来的私家侦探，你注意到桌上的茶杯还冒着热气...',
  },
];

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
  const [phase, setPhase] = useState<GenerationPhase>('idle');
  const [reasoningText, setReasoningText] = useState('');
  const loading = phase !== 'idle';
  const dialog = useDialog();
  const reasoningBoxRef = useRef<HTMLDivElement>(null);

  // 已有剧本时，点击生成前先让用户选择"重新生成"还是"在现有剧本基础上修改"
  const [scriptMode, setScriptMode] = useState<ScriptMode>('unset');
  const [showScriptModeChoice, setShowScriptModeChoice] = useState(false);

  // 多轮追问：questions 非空时渲染追问表单，替代下方的生成按钮；qaHistory 累积历次问答，
  // clarifyRound 记录已经问过几轮（上限 MAX_CLARIFY_ROUNDS）
  const [clarifyQuestions, setClarifyQuestions] = useState<string[]>([]);
  const [clarifyAnswers, setClarifyAnswers] = useState<string[]>([]);
  const [clarifyLoading, setClarifyLoading] = useState(false);
  const [qaHistory, setQaHistory] = useState('');
  const [clarifyRound, setClarifyRound] = useState(0);

  // 用户被授权多个 AI 时可切换，默认第一项（用户默认提供者）
  const { providers } = useAiPermissions();
  const [selectedProvider, setSelectedProvider] = useState<string>('');
  const activeProvider = selectedProvider || providers[0];

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

  function buildRoundQa(): string {
    return clarifyQuestions
      .map((q, i) => (clarifyAnswers[i]?.trim() ? `Q: ${q}\nA: ${clarifyAnswers[i].trim()}` : ''))
      .filter(Boolean)
      .join('\n');
  }

  function appendQa(base: string, addition: string): string {
    if (!addition) return base;
    return base ? `${base}\n${addition}` : addition;
  }

  // 用轻量模型快速判断当前信息是否够用；失败或解析不出结果都当作"已就绪"，
  // 调用方据此直接跳过追问、不阻塞用户
  async function fetchAssessment(fullStory: string): Promise<{ ready: boolean; questions: string[] }> {
    try {
      const res = await fetch(`/api/cms/games/${id}/clarify-story`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ story: fullStory, provider: activeProvider }),
      });
      if (!res.ok) return { ready: true, questions: [] };
      const data = (await res.json()) as { ready?: boolean; questions?: string[] };
      return { ready: data.ready ?? true, questions: data.questions ?? [] };
    } catch {
      return { ready: true, questions: [] };
    }
  }

  // 每轮的核心流程：评估当前信息是否足够；不够且未达轮次上限就展示新一轮追问，
  // 否则（已就绪 / 没问出问题 / 达到上限）直接进入正式生成
  // mode 显式传入而不是读闭包里的 scriptMode：handleChooseRevise/Regenerate 里
  // setScriptMode 之后同一事件里立刻调用这条链路，state 更新还没反映到闭包，
  // 直接读 scriptMode 会拿到更新前的旧值
  async function assessAndProceed(qa: string, round: number, mode: ScriptMode) {
    const fullStory = buildFullStory(qa);

    if (round >= MAX_CLARIFY_ROUNDS) {
      await runGeneration(fullStory, mode);
      return;
    }

    setClarifyLoading(true);
    const { ready, questions } = await fetchAssessment(fullStory);
    setClarifyLoading(false);

    if (ready || questions.length === 0) {
      await runGeneration(fullStory, mode);
      return;
    }

    setClarifyQuestions(questions);
    setClarifyAnswers(questions.map(() => ''));
    setClarifyRound(round + 1);
  }

  function proceedToGeneration(mode: ScriptMode) {
    setQaHistory('');
    setClarifyRound(0);
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
    const finalQaHistory = appendQa(qaHistory, buildRoundQa());
    setClarifyQuestions([]);
    setClarifyAnswers([]);
    void runGeneration(buildFullStory(finalQaHistory), scriptMode);
  }

  function handleSubmitClarifyAnswers() {
    const newQaHistory = appendQa(qaHistory, buildRoundQa());
    setQaHistory(newQaHistory);
    setClarifyQuestions([]);
    setClarifyAnswers([]);
    void assessAndProceed(newQaHistory, clarifyRound, scriptMode);
  }

  async function runGeneration(finalStory: string, mode: ScriptMode) {
    setPhase('thinking');
    setReasoningText('');
    try {
      // 先保存原始输入（不含追问拼接内容），确保用户输入不丢失
      if (onSaveStory) {
        onSaveStory(story);
      }

      const res = await fetch(`/api/cms/games/${id}/generate-script`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          story: finalStory,
          provider: activeProvider,
          ...(mode === 'revise' && existingScript ? { existingScript } : {}),
        }),
      });

      if (!res.ok) {
        const data = (await res.json()) as {
          error: string;
        };
        throw new Error(data.error || '生成失败');
      }

      const reader = res.body?.getReader();
      if (!reader) throw new Error('无法读取响应流');

      const decoder = new TextDecoder();
      let buffer = '';
      let script: string | null = null;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const jsonStr = line.slice(6).trim();
          if (!jsonStr) continue;

          let event: SSEGenerateEvent;
          try {
            event = JSON.parse(jsonStr) as SSEGenerateEvent;
          } catch (parseError) {
            console.error('解析生成流消息失败:', parseError, jsonStr);
            continue;
          }

          switch (event.type) {
            case 'phase':
              setPhase(event.phase);
              break;
            case 'reasoning':
              setReasoningText((prev) => prev + event.delta);
              break;
            case 'content':
              setPhase('writing');
              break;
            case 'done':
              script = event.script;
              break;
            case 'error':
              throw new Error(event.content);
          }
        }
      }

      if (!script) throw new Error('未能生成剧本');

      onImport(script);
      onClose();
    } catch (e: unknown) {
      await dialog.error((e as Error).message);
    } finally {
      setPhase('idle');
    }
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

        {loading && reasoningText && (
          <div
            ref={reasoningBoxRef}
            className="mb-4 max-h-32 overflow-y-auto rounded-md border border-gray-200 bg-gray-50 p-3 text-xs text-gray-500 whitespace-pre-wrap">
            {reasoningText}
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
        ) : clarifyQuestions.length > 0 ? (
          <div className="mb-4 rounded-lg border border-purple-200 bg-purple-50 p-4">
            <p className="text-sm text-purple-900 font-medium mb-3">
              故事信息还不太完整，回答几个小问题能帮 AI 生成更贴合的剧本（也可以跳过）
              <span className="text-purple-400 font-normal">{`（第 ${clarifyRound}/${MAX_CLARIFY_ROUNDS} 轮）`}</span>：
            </p>
            <div className="space-y-3">
              {clarifyQuestions.map((q, i) => (
                <div key={q}>
                  <label className="text-xs text-purple-700 mb-1 block">{q}</label>
                  <input
                    type="text"
                    value={clarifyAnswers[i] ?? ''}
                    onChange={(e) => {
                      const next = [...clarifyAnswers];
                      next[i] = e.target.value;
                      setClarifyAnswers(next);
                    }}
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
              disabled={loading || clarifyLoading || !story.trim()}
              className="flex items-center gap-2 px-6 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:opacity-50"
              type="button">
              {(loading || clarifyLoading) && <SpinnerIcon className="animate-spin size-4" />}
              {clarifyLoading ? '正在分析故事...' : PHASE_LABELS[phase]}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
