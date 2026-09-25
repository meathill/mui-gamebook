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

describe('skills 注册表', () => {
  it('下载 slug 全覆盖：setup + 全量包 + 5 子 skill', () => {
    expect(listSkillDownloadSlugs()).toEqual([
      'setup',
      'create-game',
      'create-game-worldview',
      'create-game-characters',
      'create-game-plot',
      'create-game-branches',
      'create-game-media',
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
    expect((zhMessages as { footer: Record<string, string> }).footer.skills).toBeTruthy();
    expect((enMessages as { footer: Record<string, string> }).footer.skills).toBeTruthy();
  });
});
