// @vitest-environment node
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { parse, stringify } from '@roudanio/parser';
import { createRuntime, insertGame, story } from './runtime';
import { hashGenerationInput, sha256 } from '@/lib/media-assistance/hash';
import { savePlan } from '@/lib/media-assistance/plan';
import { claimWork, finishWork } from '@/lib/media-assistance/work';
import { claimItem, updateItem } from '@/lib/media-assistance/generation';
import { applyAsset } from '@/lib/media-assistance/apply';
import { getGeneration, listTargets, loadAssistanceGame } from '@/lib/media-assistance/store';
import { uploadAssistanceAsset } from '@/lib/media-assistance/upload';
import { saveEditorContent } from '@/lib/media-assistance/editor-save';
import { requireAssistanceAdmin } from '@/lib/media-assistance/auth';
import type { GenerationInput } from '@/lib/media-assistance/types';

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
});

function input(prompt: string): GenerationInput {
  return { kind: 'image', prompt, referenceHashes: [], parameters: { model: 'local-test', width: 1024 } };
}

async function planImages(count = 1, samePrompt = false) {
  const work = await claimWork(local.db);
  await savePlan(
    local.db,
    Number(work.gameId),
    Number(work.revision),
    Array.from({ length: count }, (_, index) => ({
      target: { kind: 'image', sceneId: `scene_${index}` },
      input: input(samePrompt ? '共享画面' : `图片 ${index}`),
    })),
  );
  return listTargets(local.db, Number(work.gameId));
}

async function upload(gameId: number, hash: string, token: string, data = 'image-bytes') {
  return uploadAssistanceAsset(
    local.db,
    local.bucket,
    'https://assets.example.test',
    new Request('https://example.test/upload', {
      method: 'POST',
      body: data,
      headers: {
        'Content-Type': 'image/png',
        'Content-Length': String(Buffer.byteLength(data)),
        'X-Execution-Token': token,
        'X-Content-SHA256': await sha256(data),
      },
    }),
    gameId,
    hash,
  );
}

describe('真实本地 D1 / R2 素材协助', () => {
  it('确定性 hash 忽略字段顺序和换行，不忽略画风、音色、尺寸及参考内容', async () => {
    const original = input('画面\r\n第二行');
    expect(await hashGenerationInput(original)).toBe(
      await hashGenerationInput({
        ...original,
        prompt: '画面\n第二行',
        parameters: { width: 1024, model: 'local-test' },
      }),
    );
    for (const changed of [
      { ...original, prompt: '别的画面' },
      { ...original, parameters: { voice: 'new' } },
      { ...original, parameters: { width: 2048 } },
      { ...original, referenceHashes: ['a'.repeat(64)] },
    ]) {
      expect(await hashGenerationInput(changed)).not.toBe(await hashGenerationInput(original));
    }
  });

  it('20 张图只改一张，另外 19 张的生成记录、文件及 URL 完全不变', async () => {
    await insertGame(local.db, 1, story(20));
    const targets = await planImages(20);
    for (const target of targets) {
      const claim = await claimItem(local.db, 1, target.id, target.id);
      await upload(1, target.input_hash, 'executionToken' in claim ? String(claim.executionToken) : '', target.id);
      await applyAsset(local.db, 1, target.id, target.input_hash);
    }
    await finishWork(local.db, 1);
    const before = await listTargets(local.db, 1);
    const loaded = await loadAssistanceGame(local.db, 1);
    const node = loaded.game.scenes.scene_7.nodes.find((entry) => entry.type === 'ai_image');
    if (node?.type !== 'ai_image') throw new Error('missing');
    node.url = 'https://author.example/custom.png';
    await local.db.prepare('UPDATE GameContent SET content = ? WHERE game_id = 1').bind(stringify(loaded.game)).run();
    const changed = await claimWork(local.db);
    await savePlan(
      local.db,
      1,
      Number(changed.revision),
      Array.from({ length: 20 }, (_, index) => ({
        target: { kind: 'image', sceneId: `scene_${index}` },
        input: input(`AI 不应重写 ${index}`),
      })),
    );
    const after = await listTargets(local.db, 1);
    expect(after.filter((row) => row.status === 'applied')).toHaveLength(19);
    for (const row of after.filter((row) => row.status === 'applied'))
      expect(row).toEqual(before.find((old) => old.id === row.id));
    expect(
      (await local.db.prepare('SELECT COUNT(*) AS n FROM MediaAssistanceGenerations').first<{ n: number }>())?.n,
    ).toBe(20);
    expect((await local.bucket.list()).objects).toHaveLength(20);
    expect((await finishWork(local.db, 1)).status).toBe('completed');
  }, 30000);

  it('多个位置相同 hash 只生成一份，并发领取仅一个获得执行凭据', async () => {
    await insertGame(local.db, 1, story(2));
    const targets = await planImages(2, true);
    expect(targets[0].input_hash).toBe(targets[1].input_hash);
    const claims = await Promise.all(
      targets.map((target, index) => claimItem(local.db, 1, target.id, `worker-${index}`)),
    );
    expect(claims.filter((claim) => 'executionToken' in claim)).toHaveLength(1);
    const winner = claims.find((claim) => 'executionToken' in claim)!;
    const token = 'executionToken' in winner ? String(winner.executionToken) : '';
    await upload(1, targets[0].input_hash, token);
    await upload(1, targets[0].input_hash, token);
    for (const target of targets) {
      await applyAsset(local.db, 1, target.id, target.input_hash);
      expect((await applyAsset(local.db, 1, target.id, target.input_hash)).status).toBe('applied');
    }
    expect((await local.bucket.list()).objects).toHaveLength(1);
  });

  it('修改一项未生成 prompt，只新增对应 hash；重新排序不改变身份', async () => {
    await insertGame(local.db, 1, story(20));
    const before = await planImages(20);
    const loaded = await loadAssistanceGame(local.db, 1);
    const node = loaded.game.scenes.scene_7.nodes.find((entry) => entry.type === 'ai_image');
    if (node?.type !== 'ai_image') throw new Error('missing');
    node.prompt = '新画面';
    loaded.game.scenes = Object.fromEntries(Object.entries(loaded.game.scenes).reverse());
    await local.db.prepare('UPDATE GameContent SET content = ? WHERE game_id = 1').bind(stringify(loaded.game)).run();
    const work = await claimWork(local.db);
    await savePlan(local.db, 1, Number(work.revision), [
      { target: { kind: 'image', sceneId: 'scene_7' }, input: input('新画面') },
    ]);
    const after = await listTargets(local.db, 1);
    expect(after.filter((row) => row.input_hash !== before.find((old) => old.id === row.id)?.input_hash)).toHaveLength(
      1,
    );
  });

  it('作者删除不会被缓存补回，重新开关授权后仍尊重删除', async () => {
    await insertGame(local.db, 1);
    const [target] = await planImages();
    const claim = await claimItem(local.db, 1, target.id, 'worker');
    await upload(1, target.input_hash, 'executionToken' in claim ? String(claim.executionToken) : '');
    await applyAsset(local.db, 1, target.id, target.input_hash);
    const loaded = await loadAssistanceGame(local.db, 1);
    loaded.game.scenes.scene_0.nodes = loaded.game.scenes.scene_0.nodes.filter((node) => node.type !== 'ai_image');
    await local.db.prepare('UPDATE GameContent SET content = ? WHERE game_id = 1').bind(stringify(loaded.game)).run();
    await local.db.prepare('UPDATE Games SET media_assistance_enabled = 0 WHERE id = 1').run();
    await local.db.prepare('UPDATE Games SET media_assistance_enabled = 1 WHERE id = 1').run();
    const work = await claimWork(local.db);
    await savePlan(local.db, 1, Number(work.revision), [
      { target: { kind: 'image', sceneId: 'scene_0' }, input: input('图片 0') },
    ]);
    expect((await listTargets(local.db, 1))[0].status).toBe('dismissed');
    expect(
      (await loadAssistanceGame(local.db, 1)).game.scenes.scene_0.nodes.some((node) => node.type === 'ai_image'),
    ).toBe(false);
  });

  it('访问量优先、当前作品优先，暂停项目后可以处理下一部', async () => {
    await insertGame(local.db, 1, story(), 10);
    await insertGame(local.db, 2, story(), 100);
    expect((await claimWork(local.db)).gameId).toBe(2);
    await local.db.prepare('UPDATE GameAnalytics SET open_count = 1000 WHERE game_id = 1').run();
    const [target] = await planImages();
    expect((await claimWork(local.db)).gameId).toBe(2);
    await updateItem(local.db, 2, target.input_hash, { action: 'pause', reason: '本地工具不支持' });
    expect((await finishWork(local.db, 2)).status).toBe('partial');
    expect((await claimWork(local.db)).gameId).toBe(1);
  });

  it('过期任务不会再次生成，重试领取恢复凭据并先核对产物', async () => {
    await insertGame(local.db, 1);
    const [target] = await planImages();
    const first = await claimItem(local.db, 1, target.id, 'same-request');
    await local.db.prepare('UPDATE MediaAssistanceGenerations SET lease_until = 1').run();
    const second = await claimItem(local.db, 1, target.id, 'same-request');
    expect(second).toMatchObject({
      status: 'uncertain',
      executionToken: 'executionToken' in first ? first.executionToken : '',
    });
    await expect(updateItem(local.db, 1, target.input_hash, { action: 'resume' })).rejects.toThrow('确认');
  });

  it('旧版本保存不会覆盖后台成果，撤销授权后不能回填', async () => {
    await insertGame(local.db, 1);
    const [target] = await planImages();
    const old = await loadAssistanceGame(local.db, 1);
    const claim = await claimItem(local.db, 1, target.id, 'worker');
    await upload(1, target.input_hash, 'executionToken' in claim ? String(claim.executionToken) : '');
    await applyAsset(local.db, 1, target.id, target.input_hash);
    await expect(
      saveEditorContent(local.db, {
        gameId: 1,
        content: old.content,
        game: old.game,
        expectedRevision: old.revision,
        slug: old.slug,
        actorId: 'author',
      }),
    ).rejects.toThrow('已更新');
    await local.db.prepare('UPDATE Games SET media_assistance_enabled = 0 WHERE id = 1').run();
    await expect(applyAsset(local.db, 1, target.id, target.input_hash)).rejects.toThrow('停止协助');
  });

  it('无声明作品开启需作者确认，普通账号不能调用站方能力', async () => {
    await insertGame(local.db, 1, '---\ntitle: 纯文字\npublished: true\n---\n# start\n故事');
    await local.db.prepare('UPDATE Games SET media_assistance_enabled = 0 WHERE id = 1').run();
    const content = (await local.db
      .prepare('SELECT content FROM GameContent WHERE game_id = 1')
      .first<{ content: string }>())!.content;
    const parsed = parse(content);
    if (!parsed.success) throw new Error('invalid');
    const options = {
      gameId: 1,
      content,
      game: parsed.data,
      expectedRevision: 0,
      slug: 'game-1',
      actorId: 'author',
      mediaAssistanceEnabled: true,
    };
    await expect(saveEditorContent(local.db, options)).rejects.toThrow('先确认');
    await expect(
      saveEditorContent(local.db, { ...options, actorId: 'admin', mediaPlanningConfirmed: true }),
    ).rejects.toThrow('只有作者');
    await saveEditorContent(local.db, { ...options, mediaPlanningConfirmed: true });
    await expect(requireAssistanceAdmin(local.db, 'session', 'author')).rejects.toThrow('管理员');
    await local.db.prepare("INSERT INTO user(id,email,is_admin) VALUES ('admin','admin@test',1)").run();
    await requireAssistanceAdmin(local.db, 'session', 'admin');
  });

  it('支持超过 8 MB 的流式上传', async () => {
    await insertGame(local.db, 1);
    const [target] = await planImages();
    const claim = await claimItem(local.db, 1, target.id, 'worker');
    const token = 'executionToken' in claim ? String(claim.executionToken) : '';
    await upload(1, target.input_hash, token, 'a'.repeat(9 * 1024 * 1024));
    expect((await getGeneration(local.db, 1, target.input_hash)).status).toBe('ready');
  }, 30000);

  it('已完成作品的封面仍是占位图且目标为 satisfied（无 applied_url）时可重新领取，封面回到 pending', async () => {
    const content = story(0).replace('published: true\n', 'published: true\ncover_prompt: 封面\n');
    await insertGame(local.db, 1, content);
    const work = await claimWork(local.db, { gameId: 1 });
    await savePlan(local.db, 1, Number(work.revision), [{ target: { kind: 'cover' }, input: input('封面') }]);
    // 模拟修复前的旧数据：占位封面被当成已有封面
    await local.db.batch([
      local.db.prepare("UPDATE Games SET cover_image = '/images/placeholder-cover-400x600.png' WHERE id = 1"),
      local.db.prepare("UPDATE MediaAssistanceTargets SET status = 'satisfied' WHERE game_id = 1"),
      local.db.prepare(
        "UPDATE MediaAssistanceWorks SET status = 'completed', checked_revision = (SELECT revision FROM GameContent WHERE game_id = 1) WHERE game_id = 1",
      ),
    ]);
    const again = await claimWork(local.db, { gameId: 1 });
    expect(again.gameId).toBe(1);
    expect((await listTargets(local.db, 1)).find((row) => row.target_json.includes('"cover"'))?.status).toBe('pending');
  }, 30000);
});
