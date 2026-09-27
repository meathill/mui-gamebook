import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { startPreviewServer } from '../src/preview/server';

const TEST_FILE = path.resolve(__dirname, 'temp_preview_story.md');
const SCRIPT = `---
title: "预览测试剧本"
---

# start
这是预览内容。

* [继续] -> end

# end
这是结局。
`;

describe('startPreviewServer', () => {
  beforeEach(() => {
    fs.writeFileSync(TEST_FILE, SCRIPT, 'utf-8');
  });

  afterEach(() => {
    if (fs.existsSync(TEST_FILE)) {
      fs.unlinkSync(TEST_FILE);
    }
  });

  it('成功启动预览服务器并响应 HTML 与 API 数据', async () => {
    const instance = await startPreviewServer({
      filePath: TEST_FILE,
      port: 0, // 动态端口
    });

    try {
      expect(instance.port).toBeGreaterThan(0);
      expect(instance.url).toContain('http://localhost:');

      // 验证 GET / 返回 HTML
      const htmlRes = await fetch(`${instance.url}/`);
      expect(htmlRes.status).toBe(200);
      const htmlText = await htmlRes.text();
      expect(htmlText).toContain('Mui Gamebook');

      // 验证 GET /api/game 返回解析后的 JSON
      const apiRes = await fetch(`${instance.url}/api/game`);
      expect(apiRes.status).toBe(200);
      const gameData: any = await apiRes.json();
      expect(gameData.title).toBe('预览测试剧本');
      expect(gameData.scenes.start).toBeDefined();
    } finally {
      await instance.close();
    }
  });
});
