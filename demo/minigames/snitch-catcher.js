/**
 * Demo 小游戏：金色飞贼捕捉
 *
 * 这是一个示例小游戏，展示了小游戏 API 的正确实现方式。
 * 玩家需要在限定时间内点击屏幕上随机出现的金色飞贼。
 *
 * 接口规范：
 * - init(container, variables): 初始化游戏
 * - onComplete(callback): 注册完成回调
 * - destroy(): 清理资源
 */

// 游戏状态
let container = null;
let canvas = null;
let ctx = null;
let animationId = null;
let gameTimer = null;
let completeCallback = null;

// 游戏配置
const GAME_DURATION = 10000; // 10秒
const SNITCH_SIZE = 30;
const SNITCH_SPEED = 5;
const TARGET_CLICKS = 10;

// 游戏数据
let snitch = { x: 0, y: 0, vx: 0, vy: 0 };
let score = 0;
let timeLeft = GAME_DURATION;
let gameStartTime = 0;
let isGameOver = false;

/**
 * 初始化金色飞贼位置和速度
 */
function resetSnitch() {
  snitch.x = Math.random() * (canvas.width - SNITCH_SIZE * 2) + SNITCH_SIZE;
  snitch.y = Math.random() * (canvas.height - SNITCH_SIZE * 2) + SNITCH_SIZE;
  snitch.vx = (Math.random() - 0.5) * SNITCH_SPEED * 2;
  snitch.vy = (Math.random() - 0.5) * SNITCH_SPEED * 2;
}

/**
 * 更新飞贼位置
 */
function updateSnitch() {
  snitch.x += snitch.vx;
  snitch.y += snitch.vy;

  // 边界反弹
  if (snitch.x <= SNITCH_SIZE || snitch.x >= canvas.width - SNITCH_SIZE) {
    snitch.vx *= -1;
    snitch.x = Math.max(SNITCH_SIZE, Math.min(canvas.width - SNITCH_SIZE, snitch.x));
  }
  if (snitch.y <= SNITCH_SIZE || snitch.y >= canvas.height - SNITCH_SIZE) {
    snitch.vy *= -1;
    snitch.y = Math.max(SNITCH_SIZE, Math.min(canvas.height - SNITCH_SIZE, snitch.y));
  }

  // 随机改变方向
  if (Math.random() < 0.02) {
    snitch.vx += (Math.random() - 0.5) * 2;
    snitch.vy += (Math.random() - 0.5) * 2;
    // 限制最大速度
    const maxSpeed = SNITCH_SPEED * 1.5;
    snitch.vx = Math.max(-maxSpeed, Math.min(maxSpeed, snitch.vx));
    snitch.vy = Math.max(-maxSpeed, Math.min(maxSpeed, snitch.vy));
  }
}

/**
 * 绘制游戏画面
 */
function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // 背景
  ctx.fillStyle = '#1a1a2e';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // 绘制飞贼（金色小球）
  ctx.beginPath();
  ctx.arc(snitch.x, snitch.y, SNITCH_SIZE, 0, Math.PI * 2);
  const gradient = ctx.createRadialGradient(
    snitch.x - SNITCH_SIZE / 3,
    snitch.y - SNITCH_SIZE / 3,
    0,
    snitch.x,
    snitch.y,
    SNITCH_SIZE,
  );
  gradient.addColorStop(0, '#ffd700');
  gradient.addColorStop(0.5, '#ffb800');
  gradient.addColorStop(1, '#ff8c00');
  ctx.fillStyle = gradient;
  ctx.fill();
  ctx.strokeStyle = '#fff';
  ctx.lineWidth = 2;
  ctx.stroke();

  // 绘制翅膀
  ctx.save();
  ctx.translate(snitch.x, snitch.y);
  const wingAngle = Math.sin(Date.now() / 50) * 0.3;

  // 左翅膀
  ctx.save();
  ctx.rotate(-Math.PI / 4 + wingAngle);
  ctx.beginPath();
  ctx.ellipse(-SNITCH_SIZE, 0, SNITCH_SIZE * 0.8, SNITCH_SIZE * 0.3, 0, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
  ctx.fill();
  ctx.restore();

  // 右翅膀
  ctx.save();
  ctx.rotate(Math.PI / 4 - wingAngle);
  ctx.beginPath();
  ctx.ellipse(SNITCH_SIZE, 0, SNITCH_SIZE * 0.8, SNITCH_SIZE * 0.3, 0, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
  ctx.fill();
  ctx.restore();

  ctx.restore();

  // UI: 得分和时间
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 24px Arial';
  ctx.textAlign = 'left';
  ctx.fillText(`捕获: ${score} / ${TARGET_CLICKS}`, 20, 40);

  const remainingTime = Math.max(0, Math.ceil(timeLeft / 1000));
  ctx.textAlign = 'right';
  ctx.fillText(`时间: ${remainingTime}s`, canvas.width - 20, 40);

  // 进度条
  const progress = score / TARGET_CLICKS;
  ctx.fillStyle = '#333';
  ctx.fillRect(20, canvas.height - 30, canvas.width - 40, 10);
  ctx.fillStyle = progress >= 1 ? '#4caf50' : '#ffd700';
  ctx.fillRect(20, canvas.height - 30, (canvas.width - 40) * Math.min(1, progress), 10);
}

/**
 * 游戏主循环
 */
function gameLoop() {
  if (isGameOver) return;

  // 更新时间
  timeLeft = GAME_DURATION - (Date.now() - gameStartTime);

  // 检查游戏结束条件
  if (timeLeft <= 0 || score >= TARGET_CLICKS) {
    endGame();
    return;
  }

  updateSnitch();
  draw();
  animationId = requestAnimationFrame(gameLoop);
}

/**
 * 处理点击事件
 */
function handleClick(event) {
  if (isGameOver) return;

  const rect = canvas.getBoundingClientRect();
  const x = event.clientX - rect.left;
  const y = event.clientY - rect.top;

  // 检查是否点击到飞贼
  const dx = x - snitch.x;
  const dy = y - snitch.y;
  const distance = Math.sqrt(dx * dx + dy * dy);

  if (distance <= SNITCH_SIZE) {
    score++;
    // 重置飞贼位置并加速
    resetSnitch();
    snitch.vx *= 1.1;
    snitch.vy *= 1.1;

    // 点击效果
    showClickEffect(snitch.x, snitch.y);
  }
}

/**
 * 显示点击效果
 */
function showClickEffect(x, y) {
  ctx.beginPath();
  ctx.arc(x, y, SNITCH_SIZE * 1.5, 0, Math.PI * 2);
  ctx.strokeStyle = '#ffd700';
  ctx.lineWidth = 3;
  ctx.stroke();
}

/**
 * 结束游戏
 */
function endGame() {
  isGameOver = true;

  if (animationId) {
    cancelAnimationFrame(animationId);
    animationId = null;
  }

  // 显示结果
  ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = '#fff';
  ctx.font = 'bold 36px Arial';
  ctx.textAlign = 'center';

  const success = score >= TARGET_CLICKS;
  ctx.fillText(success ? '🎉 成功！' : '⏰ 时间到！', canvas.width / 2, canvas.height / 2 - 40);

  ctx.font = '24px Arial';
  ctx.fillText(`捕获飞贼: ${score} / ${TARGET_CLICKS}`, canvas.width / 2, canvas.height / 2 + 10);

  ctx.font = '18px Arial';
  ctx.fillStyle = '#aaa';
  ctx.fillText('点击任意位置继续', canvas.width / 2, canvas.height / 2 + 50);

  // 添加继续点击监听
  canvas.addEventListener('click', handleContinue, { once: true });
}

/**
 * 处理继续点击
 */
function handleContinue() {
  if (completeCallback) {
    completeCallback({
      snitch_caught: score,
    });
  }
}

// ============ 导出的 API ============

/**
 * 初始化游戏
 * @param {HTMLElement} containerEl - 游戏容器 DOM 元素
 * @param {Record<string, number | string | boolean>} variables - 当前变量值
 */
export function init(containerEl, variables) {
  container = containerEl;

  // 获取初始变量值
  if (variables.snitch_caught !== undefined) {
    score = Number(variables.snitch_caught) || 0;
  }

  // 创建 canvas
  canvas = document.createElement('canvas');
  canvas.width = container.clientWidth;
  canvas.height = container.clientHeight;
  canvas.style.display = 'block';
  canvas.style.cursor = 'crosshair';
  container.appendChild(canvas);

  ctx = canvas.getContext('2d');

  // 初始化游戏状态
  score = 0;
  isGameOver = false;
  timeLeft = GAME_DURATION;
  gameStartTime = Date.now();

  // 初始化飞贼
  resetSnitch();

  // 添加点击监听
  canvas.addEventListener('click', handleClick);

  // 开始游戏循环
  gameLoop();
}

/**
 * 注册游戏完成回调
 * @param {function} callback - 回调函数，接收更新后的变量
 */
export function onComplete(callback) {
  completeCallback = callback;
}

/**
 * 销毁游戏，清理资源
 */
export function destroy() {
  isGameOver = true;

  if (animationId) {
    cancelAnimationFrame(animationId);
    animationId = null;
  }

  if (gameTimer) {
    clearTimeout(gameTimer);
    gameTimer = null;
  }

  if (canvas) {
    canvas.removeEventListener('click', handleClick);
    canvas.removeEventListener('click', handleContinue);
    canvas.remove();
    canvas = null;
  }

  container = null;
  ctx = null;
  completeCallback = null;
}

// 默认导出
export default {
  init,
  onComplete,
  destroy,
};
