/**
 * 内置轻量离线播放器单页应用：无需任何外部依赖或 CDN，开箱即用。
 */
export function getPreviewHtml(): string {
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Mui Gamebook 本地预览与调试器</title>
  <style>
    :root {
      --bg: #0f172a;
      --card-bg: #1e293b;
      --card-border: #334155;
      --text-main: #f8fafc;
      --text-muted: #94a3b8;
      --accent: #f59e0b;
      --accent-hover: #d97706;
      --success: #10b981;
      --danger: #ef4444;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      background-color: var(--bg);
      color: var(--text-main);
      min-height: 100vh;
      display: flex;
      flex-direction: column;
    }
    header {
      background: var(--card-bg);
      border-bottom: 1px solid var(--card-border);
      padding: 12px 24px;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .header-left { display: flex; align-items: center; gap: 12px; }
    .badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 4px 10px;
      border-radius: 9999px;
      font-size: 12px;
      font-weight: 600;
      background: rgba(16, 185, 129, 0.15);
      color: var(--success);
      border: 1px solid rgba(16, 185, 129, 0.3);
    }
    .badge.disconnected {
      background: rgba(239, 68, 68, 0.15);
      color: var(--danger);
      border-color: rgba(239, 68, 68, 0.3);
    }
    .dot { width: 8px; height: 8px; border-radius: 50%; background: currentColor; }
    .main-layout {
      display: grid;
      grid-template-columns: 1fr 340px;
      flex: 1;
      height: calc(100vh - 61px);
    }
    .player-area {
      overflow-y: auto;
      padding: 40px 24px;
      display: flex;
      justify-content: center;
    }
    .story-card {
      width: 100%;
      max-width: 680px;
      background: var(--card-bg);
      border: 1px solid var(--card-border);
      border-radius: 16px;
      padding: 32px;
      box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.3);
      height: fit-content;
    }
    .scene-meta {
      font-size: 13px;
      color: var(--text-muted);
      margin-bottom: 20px;
      display: flex;
      justify-content: space-between;
      border-bottom: 1px solid var(--card-border);
      padding-bottom: 12px;
    }
    .prose-block {
      line-height: 1.8;
      font-size: 17px;
      margin-bottom: 24px;
    }
    .prose-block p { margin-bottom: 14px; }
    .dialogue {
      background: rgba(245, 158, 11, 0.08);
      border-left: 3px solid var(--accent);
      padding: 10px 16px;
      border-radius: 0 8px 8px 0;
      margin-bottom: 14px;
    }
    .dialogue-speaker {
      font-weight: 700;
      color: var(--accent);
      margin-bottom: 4px;
    }
    .choices-list {
      display: flex;
      flex-direction: column;
      gap: 12px;
      margin-top: 24px;
    }
    .choice-btn {
      background: #283548;
      border: 1px solid var(--card-border);
      color: var(--text-main);
      padding: 14px 20px;
      border-radius: 10px;
      text-align: left;
      font-size: 15px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.15s ease;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .choice-btn:hover:not(:disabled) {
      background: #334155;
      border-color: var(--accent);
      transform: translateY(-1px);
    }
    .choice-btn:disabled {
      opacity: 0.45;
      cursor: not-allowed;
    }
    .inspector {
      background: #111827;
      border-left: 1px solid var(--card-border);
      overflow-y: auto;
      padding: 24px;
      display: flex;
      flex-direction: column;
      gap: 24px;
    }
    .inspector h3 {
      font-size: 14px;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--text-muted);
      margin-bottom: 12px;
    }
    .debug-select {
      width: 100%;
      background: var(--card-bg);
      border: 1px solid var(--card-border);
      color: var(--text-main);
      padding: 10px;
      border-radius: 8px;
      font-size: 14px;
    }
    .state-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 13px;
      font-family: monospace;
    }
    .state-table th, .state-table td {
      border: 1px solid var(--card-border);
      padding: 8px 10px;
      text-align: left;
    }
    .state-table th { background: rgba(255, 255, 255, 0.05); }
    .btn-small {
      background: var(--card-bg);
      border: 1px solid var(--card-border);
      color: var(--text-main);
      padding: 6px 12px;
      border-radius: 6px;
      cursor: pointer;
      font-size: 12px;
    }
    .btn-small:hover { background: #334155; }
    .toast {
      position: fixed;
      bottom: 24px;
      right: 24px;
      background: var(--accent);
      color: #000;
      padding: 10px 18px;
      border-radius: 8px;
      font-weight: 600;
      font-size: 13px;
      opacity: 0;
      transform: translateY(10px);
      transition: all 0.2s ease;
      pointer-events: none;
    }
    .toast.show { opacity: 1; transform: translateY(0); }
    @media (max-width: 800px) {
      .main-layout { grid-template-columns: 1fr; height: auto; }
      .inspector { border-left: none; border-top: 1px solid var(--card-border); }
    }
  </style>
</head>
<body>
  <header>
    <div class="header-left">
      <strong id="game-title" style="font-size: 16px;">Mui Gamebook 预览</strong>
      <span class="badge" id="conn-badge"><span class="dot"></span><span id="conn-text">热重载中</span></span>
    </div>
    <div>
      <button class="btn-small" onclick="resetStory()">重新开始</button>
    </div>
  </header>

  <div class="main-layout">
    <div class="player-area">
      <div class="story-card" id="story-container">
        <!-- 场景内容渲染在此 -->
      </div>
    </div>

    <div class="inspector">
      <div>
        <h3>⚡ 快速跳转场景</h3>
        <select class="debug-select" id="scene-selector" onchange="jumpToScene(this.value)">
        </select>
      </div>

      <div>
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
          <h3 style="margin-bottom:0;">📊 实时变量 (State)</h3>
          <button class="btn-small" onclick="resetVariables()">重置变量</button>
        </div>
        <table class="state-table" id="state-table">
          <thead><tr><th>变量名</th><th>当前值</th></tr></thead>
          <tbody></tbody>
        </table>
      </div>
    </div>
  </div>

  <div class="toast" id="toast">剧本已热更新</div>

  <script>
    let game = null;
    let currentSceneId = 'start';
    let runtimeState = {};
    let historyStack = [];

    function showToast(msg) {
      const toast = document.getElementById('toast');
      toast.innerText = msg;
      toast.classList.add('show');
      setTimeout(() => toast.classList.remove('show'), 2000);
    }

    function initSSE() {
      const es = new EventSource('/events');
      es.onopen = () => {
        document.getElementById('conn-badge').className = 'badge';
        document.getElementById('conn-text').innerText = '热重载已就绪';
      };
      es.onmessage = (e) => {
        try {
          const payload = JSON.parse(e.data);
          if (payload.type === 'init' || payload.type === 'update') {
            game = payload.data;
            document.getElementById('game-title').innerText = game.title || '无标题互动小说';
            updateSceneSelector();
            if (!runtimeState || Object.keys(runtimeState).length === 0) {
              runtimeState = Object.assign({}, game.initialState || {});
            }
            if (!game.scenes[currentSceneId]) {
              currentSceneId = 'start';
            }
            renderScene(currentSceneId);
            renderStateTable();
            if (payload.type === 'update') showToast('剧本已热更新！');
          }
        } catch (err) {
          console.error('SSE 解析失败', err);
        }
      };
      es.onerror = () => {
        document.getElementById('conn-badge').className = 'badge disconnected';
        document.getElementById('conn-text').innerText = '连接中断，重连中...';
      };
    }

    function updateSceneSelector() {
      const sel = document.getElementById('scene-selector');
      if (!game || !game.scenes) return;
      sel.innerHTML = '';
      for (const id of Object.keys(game.scenes)) {
        const opt = document.createElement('option');
        opt.value = id;
        opt.innerText = id + (id === 'start' ? ' (入口)' : '');
        if (id === currentSceneId) opt.selected = true;
        sel.appendChild(opt);
      }
    }

    function renderStateTable() {
      const tbody = document.querySelector('#state-table tbody');
      tbody.innerHTML = '';
      for (const [k, v] of Object.entries(runtimeState)) {
        const tr = document.createElement('tr');
        tr.innerHTML = \`<td style="color:var(--accent);">\${k}</td><td>\${JSON.stringify(v)}</td>\`;
        tbody.appendChild(tr);
      }
    }

    function jumpToScene(sceneId) {
      if (!game || !game.scenes[sceneId]) return;
      currentSceneId = sceneId;
      document.getElementById('scene-selector').value = sceneId;
      renderScene(sceneId);
    }

    function executeAssignments(stmtStr) {
      if (!stmtStr) return;
      // 简单按逗号分割多条赋值，如 has_torch = true, courage = courage + 1
      const parts = stmtStr.split(',');
      for (const raw of parts) {
        const p = raw.trim();
        const eqIdx = p.indexOf('=');
        if (eqIdx > 0) {
          const key = p.slice(0, eqIdx).trim();
          const valExpr = p.slice(eqIdx + 1).trim();
          try {
            // 构造安全求值函数
            const fn = new Function(...Object.keys(runtimeState), \`return \${valExpr};\`);
            runtimeState[key] = fn(...Object.values(runtimeState));
          } catch {
            if (valExpr === 'true') runtimeState[key] = true;
            else if (valExpr === 'false') runtimeState[key] = false;
            else if (!isNaN(Number(valExpr))) runtimeState[key] = Number(valExpr);
            else runtimeState[key] = valExpr.replace(/^["']|["']$/g, '');
          }
        }
      }
      renderStateTable();
    }

    function checkCondition(cond) {
      if (!cond || !cond.trim()) return true;
      try {
        const fn = new Function(...Object.keys(runtimeState), \`return Boolean(\${cond});\`);
        return fn(...Object.values(runtimeState));
      } catch {
        return false;
      }
    }

    function chooseOption(target, setExpr) {
      if (setExpr) executeAssignments(setExpr);
      jumpToScene(target);
    }

    function renderScene(sceneId) {
      const container = document.getElementById('story-container');
      const scene = game?.scenes?.[sceneId];
      if (!scene) {
        container.innerHTML = \`<p style="color:var(--danger)">场景 "\${sceneId}" 不存在</p>\`;
        return;
      }

      let html = \`<div class="scene-meta"><span>当前场景: #\${sceneId}</span><span>共 \${scene.nodes.length} 个节点</span></div>\`;

      const choices = [];

      for (const node of scene.nodes) {
        if (node.type === 'dialogue') {
          const spk = node.speaker || node.character;
          html += \`<div class="dialogue"><div class="dialogue-speaker">@\${spk}</div><div>\${node.content}</div></div>\`;
        } else if (node.type === 'text') {
          const formatted = (node.content || '').replace(/\n\n+/g, '</p><p>').replace(/\n/g, '<br/>');
          html += \`<div class="prose-block"><p>\${formatted}</p></div>\`;
        } else if (node.type === 'prose') {
          html += '<div class="prose-block">';
          for (const line of (node.paragraphs || [])) {
            html += \`<p>\${line}</p>\`;
          }
          html += '</div>';
        } else if (node.type === 'choice') {
          choices.push(node);
        } else if (node.type === 'redirect') {
          const target = node.nextSceneId || node.target;
          if (checkCondition(node.condition)) {
            setTimeout(() => jumpToScene(target), 300);
            html += \`<p style="color:var(--accent); font-style:italic;">跳转至 \${target} ...</p>\`;
          }
        }
      }

      if (choices.length > 0) {
        html += '<div class="choices-list">';
        choices.forEach((c) => {
          const allowed = checkCondition(c.condition);
          const target = c.nextSceneId || c.target;
          const condTag = c.condition ? \`<span style="font-size:12px;opacity:0.7;">(if: \${c.condition})</span>\` : '';
          html += \`<button class="choice-btn" \${allowed ? '' : 'disabled'} onclick="chooseOption('\${target}', '\${(c.set || '').replace(/'/g, "\\\\'")}')">
            <span>\${c.text || '继续'}</span>
            \${condTag}
          </button>\`;
        });
        html += '</div>';
      } else {
        html += '<div style="margin-top:32px; text-align:center; color:var(--accent); font-weight:700;">── 达成此路线结局 ──</div>';
      }

      container.innerHTML = html;
    }

    function resetStory() {
      runtimeState = Object.assign({}, game?.initialState || {});
      jumpToScene('start');
      renderStateTable();
      showToast('已重新开始故事');
    }

    function resetVariables() {
      runtimeState = Object.assign({}, game?.initialState || {});
      renderStateTable();
      renderScene(currentSceneId);
      showToast('变量已重置');
    }

    initSSE();
  </script>
</body>
</html>`;
}
