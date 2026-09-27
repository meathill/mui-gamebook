import { describe, expect, it, vi } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { GET as getSkillMdApi } from '@/app/api/skills/[slug]/skill-md/route';
import { listSkillDownloadSlugs, getSkillDownload } from '@/lib/skills';

// Mock next-intl server
vi.mock('next-intl/server', () => ({
  getTranslations: vi.fn(async () => (key: string) => `trans_${key}`),
}));

describe('Skills 页面与 API 综合访问验证', () => {
  it('API: /api/skills/[slug]/skill-md 全部 slug 可正常返回 200 与 Markdown 内容', async () => {
    const slugs = listSkillDownloadSlugs();
    expect(slugs.length).toBeGreaterThan(0);

    for (const slug of slugs) {
      const response = await getSkillMdApi(new Request('http://localhost'), {
        params: Promise.resolve({ slug }),
      });
      expect(response.status).toBe(200);
      expect(response.headers.get('Content-Type')).toContain('text/markdown');
      const text = await response.text();
      expect(text.length).toBeGreaterThan(50);
      expect(text).toContain('---');
    }
  });

  it('API: 未知 slug 返回 404', async () => {
    const response = await getSkillMdApi(new Request('http://localhost'), {
      params: Promise.resolve({ slug: 'not-exists' }),
    });
    expect(response.status).toBe(404);
  });

  it('静态部署产物: public/skills/ 包含全部 6 个标准技能包并可读', () => {
    const publicSkillsDir = path.resolve(__dirname, '../../public/skills');
    const expectedSkills = [
      'mui-gamebook-cli',
      'mui-gamebook-create-game',
      'mui-gamebook-create-minigame',
      'mui-gamebook-setup',
      'mui-gamebook-upgrade-game',
      'mui-gamebook-validate-game',
    ];

    for (const skill of expectedSkills) {
      const skillFile = path.join(publicSkillsDir, skill, 'SKILL.md');
      expect(fs.existsSync(skillFile)).toBe(true);
      const content = fs.readFileSync(skillFile, 'utf-8');
      expect(content).toContain(`name: ${skill}`);
      expect(content).toContain('description:');
    }
  });

  it('页面组件: Skills 列表页与各子页面组件均可无异常渲染', async () => {
    const SkillsPage = (await import('@/app/skills/page')).default;
    const SetupPage = (await import('@/app/skills/setup/page')).default;
    const CreateGamePage = (await import('@/app/skills/create-game/page')).default;
    const UpgradeGamePage = (await import('@/app/skills/upgrade-game/page')).default;
    const CreateMinigamePage = (await import('@/app/skills/create-minigame/page')).default;
    const ValidateGamePage = (await import('@/app/skills/validate-game/page')).default;

    // 验证各页面函数执行均不抛出异常
    const skillsRes = await SkillsPage();
    expect(skillsRes).toBeDefined();

    const setupRes = await SetupPage();
    expect(setupRes).toBeDefined();

    const createRes = await CreateGamePage();
    expect(createRes).toBeDefined();

    const upgradeRes = await UpgradeGamePage();
    expect(upgradeRes).toBeDefined();

    const minigameRes = await CreateMinigamePage();
    expect(minigameRes).toBeDefined();

    const validateRes = await ValidateGamePage();
    expect(validateRes).toBeDefined();
  });
});
