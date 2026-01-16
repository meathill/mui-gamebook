---
title: "哈利·波特与密室"
description: "重返霍格沃茨，揭开斯莱特林继承人的秘密。在经典英式漫画风格中体验飞车冒险、幽灵决斗与蛇怪之战。"
backgroundStory: |
  这是哈利在霍格沃茨的第二年。家养小精灵多比的警告，飞车的惊险旅程，墙上的血字，被石化的学生...
  密室被打开了，斯莱特林的继承人回来了。
  你将扮演哈利·波特，面对前所未有的危险。
cover_prompt: "Harry Potter and Ron Weasley flying in a blue Ford Anglia car over the Hogwarts Express train, classic English comic book style, dynamic angle, vibrant colors"
tags:
  - 魔法
  - 冒险
  - 哈利波特
  - 同人
state:
  health:
    value: 100
    visible: true
    display: progress
    max: 100
    label: 生命值
  house_points:
    value: 0
    visible: true
    label: 学院分
  clues_found:
    value: 0
    visible: false
  has_sword:
    value: false
    visible: false
  diary_destroyed:
    value: false
    visible: false
ai:
  style:
    image: "Classic English comic book style, hand-drawn, vibrant colors, clear ink lines, dynamic composition, 1990s aesthetic"
    audio: "Orchestral fantasy themes, mysterious and magical"
  characters:
    harry:
      name: "Harry Potter"
      description: "12 year old boy, messy black hair, round glasses, lightning scar, Gryffindor robes"
      image_url: https://i.muistory.com/images/harry-potter-2/1767800383573-harry_potter_portrait_1767781378797.webp
    ron:
      name: "Ron Weasley"
      description: "12 year old boy, red hair, freckles, hand-me-down robes, funny expressions"
      image_url: https://i.muistory.com/images/harry-potter-2/1767800379406-ron_weasley_portrait_1767781396524.webp
    hermione:
      name: "Hermione Granger"
      description: "12 year old girl, bushy brown hair, holding books, intelligent look"
      image_url: https://i.muistory.com/images/harry-potter-2/1767800383573-hermione_granger_portrait_1767781416095.webp
    dobby:
      name: "Dobby"
      description: "House elf, large bat-like ears, wearing a dirty pillowcase, big green eyes"
      image_url: https://i.muistory.com/images/harry-potter-2/1767800377966-dobby_portrait_1767781441327.webp
    snape:
      name: "Severus Snape"
      description: "Tall, thin, sallow skin, hooked nose, greasy black hair, black robes"
      image_url: https://i.muistory.com/images/harry-potter-2/1767800391115-severus_snape_portrait_1767781460510.webp
    lockhart:
      name: "Gilderoy Lockhart"
      description: "Handsome blond man, waving robes, dazzling white teeth, narcissistic smile"
      image_url: https://i.muistory.com/images/harry-potter-2/1767800379139-gilderoy_lockhart_portrait_1767781481534.webp
    ginny:
      name: "Ginny Weasley"
      description: "11 year old girl, long red hair, pale face, small and looking terrified, Gryffindor robes"
    hagrid:
      name: "Rubeus Hagrid"
      description: "Half-giant, wild bushy black hair and beard, beetle-black eyes, wearing a large moleskin coat"
      image_url: https://i.muistory.com/images/harry-potter-2/1767800391149-rubeus_hagrid_portrait_1767781529948.webp
    tom_riddle:
      name: "Tom Riddle"
      description: "Handsome 16 year old boy, dark hair, Slytherin prefect badge, charming but sinister"
      image_url: https://i.muistory.com/images/harry-potter-2/1767800391114-tom_riddle_portrait_1767781553411.webp
---

# start
```image-gen
prompt: Harry Potter in his bedroom at 4 Privet Drive, looking surprised at a small creature standing on his bed. Classic English comic style.
character: harry
url: https://i.muistory.com/images/harry-potter-2/1767800383596-hp2_scene_01_bedroom_1767790859478.webp
```
这是你在女贞路4号的卧室。虽然这里是你唯一的“家”，但你从未感到快乐。
现在是暑假，你正想念着霍格沃茨的一切。

突然，床上出现了一个有着巨大蝙蝠耳朵、网球般大眼睛的小怪物。他穿着一只破旧的枕套。

“哈利·波特！”小怪物尖声说道，“多比久仰大名，荣幸之至！”

* [你是谁？你想干什么？] -> dobby_warning
* [把它赶走，德思礼一家会听见！] -> dobby_noise

---

# dobby_warning
```image-gen
prompt: Dobby the house elf looking terrified and pleading, pulling on his ears. Harry looks concerned.
character: dobby
url: https://i.muistory.com/images/harry-potter-2/1767800383453-hp2_scene_02_dobby_warning_1767790893553.webp
```
“多比是来警告哈利·波特的，”小精灵颤抖着说，“哈利·波特今年不能回霍格沃茨！有一个阴谋，会有危险！”

多比眼睛睁得大大的，似乎在努力忍住不把头往墙上撞。

“如果不回霍格沃茨，我就只能待在這裡！”你反驳道。

多比为了阻止你，甚至截留了你的信件！无论如何，你必须回去。

就在这时，窗外传来了引擎的轰鸣声。

* [看向窗外] -> the_burrow

---

# dobby_noise
```image-gen
prompt: Uncle Vernon yelling at Harry, face purple with rage. Dobby hiding or disappearing.
url: https://i.muistory.com/images/harry-potter-2/1767800383845-hp2_scene_03_vernon_yelling_1767790915015.webp
```
你的惊呼引起了弗农姨父的注意。他冲进房间，咆哮着让你安静。
多比因为你的不友善而感到悲伤，但他还是留下了一句警告：“霍格沃茨有危险！”然后消失了。

虽然少了一些解释，但结果是一样的：你被锁在了房间里，直到...

窗外传来了引擎的轰鸣声。

* [看向窗外] -> the_burrow (set: health = health - 5)

---

# the_burrow
```image-gen
prompt: A flying blue Ford Anglia car hovering outside a window at night. Ron Weasley is driving and waving.
character: ron
url: https://i.muistory.com/images/harry-potter-2/1767800383996-hp2_scene_04_flying_car_arrival_1767790938182.webp
```
是一辆飞在空中的老式福特安格利亚车！罗恩·韦斯莱从驾驶座探出头来。

“哈利！快上车！”

弗雷德和乔治也在车上。你手忙脚乱地把行李箱塞进后备箱，海德薇的笼子放在后座。
在弗农姨父试图抓住你脚踝的前一秒，汽车轰鸣着冲向夜空。

下一站：陋居。

到了韦斯莱家，韦斯莱夫人虽然生气你们偷车，但还是给你们准备了丰盛的早餐。
不过，作为惩罚（或者说家务），你们需要帮忙清理花园里的地精。

* [开始清理地精（小游戏）] -> de_gnoming_game

---

# de_gnoming_game
```minigame-gen
prompt: '这是一个投掷类小游戏。玩家需要抓住花园里的地精，旋转并将其抛出花园墙外。操作：点击并拖动以旋转，松开以投掷。目标：将地精扔得越远越好。成功条件：扔出 5 只地精。'
variables:
  throw_distance: 投掷距离
url: https://i.muistory.com/images/harry-potter-2/1767800379116-harry-potter-2_de_gnoming_game_minigame.js
```
```image-gen
prompt: Harry and Ron in a garden, swinging small potato-like gnomes by their feet to throw them over a wall. Funny comic style.
characters: [harry, ron]
url: https://i.muistory.com/images/harry-potter-2/1767800380292-hp2_scene_05_de_gnoming_1767790983043.webp
```
花园里到处是像土豆一样的小地精。罗恩示范道：“把它们转晕，然后扔出去！”

（这里是小游戏环节，展示你抓地精的技巧）

* [完成清理] -> platform_934

---

# platform_934
```image-gen
prompt: Harry and Ron pushing trolleys into a brick wall at King's Cross Station, but crashing into it. The barrier is sealed.
characters: [harry, ron]
url: https://i.muistory.com/images/harry-potter-2/1767800384122-hp2_scene_06_platform_934_crash_1767791017561.webp
```
你们来到了国王十字车站。时间已经很紧了。
哈利和罗恩推着推车冲向9¾站台的隔墙...

**砰！**

墙壁像石头一样坚硬，你们被弹了回来。车子翻了，笼子大概也摔坏了。
“通道被封锁了！”罗恩惊恐地说，“火车要开了！”

你们听到了霍格沃茨特快列车离去的汽笛声。

“只有一招了，”罗恩看着停在外面的老福特车，“我们可以飞过去。”

* [驾驶飞车前往霍格沃茨] -> flying_car_scene

---

# flying_car_scene
```minigame-gen
prompt: '驾驶福特安格利亚飞车追赶霍格沃茨特快列车。避开云层中的鸟群和突然出现的障碍物。保持隐形开关开启（如果能量耗尽会显形，增加麻瓜目击风险）。最终目标：安全抵达霍格沃茨城堡上空。'
variables:
  car_health: 汽车耐久度
url: https://i.muistory.com/images/harry-potter-2/1767800382308-harry-potter-2_flying_car_scene_minigame.js
```
```image-gen
prompt: The blue Ford Anglia flying through clouds, following the steam train below. Scenic landscape of Scotland.
url: https://i.muistory.com/images/harry-potter-2/1767800382460-hp2_scene_07_flying_car_chase_1767791036844.webp
```
汽车再次升空。但在长途飞行后，隐形助推器开始故障。
你需要控制好汽车，避开麻瓜的视线，还要小心撞到云里的东西！

（小游戏环节：飞车追逐）

* [抵达霍格沃茨] -> whomping_willow

---

# whomping_willow
```image-gen
prompt: The car crashed into a giant, angry willow tree. The tree branches are smashing the car. Night time.
characters: [harry, ron]
url: https://i.muistory.com/images/harry-potter-2/1767800385882-hp2_scene_08_whomping_willow_crash_1767791067372.webp
```
就在你们以为安全抵达时，汽车引擎熄火了。你们直直地坠落下去...
正好掉进了一棵看起来很脾气暴躁的大树怀里。

是打人柳！

粗大的树枝像鞭子一样抽打着车身。玻璃碎了，车顶凹陷。

* [快逃出车去！] -> escape_willow (set: health = health - 10)
* [试图发动汽车！] -> escape_willow (set: health = health - 15)

---

# escape_willow
```image-gen
prompt: Harry and Ron scrambling away from the tree on the grass. The battered car is driving itself away into the Forbidden Forest.
url: https://i.muistory.com/images/harry-potter-2/1767800385868-hp2_scene_09_escape_willow_1767791122004.webp
```
你们狼狈地逃了出来。那辆伤痕累累的福特车把你们的行李吐了出来，然后愤怒地亮着车灯，独自驶进了禁林深处。

“我爸爸会杀了我的。”罗恩看着远去的车，绝望地说。

你们拖着行李走进城堡，错过了分院仪式，还差点被斯内普教授开除。
好在邓布利多校长给了你们一个机会，但这绝不是一个顺利的开学。

* [进入大礼堂用餐] -> great_hall

---

# great_hall
```image-gen
prompt: The Great Hall at Hogwarts, floating candles, students eating. Harry and Ron sitting at Gryffindor table looking exhausted but relieved. Hermione is there.
characters: [harry, ron, hermione]
url: https://i.muistory.com/images/harry-potter-2/1767800385847-hp2_scene_10_great_hall_feast_1767791156211.webp
```
第二天，生活似乎恢复了正常。你见到了赫敏，还有那个新来的黑魔法防御术老师——吉德罗·洛哈特。
他正忙着给粉丝回信，还试图给你“名气上的建议”。

日子一天天过去，直到万圣节前夕。
当你被费尔奇罚留堂回来时，你听到了墙壁里传来的那个声音...

*“...撕裂你...杀死你...”*

这是一个冰冷、恶毒的声音，只有你能听见。

* [跟随声音奔跑] -> writing_on_wall
* [不管它，回休息室] -> ignore_voice

---

# ignore_voice
你觉得这是幻听。但那个声音越来越大，越来越急迫。
你无法忽视它，你的直觉告诉你，如果不去看看，会发生可怕的事。
你还是追了上去。

* [继续] -> writing_on_wall

---

# writing_on_wall
```image-gen
prompt: A dark corridor in Hogwarts. Writing on the wall in blood - THE CHAMBER OF SECRETS HAS BEEN OPENED. ENEMIES OF THE HEIR, BEWARE. Mrs. Norris the cat hanging stiff by her tail from a torch bracket.
characters: [harry, ron, hermione]
url: https://i.muistory.com/images/harry-potter-2/1767800386458-hp2_scene_11_writing_on_wall_1767791190756.webp
```
在二楼的走廊里，地板上积满了水。
墙上涂抹着一行闪闪发亮的字迹：

> **密室被打开了。**
> **与继承人为敌者，警惕。**

在字迹下方，挂着费尔奇的猫——洛丽丝夫人，它僵硬得像块木板。

学生们渐渐围拢过来。马尔福挤出人群，看着墙上的字，脸上露出了冷笑。
“在这个学校里，你们下一个就是目标，泥巴种！”

虽然没听懂他在说什么，但你知道，霍格沃茨不再安全了。

* [调查现场] -> investigate_scene
* [询问赫敏关于密室的事] -> ask_hermione

---

# investigate_scene
```image-gen
prompt: Harry and Ron looking closely at the wet floor and the spiders fleeing out the window.
url: https://i.muistory.com/images/harry-potter-2/1767800386009-hp2_scene_12_investigate_1767799379262.webp
```
你在地上发现了一滩积水，还有... 蜘蛛？
成群结队的蜘蛛正排着队，拼命地往窗外爬，仿佛在逃离什么巨大的捕食者。

“蜘蛛...”罗恩的脸都白了，“为什么非得是蜘蛛？”

除此之外，你们还发现这水是从默特尔的哭泣女生盥洗室流出来的。

* [去决斗俱乐部练习魔法] -> dueling_club
* [制定复方汤剂计划] -> polyjuice_mission (if: clues_found > 0)

---

# ask_hermione
```image-gen
prompt: Hermione reading a giant old book in the library, explaining to Harry and Ron.
character: hermione
url: https://i.muistory.com/images/harry-potter-2/1767800387141-hp2_scene_13_ask_hermione_1767799404053.webp
```
赫敏依然在图书馆里翻阅着所有的古籍。
“密室...传说中斯莱特林甚至还在学校里藏了一头怪物。”
“能够瞬间石化活物...也许我们需要更多线索。”

赫敏认为这是一场持久战。而为了应对危险，洛哈特教授举办了决斗俱乐部。

* [前往决斗俱乐部] -> dueling_club

---

# dueling_club
```image-gen
prompt: Gilderoy Lockhart and Severus Snape bowing to each other on a dueling stage in the Great Hall. Students watching.
characters: [harry, snape, lockhart]
url: https://i.muistory.com/images/harry-potter-2/1767800387156-hp2_scene_14_dueling_club_1767799436466.webp
```
大礼堂被改成了一个决斗舞台。洛哈特穿着华丽的紫红色长袍，旁边是穿着黑袍的一脸阴沉的斯内普。

斯内普仅仅用了一招“除你武器”，就把洛哈特击飞到了墙上。
“示范到此结束！”洛哈特爬起来尴尬地说，“现在轮到你们了。”

你被安排和马尔福对手。马尔福阴笑着举起了魔杖。
“乌龙出洞！”

一条黑蛇从他的杖尖喷出，落在地板上，昂起头准备攻击。

* [使用缴械咒（开始决斗小游戏）] -> dueling_minigame
* [用蛇佬腔和蛇说话] -> parseltongue_reveal

---

# dueling_minigame
```minigame-gen
prompt: '巫师决斗小游戏。机制：石头剪刀布式的咒语克制。攻击咒语克制防御咒语，防御咒语克制干扰咒语，干扰咒语克制攻击咒语。需要在规定时间内选择咒语。'
variables:
  duel_wins: 胜利次数
url: https://i.muistory.com/images/harry-potter-2/1767800381912-harry-potter-2_dueling_minigame_minigame.js
```
你和马尔福展开了激烈的对攻。你需要快速反应，选择正确的咒语来克制他！

（小游戏：巫师决斗）

* [赢得决斗] -> parseltongue_reveal (set: house_points = house_points + 10)
* [输掉决斗] -> parseltongue_reveal (set: health = health - 10)

---

# parseltongue_reveal
```image-gen
prompt: Harry speaking to a cobra on the floor, looking intense. Other students looking terrified and backing away.
character: harry
url: https://i.muistory.com/images/harry-potter-2/1767800387113-hp2_scene_15_parseltongue_1767799459265.webp
```
那条蛇正准备攻击贾斯廷。情急之下，你冲上前去。
你只想叫它停下，但在别人听来，你嘴里发出的是嘶嘶的可怕声音。

蛇顺从地瘫软在地上。

全场死一般的寂静。罗恩把你拉走了。
“你是蛇佬腔！那是萨拉查·斯莱特林的标志！”

现在，全校都以为你是那个继承人了。

你们决定主动出击，用复方汤剂混进斯莱特林休息室，问问马尔福是不是真正的继承人。

* [执行复方汤剂计划] -> polyjuice_mission

---

# polyjuice_mission
```image-gen
prompt: Harry and Ron (looking like Crabbe and Goyle) sitting on a leather sofa in the Slytherin dungeon common room. Draco Malfoy talking.
characters: [harry, ron]
url: https://i.muistory.com/images/harry-potter-2/1767800387504-hp2_scene_16_polyjuice_1767799491640.webp
```
你们喝下了赫敏熬制的（像鼻涕一样的）药水，变成了克拉布和高尔的样子。
在斯莱特林的地窖里，你们套出了马尔福的话：

1. 他不是继承人。
2. 上一次密室打开是在50年前，死了一个麻瓜女生。

药效快要过了，你们匆忙逃离。
回到那个废弃的盥洗室，你们发现了一本黑色的日记本。

* [打开日记本] -> tom_riddle_flashback

---

# tom_riddle_flashback
```image-gen
prompt: Harry falling into a sepia-toned memory. Standing in the Headmaster's office watching a young Tom Riddle.
character: harry
url: https://i.muistory.com/images/harry-potter-2/1767800387002-hp2_scene_17_tom_riddle_1767799540470.webp
```
日记本带你进入了一段记忆。你看到了50年前的汤姆·里德尔。
他指控海格打开了密室，放出了怪物——阿拉戈克。

回到现实，还没等你想清楚，海格就被魔法部带走了。邓布利多也被停职了。
海格临走前留下了一句话：“跟着蜘蛛走。”

赫敏也被石化了！你在她紧握的手里发现了一张纸条。

* [前往禁林寻找蜘蛛] -> aragog_meeting (set: clues_found = clues_found + 1)
* [查看赫敏手中的纸条] -> hermione_clue (set: clues_found = clues_found + 1)

---

# aragog_meeting
```image-gen
prompt: Giant spider Aragog strictly talking to Harry and Ron in a dark forest clearing. Hundreds of smaller spiders surrounding them.
character: ron
url: https://i.muistory.com/images/harry-potter-2/1767800388162-hp2_scene_18_aragog_1767799562036.webp
```
在禁林深处，你们找到了阿拉戈克——一只像大象一样大的八眼巨蛛。
它告诉你们：
“我不是密室里的怪物。那怪物是蜘蛛最害怕的古老生物。”
“那个死去的女孩，是在厕所里死的。”

线索齐了！但在你们离开前，阿拉戈克说：
“我的儿女们不伤害海格。但我不能命令它们不吃掉新鲜的肉送上门……”

成百上千只蜘蛛向你们涌来。
此时，那辆野生的福特飞车冲了出来！

* [上车逃跑（小游戏）] -> spider_chase_minigame

---

# spider_chase_minigame
```minigame-gen
prompt: '禁林逃亡跑酷游戏。驾驶破损的飞车在树根和蜘蛛群中穿梭。躲避巨型蜘蛛的扑咬和倒下的树木。坚持一定距离直到冲出禁林。'
variables:
  escape_success: 逃脱成功
url: https://i.muistory.com/images/harry-potter-2/1767800383553-harry-potter-2_spider_chase_minigame_minigame.js
```
（小游戏：蜘蛛大逃亡）

* [成功逃脱] -> hermione_clue
* [被蜘蛛抓住了] -> game_over_spiders

---

# hermione_clue
```image-gen
prompt: A torn page from a library book held in a hand. Illustration of a Basilisk. Text visible - Pipes.
url: https://i.muistory.com/images/harry-potter-2/1767800388039-hp2_scene_19_hermione_clue_1767799581731.webp
```
你们安全了。结合阿拉戈克的话，你终于看懂了赫敏留下的纸条：
**蛇怪（Basilisk）**。
它是蛇类之王，视线可以杀人。蜘蛛害怕它。
它是怎么在城堡里移动的？
赫敏在旁边写了一个词：**管子**。

受害者都在盥洗室附近，遇难的女孩就是哭泣的默特尔！
而此时，金妮·韦斯莱被抓进了密室！墙上出现了新的血字：
“她的尸骨将永远留在密室。”

哈利，你必须去救她。

* [前往默特尔的盥洗室] -> bathroom_entrance

---

# bathroom_entrance
```image-gen
prompt: Harry speaking Parseltongue to a sink tap with a snake engraved on it. The sinks moving apart to reveal a dark tunnel.
character: harry
url: https://i.muistory.com/images/harry-potter-2/1767800388676-hp2_scene_20_bathroom_1767799610880.webp
```
你找到了那个刻着小蛇的水龙头。
你再次用蛇佬腔命令：“*打开*”。

水池缓缓分开，露出了一条巨大的、通向地底深处的管道。
洛哈特教授试图逃跑，但被你们逼着一起跳了下去。

* [跳进管道] -> chamber_slide

---

# chamber_slide
你们顺着黏糊糊的管道滑行了很久，终于落到了地底。
地面上到处是小动物的骨头，还有一张巨大的绿色蛇皮。

洛哈特抢走了罗恩的魔杖试图施遗忘咒，结果被损坏的魔杖反噬，炸塌了隧道。
你和罗恩被分开了。

“哈利，这一段你得自己走了。”罗恩在乱石堆后喊道。

你独自一人，握紧魔杖，走向前方那扇刻着纠缠大蛇的圆门。

* [进入密室] -> chamber_of_secrets

---

# chamber_of_secrets
```image-gen
prompt: The Chamber of Secrets. A giant stone face of Salazar Slytherin at the end of a long walkway over water. Ginny lying motionless. Tom Riddle standing there.
characters: [harry, harry]
url: https://i.muistory.com/images/harry-potter-2/1767800388499-hp2_scene_21_chamber_1767799650394.webp
```
这是一个巨大的石室，两侧立着高耸的石柱。
金妮躺在斯莱特林雕像脚下，面色苍白，奄奄一息。

而汤姆·里德尔站在那里——那是一段记忆的实体。
他告诉你真相：他就是伏地魔。是他控制了金妮打开密室。
随着金妮生命力的流逝，里德尔正在变得越来越真实。

“以此对阵全盛时期的里德尔领主？”
他转身对着雕像嘶嘶作响。
斯莱特林的石像嘴巴张开了，那一恐怖的怪物正在苏醒。

* [闭上眼睛！] -> basilisk_summoned

---

# basilisk_summoned
```image-gen
prompt: Fawkes the Phoenix flying in, dropping the Sorting Hat. The Basilisk (giant snake) emerging from the statue.
url: https://i.muistory.com/images/harry-potter-2/1767800388104-hp2_scene_22_basilisk_summon_1767799687777.webp
```
就在你绝望时，一声嘹亮的凤鸣响起。
邓布利多的凤凰——福克斯飞来了！它扔给了你**分院帽**，然后冲向了蛇怪，啄瞎了它的双眼！

蛇怪痛苦地翻滚，但它依然能闻到你的气味，依然有剧毒的獠牙。
你把手伸进分院帽... 你摸到了一柄冰冷的银剑。

* [拔出格兰芬多宝剑，决一死战！] -> basilisk_battle (set: has_sword = true)

---

# basilisk_battle
```minigame-gen
prompt: '最终BOSS战：蛇怪。阶段1：躲避蛇怪的尾巴扫击和毒牙撕咬。阶段2：利用地形掩护，寻找进攻机会。阶段3（决胜）：当时机出现时，使用格兰芬多宝剑刺穿蛇怪的上颚。'
variables:
  boss_hp: 蛇怪生命值
url: https://i.muistory.com/images/harry-potter-2/1767800377975-harry-potter-2_basilisk_battle_minigame.js
```
（小游戏：决战蛇怪）

* [刺穿蛇怪] -> venom_scene (if: health > 0)
* [被蛇怪杀死] -> game_over_basilisk

---

# venom_scene
```image-gen
prompt: Harry stabbing the Basilisk through the roof of its mouth. A basilisk fang piercing Harry's arm.
character: harry
url: https://i.muistory.com/images/harry-potter-2/1767800389927-hp2_scene_23_venom_1767799720359.webp
```
你用尽全力将剑刺入蛇怪的上颚。它死了。
但你还没来得及庆祝，一颗毒牙深深刺进了你的手臂。
剧毒迅速蔓延，你的视线开始模糊。

里德尔在狂笑：“哈利·波特就要死了。”

你倒在金妮身边，手里还抓着那一截断掉的毒牙。
你看到了旁边的日记本。

* [用毒牙刺向日记本！] -> destroy_diary

---

# destroy_diary
```image-gen
prompt: Harry stabbing the black diary with the basilisk fang. Ink spurting out like blood. Tom Riddle screaming and exploding into light.
character: harry
url: https://i.muistory.com/images/harry-potter-2/1767800390009-hp2_scene_24_destroy_diary_1767799743692.webp
```
用尽最后的力气，你把毒牙扎进了日记本的中心。
墨水像血一样喷涌而出。里德尔发出了凄厉的惨叫，他的身体扭曲、破碎，最后消散在空气中。

金妮醒了过来。
而你...福克斯落在了你的伤口旁，流下了眼泪。
凤凰的眼泪能治愈一切。伤口愈合了。

你们得救了。

* [离开密室] -> ending_success

---

# ending_success
```image-gen
prompt: The Great Hall end of year feast. Hagrid returning. Gryffindor winning the House Cup. Everyone cheering.
characters: [harry, ron, hermione, hagrid]
url: https://i.muistory.com/images/harry-potter-2/1767800389957-hp2_scene_25_ending_1767799782120.webp
```
邓布利多回来了。他告诉你，只有真正的格兰芬多才能从分院帽里拔出那把剑。
卢修斯·马尔福气急败坏地被赶走了——你还顺便耍了个花招，让多比获得了自由（一只袜子！）。

在大礼堂的年终宴会上，赫敏康复归来。海格也从阿兹卡班放出来了。
格兰芬多赢得了学院杯。
这是一个完美的结局。

> “就像邓布利多说的，决定我们成为什么样人的，不是我们的能力，而是我们的选择。”

**恭喜通关！**

* [再次冒险] -> start

---

# game_over_spiders
你被蜘蛛群淹没了。在禁林深处，没有人能听见你的呼救。
这是一个悲惨的结局。

* [重新开始] -> start

---

# game_over_basilisk
蛇怪的毒牙终结了活下来的男孩的传说。
里德尔完全复活了，伏地魔归来了。霍格沃茨陷入了黑暗。

* [重新开始] -> start
