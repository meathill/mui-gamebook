---
name: mui-gamebook-create-minigame
description: 为互动小说创作并嵌入互动小游戏（Mini-game）：设计玩法与变量契约、编写标准 ES 模块代码、利用 uploadAsset 部署、挂接场景 DSL 驱动分支剧情。当用户要为游戏增加互动解谜、QTE、小游戏时使用。
---

# Mui Gamebook 小游戏创作指南

> 远程 MCP 端点：`https://muistory.com/api/mcp`
> 核心定位：**剧情玩法化、变量回传驱动分支、严守 ES 模块生命周期契约**。

## 适用场景

互动小说不只是“看字点选项”。在**开锁解谜、拆除机关、心理对峙、反应按键、轻度回合战斗、地图探查**等高潮情节中，嵌入一个 30-90 秒的原生轻量小游戏，能极大提升作品的代入感与游戏性。

---

## 核心架构与运行机制

Mui Gamebook 播放器内置了强大的 `MiniGamePlayer` 引擎。当玩家进入包含 `minigame` 的场景时：
1. 宿主通过动态 `import()` 加载小游戏的 JavaScript ES 模块。
2. 宿主调用模块的 `init(container, variables)`，将 DOM 容器与剧本当前变量状态注入。
3. 玩家在容器内进行交互游戏。
4. 游戏结束或通关时，小游戏调用 `onComplete(updatedVariables)`。
5. 宿主将回传变量合并至游戏全局状态机，**自动刷新条件选项与分支流转**。
6. 切离场景时，宿主调用 `destroy()` 优雅释放内存。

---

## 代码契约规范（必须完全遵守）

小游戏代码必须是**标准 ES 模块单文件**，默认导出（或导出）实现以下接口的对象：

```javascript
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
    this.container.innerHTML = `
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
    `;

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
```

---

## DSL 中的声明语法

在场景标题下方的**首个 ```yaml 元数据块**中写入：

```markdown
# lock_room
```yaml
minigame:
  prompt: '玩家需要根据线索输入 4 位密码破解防盗门'
  variables:
    door_unlocked: 门是否解开
    security_alert: 是否触发警报
  url: "https://your-domain.com/path/to/game.js"
```

门前横亘着一道精密的电子密码锁，屏幕泛着幽蓝的冷光。

* [推门进入] -> inside_vault (if: door_unlocked == true)
* [警报大作，准备迎敌] -> security_fight (if: security_alert == true)
* [放弃破解，另寻出路] -> hallway
```

---

## 创作与部署全流程（5 步走）

### 1. 剧情契合度与玩法设计
结合剧情高潮点确定机制（开锁、猜拳、反应击打、连线、拼图等），定好持续时间（30-90 秒），明确产出的结算变量。

### 2. 剧本变量与分支条件配置
在 `initialState` 中登记变量，在小游戏场景后使用 `* [选项] -> target (if: variable == true)` 配置好成功与失败分支，并务必保留一个无条件选项兜底。

### 3. 编写单文件 ES 模块代码
实现 `init`、`onComplete`、`destroy`，确保样式自包含、移动端触控友好、带有跳过按钮。

### 4. 上传 CDN 并挂接场景 DSL
将代码转为 base64，调用 MCP 的 `uploadAsset({ gameId, data, contentType: 'application/javascript', fileName: 'minigame.js' })` 取得公网 URL，写回场景 YAML 的 `minigame.url` 中。

### 5. 播放页实机调试
在 `/play/<slug>` 播放页面进行实操测试，检验通关后变量是否顺利回传，分支是否根据玩法结果正确流转。

---

## 避坑铁律

1. **兜底退出机制**：小游戏界面**必须留有“跳过 / 放弃”按钮**（调用 `callback({ door_unlocked: false })`），切忌因为难度或兼容性导致玩家死锁卡关。
2. **样式隔离**：严禁修改 `document.body` 或全局样式；所有 CSS 应通过内联 `style="..."` 或容器内局部 `<style>` 注入。
3. **移动端适配**：点击事件优先使用 `pointerdown` 或同时监听 `click`，避免移动设备 300ms 延迟或触摸穿透。
4. **清理资源**：在 `destroy()` 中务必清空定时器、事件监听器和 AudioContext，避免内存泄漏。
