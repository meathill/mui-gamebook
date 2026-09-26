import { describe, expect, it } from 'vitest';
import { CREATE_GAME_PACK_MD, CREATE_GAME_STEPS } from '@/lib/skills/create-game';
import { getSkillDownload, listSkillDownloadSlugs } from '@/lib/skills';
import {
  ANTIGRAVITY_CONFIG_PATHS,
  MCP_ENDPOINT,
  OPENCODE_CONFIG_PATHS,
  SETUP_PROMPT,
  SETUP_SKILL_MD,
  buildAntigravityConfig,
  buildOpenCodeConfig,
} from '@/lib/skills/setup';
import zhMessages from '@/i18n/messages/zh.json';
import enMessages from '@/i18n/messages/en.json';

function expectFrontmatter(md: string, name: string) {
  expect(md.startsWith('---\n')).toBe(true);
  expect(md).toContain(`name: ${name}`);
  expect(md).toContain('description: ');
}

describe('setup skill', () => {
  it('SKILL.md 有 frontmatter 且包含端点与关键工具', () => {
    expectFrontmatter(SETUP_SKILL_MD, 'mui-gamebook-setup');
    expect(SETUP_SKILL_MD).toContain(MCP_ENDPOINT);
    expect(SETUP_SKILL_MD).toContain('listGames');
    expect(SETUP_SKILL_MD).toContain('API Key');
    // 绝不出现真实 key：只有占位符（mgb_ 前缀说明文字是合法的）
    expect(SETUP_SKILL_MD).toContain('<YOUR_API_KEY>');
    expect(SETUP_SKILL_MD).not.toMatch(/mgb_[A-Za-z0-9]{8,}/);
  });

  it('OpenCode 配置走 mcp + url，Antigravity 走 mcpServers + serverUrl', () => {
    const open = JSON.parse(buildOpenCodeConfig('KEY')) as {
      mcp: Record<string, { type: string; url: string; headers: Record<string, string> }>;
    };
    expect(open.mcp['mui-gamebook'].type).toBe('remote');
    expect(open.mcp['mui-gamebook'].url).toBe(MCP_ENDPOINT);
    expect(open.mcp['mui-gamebook'].headers.Authorization).toBe('Bearer KEY');

    const anti = JSON.parse(buildAntigravityConfig('KEY')) as {
      mcpServers: Record<string, { serverUrl: string; headers: Record<string, string> }>;
    };
    expect(anti.mcpServers['mui-gamebook'].serverUrl).toBe(MCP_ENDPOINT);
    expect(anti.mcpServers['mui-gamebook'].headers.Authorization).toBe('Bearer KEY');
  });

  it('配置文件路径齐全', () => {
    expect(OPENCODE_CONFIG_PATHS.length).toBeGreaterThan(0);
    expect(ANTIGRAVITY_CONFIG_PATHS.length).toBeGreaterThan(0);
  });

  it('复制 prompt 包含端点与两种客户端关键词', () => {
    expect(SETUP_PROMPT).toContain(MCP_ENDPOINT);
    expect(SETUP_PROMPT).toContain('OpenCode');
    expect(SETUP_PROMPT).toContain('Antigravity');
    expect(SETUP_PROMPT).toContain('serverUrl');
  });
});

describe('create-game skill', () => {
  it('恰好 5 个子 skill，顺序固定', () => {
    expect(CREATE_GAME_STEPS.map((s) => s.slug)).toEqual(['worldview', 'characters', 'plot', 'branches', 'media']);
  });

  it('每个子 skill 有 prompt / SKILL.md / 工具 / 完成标准', () => {
    for (const step of CREATE_GAME_STEPS) {
      expect(step.prompt.length).toBeGreaterThan(50);
      expectFrontmatter(step.skillMd, step.name);
      expect(step.tools.length).toBeGreaterThan(0);
      expect(step.doneCriteria.length).toBeGreaterThan(0);
    }
  });

  it('DSL 铁律散落在正确步骤里', () => {
    const bySlug = Object.fromEntries(CREATE_GAME_STEPS.map((s) => [s.slug, s.skillMd]));
    expect(bySlug.worldview).toContain('# start');
    expect(bySlug.characters).toContain('@');
    expect(bySlug.plot).toContain('# start');
    expect(bySlug.branches).toContain('无条件');
    expect(bySlug.media).toContain('setSceneImage');
  });

  it('全量包引用 5 个子 skill 且强调媒体最后', () => {
    expectFrontmatter(CREATE_GAME_PACK_MD, 'mui-gamebook-create-game');
    for (const step of CREATE_GAME_STEPS) {
      expect(CREATE_GAME_PACK_MD).toContain(step.name);
    }
    expect(CREATE_GAME_PACK_MD).toContain('最后');
  });
});

describe('upgrade-game skill', () => {
  it('SKILL.md 有 frontmatter 且包含关键流程与核心工具', async () => {
    const { UPGRADE_GAME_SKILL_MD, UPGRADE_GAME_PROMPT, UPGRADE_GAME_STEPS } = await import(
      '@/lib/skills/upgrade-game'
    );
    expectFrontmatter(UPGRADE_GAME_SKILL_MD, 'mui-gamebook-upgrade-game');
    expect(UPGRADE_GAME_SKILL_MD).toContain('listGames');
    expect(UPGRADE_GAME_SKILL_MD).toContain('getDsl');
    expect(UPGRADE_GAME_SKILL_MD).toContain('setGameDsl');
    expect(UPGRADE_GAME_SKILL_MD).toContain('dryRun');
    expect(UPGRADE_GAME_SKILL_MD).toContain('useExisting');
    expect(UPGRADE_GAME_SKILL_MD).toContain('published');

    expect(UPGRADE_GAME_PROMPT.length).toBeGreaterThan(50);
    expect(UPGRADE_GAME_STEPS.length).toBeGreaterThanOrEqual(4);
    for (const step of UPGRADE_GAME_STEPS) {
      expect(step.slug).toBeTruthy();
      expect(step.title).toBeTruthy();
      expect(step.tools.length).toBeGreaterThan(0);
      expect(step.doneCriteria.length).toBeGreaterThan(0);
    }
  });
});

describe('create-minigame skill', () => {
  it('SKILL.md 有 frontmatter 且包含小游戏生命周期协议与关键工具', async () => {
    const { CREATE_MINIGAME_SKILL_MD, CREATE_MINIGAME_PROMPT, CREATE_MINIGAME_STEPS } = await import(
      '@/lib/skills/create-minigame'
    );
    expectFrontmatter(CREATE_MINIGAME_SKILL_MD, 'mui-gamebook-create-minigame');
    expect(CREATE_MINIGAME_SKILL_MD).toContain('init');
    expect(CREATE_MINIGAME_SKILL_MD).toContain('onComplete');
    expect(CREATE_MINIGAME_SKILL_MD).toContain('destroy');
    expect(CREATE_MINIGAME_SKILL_MD).toContain('minigame:');
    expect(CREATE_MINIGAME_SKILL_MD).toContain('variables');
    expect(CREATE_MINIGAME_SKILL_MD).toContain('uploadAsset');

    expect(CREATE_MINIGAME_PROMPT.length).toBeGreaterThan(50);
    expect(CREATE_MINIGAME_STEPS.length).toBeGreaterThanOrEqual(4);
    for (const step of CREATE_MINIGAME_STEPS) {
      expect(step.slug).toBeTruthy();
      expect(step.title).toBeTruthy();
      expect(step.tools.length).toBeGreaterThan(0);
      expect(step.doneCriteria.length).toBeGreaterThan(0);
    }
  });
});

describe('validate-game skill', () => {
  it('SKILL.md 有 frontmatter 且包含逻辑校验关键维度与核心工具', async () => {
    const { VALIDATE_GAME_SKILL_MD, VALIDATE_GAME_PROMPT, VALIDATE_GAME_STEPS } = await import(
      '@/lib/skills/validate-game'
    );
    expectFrontmatter(VALIDATE_GAME_SKILL_MD, 'mui-gamebook-validate-game');
    expect(VALIDATE_GAME_SKILL_MD).toContain('# start');
    expect(VALIDATE_GAME_SKILL_MD).toContain('getDsl');
    expect(VALIDATE_GAME_SKILL_MD).toContain('setGameDsl');
    expect(VALIDATE_GAME_SKILL_MD).toContain('dryRun');
    expect(VALIDATE_GAME_SKILL_MD).toContain('死局');
    expect(VALIDATE_GAME_SKILL_MD).toContain('悬空');

    expect(VALIDATE_GAME_PROMPT.length).toBeGreaterThan(50);
    expect(VALIDATE_GAME_STEPS.length).toBeGreaterThanOrEqual(4);
    for (const step of VALIDATE_GAME_STEPS) {
      expect(step.slug).toBeTruthy();
      expect(step.title).toBeTruthy();
      expect(step.tools.length).toBeGreaterThan(0);
      expect(step.doneCriteria.length).toBeGreaterThan(0);
    }
  });
});

describe('skills 注册表', () => {
  it('下载 slug 全覆盖：setup + 全量包 + 5 子 skill + upgrade-game + create-minigame + validate-game', () => {
    expect(listSkillDownloadSlugs()).toEqual([
      'setup',
      'create-game',
      'create-game-worldview',
      'create-game-characters',
      'create-game-plot',
      'create-game-branches',
      'create-game-media',
      'upgrade-game',
      'create-minigame',
      'validate-game',
    ]);
    for (const slug of listSkillDownloadSlugs()) {
      const d = getSkillDownload(slug);
      expect(d?.markdown.length).toBeGreaterThan(100);
      expect(d?.fileName.endsWith('-SKILL.md')).toBe(true);
    }
  });

  it('未知 slug 返回 undefined（下载路由转 404）', () => {
    expect(getSkillDownload('nope')).toBeUndefined();
  });
});

describe('skills i18n', () => {
  const required = [
    'pageTitle',
    'heroTitle',
    'setupCardTitle',
    'createCardTitle',
    'upgradeCardTitle',
    'upgradeCardDesc',
    'upgradeCardMeta',
    'minigameCardTitle',
    'minigameCardDesc',
    'minigameCardMeta',
    'validateCardTitle',
    'validateCardDesc',
    'validateCardMeta',
    'comingTitle',
    'openSkill',
    'downloadMd',
    'copyPrompt',
    'copied',
    'backToSkills',
    'step1Title',
    'promptTitle',
    'toolsLabel',
    'doneLabel',
  ];
  it.each([
    ['zh', zhMessages],
    ['en', enMessages],
  ] as const)('%s 具备全部页面文案 key', (_locale, messages) => {
    const skills = (messages as unknown as { skills: Record<string, string> }).skills;
    expect(skills).toBeDefined();
    for (const key of required) {
      expect(skills[key], key).toBeTruthy();
    }
  });

  it('footer.skills 中英齐备', () => {
    expect((zhMessages as unknown as { footer: Record<string, string> }).footer.skills).toBeTruthy();
    expect((enMessages as unknown as { footer: Record<string, string> }).footer.skills).toBeTruthy();
  });

  it('header 入口与首页 section 文案中英齐备', () => {
    for (const messages of [zhMessages, enMessages]) {
      const m = messages as unknown as {
        header: Record<string, string>;
        home: {
          skillsSection: {
            title: string;
            subtitle: string;
            setup: { title: string };
            create: { title: string };
            upgrade: { title: string };
            minigame: { title: string };
            cta: string;
          };
        };
      };
      expect(m.header.skills).toBeTruthy();
      expect(m.home.skillsSection.title).toBeTruthy();
      expect(m.home.skillsSection.setup.title).toBeTruthy();
      expect(m.home.skillsSection.create.title).toBeTruthy();
      expect(m.home.skillsSection.upgrade.title).toBeTruthy();
      expect(m.home.skillsSection.minigame.title).toBeTruthy();
      expect(m.home.skillsSection.cta).toBeTruthy();
    }
  });
});
