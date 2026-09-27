import * as fs from 'fs';
import * as path from 'path';
import { colors } from '../utils/colors';

const STARTER_TEMPLATE = `---
title: "迷雾森林的抉择"
author: "探索者"
description: "一个用于演示互动小说分支、变量与多结局的标准起步模板。"
published: false
initialState:
  courage: 10
  has_torch: false
  gold: 0
ai:
  characters:
    guide:
      name: "神秘向导"
      role: "npc"
      image_prompt: "A mysterious elderly guide in a dark hooded cloak, holding a glowing lantern"
---

# start
你站在迷雾笼罩的森林入口，寒风夹杂着落叶拂过脸颊。

@guide: 年轻人，前方的森林凶险莫测，你准备好踏上旅程了吗？

* [点燃火把，勇敢前行] -> deep_forest (set: has_torch = true, courage = courage + 2)
* [向向导讨教建议] -> ask_guide
* [有些犹豫，四处观察] -> look_around

# ask_guide
向导微微一笑，从怀中掏出一枚古旧的硬币递给你。

@guide: 记住，无论面对黑暗还是财富，唯有内心的勇气能带你走向光明的结局。

* [谢过向导，迈入森林] -> deep_forest (set: gold = gold + 5, courage = courage + 1)
* [原路返回，放弃冒险] -> ending_coward

# look_around
你仔细观察四周，在树根旁发现了一柄被遗弃的火把。

* [拾起火把继续出发] -> deep_forest (set: has_torch = true)
* [直接迈步进入森林] -> deep_forest

# deep_forest
森林深处树影婆娑，前方出现了两扇奇异的门扉。左侧门隐约传来猛兽的低吼，右侧门闪烁着幽蓝的光芒。

* [凭借火把的光亮冲破左侧暗门] -> treasure_room (if: has_torch == true)
* [小心翼翼地推开右侧发光门] -> ending_wise (set: courage = courage + 5)
* [退回林间空地另寻出路] -> start

# treasure_room
火把驱散了黑暗中的暗影毒蛇！在石窟中央，你发现了一座盛满金币的宝箱。

* [开启宝箱，满载而归] -> ending_rich (set: gold = gold + 100)
* [保持警惕，迅速离开] -> ending_wise

# ending_wise
【结局：智者归途】
你凭借审慎与机敏，安全穿过了迷雾森林，并在旅途中收获了宝贵的人生经验。

# ending_rich
【结局：富商传奇】
你不仅活着走出了森林，还带出了失落百年的古老宝藏，成为了远近闻名的传奇探险家！

# ending_coward
【结局：平凡安宁】
你决定不冒任何风险，转身回到了平静的小镇，过上了安稳祥和的平凡生活。
`;

export function initProject(targetPath = 'story.md'): { success: boolean; filePath: string; message: string } {
  const resolved = path.resolve(process.cwd(), targetPath);
  const dir = path.dirname(resolved);

  if (fs.existsSync(resolved)) {
    return {
      success: false,
      filePath: resolved,
      message: `目标文件已存在: ${targetPath}，请指定其他名称或在空目录运行。`,
    };
  }

  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  fs.writeFileSync(resolved, STARTER_TEMPLATE, 'utf-8');
  return {
    success: true,
    filePath: resolved,
    message: `成功创建互动小说标准模板: ${targetPath}`,
  };
}
