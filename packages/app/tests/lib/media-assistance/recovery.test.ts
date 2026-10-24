// @vitest-environment node
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { stringify, parse } from '@roudanio/parser';
import { createRuntime, insertGame, story } from './runtime';
import { claimWork, finishWork } from '@/lib/media-assistance/work';
import { savePlan } from '@/lib/media-assistance/plan';
import { claimItem, updateItem } from '@/lib/media-assistance/generation';
import { applyAsset } from '@/lib/media-assistance/apply';
import { listTargets, loadAssistanceGame, getGeneration } from '@/lib/media-assistance/store';
import { uploadAssistanceAsset } from '@/lib/media-assistance/upload';
import { sha256 } from '@/lib/media-assistance/hash';
import { saveEditorContent } from '@/lib/media-assistance/editor-save';
import { gameToFlow, flowToGame } from '@/lib/editor/transformers';
import type { GenerationInput } from '@/lib/media-assistance/types';

let local: Awaited<ReturnType<typeof createRuntime>>;
beforeAll(async () => {
  local = await createRuntime();
}, 30000);
afterAll(async () => {
  await local?.runtime.dispose();
});
beforeEach(async () => {
  await local.db.batch(
    [
      'MediaAssistanceTargets',
      'MediaAssistanceGenerations',
      'MediaAssistanceWorks',
      'GameContent',
      'Games',
      'GameAnalytics',
    ].map((table) => local.db.prepare(`DELETE FROM ${table}`)),
  );
  const objects = (await local.bucket.list()).objects;
  if (objects.length) await local.bucket.delete(objects.map((object) => object.key));
});

function imageInput(prompt = '场景'): GenerationInput {
  return { kind: 'image', prompt, referenceHashes: [], parameters: {} };
}

async function setupImage() {
  await insertGame(local.db, 1);
  const work = await claimWork(local.db);
  await savePlan(local.db, 1, Number(work.revision), [
    { target: { kind: 'image', sceneId: 'scene_0' }, input: imageInput() },
  ]);
  const [target] = await listTargets(local.db, 1);
  const claimed = await claimItem(local.db, 1, target.id, 'persistent-request');
  return { target, token: 'executionToken' in claimed ? String(claimed.executionToken) : '' };
}

async function upload(hash: string, token: string, contentType = 'image/png', checksum?: string) {
  const bytes = 'generated-file';
  return uploadAssistanceAsset(
    local.db,
    local.bucket,
    'https://assets.example.test',
    new Request('https://local/upload', {
      method: 'POST',
      body: bytes,
      headers: {
        'Content-Length': String(bytes.length),
        'Content-Type': contentType,
        'X-Execution-Token': token,
        'X-Content-SHA256': checksum ?? (await sha256(bytes)),
      },
    }),
    1,
    hash,
  );
}

describe('素材恢复与增量边界', () => {
  it('复制场景导致稳定标识重复时暂停该项，不能写到第一个匹配场景', async () => {
    const { target, token } = await setupImage();
    await upload(target.input_hash, token);
    const loaded = await loadAssistanceGame(local.db, 1);
    loaded.game.scenes.copy = { ...loaded.game.scenes.scene_0, id: 'copy' };
    await local.db.prepare('UPDATE GameContent SET content=? WHERE game_id=1').bind(stringify(loaded.game)).run();
    expect((await applyAsset(local.db, 1, target.id, target.input_hash)).status).toBe('paused');
    const row = (await listTargets(local.db, 1))[0];
    expect(row.error).toContain('稳定标识重复');
    expect(row.applied_url).toBeNull();
  });

  it('暂停后找到原产物，通过原凭据恢复上传，不重置生成请求', async () => {
    const { target, token } = await setupImage();
    await updateItem(local.db, 1, target.input_hash, {
      action: 'pause',
      executionToken: token,
      reason: '等待核对文件',
    });
    await updateItem(local.db, 1, target.input_hash, {
      action: 'checkpoint',
      executionToken: token,
      providerTaskId: 'original-task',
    });
    await upload(target.input_hash, token);
    const result = await getGeneration(local.db, 1, target.input_hash);
    expect(result).toMatchObject({
      status: 'ready',
      request_id: 'persistent-request',
      provider_task_id: 'original-task',
    });
  });

  it('元数据接口更换封面同样使旧保存版本失效，后续回填保留新封面', async () => {
    const { target, token } = await setupImage();
    const old = await loadAssistanceGame(local.db, 1);
    await local.db.prepare("UPDATE Games SET cover_image='https://author.test/new-cover.png' WHERE id=1").run();
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
    await upload(target.input_hash, token);
    await applyAsset(local.db, 1, target.id, target.input_hash);
    expect((await loadAssistanceGame(local.db, 1)).game.cover_image).toBe('https://author.test/new-cover.png');
  });

  it('没有登记所有已声明素材时不能把规划标记为完成', async () => {
    await insertGame(local.db, 1, story(2));
    const work = await claimWork(local.db);
    await expect(savePlan(local.db, 1, Number(work.revision), [])).rejects.toThrow('未纳入计划');
  });

  it('站方生成角色立绘不会使同角色的其他场景图任务失效', async () => {
    await insertGame(
      local.db,
      1,
      `---\ntitle: 主角\npublished: true\nai:\n  characters:\n    hero:\n      name: 主角\n      description: 蓝色衣服\n---\n# start\n\n\`\`\`yaml\nimage:\n  prompt: 主角在湖边\n  character: hero\n\`\`\`\n正文`,
    );
    const work = await claimWork(local.db);
    await savePlan(local.db, 1, Number(work.revision), [
      { target: { kind: 'image', sceneId: 'start' }, input: imageInput('主角在湖边') },
      { target: { kind: 'character', characterId: 'hero' }, input: imageInput('主角立绘') },
    ]);
    const targets = await listTargets(local.db, 1);
    const character = targets.find((row) => row.target_key.startsWith('character:'))!;
    const image = targets.find((row) => row.id !== character.id)!;
    const claim = await claimItem(local.db, 1, character.id, 'character-request');
    await upload(character.input_hash, 'executionToken' in claim ? String(claim.executionToken) : '');
    await applyAsset(local.db, 1, character.id, character.input_hash);
    expect(await claimItem(local.db, 1, image.id, 'scene-request')).toMatchObject({
      status: 'generating',
      executionToken: expect.any(String),
    });
  });

  it('上传响应丢失、数据库登记丢失都能复用原文件，错误 checksum 不会变为 ready', async () => {
    const { target, token } = await setupImage();
    await expect(upload(target.input_hash, token, 'image/png', 'a'.repeat(64))).rejects.toThrow();
    expect((await getGeneration(local.db, 1, target.input_hash)).status).toBe('generating');
    const first = await upload(target.input_hash, token);
    await local.db
      .prepare(
        "UPDATE MediaAssistanceGenerations SET status='generating',output_url=NULL,output_key=NULL,file_hash=NULL",
      )
      .run();
    const second = await upload(target.input_hash, token);
    expect(second.output_url).toBe(first.output_url);
    expect((await local.bucket.list()).objects).toHaveLength(1);
  });

  it('旧 prompt 的结果晚到不能应用到作者修改后的目标', async () => {
    const { target, token } = await setupImage();
    await upload(target.input_hash, token);
    const loaded = await loadAssistanceGame(local.db, 1);
    const image = loaded.game.scenes.scene_0.nodes.find((node) => node.type === 'ai_image');
    if (image?.type !== 'ai_image') throw new Error('missing');
    image.prompt = '作者新需求';
    await local.db.prepare('UPDATE GameContent SET content=? WHERE game_id=1').bind(stringify(loaded.game)).run();
    expect((await applyAsset(local.db, 1, target.id, target.input_hash)).status).toBe('paused');
    const next = await loadAssistanceGame(local.db, 1);
    await savePlan(local.db, 1, next.revision, [
      { target: { kind: 'image', sceneId: 'scene_0' }, input: imageInput('作者新需求') },
    ]);
    await expect(applyAsset(local.db, 1, target.id, target.input_hash)).rejects.toThrow('旧结果');
  });

  it('分批规划中断后仍提示 needsPlanning，不会把半份清单算成完成', async () => {
    await insertGame(local.db, 1, story(2));
    const work = await claimWork(local.db);
    await savePlan(
      local.db,
      1,
      Number(work.revision),
      [{ target: { kind: 'image', sceneId: 'scene_0' }, input: imageInput() }],
      false,
    );
    expect((await claimWork(local.db)).needsPlanning).toBe(true);
    await expect(finishWork(local.db, 1)).rejects.toThrow('规划');
  });

  it('封面、角色、视频、音乐、音效及对白语音都能按目标应用', async () => {
    const content = `---\ntitle: 多媒体\npublished: true\nai:\n  characters:\n    hero:\n      name: 主角\n---\n# start\n@hero: 你好\n\n# other\n另一段故事`;
    await insertGame(local.db, 1, content);
    const work = await claimWork(local.db);
    const speech = work.speechTargets as { kind: string; sceneId: string; textHash: string; occurrence: number }[];
    const items = [
      { target: { kind: 'cover' }, input: imageInput('封面') },
      { target: { kind: 'character', characterId: 'hero' }, input: imageInput('角色') },
      { target: { kind: 'video', sceneId: 'start' }, input: { ...imageInput('视频'), kind: 'video' } },
      { target: { kind: 'audio', sceneId: 'start' }, input: { ...imageInput('音乐'), kind: 'music' } },
      { target: { kind: 'audio', sceneId: 'other' }, input: { ...imageInput('音效'), kind: 'sfx' } },
      { target: speech[0], input: { ...imageInput('你好'), kind: 'speech' } },
    ];
    await savePlan(local.db, 1, Number(work.revision), items);
    for (const target of await listTargets(local.db, 1)) {
      const claim = await claimItem(local.db, 1, target.id, target.id);
      const generation = await getGeneration(local.db, 1, target.input_hash);
      const input = JSON.parse(generation.input_json) as GenerationInput;
      await upload(
        target.input_hash,
        'executionToken' in claim ? String(claim.executionToken) : '',
        input.kind === 'image' ? 'image/png' : input.kind === 'video' ? 'video/mp4' : 'audio/mpeg',
      );
      await applyAsset(local.db, 1, target.id, target.input_hash);
    }
    const game = (await loadAssistanceGame(local.db, 1)).game;
    expect(game.cover_image).toContain('https://');
    expect(game.ai.characters?.hero.image_url).toContain('https://');
    const flow = gameToFlow(game);
    const roundTrip = parse(stringify(flowToGame(flow.nodes, flow.edges, game)));
    if (!roundTrip.success) throw new Error('roundtrip failed');
    expect(roundTrip.data.scenes.start.extra).toEqual(game.scenes.start.extra);
    expect(roundTrip.data.scenes.start.nodes.find((node) => node.type === 'dialogue')).toMatchObject({
      audio_url: expect.stringContaining('https://'),
    });
    expect((await finishWork(local.db, 1)).status).toBe('completed');
  });

  it('场景改名及编辑器往返不重复创建素材位置', async () => {
    const { target } = await setupImage();
    const loaded = await loadAssistanceGame(local.db, 1);
    const scene = loaded.game.scenes.scene_0;
    delete loaded.game.scenes.scene_0;
    scene.id = 'renamed';
    loaded.game.scenes.renamed = scene;
    const flow = gameToFlow(loaded.game);
    await local.db
      .prepare('UPDATE GameContent SET content=? WHERE game_id=1')
      .bind(stringify(flowToGame(flow.nodes, flow.edges, loaded.game)))
      .run();
    const work = await claimWork(local.db);
    await savePlan(local.db, 1, Number(work.revision), [
      { target: { kind: 'image', sceneId: 'renamed' }, input: imageInput('不应重新生成') },
    ]);
    expect((await listTargets(local.db, 1)).map((row) => row.id)).toEqual([target.id]);
  });

  it('并发领取作品保持唯一当前作品；下架、封禁及未同意作品不入队', async () => {
    for (let id = 1; id <= 4; id++) await insertGame(local.db, id, story(), id * 100);
    await local.db.batch([
      local.db.prepare('UPDATE Games SET published=0 WHERE id=4'),
      local.db.prepare('UPDATE Games SET shadow_banned=1 WHERE id=3'),
      local.db.prepare('UPDATE Games SET media_assistance_enabled=0 WHERE id=2'),
    ]);
    const works = await Promise.all([claimWork(local.db), claimWork(local.db)]);
    expect(works.map((work) => work.gameId)).toEqual([1, 1]);
    expect(
      (
        await local.db
          .prepare("SELECT COUNT(*) AS n FROM MediaAssistanceWorks WHERE status='active'")
          .first<{ n: number }>()
      )?.n,
    ).toBe(1);
  });

  it('真实 Worker Request.body 可直接流式传入 R2，超过 8 MB 不需转 base64', async () => {
    const body = 'x'.repeat(9 * 1024 * 1024);
    const response = await local.runtime.dispatchFetch('http://local/stream', {
      method: 'PUT',
      body,
      headers: { 'Content-Length': String(body.length), 'X-Content-SHA256': await sha256(body) },
    });
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ size: body.length });
  }, 30000);
});
