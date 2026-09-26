/**
 * Skills 注册表：下载 API 与页面共用的 slug → 内容映射。
 * 加新 skill：实现内容模块 → 在这里加一行 → 页面/下载/sitemap 自动生效。
 */
import { CREATE_GAME_PACK_MD, CREATE_GAME_STEPS } from './create-game';
import { CREATE_MINIGAME_PROMPT, CREATE_MINIGAME_SKILL_MD, CREATE_MINIGAME_STEPS } from './create-minigame';
import { SETUP_PROMPT, SETUP_SKILL_MD } from './setup';
import { UPGRADE_GAME_PROMPT, UPGRADE_GAME_SKILL_MD, UPGRADE_GAME_STEPS } from './upgrade-game';
import { VALIDATE_GAME_PROMPT, VALIDATE_GAME_SKILL_MD, VALIDATE_GAME_STEPS } from './validate-game';

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
  { slug: 'upgrade-game', fileName: 'mui-gamebook-upgrade-game-SKILL.md', markdown: UPGRADE_GAME_SKILL_MD },
  { slug: 'create-minigame', fileName: 'mui-gamebook-create-minigame-SKILL.md', markdown: CREATE_MINIGAME_SKILL_MD },
  { slug: 'validate-game', fileName: 'mui-gamebook-validate-game-SKILL.md', markdown: VALIDATE_GAME_SKILL_MD },
];

export function getSkillDownload(slug: string): SkillDownload | undefined {
  return DOWNLOADS.find((d) => d.slug === slug);
}

export function listSkillDownloadSlugs(): string[] {
  return DOWNLOADS.map((d) => d.slug);
}

export {
  CREATE_GAME_PACK_MD,
  CREATE_GAME_STEPS,
  CREATE_MINIGAME_PROMPT,
  CREATE_MINIGAME_SKILL_MD,
  CREATE_MINIGAME_STEPS,
  SETUP_PROMPT,
  SETUP_SKILL_MD,
  UPGRADE_GAME_PROMPT,
  UPGRADE_GAME_SKILL_MD,
  UPGRADE_GAME_STEPS,
  VALIDATE_GAME_PROMPT,
  VALIDATE_GAME_SKILL_MD,
  VALIDATE_GAME_STEPS,
};
