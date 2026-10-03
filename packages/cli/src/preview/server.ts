import * as http from 'http';
import * as fs from 'fs';
import * as path from 'path';
import { parse, type Game } from '@roudanio/parser';
import { getPreviewHtml } from './html';

export interface PreviewServerOptions {
  filePath: string;
  port?: number;
}

export interface PreviewServerInstance {
  server: http.Server;
  port: number;
  url: string;
  close: () => Promise<void>;
}

export function startPreviewServer(options: PreviewServerOptions): Promise<PreviewServerInstance> {
  const resolvedPath = path.resolve(process.cwd(), options.filePath);
  if (!fs.existsSync(resolvedPath)) {
    throw new Error(`文件不存在: ${options.filePath}`);
  }

  let currentGame: Game | null = null;
  const sseClients = new Set<http.ServerResponse>();

  function loadGame(): Game | null {
    try {
      const raw = fs.readFileSync(resolvedPath, 'utf-8');
      const res = parse(raw);
      if (res.success) {
        return res.data;
      }
      console.warn(`[Preview] DSL 解析警告: ${res.error}`);
      return null;
    } catch (e) {
      console.error(`[Preview] 读取文件失败: ${(e as Error).message}`);
      return null;
    }
  }

  currentGame = loadGame();

  function broadcast(type: 'init' | 'update', data: Game | null) {
    if (!data) return;
    const msg = `data: ${JSON.stringify({ type, data })}\n\n`;
    for (const client of sseClients) {
      try {
        client.write(msg);
      } catch {
        sseClients.delete(client);
      }
    }
  }

  // 监听文件变动 (带有 100ms debounce)
  let debounceTimer: NodeJS.Timeout | null = null;
  const watcher = fs.watch(resolvedPath, (event) => {
    if (event === 'change') {
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        const next = loadGame();
        if (next) {
          currentGame = next;
          broadcast('update', currentGame);
        }
      }, 100);
    }
  });

  const server = http.createServer((req, res) => {
    const url = new URL(req.url || '/', 'http://localhost');

    if (url.pathname === '/') {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(getPreviewHtml());
      return;
    }

    if (url.pathname === '/events') {
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      });
      res.write('\n');
      sseClients.add(res);

      if (currentGame) {
        res.write(`data: ${JSON.stringify({ type: 'init', data: currentGame })}\n\n`);
      }

      req.on('close', () => {
        sseClients.delete(res);
      });
      return;
    }

    if (url.pathname === '/api/game') {
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify(currentGame || {}));
      return;
    }

    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not Found');
  });

  const requestedPort = options.port || 3456;

  return new Promise((resolve, reject) => {
    server.on('error', (err: any) => {
      if (err.code === 'EADDRINUSE') {
        // 端口被占，尝试端口+1
        server.listen(requestedPort + 1);
      } else {
        reject(err);
      }
    });

    server.listen(requestedPort, () => {
      const addr = server.address();
      const actualPort = typeof addr === 'object' && addr ? addr.port : requestedPort;
      const serverUrl = `http://localhost:${actualPort}`;

      resolve({
        server,
        port: actualPort,
        url: serverUrl,
        close: () => {
          watcher.close();
          if (debounceTimer) clearTimeout(debounceTimer);
          for (const client of sseClients) {
            try {
              client.end();
            } catch {}
          }
          sseClients.clear();
          return new Promise<void>((resClose) => {
            server.close(() => resClose());
          });
        },
      });
    });
  });
}
