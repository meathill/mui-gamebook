---
title: 哈利波特与魔法石
description: 跟随哈利·波特踏入魔法世界，探索霍格沃茨的秘密，守护魔法石！
backgroundStory: |
  # 大难不死的男孩

  十年前，黑魔法大魔头伏地魔肆虐魔法世界。一个万圣节之夜，他杀害了詹姆和莉莉·波特夫妇。
  然而当他试图杀死他们年幼的儿子哈利时，诅咒奇迹般地反弹了——伏地魔消失了。

  小哈利额头上留下了一道闪电形伤疤，成为整个魔法世界的传奇：**大难不死的男孩**。

  十年后，在女贞路4号的碗橱里，一个黑发男孩即将迎来改变命运的第十一个生日……
cover_prompt: Harry Potter standing at the entrance of Hogwarts castle, magical aurora in the sky, British color comic style
cover: https://i.muistory.com/images/harry-potter-1/1767753439200-hp1_fluffy_discovery_1767715857564.png
tags:
  - 魔法
  - 冒险
  - 经典改编
  - 互动剧情
published: false
state:
  house_points:
    value: 0
    visible: true
    display: value
    label: "学院分数"
  courage:
    value: 50
    visible: true
    display: progress
    max: 100
    label: "勇气"
  friendship:
    value: 0
    visible: true
    display: value
    label: "友谊"
  has_cloak: false
  knows_fluffy: false
  snape_suspicious: true
  wand_found: false
  snitch_caught: 0
  spell_success: 0
  chess_victory: false
  ron_sacrifice: false
ai:
  style:
    image: |
      British color comic illustration style, vibrant saturated colors,
      clear bold outlines, expressive characters, detailed English Gothic architecture,
      magical sparkle effects, reminiscent of Tintin and Asterix comics
    audio: epic orchestral music with magical whimsical elements, John Williams style
  characters:
    harry:
      name: 哈利·波特
      image_prompt: 11-year-old boy, messy black hair, round glasses, lightning bolt scar on forehead, bright green eyes
    ron:
      name: 罗恩·韦斯莱
      image_prompt: 11-year-old boy, red hair, freckles, tall and gangly, friendly smile, hand-me-down robes
    hermione:
      name: 赫敏·格兰杰
      image_prompt: 11-year-old girl, bushy brown hair, bright intelligent eyes, neat appearance, confident posture
    hagrid:
      name: 海格
      image_prompt: Giant man over 8 feet tall, wild black hair and bushy beard, moleskin overcoat, kind beetle-black eyes
    dumbledore:
      name: 邓布利多
      image_prompt: Elderly wizard, long silver hair and beard, half-moon spectacles, twinkling blue eyes, purple robes with stars
    mcgonagall:
      name: 麦格教授
      image_prompt: Stern elderly woman, emerald green robes, black hair in tight bun, square spectacles
    snape:
      name: 斯内普教授
      image_prompt: Pale man with sallow skin, greasy black curtain-like hair, black robes, hooked nose, cold black eyes
    quirrell:
      name: 奇洛教授
      image_prompt: Nervous pale man, large purple turban on head, twitching expression, stammering demeanor
    malfoy:
      name: 德拉科·马尔福
      image_prompt: 11-year-old boy, pale pointed face, sleek white-blond hair slicked back, grey eyes, arrogant sneer
    voldemort:
      name: 伏地魔
      image_prompt: Ghostly face emerging from back of head, chalk-white skin, red slit-like eyes, snake-like nostrils
---

# start

```image-gen
prompt: A small cupboard under the stairs, a thin boy with messy black hair and round glasses sits on a tiny bed, spider webs in corners, dim light
character: harry
url: https://i.muistory.com/images/harry-potter-1/1767799041891-hp1_start_1767687266779.webp
```

你睁开眼睛，又是碗橱里的一天。

蜘蛛在头顶的天花板上悠闲地织着网。从门缝里传来德思礼一家吃早餐的声音，还有你表哥达力那令人厌烦的抱怨声。

十年了，你一直住在这个楼梯下的碗橱里。德思礼姨夫和佩妮姨妈告诉你，你的父母死于车祸——但你总觉得事情没那么简单。

今天是你的生日。当然，没人会记得。

* [从碗橱里出来] -> cupboard_exit

---

# cupboard_exit

```image-gen
prompt: A grumpy fat man at breakfast table pointing angrily, a thin blonde woman looks disapproving, a spoiled fat boy eating bacon
url: https://i.muistory.com/images/harry-potter-1/1767799033761-hp1_cupboard_exit_1767687283711.webp
```

"快去做早餐！"弗农姨夫冲你大喊。

达力正在数他的生日礼物，尽管他的生日早就过了。你默默走进厨房，开始煎培根。

就在这时，信箱发出"啪嗒"一声。

"达力，去拿信。"弗农姨夫说。
"让哈利去。"达力头也不抬。
"哈利，去拿信。"

* [去拿信] -> letters_arrive

---

# letters_arrive

```image-gen
prompt: A boy holding a mysterious letter with emerald green ink, red wax seal with a coat of arms, address written in elegant script
character: harry
url: https://i.muistory.com/images/harry-potter-1/1767799037647-hp1_letters_arrive_1767687302747.webp
```

你从门垫上捡起信件。账单、明信片……然后你看到了一封写给**你**的信。

信封是用厚重的羊皮纸做的，用翠绿色墨水写着：

> **萨里郡 小惠金区 女贞路4号**
> **楼梯下的碗橱**
> **哈利·波特先生 收**

你的心跳加速。从来没有人给你写过信。

* [打开信] -> letter_snatched
* [把信藏起来] -> letter_snatched

---

# letter_snatched

```image-gen
prompt: An angry fat man snatching a letter from a boy's hands, face turning purple with rage
url: https://i.muistory.com/images/harry-potter-1/1767799036587-hp1_letter_snatched_1767687321680.webp
```

"把那个给我！"弗农姨夫一把夺过信，脸色变得紫红。

他看了一眼信封上的地址，脸色骤变。他把信撕得粉碎。

"这是我的信！"你喊道。
"不是你的！这是寄错了！"

但第二天，又来了三封。第三天，十二封。信件从壁炉、门缝、窗户涌入……

弗农姨夫做出了一个疯狂的决定。

* [跟着德思礼一家离开] -> escape_to_island

---

# escape_to_island

```image-gen
prompt: A tiny wooden hut on a rock in the middle of stormy sea at night, waves crashing, lightning in the sky
url: https://i.muistory.com/images/harry-potter-1/1767799035180-hp1_escape_to_island_1767687340687.webp
```

你们逃到了一座偏僻的小岛。一间破旧的小木屋在狂风中摇摇欲坠。

外面电闪雷鸣，海浪咆哮。你躺在冰冷的地板上，看着达力的手表。

再过十分钟就是你的十一岁生日了。

10……9……8……7……

**砰！砰！砰！**

巨大的敲门声震动了整间屋子。

* [看向门口] -> hagrid_arrives

---

# hagrid_arrives

```image-gen
prompt: A giant man with wild black hair breaking through a wooden door, silhouetted against lightning, holding a pink umbrella
character: hagrid
url: https://i.muistory.com/images/harry-potter-1/1767799036543-hp1_hagrid_arrives_1767687376896.webp
```

```audio-gen
type: sfx
prompt: wooden door breaking apart with a loud crash
```

门被撞开了！一个**巨人**站在门口——他足有两米多高，身形像一座小山。

"抱歉，"他说，把门轻松地装回门框上，"给撞坏了。"

他走进屋里，那双黑亮的眼睛在乱蓬蓬的黑胡子后面闪闪发光。

"哈利！"他咧嘴笑着，"上一次见你的时候，你还是个小婴儿。你长得真像你爸爸，但眼睛——你有你妈妈的眼睛。"

* ["你……你是谁？"] -> truth_revealed

---

# truth_revealed

```image-gen
prompt: A giant man sitting by fireplace explaining something to an amazed boy, warm golden light, birthday cake on table
characters: [harry, hagrid]
url: https://i.muistory.com/images/harry-potter-1/1767799042852-hp1_truth_revealed_1767687397469.webp
```

"我是鲁伯·海格，霍格沃茨的钥匙保管员和猎场看守。"

他从大衣里掏出一个有点压扁的盒子。"差点忘了——生日快乐，哈利！自己做的。"

盒子里是一个巧克力蛋糕，上面用绿色糖霜写着：**生日快乐 哈利**

"哈利，"海格严肃地说，"你是个巫师。"

"我是什么？"

海格递给你一封信——那封你一直想看的信。信上说你被录取了，去一所叫**霍格沃茨魔法学校**的地方。

* ["我的父母……他们真的是车祸死的吗？"] -> parents_truth (set: courage = courage + 10)
* ["带我去霍格沃茨！"] -> diagon_alley

---

# parents_truth

```image-gen
prompt: A giant man looking sad and serious, firelight flickering on his face, telling a dark story
character: hagrid
url: https://i.muistory.com/images/harry-potter-1/1767799039973-hp1_parents_truth_1767687416461.webp
```

海格告诉你真相：你的父母是被一个黑巫师**伏地魔**杀害的。

"但当他试图杀死你的时候，诅咒反弹了，他消失了。而你活了下来。"

海格指着你额头上的伤疤。"你很有名，哈利。你是**大难不死的男孩**。"

* [震惊地沉默] -> diagon_alley (set: courage = courage + 5)

---

# diagon_alley

```image-gen
prompt: A cobblestone alley filled with magical shops, cauldrons stacked outside, owls flying overhead, witches and wizards shopping
url: https://i.muistory.com/images/harry-potter-1/1767799034139-hp1_diagon_alley_1767687432914.webp
```

```audio-gen
type: background_music
prompt: whimsical magical marketplace music, bustling and cheerful
```

**对角巷**——魔法世界的购物中心！

你跟着海格穿过破釜酒吧后面一堵砖墙，眼前的景象让你目瞪口呆。

到处都是穿着长袍的巫师，商店里陈列着各种神奇的东西：飞天扫帚、咕噜咕噜冒泡的坩埚、装着眨眼猫头鹰的笼子……

"我们得先去古灵阁，"海格说，"巫师银行。然后买你的课本、长袍——还有魔杖！"

* [前往古灵阁] -> gringotts

---

# gringotts

```image-gen
prompt: A grand white marble building with bronze doors, small goblin bankers in suits, vast underground vault caverns
url: https://i.muistory.com/images/harry-potter-1/1767799035705-hp1_gringotts_1767687454041.webp
```

古灵阁是一座雪白的大理石建筑，由妖精管理。海格帮你取了金加隆，然后去713号金库取了一个神秘的包裹。

"霍格沃茨的事，"他压低声音说，"最高机密。"

* [去买魔杖] -> ollivanders

---

# ollivanders

```image-gen
prompt: An old dusty wand shop interior, thousands of narrow boxes stacked to ceiling, silvery-eyed old man behind counter
url: https://i.muistory.com/images/harry-potter-1/1767799038955-hp1_ollivanders_1767687487775.webp
```

**奥利凡德魔杖店**。

一位老人从货架后面出现。"啊，波特先生。来，试试这根。山毛榉，龙心弦，9英寸。"

* [挥动魔杖] -> wand_chooses

---

# wand_chooses

```image-gen
prompt: A boy trying to pick up a wand, magical sparks flying chaotically, old wandmaker watching intently
character: harry
url: https://i.muistory.com/images/harry-potter-1/1767799042652-hp1_wand_chooses_1767687509262.webp
```

```minigame-gen
prompt: 魔杖选择游戏。屏幕显示一个目标光圈，玩家需点击中心。前两根魔杖点击时光圈会严重偏移（怎么点都不对），第3根魔杖光圈稳定且有吸附效果。
variables:
  - wand_found: 是否找到正确魔杖
url: https://i.muistory.com/images/harry-potter-1/1767799042705-hp1_wand_chooses_minigame_v1.js
```

第一根魔杖炸碎了花瓶。第二根刚碰到就枯萎了。

奥利凡德眼睛一亮："试试这根——冬青木，凤凰羽毛，11英寸……"

* [握住魔杖] -> wand_chosen (if: wand_found == true)
* [握住魔杖] -> wand_chosen

---

# wand_chosen

```image-gen
prompt: A boy holding a wand with golden light emanating from it, wind swirling around him, wonder expression
character: harry
url: https://i.muistory.com/images/harry-potter-1/1767799042830-hp1_wand_chosen_1767687527680.webp
```

```audio-gen
type: sfx
prompt: magical chime and warm golden whoosh sound
```

温暖从指尖涌遍全身。魔杖发出了柔和的金光，仿佛**它认识你**。

"奇妙……"奥利凡德说，"这根魔杖的芯，也就是那只凤凰，只贡献过另一根羽毛——就是给你留下伤疤的那根。"

* [离开] -> pet_shop (set: wand_found = true)

---

# pet_shop

```image-gen
prompt: A magical pet shop with owls, cats, toads, a beautiful snowy white owl in a golden cage
url: https://i.muistory.com/images/harry-potter-1/1767799039815-hp1_pet_shop_1767687546418.webp
```

作为生日礼物，海格给你买了一只雪白的猫头鹰。你叫她**海德薇**。

海格递给你一张火车票："9月1日 上午11点 9¾站台。"

* [前往车站] -> platform_search

---

# platform_search

```image-gen
prompt: A confused boy at King's Cross Station pushing a trolley, looking between platforms 9 and 10
character: harry
url: https://i.muistory.com/images/harry-potter-1/1767799040664-hp1_platform_search_1767687604281.webp
```

你在9号和10号站台之间徘徊。哪里有9¾站台？

这时，你听到一个红发女人说："——到处都是麻瓜……来吧，站台在这边。"

* [跟上那群红发孩子] -> meet_weasleys (set: courage = courage + 5)

---

# meet_weasleys

```image-gen
prompt: A kind plump red-haired woman with several red-haired children at a train station
url: https://i.muistory.com/images/harry-potter-1/1767799037447-hp1_meet_weasleys_1767687624349.webp
```

"不好意思，"你问那位母亲，"怎么去站台？"

"哦，第一年吧？"她笑了，"罗恩也是。看着——对准检票口冲过去就行了。"

你闭上眼睛，推着车冲向墙壁——

* [冲！] -> hogwarts_express

---

# hogwarts_express

```image-gen
prompt: A magnificent scarlet steam train "Hogwarts Express", platform full of students
url: https://i.muistory.com/images/harry-potter-1/1767799036776-hp1_hogwarts_express_1767687641712.webp
```

**霍格沃茨特快列车**！

你找到一个空车厢。那个红发男孩探进头来："这里有人吗？其他地方都满了。"

* [请他进来] -> meet_ron

---

# meet_ron

```image-gen
prompt: Two boys sitting in train compartment, one with black messy hair, one with red hair and freckles, candy everywhere
characters: [harry, ron]
url: https://i.muistory.com/images/harry-potter-1/1767799037733-hp1_meet_ron_1767687659698.webp
```

他叫罗恩·韦斯莱。你们分享了比比多味豆和巧克力蛙。

"你真的有那个伤疤吗？"罗恩惊讶地看着你撩起刘海。

这时，一个金发男孩带着两个跟班走了进来。

* [看是谁] -> meet_malfoy (set: friendship = friendship + 10)

---

# meet_malfoy

```image-gen
prompt: A pale blond boy with arrogant expression standing in train compartment doorway
character: malfoy
url: https://i.muistory.com/images/harry-potter-1/1767799037797-hp1_meet_malfoy_1767687676437.webp
```

"我叫马尔福，德拉科·马尔福。"他不屑地看了罗恩一眼，"波特，有些巫师家族比其他的好。别跟不三不四的人交朋友。"

他伸出手。

* ["我自己会分辨，谢谢"] -> malfoy_rejected (set: courage = courage + 10)
* [握手] -> malfoy_rejected

---

# malfoy_rejected

```image-gen
prompt: A blond boy looking offended and angry, turning to leave
character: malfoy
url: https://i.muistory.com/images/harry-potter-1/1767799037440-hp1_malfoy_rejected_1767715651317.webp
```

马尔福恼羞成怒地离开了。

火车慢了下来。窗外，一座巨大的城堡在夜色中闪耀。**霍格沃茨**到了。

* [下车] -> boat_arrival

---

# boat_arrival

```image-gen
prompt: First-year students in small boats crossing a dark lake toward a magnificent lit-up castle
character: harry
url: https://i.muistory.com/images/harry-potter-1/1767799032794-hp1_boat_arrival_1767715673777.webp
```

```audio-gen
type: background_music
prompt: majestic awe-inspiring orchestral music
```

你们坐船划过黑湖。霍格沃茨城堡巍峨耸立，窗口透出温暖的光。

麦格教授在门口迎接你们，带你们进入大礼堂。

* [进入大礼堂] -> great_hall

---

# great_hall

```image-gen
prompt: Grand dining hall with four long tables, floating candles, enchanted ceiling
url: https://i.muistory.com/images/harry-potter-1/1767799036125-hp1_great_hall_1767715695820.webp
```

大礼堂天花板像星空一样。一顶破旧的帽子放在凳子上。

"点到名字的上来戴上分院帽。"

"格兰杰，赫敏！"……"格兰芬多！"
"马尔福，德拉科！"……"斯莱特林！"

"波特，哈利！"

* [戴上帽子] -> sorting_hat

---

# sorting_hat

```image-gen
prompt: A nervous boy sitting on stool with an old worn pointed hat on his head
character: harry
url: https://i.muistory.com/images/harry-potter-1/1767799041324-hp1_sorting_hat_1767715718504.webp
```

```minigame-gen
prompt: 分院帽小游戏。屏幕快速闪现四个学院徽章，玩家需要在5秒内点击格兰芬多徽章3次。
variables:
  - sorting_choice: 成功点击格兰芬多的次数
url: https://i.muistory.com/images/harry-potter-1/1767799041206-hp1_sorting_hat_minigame_v1.js
```

细小的声音在耳边响起："嗯……困难……心地不坏，也有天赋……把你放在哪里呢？"

* [想着格兰芬多] -> sorting_result

---

# sorting_result

```image-gen
prompt: A boy jumping off stool triumphantly as students cheer
character: harry
url: https://i.muistory.com/images/harry-potter-1/1767799041962-hp1_sorting_result_1767715736257.webp
```

"不是斯莱特林？好吧，既然你坚持——**格兰芬多**！"

格兰芬多长桌爆发出欢呼。韦斯莱双胞胎高喊："我们有波特啦！"

* [入座] -> first_night (set: house_points = house_points + 10)

---

# first_night

```image-gen
prompt: A cozy dormitory room with four-poster beds and red curtains
```

格兰芬多塔楼成了你的新家。你第一次有了归属感。

当晚你做了一个梦，梦见奇洛教授的头巾在跟你说话。

* [去上课] -> potions_class

---

# potions_class

```image-gen
prompt: A dark dungeon classroom, a pale professor in black robes glaring
character: snape
url: https://i.muistory.com/images/harry-potter-1/1767799040074-hp1_potions_class_1767715796028.webp
```

魔药课上，斯内普教授处处针对你。"名气不代表一切，波特。"

他扣了格兰芬多5分。只要他在看你，伤疤就会隐隐作痛。

* [忍耐] -> flying_lesson (set: snape_suspicious = true)

---

# flying_lesson

```image-gen
prompt: Students on a grassy field with broomsticks, castle in background
```

飞行课上，纳威摔断了手腕。马尔福抢走他的记忆球飞上天："来拿啊波特！"

* [骑扫帚追上去] -> rememberall_incident (set: courage = courage + 15)

---

# rememberall_incident

```image-gen
prompt: A boy on broomstick chasing another boy high in the sky
characters: [harry, malfoy]
```

你天生就会飞！你俯冲下去，在记忆球撞地前抓住了它。

麦格教授跑了过来……你以为要被开除了，结果她把你推荐入队。

**你成了百年来最年轻的找球手！**

* [太棒了] -> halloween_feast (set: house_points = house_points + 50)

---

# halloween_feast

```image-gen
prompt: Great hall decorated for Halloween, students eating feast
```

万圣节晚宴。奇洛冲进来喊："巨怪在地牢里！"然后晕倒。

大家撤离时，你和罗恩想起——赫敏还在女厕所，她不知道巨怪的事！

* [去救赫敏] -> troll_attack (set: courage = courage + 20)

---

# troll_attack

```image-gen
prompt: A massive grey troll in a bathroom, three students cowering
```

```audio-gen
type: sfx
prompt: monster roaring and crashing sounds
```

赫敏缩在墙角。巨怪挥舞着木棒砸碎了洗手池。

* [攻击巨怪] -> save_hermione

---

# save_hermione

```image-gen
prompt: Two boys fighting a troll, magical sparks flying
characters: [harry, ron]
```

```minigame-gen
prompt: 击退巨怪游戏。屏幕显示方向箭头序列，2秒内按正确顺序点击。成功3轮击退巨怪。
variables:
  - spell_success: 成功次数
url: https://i.muistory.com/images/harry-potter-1/1767799041244-hp1_save_hermione_minigame_v1.js
```

你跳到巨怪背上插了它的鼻子！罗恩用漂浮咒让木棒砸晕了巨怪。

从那天起，你们成了最好的朋友。

* [友谊万岁] -> fluffy_discovered (set: friendship = friendship + 20)

---

# fluffy_discovered

```image-gen
prompt: Three students facing a massive three-headed dog
```

一次夜游，你们误闯三楼禁区，发现了一只**三头犬**！它站在活板门上。

海格说它叫"路威"，在守护尼可·勒梅的东西……**魔法石**！

* [调查] -> quidditch_match (set: knows_fluffy = true)

---

# quidditch_match

```image-gen
prompt: Quidditch stadium, players zooming around
character: harry
url: https://i.muistory.com/images/harry-potter-1/1767799041296-hp1_quidditch_match_1767715969204.webp
```

```minigame-gen
prompt: 金色飞贼捕捉。金色小球快速移动，15秒内点击8次。
variables:
  - snitch_caught: 成功点击次数
url: https://i.muistory.com/images/harry-potter-1/1767799041201-hp1_quidditch_match_minigame_v1.js
```

比赛中你的扫帚失控（赫敏以为是斯内普干的，帮了解咒），但你吞下并吐出了飞贼，赢了！

* [庆祝] -> christmas_gift (set: house_points = house_points + 150)

---

# christmas_gift

```image-gen
prompt: A boy opening presents, revealing a silvery cloak
character: harry
```

圣诞节你收到了一件**隐形衣**。纸条上写着："是你父亲留下的。"

* [夜游] -> mirror_erised (set: has_cloak = true)

---

# mirror_erised

```image-gen
prompt: A boy standing before an ornate mirror showing his parents
character: harry
url: https://i.muistory.com/images/harry-potter-1/1767799038961-hp1_mirror_erised_1767716029412.webp
```

你发现了**厄里斯魔镜**。镜子里，早已去世的父母在对你微笑。

邓布利多后来劝诫你："沉溺梦境而忘记生活是不明智的。"

* [离开] -> forbidden_forest

---

# forbidden_forest

```image-gen
prompt: Dark forest at night, a hooded figure drinking silver blood
url: https://i.muistory.com/images/harry-potter-1/1767799036031-hp1_forbidden_forest_1767716072287.webp
```

作为惩罚，你进了禁林。你看到一个黑影在喝独角兽的血！

人马费伦泽救了你，说那是**伏地魔**为了续命。

* [回城堡] -> decision_time (set: courage = courage + 10)

---

# decision_time

```image-gen
prompt: Three determined children at start of adventure
characters: [harry, ron, hermione]
```

鄧布利多被骗走了。斯内普（你们以为是他）今晚就要偷魔法石！

"我们必须阻止他！"

你们跳进了活板门。

* [跳！] -> devils_snare

---

# devils_snare

```image-gen
prompt: Students entangled in vines
url: https://i.muistory.com/images/harry-potter-1/1767799034294-hp1_devils_snare_1767749750768.webp
```

魔鬼网缠住了你们。赫敏用光亮咒逼退了它。

* [下一关] -> flying_keys

---

# flying_keys

```image-gen
prompt: Room full of flying keys
url: https://i.muistory.com/images/harry-potter-1/1767799035008-hp1_flying_keys_1767749768793.webp
```

那是满屋飞舞的钥匙。你骑上扫帚，凭着找球手的技术抓住了那把断翅的旧钥匙。

* [开门] -> chess_game

---

# chess_game

```image-gen
prompt: Giant chess board with stone pieces
characters: [harry, ron, hermione]
url: https://i.muistory.com/images/harry-potter-1/1767799032632-hp1_chess_game_1767749785427.webp
```

```minigame-gen
prompt: 简化巫师棋。3x3棋盘，控制骑士L形走位吃掉3个兵，限时30秒。
variables:
  - chess_victory: 获胜
url: https://i.muistory.com/images/harry-potter-1/1767799032025-hp1_chess_game_minigame_v1.js
```

罗恩指挥棋局。为了让你获胜，他牺牲了自己被白皇后击倒。

"哈利，你必须继续！"

* [含泪继续] -> potions_riddle (set: ron_sacrifice = true, friendship = friendship + 20)

---

# potions_riddle

```image-gen
prompt: A table with seven potion bottles and flames
character: hermione
url: https://i.muistory.com/images/harry-potter-1/1767799039835-hp1_potions_riddle_1767749818827.webp
```

赫敏解开了斯内普的逻辑谜题。"只有一人能过的药水。哈利，你去。"

她拥抱了你："你是个伟大的巫师，哈利。"

* [喝下药水] -> final_chamber

---

# final_chamber

```image-gen
prompt: A man unwrapping turban to reveal Voldemort's face
characters: [quirrell, voldemort]
url: https://i.muistory.com/images/harry-potter-1/1767799035242-hp1_final_chamber_1767749836171.webp
```

站在厄里斯魔镜前的不是斯内普，是**奇洛**！

他解开头巾——后脑勺上是**伏地魔的脸**！

"**把魔法石给我！**"

* [绝不！] -> final_battle (set: courage = courage + 20)

---

# final_battle

```image-gen
prompt: Harry grappling with Quirrell, hands burning
characters: [harry, quirrell]
url: https://i.muistory.com/images/harry-potter-1/1767799034711-hp1_final_battle_1767749857740.webp
```

奇洛掐住你，但他的手碰到你就**燃烧起泡**！

"杀了他！"伏地魔咆哮。

你死死抓住奇洛的脸，剧痛让你失去知觉……

* [醒来] -> good_ending (if: courage >= 80)
* [醒来] -> normal_ending

---

# good_ending

```image-gen
prompt: Harry in hospital bed with Dumbledore
characters: [harry, dumbledore]
url: https://i.muistory.com/images/harry-potter-1/1767799035855-hp1_good_ending_1767749891653.webp
```

邓布利多告诉你：魔法石销毁了。你母亲的**爱**像护身符一样保护了你，奇洛碰不了你。

期末晚宴上，因为你们的英勇，格兰芬多赢得了**学院杯**！

* [回家] -> end_screen

---

# normal_ending

```image-gen
prompt: Harry in hospital bed with Dumbledore, sunset
url: https://i.muistory.com/images/harry-potter-1/1767799039299-hp1_normal_ending_1767749910003.webp
```

魔法石销毁了，伏地魔暂时失败了。你做得很好。

雖然沒贏得學院杯，但你證明了自己是真正的格兰芬多。

* [回家] -> end_screen

---

# end_screen

```image-gen
prompt: Hogwarts Express leaving, Harry waving goodbye
character: harry
url: https://i.muistory.com/images/harry-potter-1/1767799033876-hp1_end_screen_1767749928234.webp
```

不可思议的一年结束了。

你不再是那个住在碗橱里的男孩了。你是巫师，通过了考验。

**霍格沃茨是你的家。**

**全剧终**
