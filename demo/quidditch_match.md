---
title: 魁地奇比赛
description: 体验哈利波特的魁地奇世界，抓住金色飞贼赢得比赛！
cover_image: https://picsum.photos/400/600?random=quidditch
tags:
  - 小游戏
  - 哈利波特
  - 互动
published: true
state:
  snitch_caught:
    value: 0
    visible: true
    display: value
    label: 捕获飞贼
ai:
  style:
    image: fantasy, magical, quidditch stadium, flying broomsticks
  characters:
    player:
      name: 你
      image_prompt: a young wizard on a broomstick, wearing quidditch robes
---

# start

欢迎来到霍格沃茨魁地奇球场！

今天是格兰芬多对斯莱特林的关键比赛。作为球队的找球手，你的任务只有一个——抓住金色飞贼！

金色飞贼非常狡猾，它会在空中快速移动，你需要眼疾手快才能抓住它。

* [准备好了，开始比赛！] -> quidditch_match

---

# quidditch_match

比赛开始了！金色飞贼已经被放出！

你骑着飞天扫帚在球场上空盘旋，仔细搜寻那道金色的光芒...

突然，你看到了它！金色飞贼正在快速移动！

```yaml
minigame:
  prompt: 创建一个点击金色飞贼的游戏。屏幕上会有一个金色小球快速移动，玩家需要在10秒内点击10次才算成功。使用 Canvas 绘制，小球会随机改变方向并且有翅膀动画效果。
  variables:
    - snitch_caught: 成功捕获飞贼的次数
  url: /api/cms/minigames/1
```

* [查看结果] -> quidditch_win (if: snitch_caught >= 10)
* [查看结果] -> quidditch_lose (if: snitch_caught < 10)

---

# quidditch_win

🎉 太棒了！

你成功抓住了金色飞贼！整个球场都沸腾了！

"格兰芬多获胜！"解说员的声音响彻云霄。

你的队友们冲上来把你高高抛起，庆祝这来之不易的胜利。邓布利多在看台上微笑着为你鼓掌。

今天，你是整个霍格沃茨的英雄！

---

# quidditch_lose

😔 很遗憾...

金色飞贼太狡猾了，你没能抓住足够多的飞贼。

斯莱特林的找球手趁机抓住了金色飞贼，比赛结束了。

但不要灰心！魁地奇比赛总会有下一场。伍德队长拍着你的肩膀说："训练更刻苦一点，下次一定能赢！"

* [重新挑战] -> start
