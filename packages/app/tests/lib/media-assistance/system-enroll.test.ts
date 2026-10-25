// @vitest-environment node
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { parse } from '@roudanio/parser';
import { createRuntime, insertGame } from './runtime';
import { sha256 } from '@/lib/media-assistance/hash';
import { savePlan } from '@/lib/media-assistance/plan';
import { claimWork, finishWork, type NotifySender } from '@/lib/media-assistance/work';
import { claimItem } from '@/lib/media-assistance/generation';
import { applyAsset } from '@/lib/media-assistance/apply';
import { listTargets, loadAssistanceGame } from '@/lib/media-assistance/store';
import { uploadAssistanceAsset } from '@/lib/media-assistance/upload';
import { saveEditorContent } from '@/lib/media-assistance/editor-save';
import {
  createRevertToken,
  revertAssistance,
  verifyRevertToken,
  REVERT_LINK_TTL_SECONDS,
} from '@/lib/media-assistance/revert';
import { story } from './runtime';

let local: Awaited<ReturnType<typeof createRuntime>>;
beforeAll(async () => {
  local = await createRuntime();
}, 30000);
afterAll(async () => {
  await local?.runtime.dispose();
});
beforeEach(async () => {
  const objects = (await local.bucket.list()).objects;
  if (objects.length) await local.bucket.delete(objects.map((object) => object.key));
  await local.db.batch(
    [
      'MediaAssistanceTargets',
      'MediaAssistanceGenerations',
      'MediaAssistanceWorks',
      'GameContent',
      'Games',
      'GameAnalytics',
      'user',
    ].map((table) => local.db.prepare(`DELETE FROM ${table}`)),
  );
  await local.db.prepare("INSERT INTO user(id,email) VALUES ('author','author@test')").run();
});

function gameRow(id: number) {
  return local.db
    .prepare(
      'SELECT media_assistance_enabled, media_planning_confirmed, media_assistance_enrolled_by, media_assistance_opted_out_at, media_assistance_notified_at FROM Games WHERE id = ?',
    )
    .bind(id)
    .first<Record<string, unknown>>();
}

async function processOne(gameId: number, revision: number, scenes = 1) {
  await savePlan(
    local.db,
    gameId,
    revision,
    Array.from({ length: scenes }, (_, index) => ({
      target: { kind: 'image' as const, sceneId: `scene_${index}` },
      input: {
        kind: 'image' as const,
        prompt: `图片 ${index}`,
        referenceHashes: [],
        parameters: { model: 'local-test' },
      },
    })),
  );
  for (const target of await listTargets(local.db, gameId)) await processTarget(gameId, target);
}

async function processTarget(gameId: number, target: Awaited<ReturnType<typeof listTargets>>[number]) {
  const claim = await claimItem(local.db, gameId, target.id, 'worker');
  const data = `image-bytes-${target.id}`;
  await uploadAssistanceAsset(
    local.db,
    local.bucket,
    'https://assets.example.test',
    new Request('https://example.test/upload', {
      method: 'POST',
      body: data,
      headers: {
        'Content-Type': 'image/png',
        'Content-Length': String(data.length),
        'X-Execution-Token': 'executionToken' in claim ? String(claim.executionToken) : '',
        'X-Content-SHA256': await sha256(data),
      },
    }),
    gameId,
    target.input_hash,
  );
  await applyAsset(local.db, gameId, target.id, target.input_hash);
}

describe('站方代为开启素材协助', () => {
  it('主动开启的作品优先，其次按访问量领取未设置的作品并标记为站方开启', async () => {
    await insertGame(local.db, 1, undefined, 1000, false);
    await insertGame(local.db, 2, undefined, 1, true);
    expect((await claimWork(local.db)).gameId).toBe(2);
    expect(await gameRow(1)).toMatchObject({ media_assistance_enabled: 0, media_assistance_enrolled_by: null });
  });

  it('无主动开启作品时代为开启，并发送一次通知邮件', async () => {
    await insertGame(local.db, 1, undefined, 10, false);
    const work = await claimWork(local.db);
    expect(work.gameId).toBe(1);
    expect(await gameRow(1)).toMatchObject({
      media_assistance_enabled: 1,
      media_planning_confirmed: 1,
      media_assistance_enrolled_by: 'system',
    });
    await processOne(1, Number(work.revision));
    const sent: Parameters<NotifySender>[0][] = [];
    const notify = {
      siteUrl: 'https://muistory.test/',
      send: async (m: Parameters<NotifySender>[0]) => void sent.push(m),
    };
    const result = await finishWork(local.db, 1, notify);
    expect(result).toMatchObject({ status: 'completed', notified: true });
    expect(sent).toHaveLength(1);
    expect(sent[0].to).toBe('author@test');
    expect(sent[0].body).toContain('https://muistory.test/my/edit/1');
    expect(sent[0].body).toContain('场景图片（scene_0）');
    expect(sent[0].body).toContain('删除');
    expect((await finishWork(local.db, 1, notify)).notified).toBe(false);
    expect(sent).toHaveLength(1);
  });

  it('作者主动开启的作品不发站方通知；发送失败不影响完成', async () => {
    await insertGame(local.db, 1);
    const work = await claimWork(local.db);
    await processOne(1, Number(work.revision));
    const result = await finishWork(local.db, 1, {
      siteUrl: 'https://muistory.test',
      send: async () => {
        throw new Error('should not send');
      },
    });
    expect(result).toMatchObject({ status: 'completed', notified: false });
  });

  it('作者主动关闭后不再被代为开启，重新开启后记为作者开启', async () => {
    await insertGame(local.db, 1, undefined, 10, false);
    await claimWork(local.db);
    const loaded = await loadAssistanceGame(local.db, 1);
    const parsed = parse(loaded.content);
    if (!parsed.success) throw new Error('invalid');
    const base = {
      gameId: 1,
      content: loaded.content,
      game: parsed.data,
      slug: loaded.slug,
      actorId: 'author',
    };
    await saveEditorContent(local.db, { ...base, expectedRevision: loaded.revision, mediaAssistanceEnabled: false });
    const row = await gameRow(1);
    expect(row?.media_assistance_enabled).toBe(0);
    expect(row?.media_assistance_opted_out_at).not.toBeNull();
    expect((await claimWork(local.db)).gameId).toBeNull();
    const revision = (await local.db
      .prepare('SELECT revision FROM GameContent WHERE game_id = 1')
      .first<{ revision: number }>())!.revision;
    await saveEditorContent(local.db, { ...base, expectedRevision: revision, mediaAssistanceEnabled: true });
    expect(await gameRow(1)).toMatchObject({
      media_assistance_enabled: 1,
      media_assistance_enrolled_by: 'author',
      media_assistance_opted_out_at: null,
    });
  });

  it('代为开启会推进版本，旧编辑器快照保存冲突而不会误关开关', async () => {
    await insertGame(local.db, 1, undefined, 10, false);
    const content = (await local.db
      .prepare('SELECT content FROM GameContent WHERE game_id = 1')
      .first<{ content: string }>())!.content;
    const parsed = parse(content);
    if (!parsed.success) throw new Error('invalid');
    await claimWork(local.db);
    await expect(
      saveEditorContent(local.db, {
        gameId: 1,
        content,
        game: parsed.data,
        expectedRevision: 0,
        slug: 'game-1',
        actorId: 'author',
        mediaAssistanceEnabled: false,
      }),
    ).rejects.toThrow();
    expect((await gameRow(1))?.media_assistance_enabled).toBe(1);
  });

  it('撤回令牌：签名、篡改与过期校验', async () => {
    const token = await createRevertToken('secret', 7, 1000);
    expect(await verifyRevertToken('secret', token, 1000)).toBe(7);
    await expect(verifyRevertToken('other', token, 1000)).rejects.toThrow('无效');
    await expect(verifyRevertToken('secret', token.replace(/^7\./, '8.'), 1000)).rejects.toThrow('无效');
    await expect(verifyRevertToken('secret', token, 1000 + REVERT_LINK_TTL_SECONDS + 1)).rejects.toThrow('过期');
    await expect(verifyRevertToken('', token, 1000)).rejects.toThrow('未配置');
  });

  it('通知邮件包含一键撤回链接', async () => {
    await insertGame(local.db, 1, undefined, 10, false);
    const work = await claimWork(local.db);
    await processOne(1, Number(work.revision));
    const sent: Parameters<NotifySender>[0][] = [];
    await finishWork(local.db, 1, {
      siteUrl: 'https://muistory.test',
      revertSecret: 'secret',
      send: async (m) => void sent.push(m),
    });
    expect(sent[0].body).toContain('不想要这些 AI 素材？');
    const token = decodeURIComponent(/revert\?token=([^"]+)/.exec(sent[0].body)![1]);
    expect(await verifyRevertToken('secret', token)).toBe(1);
  });

  it('一键撤回：只清除仍为站方素材的位置，保留作者改动，关闭协助且幂等', async () => {
    await insertGame(local.db, 1, story(2), 10, false);
    const work = await claimWork(local.db);
    await processOne(1, Number(work.revision), 2);
    // 作者把 scene_1 换成了自己的图
    const loaded = await loadAssistanceGame(local.db, 1);
    const own = 'https://author.example/own.png';
    const node = loaded.game.scenes.scene_1.nodes.find((item) => item.type === 'ai_image');
    if (node && 'url' in node) node.url = own;
    const { stringify } = await import('@roudanio/parser');
    await local.db.prepare('UPDATE GameContent SET content = ? WHERE game_id = 1').bind(stringify(loaded.game)).run();
    expect((await local.bucket.list()).objects.length).toBe(2);

    const result = await revertAssistance(local.db, 1, local.bucket);
    expect(result.reverted).toBe(1);
    const content = (await local.db
      .prepare('SELECT content FROM GameContent WHERE game_id = 1')
      .first<{ content: string }>())!.content;
    const parsed = parse(content);
    if (!parsed.success) throw new Error('invalid');
    const url = (sceneId: string) => {
      const item = parsed.data.scenes[sceneId].nodes.find((n) => n.type === 'ai_image');
      return item && 'url' in item ? item.url : undefined;
    };
    expect(url('scene_0')).toBeUndefined();
    expect(url('scene_1')).toBe(own);
    expect((await listTargets(local.db, 1)).every((t) => t.status === 'dismissed')).toBe(true);
    const row = await gameRow(1);
    expect(row?.media_assistance_enabled).toBe(0);
    expect(row?.media_assistance_opted_out_at).not.toBeNull();
    expect((await local.bucket.list()).objects.length).toBe(1);
    expect((await revertAssistance(local.db, 1, local.bucket)).reverted).toBe(0);
    expect((await claimWork(local.db)).gameId).toBeNull();
  });
});
