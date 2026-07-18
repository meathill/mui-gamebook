/**
 * 正式生成前的"信息是否足够清晰"评估与追问
 * 用轻量模型（见 MIMO_FAST_TEXT_MODEL）快速判断用户当前给出的故事信息是否足够
 * 生成一个有质量的剧本；不够就给 2-3 个针对性追问，不涉及 DSL —— DSL 只在真正
 * 调用正式生成（generate-script）时才需要
 */

export const ASSESS_STORY_SYSTEM_PROMPT = `你是一个互动小说创作顾问。请判断用户目前给出的故事信息是否足够清晰、完整，可以直接生成一个有质量的多场景互动剧本（需要大致明确：主角是谁、故事背景/基调、故事可能的走向）。

- 如果信息已经足够，输出：{"ready": true, "questions": []}
- 如果信息还不够清晰，输出：{"ready": false, "questions": ["追问1", "追问2"]}
  - 2-3 个简短追问（一句话以内），中文，语气友好
  - 追问要针对已给内容量身定制，优先问缺得最多、最影响生成质量的部分，不要问无关的通用问题

只输出以上 JSON 中的一种，不要有任何其他文字或代码块标记。`;

export function buildAssessStoryPrompt(story: string): string {
  return `${ASSESS_STORY_SYSTEM_PROMPT}

## 用户目前给出的故事信息：

"""${story}"""`;
}

export interface AssessStoryResult {
  ready: boolean;
  questions: string[];
}

/**
 * 防御性解析评估结果：解析失败就当作"已就绪"处理，调用方据此直接跳过追问、
 * 走正式生成，不能因为这一步失败就把用户卡住
 */
export function parseAssessStoryResult(text: string): AssessStoryResult {
  try {
    const cleaned = text
      .replace(/^```json\n/, '')
      .replace(/^```\n/, '')
      .replace(/\n```$/, '')
      .trim();
    const parsed = JSON.parse(cleaned) as { ready?: unknown; questions?: unknown };

    if (!Array.isArray(parsed.questions)) {
      return { ready: true, questions: [] };
    }
    const questions = parsed.questions.filter((q): q is string => typeof q === 'string' && q.trim().length > 0);

    if (questions.length === 0) {
      return { ready: true, questions: [] };
    }
    return { ready: parsed.ready === true, questions: questions.slice(0, 3) };
  } catch {
    return { ready: true, questions: [] };
  }
}
