import { createHash } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { extname } from 'node:path';
import { Readable } from 'node:stream';
import { parseArgs } from 'node:util';

const MIME_TYPES: Record<string, string> = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav',
  '.ogg': 'audio/ogg',
  '.m4a': 'audio/mp4',
};

const { values } = parseArgs({
  options: {
    file: { type: 'string' },
    game: { type: 'string' },
    hash: { type: 'string' },
    mime: { type: 'string' },
  },
});

async function main() {
  const file = values.file;
  const gameId = Number(values.game);
  const hash = values.hash;
  const apiKey = process.env.MUI_GAMEBOOK_API_KEY;
  const executionToken = process.env.MEDIA_ASSISTANCE_EXECUTION_TOKEN;
  if (
    !file ||
    !Number.isSafeInteger(gameId) ||
    gameId < 1 ||
    !hash ||
    !/^[a-f0-9]{64}$/.test(hash) ||
    !apiKey ||
    !executionToken
  ) {
    throw new Error(
      '用法：配置 MUI_GAMEBOOK_API_KEY、MEDIA_ASSISTANCE_EXECUTION_TOKEN，然后传 --file 路径 --game 作品ID --hash 输入hash（可选 --mime）。脚本不会读取 .env。',
    );
  }
  const { size } = await stat(file);
  if (size <= 0 || size > 64 * 1024 * 1024) throw new Error('文件必须在 1 字节至 64 MiB 之间');
  const contentType = values.mime ?? MIME_TYPES[extname(file).toLowerCase()];
  if (!contentType) throw new Error('无法识别文件类型，请传 --mime');
  const digest = createHash('sha256');
  for await (const chunk of createReadStream(file)) digest.update(chunk);
  const url = new URL('/api/agent/media-assistance/upload', process.env.MUI_GAMEBOOK_URL ?? 'https://muistory.com');
  url.searchParams.set('gameId', String(gameId));
  url.searchParams.set('inputHash', hash);
  const options: RequestInit & { duplex: 'half' } = {
    method: 'POST',
    duplex: 'half',
    body: Readable.toWeb(createReadStream(file)) as ReadableStream,
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'X-Execution-Token': executionToken,
      'X-Content-SHA256': digest.digest('hex'),
      'Content-Type': contentType,
      'Content-Length': String(size),
    },
  };
  const response = await fetch(url, options);
  if (!response.ok)
    throw new Error(`上传失败（HTTP ${response.status}）：${await response.text()}。保留文件重试上传，不要重新生成。`);
  process.stdout.write(`${JSON.stringify(await response.json(), null, 2)}\n`);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : '上传失败');
  process.exitCode = 1;
});
