import { createRequire } from 'node:module';
import { readFile } from 'node:fs/promises';

interface LocalRuntime {
  getD1Database(name: string): Promise<D1Database>;
  getR2Bucket(name: string): Promise<R2Bucket>;
  dispose(): Promise<void>;
}

// 复用项目已安装的 Wrangler 配套 Miniflare，不加载项目配置或任何 .env。
const require = createRequire(import.meta.url);
const wranglerRequire = createRequire(require.resolve('wrangler/package.json'));
const { Miniflare } = wranglerRequire('miniflare') as {
  Miniflare: new (options: Record<string, unknown>) => LocalRuntime;
};

export async function createRuntime() {
  const runtime = new Miniflare({
    modules: true,
    script: 'export default { fetch() { return new Response("ok") } }',
    compatibilityDate: '2026-06-25',
    d1Databases: ['DB'],
    r2Buckets: ['ASSETS_BUCKET'],
  });
  const db = await runtime.getD1Database('DB');
  await db.batch([
    db.prepare('CREATE TABLE user(id TEXT PRIMARY KEY, email TEXT, is_admin INTEGER DEFAULT 0)'),
    db.prepare(`CREATE TABLE Games(id INTEGER PRIMARY KEY, slug TEXT, title TEXT, description TEXT, background_story TEXT,
      cover_image TEXT, tags TEXT, published INTEGER DEFAULT 1, shadow_banned INTEGER DEFAULT 0, owner_id TEXT,
      story_prompt TEXT, updated_at INTEGER DEFAULT 1)`),
    db.prepare(
      'CREATE TABLE GameContent(id INTEGER PRIMARY KEY,game_id INTEGER REFERENCES Games(id) ON DELETE CASCADE,content TEXT NOT NULL)',
    ),
    db.prepare('CREATE TABLE GameAnalytics(game_id INTEGER,open_count INTEGER)'),
  ]);
  const migration = await readFile(new URL('../../../migrations/0011_media_assistance.sql', import.meta.url), 'utf8');
  let statement = '';
  let trigger = false;
  for (const line of migration.split('\n')) {
    if (line.trim().startsWith('--')) continue;
    statement += `${line}\n`;
    if (line.startsWith('CREATE TRIGGER')) trigger = true;
    if (line.trim().endsWith(';') && (!trigger || line.trim() === 'END;')) {
      await db.prepare(statement).run();
      statement = '';
      trigger = false;
    }
  }
  const rawBucket = await runtime.getR2Bucket('ASSETS_BUCKET');
  // Node→Miniflare RPC 无法保留 Request 流的 known-length 标记；仅测试桥接转为字节。
  // 生产路由直接把真实 Worker Request.body 流传入 R2，不做此转换。
  const bucket = new Proxy(rawBucket, {
    get(target, property) {
      if (property === 'put')
        return async (key: string, value: ReadableStream | ArrayBuffer, options?: R2PutOptions) =>
          target.put(key, value instanceof ReadableStream ? await new Response(value).arrayBuffer() : value, options);
      const value = Reflect.get(target, property);
      return typeof value === 'function' ? value.bind(target) : value;
    },
  });
  return { runtime, db, bucket };
}

export function story(images = 1) {
  return (
    `---\ntitle: 测试\npublished: true\n---\n# start\n开场\n` +
    Array.from(
      { length: images },
      (_, index) => `\n# scene_${index}\n\n\`\`\`yaml\nimage:\n  prompt: 图片 ${index}\n\`\`\`\n\n故事 ${index}\n`,
    ).join('\n')
  );
}

export async function insertGame(db: D1Database, id: number, content = story(), visits = 0) {
  await db.batch([
    db
      .prepare('INSERT INTO Games(id,slug,title,owner_id,media_assistance_enabled) VALUES (?,?,?, ?,1)')
      .bind(id, `game-${id}`, '测试', 'author'),
    db.prepare('INSERT INTO GameContent(game_id,content) VALUES (?,?)').bind(id, content),
    db.prepare('INSERT INTO GameAnalytics(game_id,open_count) VALUES (?,?)').bind(id, visits),
  ]);
}
