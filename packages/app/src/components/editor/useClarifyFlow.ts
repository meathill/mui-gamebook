import { useState } from 'react';
import { getGameSessionHeaders } from '@/lib/editor/game-session';

// 追问最多进行几轮：每轮用轻量模型判断信息是否已经足够清晰，不够就再问 2-3 个问题
export const MAX_CLARIFY_ROUNDS = 5;

interface ClarifyFlowParams {
  gameId: string;
  provider: string;
  model?: string | null;
}

/**
 * 大纲导入前的多轮追问状态机：累积历次问答（qaHistory），每轮先让轻量模型
 * 评估信息是否足够，不够就展示新一轮问题。
 */
export function useClarifyFlow({ gameId, provider, model }: ClarifyFlowParams) {
  const [questions, setQuestions] = useState<string[]>([]);
  const [answers, setAnswers] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [qaHistory, setQaHistory] = useState('');
  const [round, setRound] = useState(0);

  // 用轻量模型快速判断当前信息是否够用；失败或解析不出结果都当作"已就绪"，
  // 调用方据此直接跳过追问、不阻塞用户
  async function fetchAssessment(fullStory: string): Promise<{ ready: boolean; questions: string[] }> {
    try {
      const res = await fetch(`/api/cms/games/${gameId}/clarify-story`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getGameSessionHeaders(gameId),
        },
        body: JSON.stringify({
          story: fullStory,
          provider,
          ...(model ? { model } : {}),
        }),
      });
      if (!res.ok) return { ready: true, questions: [] };
      const data = (await res.json()) as { ready?: boolean; questions?: string[] };
      return { ready: data.ready ?? true, questions: data.questions ?? [] };
    } catch {
      return { ready: true, questions: [] };
    }
  }

  function buildRoundQa(): string {
    return questions
      .map((q, i) => (answers[i]?.trim() ? `Q: ${q}\nA: ${answers[i].trim()}` : ''))
      .filter(Boolean)
      .join('\n');
  }

  function appendQa(base: string, addition: string): string {
    if (!addition) return base;
    return base ? `${base}\n${addition}` : addition;
  }

  /**
   * 每轮核心流程：评估当前信息是否足够；不够且未达轮次上限就展示新一轮追问（返回 'ask'），
   * 否则（已就绪 / 没问出问题 / 达到上限）返回 'generate'，调用方进入正式生成。
   * round 显式传入而不是读 state：同一事件里 reset 之后立刻调用这条链路时，
   * state 更新还没反映到闭包，直接读会拿到旧值。
   */
  async function assess(fullStory: string, currentRound: number): Promise<'generate' | 'ask'> {
    if (currentRound >= MAX_CLARIFY_ROUNDS) {
      return 'generate';
    }

    setLoading(true);
    const { ready, questions: nextQuestions } = await fetchAssessment(fullStory);
    setLoading(false);

    if (ready || nextQuestions.length === 0) {
      return 'generate';
    }

    setQuestions(nextQuestions);
    setAnswers(nextQuestions.map(() => ''));
    setRound(currentRound + 1);
    return 'ask';
  }

  /** 重置追问进度，开始一次全新的生成流程 */
  function reset() {
    setQaHistory('');
    setRound(0);
  }

  /** 把当前轮已填的答案并入 qaHistory 并清空本轮问题，返回新的完整问答记录 */
  function submitRoundAnswers(): string {
    const newQaHistory = appendQa(qaHistory, buildRoundQa());
    setQaHistory(newQaHistory);
    setQuestions([]);
    setAnswers([]);
    return newQaHistory;
  }

  function setAnswer(index: number, value: string) {
    setAnswers((previous) => {
      const next = [...previous];
      next[index] = value;
      return next;
    });
  }

  return { questions, answers, loading, qaHistory, round, assess, reset, submitRoundAnswers, setAnswer };
}
