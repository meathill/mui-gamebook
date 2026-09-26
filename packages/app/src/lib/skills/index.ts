/**
 * Skills 注册表：下载 API 与页面共用的 slug → 内容映射。
 * 加新 skill：实现内容模块 → 在这里加一行 → 页面/下载/sitemap 自动生效。
 */
import { CREATE_GAME_PACK_MD, CREATE_GAME_STEPS } from './create-game';
import { SETUP_PROMPT, SETUP_SKILL_MD } from './setup';

export interface SkillDownload {
  slug: string;
  fileName: string;
  markdown: string;
}

const DOWNLOADS: SkillDownload[] = [
  { slug: 'setup', fileName: 'mui-gamebook-setup-SKILL.md', markdown: SETUP_SKILL_MD },
  { slug: 'create-game', fileName: 'mui-gamebook-create-game-SKILL.md', markdown: CREATE_GAME_PACK_MD },
  ...CREATE_GAME_STEPS.map((step) => ({
    slug: `create-game-${step.slug}`,
    fileName: `${step.name}-SKILL.md`,
    markdown: step.skillMd,
  })),
];

export function getSkillDownload(slug: string): SkillDownload | undefined {
  return DOWNLOADS.find((d) => d.slug === slug);
}

export function listSkillDownloadSlugs(): string[] {
  return DOWNLOADS.map((d) => d.slug);
}

export { CREATE_GAME_PACK_MD, CREATE_GAME_STEPS, SETUP_PROMPT, SETUP_SKILL_MD };
