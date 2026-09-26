/**
 * 小游戏创作 Skill 单源内容。
 * 页面（/skills/create-minigame）与下载 API（/api/skills/create-minigame/skill-md）共用。
 *
 * 核心目标：
 * 1. 剧情玩法化：为互动小说剧情节点设计高度契合的小游戏（解谜、QTE、轻对战、密码锁等）。
 * 2. 规范化生命周期：基于 MiniGamePlayer 的 ES Module 标准契约（init, onComplete, destroy）编写可运行代码。
 * 3. 变量与分支双向打通：小游戏接收环境状态，结算后将更新变量回传给宿主，触发后续条件分支。
 * 4. 一键部署与挂接：利用 MCP uploadAsset 上传 JavaScript 并将 minigame 挂进场景 DSL。
 */

export interface CreateMinigameStep {
  slug: string;
  name: string;
  title: string;
  goal: string;
  prompt: string;
  tools: string[];
  doneCriteria: string;
}

function wrapSkillMd(name: string, description: string, body: string): string {
  return `---\nname: ${name}\ndescription: ${description}\n---\n\n${body}`;
}

export const CREATE_MINIGAME_PROMPT = `你是我的互动小说小游戏（Mini-game）创作专家。我希望在我的互动小说中某个关键场景嵌入一个高沉浸感的互动小游戏。

请按以下规范指导我或协助我完成创作：
1. 先确认目标游戏与场景（可调用 listGames / getGameInfo / getDsl 查看现状），明确小游戏在剧情中的作用（如：解开密室大门、打赢小怪、拆解炸弹、好感度问答）。
2. 设计玩法规则与变量契约：
   - 输入变量：剧本传入小游戏的初始状态（如 player_hp、luck_stat）。
   - 结算变量：小游戏完成时回传宿主的键值字典（如 unlocked: true, score: 80），用于驱动后续条件选项 (if: unlocked == true)。
3. 严格遵循 Mui Gamebook 的标准 ES 模块运行时契约编写单文件 JavaScript 代码：
   - 必须导出包含 init(container, variables)、onComplete(callback)、destroy() 的对象。
   - 所有样式内联化或局部作用域注入，严禁污染宿主；适配移动端触控与桌面端点击。
   - 必须包含“跳过/直接结算”兜底交互，防止卡关。
4. 调用 MCP 工具 uploadAsset（contentType: 'application/javascript'）将小游戏 JS 上传到 CDN 并拿到 URL。
5. 将 minigame 元数据块写入场景 YAML（包含 prompt、variables 和 url），并用 setGameDsl 挂接，在播放页完成实机闭环联调。`;

export const CREATE_MINIGAME_STEPS: CreateMinigameStep[] = [
  {
    slug: 'design',
    name: 'mui-gamebook-minigame-design',
    title: '第 1 步：剧情契合度与玩法设计',
    goal: '结合当前场景的高潮事件，确定小游戏机制（密码锁/连线解谜/反应QTE/记忆翻牌/轻战斗），设计输入与结算变量。',
    tools: ['getGameInfo', 'getDsl'],
    prompt:
      '请帮我针对当前场景设计一款小游戏。要求：1. 玩法紧贴故事高潮；2. 耗时 30-90 秒；3. 明确回传给剧情的结算变量（如 puzzle_solved、combat_win、intel_score），以及后续分支如何利用这些变量。',
    doneCriteria: '玩法规则、视觉概念与结算变量表获批，与剧情上下文天衣无缝。',
  },
  {
    slug: 'variables',
    name: 'mui-gamebook-minigame-variables',
    title: '第 2 步：剧本变量与分支条件配置',
    goal: '在剧本 initialState 中声明小游戏相关变量，并在场景后续编写条件分支选项与失败兜底。',
    tools: ['addVariable', 'addChoice', 'updateChoiceCondition', 'setGameDsl'],
    prompt:
      '请在剧本中注册小游戏使用的变量，并在小游戏场景下配置基于变量的选项分支（例如：* [继续前进] -> next (if: unlocked == true)）。每个场景必须留有一个无条件选项作为兜底。',
    doneCriteria: '变量在 DSL 中完成声明，选项分支条件完备，逻辑无死路。',
  },
  {
    slug: 'code',
    name: 'mui-gamebook-minigame-code',
    title: '第 3 步：编写自包含 ES 模块代码',
    goal: '严格按 MiniGamePlayer 规范编写单文件 JavaScript 代码，实现 init、onComplete、destroy 接口。',
    tools: ['uploadAsset'],
    prompt:
      '请编写单文件标准 ES 模块代码。必须实现：init(container, variables) 挂载画布与渲染；onComplete(callback) 回传变量字典；destroy() 清理定时器与事件。样式自带局部 CSS，支持响应式与触控，并提供跳过兜底。',
    doneCriteria: '输出可独立运行的 JavaScript 模块代码，语法无错，完全符合生命周期契约。',
  },
  {
    slug: 'deploy',
    name: 'mui-gamebook-minigame-deploy',
    title: '第 4 步：上传 CDN 并挂接场景 DSL',
    goal: '使用 uploadAsset 上传代码获取公网 URL，将 minigame 节点写入场景标题后的首个 YAML 块。',
    tools: ['uploadAsset', 'setGameDsl', 'getDsl'],
    prompt:
      '请将写好的小游戏 JS 转为 base64，调用 uploadAsset 上传到素材存储获取 URL。然后将 minigame: { prompt, variables, url } 挂进目标场景的 YAML 元数据块中，先 dryRun 校验再写库。',
    doneCriteria: '小游戏代码成功上传，场景 YAML 包含有效的 minigame 配置且 dryRun 通过。',
  },
  {
    slug: 'test',
    name: 'mui-gamebook-minigame-test',
    title: '第 5 步：播放页实机调试与体验优化',
    goal: '在 /play/<slug> 实际打开小游戏，验证操作手感、结算时机、变量回传与分支跳转顺畅。',
    tools: ['getGameInfo', 'updateGameMeta'],
    prompt:
      '请给出小游戏的试玩检查清单，指导我在播放页进行实机测试：1. 点击开始后加载是否顺畅；2. 通关或失败时变量是否正确生效；3. 场景选项是否根据结算状态实时解锁。',
    doneCriteria: '小游戏在真机/浏览器中完美通关，变量同步成功驱动后续故事展开。',
  },
];

const MINIGAME_BODY = `## 适用场景

互动小说不只是“看字点选项”。在**开锁解谜、拆除机关、心理对峙、反应按键、轻度回合战斗、地图探查**等高潮情节中，嵌入一个 30-90 秒的原生轻量小游戏，能极大提升作品的代入感与游戏性。

---

## 核心架构与运行机制

Mui Gamebook 播放器内置了强大的 \`MiniGamePlayer\` 引擎。当玩家进入包含 \`minigame\` 的场景时：
1. 宿主通过动态 \`import()\` 加载小游戏的 JavaScript ES 模块。
2. 宿主调用模块的 \`init(container, variables)\`，将 DOM 容器与剧本当前变量状态注入。
3. 玩家在容器内进行交互游戏。
4. 游戏结束或通关时，小游戏调用 \`onComplete(updatedVariables)\`。
5. 宿主将回传变量合并至游戏全局状态机，**自动刷新条件选项与分支流转**。
6. 切离场景时，宿主调用 \`destroy()\` 优雅释放内存。

---

## 代码契约规范（必须完全遵守）

小游戏代码必须是**标准 ES 模块单文件**，默认导出（或导出）实现以下接口的对象：

\`\`\`javascript
export default {
  /**
   * 初始化小游戏
   * @param {HTMLElement} container - 宿主提供的挂载 DOM 容器
   * @param {Record<string, number | string | boolean>} variables - 当前剧本中注入的变量
   */
  init(container, variables) {
    this.container = container;
    this.completeCallback = null;
    this.timer = null;

    // 1. 创建 UI 骨架（推荐自包含样式，避免外部污染）
    this.container.innerHTML = \`
      <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;min-height:280px;background:#18181b;color:#fafafa;border-radius:12px;padding:16px;font-family:sans-serif;user-select:none;">
        <h3 style="margin:0 0 12px 0;font-size:18px;">🔐 破解电子密码锁</h3>
        <p style="font-size:13px;color:#a1a1aa;margin:0 0 16px 0;">输入正确的 4 位密码即可通过</p>
        <div id="display" style="font-family:monospace;font-size:24px;letter-spacing:6px;background:#27272a;padding:8px 24px;border-radius:8px;margin-bottom:16px;">----</div>
        <div style="display:grid;grid-template-columns:repeat(3, 1fr);gap:8px;width:180px;">
          <!-- 动态按钮 -->
        </div>
        <button id="skip-btn" style="margin-top:16px;background:transparent;border:none;color:#71717a;font-size:12px;cursor:pointer;text-decoration:underline;">
          跳过此关卡
        </button>
      </div>
    \`;

    // 2. 绑定事件与逻辑 ...
  },

  /**
   * 注册通关回调
   * @param {(updatedVars: Record<string, number | string | boolean>) => void} callback
   */
  onComplete(callback) {
    this.completeCallback = callback;
  },

  /**
   * 宿主切场景或重开时的销毁方法
   */
  destroy() {
    if (this.timer) clearInterval(this.timer);
    if (this.container) this.container.innerHTML = '';
  }
};
\`\`\`

---

## DSL 中的声明语法

在场景标题下方的**首个 \`\`\`yaml 元数据块**中写入：

\`\`\`markdown
# lock_room
\`\`\`yaml
minigame:
  prompt: '玩家需要根据线索输入 4 位密码破解防盗门'
  variables:
    door_unlocked: 门是否解开
    security_alert: 是否触发警报
  url: "https://your-domain.com/path/to/game.js"
\`\`\`

门前横亘着一道精密的电子密码锁，屏幕泛着幽蓝的冷光。

* [推门进入] -> inside_vault (if: door_unlocked == true)
* [警报大作，准备迎敌] -> security_fight (if: security_alert == true)
* [放弃破解，另寻出路] -> hallway
\`\`\`

---

## 避坑铁律

1. **兜底退出机制**：互动小说重在故事体验，小游戏界面**必须留有“跳过 / 放弃”按钮**（调用 \`callback({ door_unlocked: false })\`），切忌因为难度或兼容性导致玩家死锁卡关。
2. **样式隔离**：严禁修改 \`document.body\` 或全局样式；所有 CSS 应通过内联 \`style="..."\` 或容器内独立 \`<style>\` 注入。
3. **移动端适配**：点击事件优先使用 \`pointerdown\` 或同时监听 \`click\`，避免移动设备 300ms 延迟或触摸穿透。
4. **清理资源**：在 \`destroy()\` 中务必清空定时器、事件监听器和 AudioContext，避免内存泄漏。
`;

export const CREATE_MINIGAME_SKILL_MD = wrapSkillMd(
  'mui-gamebook-create-minigame',
  '为互动小说创作并嵌入互动小游戏（Mini-game）：设计玩法与变量契约、编写标准 ES 模块代码、利用 uploadAsset 部署、挂接场景 DSL 驱动分支剧情。当用户要为游戏增加互动解谜、QTE、小游戏时使用。',
  `# Mui Gamebook 小游戏创作指南\n\n> 远程 MCP 端点：\`https://muistory.com/api/mcp\`\n> 核心定位：**剧情玩法化、变量回传驱动分支、严守 ES 模块生命周期契约**。\n\n${MINIGAME_BODY}`,
);
