export type CompareCell = boolean | string;

export interface CompareRow {
  feature: string;
  free: CompareCell;
  basic: CompareCell;
  pro: CompareCell;
  group: '算力' | '创作能力' | '协作与发布' | '支持';
}

export const COMPARE_ROWS: CompareRow[] = [
  { group: '算力', feature: 'M Token / 月', free: '每日体验额度', basic: '1,000,000', pro: '2,000,000' },
  { group: '算力', feature: '额度重置', free: '每日', basic: '每月账单周期', pro: '每月账单周期' },
  { group: '算力', feature: '年付优惠', free: '—', basic: '约 17%', pro: '约 17%' },
  { group: '创作能力', feature: 'Markdown 剧本与分支变量', free: true, basic: true, pro: true },
  { group: '创作能力', feature: 'AI 剧情副驾 / 剧本生成', free: true, basic: true, pro: true },
  { group: '创作能力', feature: '场景生图', free: true, basic: true, pro: true },
  { group: '创作能力', feature: 'TTS 配音 / 音色', free: true, basic: true, pro: true },
  { group: '创作能力', feature: '音乐与音效', free: true, basic: true, pro: true },
  { group: '创作能力', feature: '批量 / 高频创作算力', free: '有限', basic: '充足', pro: '最充足' },
  { group: '协作与发布', feature: '一键发布 Web / PWA', free: true, basic: true, pro: true },
  { group: '协作与发布', feature: '作品 OG 卡片与分享', free: true, basic: true, pro: true },
  { group: '协作与发布', feature: '用户级 API Key / MCP', free: true, basic: true, pro: true },
  { group: '支持', feature: '社区支持', free: true, basic: true, pro: true },
  { group: '支持', feature: '优先反馈通道', free: false, basic: true, pro: true },
];

export interface FaqItem {
  question: string;
  answer: string;
}

export const PRICING_FAQ: FaqItem[] = [
  {
    question: '姆伊游戏书怎么收费？',
    answer:
      '核心创作与发布永久免费。全模态 AI 辅助创作提供免费体验额度；订阅 Pro（$9.98/月 · $99.98/年）或 Pro+（$19.98/月 · $199.98/年）可获得每月 1M / 2M M Token，年付约 17% 优惠。',
  },
  {
    question: 'M Token 是什么？怎么计算？',
    answer:
      'M Token 是标准计费 Token：$1 模型成本 = 1,000,000 M Token。文本、生图、TTS 等按真实模型费率折算后扣减，用多少扣多少，避免不同模型成本不公。',
  },
  {
    question: '年付和月付额度一样吗？',
    answer:
      '一样。年付只是按年扣费更便宜（约 17% 优惠），月度额度仍是 Pro 1M / Pro+ 2M，按账单周期重置，推荐默认选年付。',
  },
  {
    question: '免费档能做什么？',
    answer:
      '免费档可使用 Markdown 创作、发布、游玩社区作品，并享每日 AI 体验额度（剧本生成、生图、TTS 等）。额度用完可等次日重置，或订阅升级。',
  },
  {
    question: '可以取消订阅或升级吗？',
    answer:
      '可以。在「订阅账单」打开 Stripe 客户门户，自助取消续订、更换支付方式；取消后当期额度用到周期结束，再回落免费档。',
  },
  {
    question: '支持哪些付款方式？',
    answer: '通过 Stripe Checkout 支付，支持信用卡及 Stripe 启用的本地支付方式，按你所在地区动态展示。',
  },
  {
    question: 'Token 会过期吗？能叠加吗？',
    answer: '订阅额度按账单周期重置，周期内未用完不结转。免费档为每日额度，同样不结转。',
  },
  {
    question: '适合工作室或连载作者吗？',
    answer: '适合。Pro+ 提供每月 2M M Token，覆盖高频剧本生成、批量生图与配音；年付更划算，可在「订阅账单」统一管理。',
  },
];
