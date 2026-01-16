---
title: 哈利·波特与火焰杯
description: 三强争霸赛危机四伏，伏地魔卷土重来。在英式漫画风格中体验龙斗、黑湖潜水与迷宫终战。
backgroundStory: |
  这是哈利在霍格沃茨的第四年。中断多年的三强争霸赛重新举办，布斯巴顿和德姆斯特朗的学生来到霍格沃茨。
  然而，火焰杯意外吐出了哈利的名字，使他成为第四位勇士。
  三项危险任务、隐藏的阴谋、复活的黑魔王——这一年将改变一切...
cover_image: https://i.muistory.com/images/harry-potter-4/1768374638655-cover.webp
cover_prompt: Harry Potter facing a Hungarian Horntail dragon in the Triwizard Tournament arena, epic battle scene, British comic book style, dramatic lighting
tags:
  - 魔法
  - 冒险
  - 哈利波特
  - 同人
  - 多分支
state:
  health:
    value: 100
    visible: true
    display: progress
    max: 100
    label: 生命值
    trigger:
      condition: <= 0
      scene: game_over_death
  courage:
    value: 50
    visible: true
    display: progress
    max: 100
    label: 勇气
  magic_skill:
    value: 30
    visible: true
    display: progress
    max: 100
    label: 魔法
  ron_friendship:
    value: 80
    visible: false
  hermione_help:
    value: false
    visible: false
  cedric_trust:
    value: 0
    visible: false
  investigation:
    value: 0
    visible: false
  task_points:
    value: 0
    visible: true
    display: value
    label: 竞赛积分
  has_firebolt:
    value: true
    visible: false
  knows_gillyweed:
    value: false
    visible: false
  saved_cedric:
    value: false
    visible: false
  ball_partner:
    value: none
    visible: false
ai:
  style:
    image: Classic British colored comic book style, 1990s aesthetic, bold ink outlines, vibrant saturated colors, dynamic action poses, magical atmosphere with glowing effects
    audio: Epic orchestral fantasy themes, John Williams inspired, dramatic and magical
  characters:
    harry:
      name: Harry Potter
      description: 哈利·波特，14岁，黑发绿眼，额头有闪电伤疤，戴圆眼镜，格兰芬多学生。
      image_prompt: 14 year old boy, messy black hair, bright green eyes, round glasses, lightning bolt scar on forehead, Gryffindor robes, determined expression
      image_url: https://i.muistory.com/images/harry-potter-4/1768373791739-hp4_char_harry.webp
    ron:
      name: Ron Weasley
      description: 罗恩·韦斯莱，哈利最好的朋友，红发雀斑，高瘦，有时嫉妒但忠诚。
      image_prompt: 14 year old boy, bright red hair, freckles, tall and lanky, Gryffindor robes
      image_url: https://i.muistory.com/images/harry-potter-4/1768373792664-hp4_char_ron.webp
    hermione:
      name: Hermione Granger
      description: 赫敏·格兰杰，聪明好学，浓密棕发，是团队的智囊。
      image_prompt: 14 year old girl, bushy brown hair, intelligent brown eyes, carrying books, Gryffindor robes
      image_url: https://i.muistory.com/images/harry-potter-4/1768373793394-hp4_char_hermione.webp
    cedric:
      name: Cedric Diggory
      description: 塞德里克·迪戈里，赫奇帕奇勇士，英俊正直，霍格沃茨的骄傲。
      image_prompt: 17 year old boy, handsome features, grey eyes, dark hair, Hufflepuff robes, noble bearing
      image_url: https://i.muistory.com/images/harry-potter-4/1768373794289-hp4_char_cedric.webp
    fleur:
      name: Fleur Delacour
      description: 芙蓉·德拉库尔，布斯巴顿勇士，银发美丽，有媚娃血统。
      image_prompt: 17 year old girl, long silvery-blonde hair, striking beauty, Beauxbatons blue silk uniform
      image_url: https://i.muistory.com/images/harry-potter-4/1768373795100-hp4_char_fleur.webp
    krum:
      name: Viktor Krum
      description: 威克多尔·克鲁姆，德姆斯特朗勇士，著名魁地奇球员，沉默寡言。
      image_prompt: 18 year old young man, dark hair, thick eyebrows, hooked nose, athletic build, Durmstrang fur cloak
      image_url: https://i.muistory.com/images/harry-potter-4/1768373795915-hp4_char_krum.webp
    moody:
      name: Mad-Eye Moody
      description: 疯眼汉穆迪，黑魔法防御术教授，满脸伤疤，有魔眼和木腿。（实为小克劳奇假扮）
      image_prompt: Scarred old wizard with magical spinning blue eye, wooden leg, grizzled appearance, constant vigilance expression
      image_url: https://i.muistory.com/images/harry-potter-4/1768373796751-hp4_char_moody.webp
    dumbledore:
      name: Albus Dumbledore
      description: 阿不思·邓布利多，霍格沃茨校长，白发白胡，半月眼镜，慈祥睿智。
      image_prompt: Elderly wizard with long white beard and hair, half-moon spectacles, purple robes, wise and kind expression
      image_url: https://i.muistory.com/images/harry-potter-4/1768382158768-hp4_char_dumbledore.webp
    voldemort:
      name: Lord Voldemort
      description: 伏地魔，黑魔王，蛇脸红眼无鼻，恐怖至极。
      image_prompt: Terrifying dark wizard with snake-like face, red slit eyes, no nose, pale white skin, black robes
      image_url: https://i.muistory.com/images/harry-potter-4/1768373798565-hp4_char_voldemort.webp
    wormtail:
      name: Peter Pettigrew
      description: 小矮星彼得，叛徒，矮胖鼠面，银手，伏地魔的仆人。
      image_prompt: Short balding man with rat-like features, watery eyes, silver hand, cowering posture
      image_url: https://i.muistory.com/images/harry-potter-4/1768382159637-hp4_char_wormtail.webp
    dobby:
      name: Dobby
      description: 多比，自由的家养小精灵，大眼睛大耳朵，穿着不搭的袜子。
      image_prompt: Small house-elf with large tennis ball eyes, bat-like ears, wearing mismatched socks
      image_url: https://i.muistory.com/images/harry-potter-4/1768382160690-hp4_char_dobby.webp
    hagrid:
      name: Rubeus Hagrid
      description: 鲁伯·海格，神奇动物保护课教授，半巨人，心地善良。
      image_prompt: Giant man with wild black hair and beard, kind beetle-black eyes, moleskin coat
      image_url: https://i.muistory.com/images/harry-potter-4/1768382161933-hp4_char_hagrid.webp
    snape:
      name: Severus Snape
      description: 西弗勒斯·斯内普，魔药学教授，油腻黑发鹰钩鼻，态度冰冷。
      image_prompt: Tall thin wizard with greasy black hair, hooked nose, sallow skin, black robes, cold expression
      image_url: https://i.muistory.com/images/harry-potter-4/1768382162853-hp4_char_snape.webp
    sirius:
      name: Sirius Black
      description: 小天狼星·布莱克，哈利的教父，现在躲藏中通过信件联系。
      image_prompt: Thin man with long dark hair, gaunt but handsome face, intense grey eyes
      image_url: https://i.muistory.com/images/harry-potter-4/1768382163717-hp4_char_sirius.webp
    cho:
      name: Cho Chang
      description: 张秋，拉文克劳找球手，黑发美丽，塞德里克的女友。
      image_prompt: 15 year old Asian girl, long black hair, pretty features, Ravenclaw robes
      image_url: https://i.muistory.com/images/harry-potter-4/1768382164554-hp4_char_cho.webp
---

# start

```yaml
image:
  prompt: Harry lying in bed at 4 Privet Drive reading a letter by moonlight, owl at window, excited expression, small cramped bedroom
  character: harry
  url: https://i.muistory.com/images/harry-potter-4/1768371829202-hp4_start_1768122182183.webp
```

又一个漫长的暑假。你躺在女贞路4号狭小的卧室里，刚收到一封令人兴奋的信。

罗恩邀请你去陋居住几天，然后一起去看魁地奇世界杯！爱尔兰对保加利亚的决赛！

韦斯莱先生弄到了顶层包厢的票。这将是你经历过的最棒的暑假！

* [读完信件，期待出发] -> privet_drive

---

# privet_drive

```yaml
image:
  prompt: The Dursleys looking horrified in their neat living room as Harry mentions wizards are coming, Vernon turning purple
  url: https://i.muistory.com/images/harry-potter-4/1768371830516-hp4_privet_drive_1768122201775.webp
```

"韦斯莱先生会来接我。"你小心翼翼地向德思礼一家宣布。

弗农姨父的脸涨成紫色。"那些……那些怪胎？来我的房子？"

"他们用飞路粉——就是壁炉里的那种魔法——"

"够了！"弗农姨父吼道，"就一次！他们来了就赶紧带你走！"

* [等待韦斯莱先生] -> weasley_arrival

---

# weasley_arrival

```yaml
image:
  prompt: The Weasleys tumbling out of the Dursleys blocked-up fireplace, soot everywhere, Fred and George grinning mischievously, Arthur Weasley looking apologetic, British comic style chaos
  characters:
    - harry
    - ron
  url: https://i.muistory.com/images/harry-potter-4/1768371831430-hp4_weasley_arrival_1768122220824.webp
```

砰！轰隆隆！

壁炉里传来巨响。烟灰四溅，韦斯莱先生、弗雷德、乔治和罗恩一个接一个从被封死的壁炉里滚了出来！

"哦天哪！"韦斯莱先生尴尬地拍着身上的灰，"我以为麻瓜的壁炉都是通的……"

德思礼一家吓得缩在墙角。达力捂着屁股——弗雷德"不小心"掉落的太妃糖让他的舌头变得有一米长！

* [赶紧离开这里！] -> burrow_summer

---

# burrow_summer

```yaml
image:
  prompt: The Burrow in warm summer sunshine, crooked magical house with many chimneys, Harry Ron and Hermione playing in the garden, gnomes running around
  characters:
    - harry
    - ron
    - hermione
  url: https://i.muistory.com/images/harry-potter-4/1768371832248-hp4_burrow_summer.webp
```

陋居！这里才是真正的家。

歪歪扭扭的房子、花园里乱跑的地精、韦斯莱夫人丰盛的饭菜……还有你最好的朋友们。

赫敏也来了，你们三人重聚。

"明天一早出发！"韦斯莱先生兴奋地说，"我们要走门钥匙，在黎明时分出发！"

* [出发去世界杯！] -> world_cup_portkey

---

# world_cup_portkey

```yaml
image:
  prompt: Group of wizards touching an old boot Portkey on a misty hilltop at dawn, magical blue swirling light beginning to form, anticipation on faces
  characters:
    - harry
    - ron
    - hermione
  url: https://i.muistory.com/images/harry-potter-4/1768371833237-hp4_world_cup_portkey.webp
```

凌晨时分，你们爬上山顶。另一队人已经在等待了——阿莫斯·迪戈里和他的儿子塞德里克。

塞德里克是赫奇帕奇的级长，高大英俊，对你友好地点头致意。

"抓住它！"韦斯莱先生指着地上一只破旧的长筒靴，"门钥匙就要启动了！"

所有人都把手指按在靴子上。忽然，一股强力从你的肚脐后方拽住你——

世界开始疯狂旋转！

* [到达营地] -> world_cup_camp

---

# world_cup_camp

```yaml
image:
  prompt: Massive magical campsite with thousands of colorful wizard tents, Irish shamrock flags and Bulgarian red banners everywhere, wizards in outlandish clothes, festive atmosphere
  characters:
    - harry
    - ron
  url: https://i.muistory.com/images/harry-potter-4/1768371834006-hp4_world_cup_camp_1768122239257.webp
```

你们落在一片广阔的营地中。成千上万的帐篷延伸到天际！

爱尔兰的三叶草旗帜和保加利亚的红色旗帜在风中飘扬。到处都是穿着奇装异服的巫师。

你们的帐篷外表很小，但里面……

"哇！"你惊叹道。帐篷内部是一间完整的公寓，有卧室、厨房，甚至还有浴室！

* [前往球场观看决赛！] -> world_cup_match

---

# world_cup_match

```yaml
image:
  prompt: Massive Quidditch World Cup stadium interior from VIP box view, 100000 fans cheering, players zooming on broomsticks far below, magical fireworks
  characters:
    - harry
    - ron
  url: https://i.muistory.com/images/harry-potter-4/1768372205893-hp4_world_cup_stadium.webp
```

十万名观众的欢呼声震耳欲聋！

你坐在顶层包厢，俯瞰整个球场。爱尔兰队的吉祥物——一群矮妖精——在空中撒下金币。保加利亚派出了一群迷人的媚娃。

比赛开始了！

双方你来我往，激烈非凡。保加利亚的找球手威克多尔·克鲁姆——世界上最好的魁地奇球员——在空中如鹰隼般盘旋。

* [聚精会神观看比赛] -> world_cup_victory

---

# world_cup_victory

```yaml
image:
  prompt: Viktor Krum catching the Golden Snitch but looking defeated, Irish team celebrating wildly, fireworks exploding, night sky filled with green and gold
  character: krum
  url: https://i.muistory.com/images/harry-potter-4/1768371835113-hp4_world_cup_victory_1768122259425.webp
```

克鲁姆抓住了金色飞贼！但是——

"爱尔兰赢了！"李·乔丹的解说响彻全场，"170比160！克鲁姆抓住飞贼，但爱尔兰靠积分优势取胜！"

弗雷德和乔治欣喜若狂——他们赌克鲁姆会抓住飞贼，但爱尔兰会赢！

庆祝活动持续到深夜。终于，精疲力竭的你们回到帐篷休息……

* [回帐篷睡觉] -> death_eater_attack

---

# death_eater_attack

```yaml
image:
  prompt: Death Eaters in dark robes and skull masks marching through burning campsite at night, Muggle family floating helplessly above, panic and fire everywhere, terrifying scene
  url: https://i.muistory.com/images/harry-potter-4/1768371835724-hp4_death_eater_attack.webp
```

砰！砰！砰！

尖叫声把你从睡梦中惊醒。帐篷外火光冲天！

"出去！快出去！"韦斯莱先生冲进来，脸色惨白，"食死徒来了！"

你冲出帐篷，眼前的景象让你血液凝固——

一群戴着骷髅面具的黑袍巫师正在游行，他们的魔杖让一家麻瓜像木偶一样在空中翻转！

* [拔出魔杖反抗！] -> attack_fight (set: courage = courage + 20, health = health - 15)
* [保护身边的人！] -> attack_protect (set: ron_friendship = ron_friendship + 15, hermione_help = true)
* [向森林逃跑！] -> attack_flee
* [尝试找到韦斯莱先生！] -> attack_search (set: investigation = investigation + 10)

---

# attack_fight

```yaml
image:
  prompt: Harry firing red stunning spell at Death Eaters, being knocked back by counter-curse, determined heroic expression despite danger
  character: harry
  url: https://i.muistory.com/images/harry-potter-4/1768371836552-hp4_attack_fight_1768122290069.webp
```

"昏昏倒地！"你举起魔杖对准最近的食死徒。

红光击中他，但另一个食死徒的咒语把你击飞！你重重摔在地上，肩膀一阵剧痛。

"小鬼找死！"有人咆哮。

赫敏拉住你，"快走！我们打不过他们！"

你踉跄着逃向森林，但你展现了勇气。

* [逃入森林] -> dark_mark_appear

---

# attack_protect

```yaml
image:
  prompt: Harry casting Protego shield spell to protect Hermione and a scared young witch girl, heroic protective stance, blue shield glowing
  characters:
    - harry
    - hermione
  url: https://i.muistory.com/images/harry-potter-4/1768371837368-hp4_attack_protect_1768122309124.webp
```

一个小女孩在人群中跌倒，食死徒的咒语朝她飞来——

"盔甲护身！"你冲上去，在她和赫敏面前撑起一道防护罩。

咒语被弹开了！

"快跑！"你护送她们冲向森林。赫敏感激地看着你，"谢谢你，哈利。"

你们一起逃入黑暗之中。

* [在森林中躲藏] -> dark_mark_appear

---

# attack_flee

```yaml
image:
  prompt: Harry Ron and Hermione running into dark forest at night, burning tents behind them, fear on their faces
  characters:
    - harry
    - ron
    - hermione
  url: https://i.muistory.com/images/harry-potter-4/1768371838433-hp4_attack_flee_1768122331270.webp
```

你抓住罗恩和赫敏的手，拼命向森林奔去。

身后，尖叫声、咒语声、火焰的爆裂声混成一片。食死徒的笑声在黑夜中回荡。

终于，你们跑进了森林深处，周围安静下来。

只有你们急促的喘息声。

* [在黑暗中等待] -> dark_mark_appear

---

# attack_search

```yaml
image:
  prompt: Harry searching through chaos of running wizards and fire, glimpsing a suspicious hunched figure in shadows, investigative expression
  character: harry
  url: https://i.muistory.com/images/harry-potter-4/1768371839430-hp4_attack_search_1768122348792.webp
```

在混乱中，你试图找到韦斯莱先生。

人群奔跑、火焰燃烧……突然，你瞥见一个鬼鬼祟祟的身影躲进树丛。

那不是食死徒……那个身影矮小、佝偻，鬼鬼祟祟地朝森林深处移动。

你的直觉告诉你，有什么不对劲。

* [跟踪那个可疑身影] -> dark_mark_witness (set: investigation = investigation + 20)
* [算了，先逃进森林] -> dark_mark_appear

---

# dark_mark_witness

```yaml
image:
  prompt: Harry hiding behind a tree watching a dark hunched figure casting the Dark Mark spell into the sky, green skull and snake forming, tense spying scene
  character: harry
  url: https://i.muistory.com/images/harry-potter-4/1768371840144-hp4_dark_mark_witness_1768122364393.webp
```

你悄悄跟上那个身影，躲在一棵大树后面。

那个人停下来，举起魔杖指向天空——

"尸骨再现！"

一道绿光冲上夜空，形成一个巨大的图案：骷髅头，嘴里吐出一条蛇。

黑魔标记！

你看清了那个人——不，那是一个家养小精灵？它吓得浑身发抖，然后消失在黑暗中。

你记住了这一切……

* [返回寻找朋友] -> ministry_interrogation (set: investigation = investigation + 10)

---

# dark_mark_appear

```yaml
image:
  prompt: The Dark Mark glowing sickly green in night sky above trees, skull with snake, terrified faces of Harry Ron and Hermione looking up
  characters:
    - harry
    - ron
    - hermione
  url: https://i.muistory.com/images/harry-potter-4/1768371841052-hp4_dark_mark_appear_1768122383419.webp
```

天空突然亮起绿光。

你抬头，血液凝固了——一个巨大的骷髅头悬浮在夜空中，一条蛇从它嘴里吐出！

"那是……"赫敏的声音颤抖，"黑魔标记……神秘人的标志……"

周围传来更多惊恐的尖叫。

这个标记十三年没有出现过了。它代表着死亡和恐惧。

突然，四周亮起魔杖的光芒——魔法部的人把你们包围了！

* [被魔法部人员发现] -> ministry_interrogation

---

# ministry_interrogation

```yaml
image:
  prompt: Ministry officials with lit wands interrogating Harry in dark forest, Barty Crouch Sr looking stern, tense atmosphere
  character: harry
  url: https://i.muistory.com/images/harry-potter-4/1768444088280-hp4_ministry_interrogation.webp
```

"是谁施放的黑魔标记？！"巴蒂·克劳奇先生厉声问道。

"不是我们！"你辩解，"我们只是逃进森林——"

克劳奇先生用怀疑的目光打量你们。其他魔法部官员在四处搜查。

最终，他们没有找到证据，不得不放你们走。

"世界杯结束了，"韦斯莱先生疲惫地说，"我们回陋居吧。"

这个本该完美的夜晚，被一个不祥的符号彻底打破了。

* [返回陋居] -> chapter1_end

---

# chapter1_end

```yaml
image:
  prompt: Harry and friends in the Burrow kitchen at grey dawn, worried expressions, Daily Prophet on table with Dark Mark headline
  characters:
    - harry
    - ron
    - hermione
  url: https://i.muistory.com/images/harry-potter-4/1768444089671-hp4_chapter1_end.webp
```

回到陋居，气氛沉重。

《预言家日报》的头条写着：食死徒重现世界杯！黑魔标记惊现夜空！

"这意味着什么？"罗恩问。

"意味着还有人忠于神秘人，"韦斯莱夫人叹息，"即使他已经消失了这么多年……"

赫敏若有所思："会不会……和哈利有关？"

你想起了那个夜晚，小天狼星的警告，还有你额头上那道隐隐作痛的伤疤。

暑假结束了。是时候返回霍格沃茨了。

* [前往霍格沃茨特快] -> hogwarts_express

---

# hogwarts_express

```yaml
image:
  prompt: Harry Ron and Hermione in Hogwarts Express compartment discussing seriously, letter in Harry's hand, countryside passing outside window
  characters:
    - harry
    - ron
    - hermione
  url: https://i.muistory.com/images/harry-potter-4/1768371841976-hp4_hogwarts_express.webp
```

9月1日，你们登上了霍格沃茨特快列车。

你把小天狼星的回信给朋友们看。他写道：

"哈利，世界杯的事我已经听说了。食死徒重新活动……这不是好兆头。你的伤疤疼过吗？任何异常都要告诉邓布利多。保持警惕。"

"他在担心什么？"罗恩皱眉。

窗外，雨开始下了。一种隐隐的不安笼罩着你。

* [到达霍格沃茨] -> welcome_feast

---

# welcome_feast

```yaml
image:
  prompt: Great Hall at night during welcome feast, candles floating, Dumbledore at podium making announcement, students gasping with excitement
  character: dumbledore
  url: https://i.muistory.com/images/harry-potter-4/1768372207318-hp4_great_hall_feast.webp
```

开学典礼上，邓布利多宣布了一个惊人的消息：

"今年，霍格沃茨将举办一项中断了一个多世纪的赛事——三强争霸赛！"

大厅里爆发出兴奋的议论声。

"布斯巴顿魔法学校和德姆斯特朗魔法学院的学生将在十月抵达。届时，每所学校将选出一名勇士参加三项危险的魔法任务。"

"冠军将获得永恒的荣耀和一千加隆奖金！"

"但是，"邓布利多严肃地说，"只有年满17岁的学生才能参赛。三强争霸赛曾经导致参赛者死亡。这不是儿戏。"

* [期待比赛] -> moody_intro

---

# moody_intro

```yaml
image:
  prompt: Mad-Eye Moody limping dramatically into the Great Hall during storm, lightning flash illuminating his scarred face and spinning magical blue eye, wooden leg thumping
  character: moody
  url: https://i.muistory.com/images/harry-potter-4/1768372209002-hp4_moody_entrance.webp
```

同时，邓布利多介绍了新任黑魔法防御术教授——

阿拉斯托·穆迪。

大门被推开，闪电照亮了一个可怕的身影：满脸伤疤，一只眼睛是不断旋转的魔眼，还有一条木腿。

"疯眼汉穆迪！"罗恩惊呼，"他是退休的傲罗！抓过无数黑巫师！"

穆迪一瘸一拐地走向教工席，每个人都目不转睛地看着他。

那只魔眼转向你，在你身上停留了片刻……

* [上第一节黑魔法防御课] -> moody_class

---

# moody_class

```yaml
image:
  prompt: Moody demonstrating unforgivable curses in dark DADA classroom, spider being tortured with Cruciatus curse, students watching in horror, Neville looking sick
  character: moody
  url: https://i.muistory.com/images/harry-potter-4/1768372210156-hp4_classroom_moody.webp
```

穆迪教授的第一节课与众不同。

"今天，我要教你们不可饶恕咒。"

他从罐子里取出一只蜘蛛，放大它。

"夺魂咒——完全控制他人！钻心咒——让人痛不欲生！"

蜘蛛在不可见的力量下扭曲尖叫。纳威的脸色苍白得可怕。

"还有……阿瓦达索命。"

一道绿光，蜘蛛死了。"只有一个人活过这道咒语。"穆迪的魔眼盯着你，"他就坐在这间教室里。"

* [轮到你尝试抵抗夺魂咒] -> imperius_curse

---

# imperius_curse

```yaml
image:
  prompt: Moody pointing wand at Harry, dreamlike golden haze surrounding Harry, internal struggle visible on his face, other students watching nervously
  characters:
    - harry
    - moody
  url: https://i.muistory.com/images/harry-potter-4/1768371842970-hp4_imperius_curse_1768134467731.webp
minigame:
  prompt: 抵抗夺魂咒小游戏。屏幕中央有一个代表意志力的光球，玩家需要连续快速点击来增强意志力。同时会出现金色诱惑符号试图分散注意力。在30秒内将意志力槽充满即可抵抗成功。变量 resist_score 记录最终得分。
  variables:
    - resist_score: 抵抗得分
  url: https://i.muistory.com/images/harry-potter-4/1768218061169-harry-potter-4_imperius_curse_minigame.js
```

"波特，到前面来。"

穆迪举起魔杖。"我要对你施夺魂咒。尝试抵抗它。"

"魂魄出窍！"

一种美妙的空虚感笼罩了你。一个声音在你脑海中低语："跳上桌子……跳上桌子……"

真是个好主意……等等，不对！你为什么要跳上桌子？

你感觉到另一种力量在抗拒那个声音——是你自己的意志。

你感觉到身体在颤抖，两种力量在你内心交战……

* [成功抵抗！] -> imperius_resist (if: resist_score >= 70) (set: courage = courage + 15, investigation = investigation + 5)
* [虽然失败但展现了抗性] -> imperius_fail (set: courage = courage + 10)

---

# imperius_resist

```yaml
image:
  prompt: Harry breaking free from golden Imperius haze with explosive force, determined expression, Moody looking at him with calculating interest
  characters:
    - harry
    - moody
  url: https://i.muistory.com/images/harry-potter-4/1768371843793-hp4_imperius_resist_1768134486319.webp
```

"不！"

你大吼一声，那个声音从你脑海中碎裂了！

"非常好！"穆迪的眼中闪过一丝奇怪的光芒，"波特，你能抵抗夺魂咒。极少有人能做到这一点……"

他的魔眼在你身上转了一圈，"有趣……非常有趣。"

下课后，你感觉穆迪教授似乎对你特别关注。这让你有些不安……

* [继续学业] -> foreign_schools_arrive

---

# imperius_fail

```yaml
image:
  prompt: Harry partially jumping onto desk then catching himself, looking confused and shaky, classmates watching
  character: harry
  url: https://i.muistory.com/images/harry-potter-4/1768371844622-hp4_imperius_fail_1768134504539.webp
```

你的膝盖弯曲，几乎要跳上桌子——但在最后一刻，你抓住了桌沿，阻止了自己。

"有抵抗力，但还不够。"穆迪说，"不过比大多数人强。再来！"

经过几次尝试，你终于能够部分抵抗夺魂咒了。虽然没有完全成功，但你展现了潜力。

* [继续学业] -> foreign_schools_arrive

---

# foreign_schools_arrive

```yaml
image:
  prompt: Beauxbatons giant carriage pulled by enormous winged horses flying through clouds, Durmstrang ship rising dramatically from the lake, students watching in awe
  characters:
    - fleur
    - krum
  url: https://i.muistory.com/images/harry-potter-4/1768372211590-hp4_beauxbatons_arrival.webp
```

十月底，两所外国学校抵达霍格沃茨！

布斯巴顿——一辆由十二匹巨型飞马拉动的蓝色马车从天而降！穿着丝绸制服的学生们鱼贯而出，领头的是一位银发美女。

德姆斯特朗——一艘巨船从黑湖中升起，甲板上站着身披毛皮斗篷的学生。

"看！是克鲁姆！"罗恩几乎疯狂地指着那队人，"威克多尔·克鲁姆！他来霍格沃茨了！"

克鲁姆沉默地走过，眼神深邃。

* [参加欢迎晚宴] -> goblet_ceremony

---

# goblet_ceremony

```yaml
image:
  prompt: The Goblet of Fire burning with blue magical flames in center of Great Hall, glowing age line around it, students watching eagerly
  character: dumbledore
  url: https://i.muistory.com/images/harry-potter-4/1768372212603-hp4_goblet_of_fire.webp
```

晚宴上，邓布利多揭开了勇士选拔的方式——

火焰杯。

一个巨大的木杯燃烧着蓝色火焰，被放置在大厅中央。

"想参赛的人，把写有姓名和学校的羊皮纸投入火焰杯。明天万圣节晚宴，它将选出三位勇士。"

他挥动魔杖，一道金色的圆环出现在火焰杯周围。"为了防止未成年人尝试，我画了一道年龄线。17岁以下的人无法穿过它。"

弗雷德和乔治露出狡猾的笑容，他们显然有了某个主意……

* [等待勇士选拔之夜] -> champions_selected

---

# champions_selected

```yaml
image:
  prompt: Dumbledore reading names from burnt parchments, Cedric Fleur and Krum standing proudly as champions, Goblet of Fire flickering behind, crowd cheering
  characters:
    - cedric
    - fleur
    - krum
    - dumbledore
  url: https://i.muistory.com/images/harry-potter-4/1768372213570-hp4_champions_chosen.webp
```

万圣节之夜，火焰杯终于做出了选择。

火焰变红，吐出第一张羊皮纸——"德姆斯特朗的勇士是：威克多尔·克鲁姆！"

掌声雷动。克鲁姆面无表情地走向侧厅。

火焰再次变红——"布斯巴顿的勇士是：芙蓉·德拉库尔！"

银发女孩优雅地起身。

最后——"霍格沃茨的勇士是：塞德里克·迪戈里！"

赫奇帕奇疯狂地欢呼。塞德里克微笑着走过去。

邓布利多正要结束仪式，突然——

火焰杯再次变红，又吐出一张羊皮纸！

* [不妙……] -> fourth_champion_harry

---

# fourth_champion_harry

```yaml
image:
  prompt: Harry's name on burnt parchment coming out of Goblet of Fire, Dumbledore holding it with shocked expression, entire Great Hall staring at Harry in disbelief
  characters:
    - harry
    - dumbledore
  url: https://i.muistory.com/images/harry-potter-4/1768372214594-hp4_harry_name_selected.webp
```

邓布利多接住羊皮纸，他的脸色变了。

"哈利·波特。"

全场死寂。

所有人都转向你，眼神中混杂着震惊、怀疑和敌意。

"哈利·波特！"邓布利多大声重复，"到这里来！"

你的腿像灌了铅一样沉重。你走向邓布利多，感觉到无数目光刺在你的背上。

赫敏的脸色苍白。罗恩的表情……很复杂。

你没有把名字放进火焰杯。但没有人会相信你。

* [进入侧厅接受质问] -> private_room_confrontation

---

# private_room_confrontation

```yaml
image:
  prompt: Harry being questioned by angry Madam Maxime Karkaroff and concerned Dumbledore in side room, Moody standing in shadows watching, tense confrontation
  characters:
    - harry
    - dumbledore
    - moody
  url: https://i.muistory.com/images/harry-potter-4/1768370726921-hp4_private_room.webp
```

"他作弊！"卡卡洛夫咆哮，"一个不满17岁的孩子怎么可能骗过火焰杯？"

"我没有！"你辩解，"我没有把名字放进去！"

马克西姆夫人冷哼："那是谁放的？"

"如果火焰杯选了他，"穆迪从阴影中走出来，"那就只能按规则办。火焰杯形成了魔法契约——波特必须参赛。"

邓布利多看着你，眼中有一丝忧虑："哈利，你确定……？"

"我没有，校长。我发誓。"

长时间的沉默。最终，规则就是规则——你成为了第四位勇士。

* [返回格兰芬多塔楼] -> ron_confrontation

---

# ron_confrontation

```yaml
image:
  prompt: Ron confronting Harry in dark Gryffindor common room at night, hurt and angry expression on Ron's face, tension thick in the air
  characters:
    - harry
    - ron
  url: https://i.muistory.com/images/harry-potter-4/1768371845382-hp4_ron_confrontation_1768134543309.webp
```

公共休息室里，罗恩在等你。

他的表情冰冷，不像平时的好友，更像是……陌生人。

"你是怎么做到的？"他的声音很平静，但你听得出愤怒，"你怎么骗过年龄线的？为什么不告诉我？"

"罗恩，我没有——"

"少来了！"他打断你，"你总是这样。成为'大难不死的男孩'还不够？现在又要当三强争霸赛的英雄？"

"我没有求这些！"

"那就是你更厉害。"罗恩冷笑一声，转身走向楼梯，"随便你。"

* [愤怒地反击] -> ron_fight (set: ron_friendship = ron_friendship - 50)
* [耐心解释] -> ron_explain (set: ron_friendship = ron_friendship - 10)
* [沉默地目送他离开] -> ron_cold (set: ron_friendship = ron_friendship - 30)
* [请赫敏帮忙调解] -> ask_hermione_help (set: hermione_help = true, ron_friendship = ron_friendship - 5)

---

# ron_fight

```yaml
image:
  prompt: Harry and Ron shouting at each other in common room, both looking devastated and angry, firelight on their faces, broken friendship
  characters:
    - harry
    - ron
  url: https://i.muistory.com/images/harry-potter-4/1768371846371-hp4_ron_fight.webp
```

"你知道吗，罗恩，"你的怒火爆发了，"我受够了你的嫉妒！你以为我想要这个伤疤吗？你以为我想要父母死去？"

"哦，可怜的哈利·波特！"罗恩嘲讽道。

"至少我不会因为朋友的不幸而高兴！"

话一出口，你就后悔了。但已经太晚了。

罗恩的脸变得煞白，然后涨红。他什么都没说，转身冲上楼梯。

你的友谊，在这一刻碎裂了。

* [独自面对] -> preparation_choice

---

# ron_explain

```yaml
image:
  prompt: Harry trying to explain calmly to skeptical Ron, Ron looking away with doubt, strained atmosphere in common room
  characters:
    - harry
    - ron
  url: https://i.muistory.com/images/harry-potter-4/1768371847384-hp4_ron_explain_1768134563192.webp
```

"罗恩，听我说，"你努力保持冷静，"我没有把名字放进火焰杯。我不知道是谁干的，但不是我。"

"那是谁？"

"我不知道……也许有人想害我。"

罗恩哼了一声，但眼神有些动摇。"那你为什么不拒绝？"

"穆迪说火焰杯形成了魔法契约。我必须参赛……"

罗恩沉默了一会儿。"我需要时间想想。"他最终说，然后走上楼去。

不是和解，但至少……没有完全决裂。

* [给他时间冷静] -> preparation_choice

---

# ron_cold

```yaml
image:
  prompt: Harry standing alone in dark common room, Ron's back retreating up stairs, moonlight through window, loneliness and hurt
  character: harry
  url: https://i.muistory.com/images/harry-potter-4/1768371848305-hp4_ron_cold_1768134582432.webp
```

你什么都没说，看着罗恩的背影消失在楼梯上。

也许解释也没用。也许他需要时间。也许……

你一个人站在空荡荡的休息室里，壁炉的火光在脸上跳动。

从第一年开始，罗恩就是你最好的朋友。现在，他甚至不愿看你一眼。

这将是漫长的一段日子。

* [独自准备] -> preparation_choice

---

# ask_hermione_help

```yaml
image:
  prompt: Hermione talking to Harry comfortingly, then going to talk to Ron separately, wise mediator expression, library background
  character: hermione
  url: https://i.muistory.com/images/harry-potter-4/1768370727925-hp4_hermione_help.webp
```

"赫敏，"你抓住她，"帮我跟罗恩说说……"

赫敏叹了口气。"我会试试。但你知道罗恩的脾气。"

她分别找你们两人谈话，试图调解。

"他很受伤，"赫敏后来告诉你，"他觉得自己永远是你的影子。但他会想通的。"

"什么时候？"

"给他时间。"她递给你一叠书，"现在，你应该担心第一个任务。我来帮你研究。"

* [开始准备] -> preparation_choice

---

# preparation_choice

```yaml
image:
  prompt: Harry sitting alone by fire in common room at night, deep in thought, decision weighing on his face, moonlight through window
  character: harry
  url: https://i.muistory.com/images/harry-potter-4/1768370729354-hp4_prep_choice.webp
```

第一个任务在三周后。你完全不知道会面对什么。

你需要帮助，但能找谁呢？

罗恩不理你（如果你们吵架的话）。赫敏愿意帮忙，但她能做的有限。

你想到了几个选择……

* [找海格——也许他知道什么] -> prep_hagrid
* [问穆迪教授——他对你似乎很关心] -> prep_moody (set: investigation = investigation - 5)
* [和赫敏在图书馆研究] -> prep_hermione (if: hermione_help == true) (set: magic_skill = magic_skill + 15)
* [自己独自练习] -> prep_solo (set: courage = courage + 10)
* [找塞德里克交换情报] -> prep_cedric (set: cedric_trust = cedric_trust + 20)

---

# prep_hagrid

```yaml
image:
  prompt: Hagrid leading Harry through dark Forbidden Forest at night, glimpse of massive dragons in cages ahead, fire lighting their scales
  characters:
    - harry
    - hagrid
  url: https://i.muistory.com/images/harry-potter-4/1768372215536-hp4_hagrid_dragons.webp
```

"哈利！"海格在夜里悄悄找到你，"披上隐形衣，跟我来！"

你跟着他走进禁林深处。远处传来一声咆哮……

"那是什么？"

海格没有回答，只是继续前进。终于，你看到了——

四条巨龙在铁笼中咆哮！喷火的鼻息照亮了黑夜！

"天哪……"你倒吸一口凉气。

"第一个任务，"海格低声说，"你要对付火龙，哈利。这是我能告诉你的一切了。"

你的心沉了下去。火龙……你怎么可能对付火龙？

* [看清了要面对的是什么] -> dragon_reveal

---

# prep_moody

```yaml
image:
  prompt: Moody giving suspicious advice to Harry in dark corridor, magical eye watching intently, conspiratorial whisper
  character: moody
  url: https://i.muistory.com/images/harry-potter-4/1768371849221-hp4_prep_moody_1768134640031.webp
```

"波特。"穆迪在走廊里拦住你，"关于第一个任务……"

他的魔眼转了转，确认周围没有人。

"你有什么长处？"

"呃……飞行？"

"那就利用它。"穆迪说，"不管任务是什么，发挥你的长处。你会飞……别人飞不了。"

他拍拍你的肩膀，转身离开。

这个建议很有用……但穆迪对你的关注，总让你觉得哪里不对劲。

* [继续准备] -> dragon_reveal

---

# prep_hermione

```yaml
image:
  prompt: Harry and Hermione surrounded by stacks of books in library at night, late study session, exhausted but determined
  characters:
    - harry
    - hermione
  url: https://i.muistory.com/images/harry-potter-4/1768371850038-hp4_prep_hermione_1768135361278.webp
```

赫敏果然是你最好的朋友。

你们在图书馆待了无数个夜晚，研究各种咒语和策略。

"召唤咒！"赫敏说，"如果你能熟练掌握召唤咒，就可以把任何东西召唤到你手里！"

"飞来飞去！"你对着书本练习，但它只是抖了抖。

"再试！"

到第一个任务前夜，你终于能稳定地召唤物品了。这可能会派上用场……

* [准备完成] -> dragon_reveal

---

# prep_solo

```yaml
image:
  prompt: Harry practicing spells alone in empty classroom at night, wand raised, determined lonely expression, moonlight casting shadows
  character: harry
  url: https://i.muistory.com/images/harry-potter-4/1768371850797-hp4_prep_solo_1768135379344.webp
```

既然没人想帮你，你就自己来。

每天晚上，你一个人在空教室里练习咒语。击昏咒、缴械咒、盔甲护身……

"飞来飞去！"一本书飞到你手里。

"再试！"你练习召唤更远的物品。

虽然孤独，但你的技能在提高。更重要的是，你学会了依靠自己。

这种坚韧，将会是你最大的武器。

* [准备完成] -> dragon_reveal

---

# prep_cedric

```yaml
image:
  prompt: Harry meeting Cedric secretly in a corridor, both looking around cautiously, mutual respect forming between rivals
  characters:
    - harry
    - cedric
  url: https://i.muistory.com/images/harry-potter-4/1768371851354-hp4_prep_cedric_1768135396216.webp
```

你找到塞德里克，"迪戈里，等等。"

他停下来，表情友好。"波特。有什么事？"

"关于第一个任务……"你犹豫了一下，"我知道是什么了。是火龙。"

塞德里克的脸色变了。"火龙？你确定？"

"亲眼看到的。四条。每个勇士对付一条。"

他沉默了一会儿，然后点点头。"谢谢你告诉我。这很公平——另外两个人应该也从他们的校长那里知道了。"

"是的。"你说，"我只是觉得……我们不应该处于不利。"

塞德里克伸出手，"好运，波特。"

你握住他的手。一种信任在你们之间建立了。

* [任务即将开始] -> dragon_reveal

---

# dragon_reveal

```yaml
image:
  prompt: Massive Hungarian Horntail dragon roaring in cage, flames reflected in Harry's horrified glasses, night scene with dragon handlers
  character: harry
  url: https://i.muistory.com/images/harry-potter-4/1768371852205-hp4_dragon_reveal_1768135413954.webp
```

第一个任务——火龙。

四条最凶猛的火龙被从保护区运来：威尔士绿龙、瑞典短鼻龙、中国火球龙，还有最可怕的——匈牙利树蜂龙。

每条龙都守护着一颗金蛋，而那金蛋里藏着下一个任务的线索。

你只有一个目标：活着拿到金蛋。

任务前夜，你几乎一夜未眠。

* [迎接第一任务] -> chapter2_end

---

# chapter2_end

```yaml
image:
  prompt: Harry lying awake in bed night before the task, moonlight on his worried face, mentally preparing for battle
  character: harry
  url: https://i.muistory.com/images/harry-potter-4/1768371852982-hp4_chapter2_end_1768135431824.webp
```

距离第一任务只有几个小时了。

窗外的月光洒在你脸上。你想起了父母，想起了小天狼星，想起了迄今为止经历的一切。

你不知道明天会发生什么。但你知道一件事——

你是哈利·波特。你曾面对过伏地魔，面对过蛇怪，面对过摄魂怪。

一条火龙？

放马过来吧。

* [第一个任务开始] -> task1_arena

---

# task1_arena

```yaml
image:
  prompt: First Task arena with rocky terrain, massive crowd in stadium stands, four dragon handlers visible, tent for champions, dramatic atmosphere
  character: harry
  url: https://i.muistory.com/images/harry-potter-4/1768372216654-hp4_dragon_arena.webp
```

第一任务的日子到了。

竞技场由岩石和巨石构成，四周是高耸的看台，成千上万的观众在欢呼。

你和其他三位勇士在帐篷里等待。塞德里克面色苍白，芙蓉紧握魔杖，克鲁姆面无表情。

"你们将从袋子里抽取对手。"巴格曼先生宣布。

你的心跳加速……

* [抽签] -> golden_egg_draw

---

# golden_egg_draw

```yaml
image:
  prompt: Harry pulling a miniature Hungarian Horntail dragon model from a velvet bag, the tiny dragon snarling, other champions watching
  character: harry
  url: https://i.muistory.com/images/harry-potter-4/1768372217622-hp4_dragon_draw.webp
```

你把手伸进袋子，指尖触到一个扭动的东西——

拿出来一看：一个微型匈牙利树蜂龙，尾巴上挂着数字"4"。

最后一个出场。而且是最凶猛的龙。

其他三人也抽完了：塞德里克对威尔士绿龙，芙蓉对中国火球，克鲁姆对瑞典短鼻龙。

"每条龙都守护着一颗金蛋，"巴格曼说，"你们的任务就是拿到它！"

* [等待轮到你] -> summon_firebolt_practice

---

# summon_firebolt_practice

```yaml
image:
  prompt: Harry in tent concentrating hard, wand raised, practicing the Summoning Charm, magical energy spiraling upward
  character: harry
  url: https://i.muistory.com/images/harry-potter-4/1768370730056-hp4_summon_practice.webp
minigame:
  prompt: 召唤火弩箭小游戏。屏幕上出现散落的魔法符文，玩家需要按正确顺序点击收集它们来完成飞来咒。有30秒时限，收集越多符文，召唤越成功。summon_score记录得分。
  variables:
    - summon_score: 召唤得分
  url: https://i.muistory.com/images/harry-potter-4/1768218074083-harry-potter-4_summon_firebolt_practice_minigame.js
```

漫长的等待。你听到外面传来咆哮声、欢呼声、有时还有尖叫声。

前三位勇士一个接一个上场。

终于，轮到你了。

"就用这个策略，"你对自己说，"召唤火弩箭。"

你深吸一口气，走出帐篷。

* [进入竞技场] -> task1_begin

---

# task1_begin

```yaml
image:
  prompt: Harry entering the dragon arena, massive Hungarian Horntail roaring with flames, golden egg visible in nest, crowd gasping, epic confrontation
  character: harry
  url: https://i.muistory.com/images/harry-potter-4/1768371853887-hp4_task1_begin_1768135472637.webp
```

轰！！！

匈牙利树蜂龙正对着你咆哮！它有房子那么大，浑身覆满黑色鳞片，眼睛是恶毒的黄色。

它守护着一窝灰色的蛋——其中一颗闪闪发光的金蛋就藏在里面。

龙尾横扫，带着尖刺！你侧身躲过，岩石被击碎！

"飞来，火弩箭！"你举起魔杖大喊。

* [等待扫帚到来，选择策略] -> dragon_strategy

---

# dragon_strategy

```yaml
image:
  prompt: Firebolt broomstick zooming into the arena toward Harry, Hungarian Horntail preparing to breathe fire, split-second decision moment
  character: harry
  url: https://i.muistory.com/images/harry-potter-4/1768371854709-hp4_dragon_strategy_1768135491035.webp
```

火弩箭从远处飞来！你能感觉到它在接近——

但巨龙不会给你太多时间。它深吸一口气，胸膛中橙光闪烁——

它要喷火了！

* [跳上扫帚，飞向天空！] -> strat_fly (if: has_firebolt == true)
* [对龙使用石化咒！] -> strat_spell (if: magic_skill >= 60)
* [用声东击西的策略！] -> strat_lure (if: cedric_trust >= 20)
* [我做不到……] -> strat_give_up

---

# strat_fly

```yaml
image:
  prompt: Harry leaping onto Firebolt and soaring upward just as dragon fire erupts below, dramatic aerial escape, crowd cheering
  character: harry
  url: https://i.muistory.com/images/harry-potter-4/1768371855833-hp4_strat_fly_1768135756328.webp
```

火弩箭飞到！你纵身一跃，双腿夹住扫帚——

轰！！！

一团龙焰在你刚才站立的地方爆发！

但你已经在空中了！

"太棒了！"巴格曼的解说响彻全场，"波特选择发挥他的飞行优势！"

匈牙利树蜂龙展开巨翅，拖着锁链追来——你必须比它更快！

* [开始空中缠斗！] -> dragon_fight_minigame

---

# strat_spell

```yaml
image:
  prompt: Harry casting powerful spell at the Hungarian Horntail, magical beam hitting dragon scales, dragon flinching but not stopped
  character: harry
  url: https://i.muistory.com/images/harry-potter-4/1768371856784-hp4_strat_spell_1768179655685.webp
```

"石化石化！"你用尽全力喊出咒语。

一道白光击中巨龙的脸——它摇晃了一下，发出愤怒的咆哮！

但龙皮太厚了。咒语只是让它更愤怒！

它喷出一道火焰，你拼命翻滚躲避，但还是被灼伤了！

"火弩箭！来！"你用最后的力气召唤扫帚。

* [必须飞起来！] -> dragon_fight_minigame (set: health = health - 30)

---

# strat_lure

```yaml
image:
  prompt: Harry using a diversion spell to create noise and movement away from the nest, dragon turning to investigate, clever tactical move
  character: harry
  url: https://i.muistory.com/images/harry-potter-4/1768371857736-hp4_strat_lure_1768179678529.webp
```

塞德里克告诉过你一个技巧——让龙分心！

你对着远处的岩石施咒，制造出巨大的爆炸声和光芒！

匈牙利树蜂龙转过头去，盯着那边——

这是你的机会！你冲向龙巢，一把抓住金蛋——

龙回过头来，但你已经跑到安全区域了！

* [成功！] -> golden_egg_win (set: cedric_trust = cedric_trust + 10, task_points = task_points + 40)

---

# strat_give_up

```yaml
image:
  prompt: Harry backing away in terror as the Hungarian Horntail advances menacingly, crowd worried, dark scene
  character: harry
  url: https://i.muistory.com/images/harry-potter-4/1768371858527-hp4_strat_give_up_1768179696046.webp
```

恐惧吞噬了你。这龙太大了，太可怕了……

你后退，魔杖颤抖。巨龙嗅到了你的恐惧，它的嘴角似乎勾起一个残忍的弧度。

"波特似乎陷入了困境！"巴格曼紧张地说。

龙尾横扫过来！

* [太迟了……] -> dragon_fail

---

# dragon_fight_minigame

```yaml
image:
  prompt: Harry on Firebolt in epic aerial battle with Hungarian Horntail, dodging jets of flame, weaving between dragon and castle towers
  character: harry
  url: https://i.muistory.com/images/harry-potter-4/1768372218465-hp4_first_task_chase.webp
minigame:
  prompt: 躲避龙焰飞行小游戏。玩家控制哈利在空中左右移动躲避龙喷出的火焰。屏幕从下往上滚动，火焰从顶端落下。持续45秒，每躲过一道火焰得10分，被击中扣20生命。变量dragon_score记录得分。
  variables:
    - dragon_score: 龙斗得分
  url: https://i.muistory.com/images/harry-potter-4/1768218080845-harry-potter-4_dragon_fight_minigame_minigame.js
```

空中战斗开始了！

匈牙利树蜂龙在你身后紧追，喷出一道道火焰！

你俯冲、翻滚、回旋——火弩箭是世界上最快的扫帚，但龙的火焰更快！

你必须把龙引离龙巢，然后俯冲夺取金蛋！

* [完美躲避！] -> dragon_perfect (if: dragon_score >= 90) (set: courage = courage + 25, task_points = task_points + 50)
* [成功夺蛋！] -> dragon_success (if: dragon_score >= 50) (set: task_points = task_points + 35)
* [受伤但成功！] -> dragon_hurt (if: dragon_score >= 30) (set: health = health - 20, task_points = task_points + 25)
* [失败了……] -> dragon_fail (set: health = health - 50)

---

# dragon_perfect

```yaml
image:
  prompt: Harry grabbing the golden egg triumphantly in mid-air swoop, Hungarian Horntail roaring in frustration, crowd going absolutely wild, perfect victory
  character: harry
  url: https://i.muistory.com/images/harry-potter-4/1768371860667-hp4_dragon_perfect_1768179712655.webp
```

你完美地执行了计划！

先是一个俯冲让龙追出龙巢——然后急转回头，在龙反应过来之前俯冲向金蛋——

你的手指触到冰凉的金属！金蛋到手！

"不可思议！"巴格曼疯狂地喊道，"波特只用了五分钟就完成了任务！这是迄今为止最快的速度！"

全场沸腾了！

* [胜利！] -> golden_egg_win

---

# dragon_success

```yaml
image:
  prompt: Harry clutching the golden egg, singed robes, dragon handlers rushing to restrain the Horntail, crowd cheering
  character: harry
  url: https://i.muistory.com/images/harry-potter-4/1768371862209-hp4_dragon_success_1768179730729.webp
```

虽然惊险，但你做到了！

你抓住金蛋的那一刻，驯龙师们冲上来用咒语控制住了匈牙利树蜂龙。

你降落在地面，双腿发软，心脏狂跳——但手里握着金蛋！

观众席上爆发出掌声。

* [任务完成！] -> golden_egg_win

---

# dragon_hurt

```yaml
image:
  prompt: Harry clutching the golden egg but with burned shoulder and torn robes, grimacing in pain but triumphant, medics approaching
  character: harry
  url: https://i.muistory.com/images/harry-potter-4/1768371863368-hp4_dragon_hurt_1768179749401.webp
```

龙焰擦过你的肩膀！剧痛让你差点松手——

但你咬紧牙关，死死抓住金蛋！

你勉强降落，摔倒在地。医疗巫师立刻冲过来。

"没事……"你咬牙说，举起金蛋，"我拿到了……"

观众席上的欢呼告诉你——你成功了。

* [接受治疗] -> golden_egg_win

---

# dragon_fail

```yaml
image:
  prompt: Harry being hit by dragon tail spike, falling from broom, crowd screaming in horror, dark dramatic scene
  character: harry
  url: https://i.muistory.com/images/harry-potter-4/1768371864425-hp4_dragon_fail_1768179765951.webp
```

龙尾的尖刺击中你！

你从扫帚上摔落——世界旋转——

剧痛。黑暗。

你最后听到的是人群惊恐的尖叫……

GAME OVER：龙焰焚身

---

# golden_egg_win

```yaml
image:
  prompt: Harry holding up the golden egg to cheering crowd in the arena, sunset light, triumphant moment, other champions applauding
  character: harry
  url: https://i.muistory.com/images/harry-potter-4/1768371865274-hp4_golden_egg_win_1768179782227.webp
```

你做到了！

站在竞技场中央，金蛋在手，你终于松了一口气。

评委们举起分数——除了卡卡洛夫只给了四分（这个混蛋），其他人的分数都很高。

你和塞德里克并列第一！

赫敏冲过来拥抱你，"哈利！你太棒了！"

但你注意到，人群中有一个红头发的身影在远处看着你……

* [任务结束后] -> task1_aftermath

---

# task1_aftermath

```yaml
image:
  prompt: Champions tent after the task, Harry being congratulated, Cedric approaching with a smile, evening light
  characters:
    - harry
    - cedric
  url: https://i.muistory.com/images/harry-potter-4/1768371866404-hp4_task1_aftermath_1768179799906.webp
```

在勇士帐篷里，塞德里克走过来。

"好样的，波特。"他真诚地说，"那个飞行战术太精彩了。"

"你也做得很好。"你握住他伸出的手。

"我们扯平了，"塞德里克笑着说，"你告诉了我关于龙的事，我告诉你金蛋的秘密——泡在水里打开它。"

"等等，什么？"

"泡在水里。"塞德里克眨眨眼，"相信我。"

然后他走了，留下你满脑子疑问。

* [罗恩出现了] -> ron_reconcile (if: ron_friendship >= 40)
* [罗恩还是没来] -> still_estranged (if: ron_friendship < 40)

---

# ron_reconcile

```yaml
image:
  prompt: Ron approaching Harry awkwardly in the champions tent, looking apologetic, sunset light, tension dissolving
  characters:
    - harry
    - ron
  url: https://i.muistory.com/images/harry-potter-4/1768371867149-hp4_ron_reconcile_1768179815581.webp
```

帐篷帘子掀开，罗恩站在门口。

他的表情尴尬，脸色发红。沉默了好一会儿。

"我……"他开口了，"我是个白痴。"

"什么？"

"我看了你对付那条龙……"罗恩的声音很小，"谁会想要把名字放进火焰杯去对付那东西……"

他抬起头，眼眶有些红，"对不起，哈利。我应该相信你的。"

* [接受道歉] -> reconcile_accept (set: ron_friendship = ron_friendship + 40)
* [拒绝原谅] -> reconcile_refuse (set: ron_friendship = ron_friendship - 20)
* [提出条件：帮我调查] -> reconcile_condition (if: investigation >= 30) (set: ron_friendship = ron_friendship + 20, investigation = investigation + 10)

---

# still_estranged

```yaml
image:
  prompt: Harry looking around the empty tent for Ron who isnt there, hollow victory feeling, loneliness
  character: harry
  url: https://i.muistory.com/images/harry-potter-4/1768371868036-hp4_still_estranged_1768180854594.webp
```

你环顾四周，希望看到罗恩的身影。

但他没有来。

赫敏安慰地拍拍你的肩膀，"给他时间……"

但你知道，你们之间的裂痕太深了。也许有些话说出口，就再也收不回来了。

你赢得了第一任务，但失去了最好的朋友。

* [继续前进] -> egg_mystery

---

# reconcile_accept

```yaml
image:
  prompt: Harry and Ron shaking hands then hugging in the tent, smiles returning, Hermione watching happily in background
  characters:
    - harry
    - ron
    - hermione
  url: https://i.muistory.com/images/harry-potter-4/1768371868910-hp4_reconcile_accept_1768180876244.webp
```

"你这个白痴。"你说，但嘴角忍不住上扬。

罗恩咧嘴一笑，你们拥抱在一起。

"我太傻了，"罗恩说，"那些食死徒的事、火焰杯的事……我应该站在你这边的。"

"以后别这样了。"

"绝对不会。"

赫敏走过来，"终于！你们两个和好了！"

三人组重聚。感觉真好。

* [一起研究金蛋] -> egg_mystery

---

# reconcile_refuse

```yaml
image:
  prompt: Harry turning away from Ron, Ron looking crushed, broken trust still visible between them
  characters:
    - harry
    - ron
  url: https://i.muistory.com/images/harry-potter-4/1768371870196-hp4_reconcile_refuse_1768180893153.webp
```

"太晚了，罗恩。"你的声音很平静。

"哈利，我说对不起了——"

"在我最需要朋友的时候，你不在。"你打断他，"这不是一句对不起就能解决的。"

罗恩的脸变得惨白。他张了张嘴，什么都没说出来，然后转身离开。

你看着他的背影，心里有些空洞。

也许……你应该原谅他？但现在，伤口还太新。

* [独自研究金蛋] -> egg_mystery

---

# reconcile_condition

```yaml
image:
  prompt: Harry making a deal with Ron, conspiratorial whispers between them, investigative mood
  characters:
    - harry
    - ron
  url: https://i.muistory.com/images/harry-potter-4/1768371871051-hp4_reconcile_condition_1768180913786.webp
```

"我原谅你，"你说，"但我需要你帮我一件事。"

"什么都行！"罗恩急切地说。

"有人把我的名字放进火焰杯，想害我。我需要你帮我查出是谁。"

罗恩的表情变得严肃，"你怀疑谁？"

"我不确定……但穆迪教授很可疑。他对我太关注了。"

"疯眼汉穆迪？那个傲罗？"罗恩皱眉，"好，我帮你盯着他。"

你握住他的手。朋友回来了——而且你们有了共同的目标。

* [一起调查和研究] -> egg_mystery

---

# egg_mystery

```yaml
image:
  prompt: Harry examining the golden egg closely in Gryffindor common room at night, curious expression, firelight reflecting off gold surface
  character: harry
  url: https://i.muistory.com/images/harry-potter-4/1768371871725-hp4_egg_mystery.webp
```

回到公共休息室，你盯着那颗金蛋。

它沉甸甸的，表面刻着复杂的纹路。应该怎么打开它？

"打开看看！"周围的格兰芬多学生催促道。

你找到蛋壳上的接缝，用力一掰——

* [打开金蛋] -> egg_scream

---

# egg_scream

```yaml
image:
  prompt: Golden egg open emitting terrible screeching wailing sound, everyone in common room covering their ears in pain, Harry grimacing
  character: harry
  url: https://i.muistory.com/images/harry-potter-4/1768371872552-hp4_egg_scream_1768180930867.webp
```

"呃啊啊啊啊啊啊——！！！"

一声刺耳的尖叫从蛋里爆发出来！像是一百只班西在同时哀嚎！

"关上它！！！"所有人都捂着耳朵尖叫。

你赶紧把蛋合上，尖叫声停止了。

"那是什么鬼东西？！"{{ if ron\_friendship >= 40 }}罗恩大喊。{{ else }}有人大喊。{{ /if }}

塞德里克说要泡在水里……这个线索意味着什么？

* [研究金蛋的秘密] -> chapter3_end

---

# chapter3_end

```yaml
image:
  prompt: Harry deep in thought at night in the common room, golden egg on table, firelight, contemplating the mystery
  character: harry
  url: https://i.muistory.com/images/harry-potter-4/1768371873274-hp4_chapter3_end_1768182106865.webp
```

第一任务结束了，但谜题才刚刚开始。

金蛋里藏着下一个任务的线索，但那刺耳的尖叫声毫无意义。

"泡在水里……"你喃喃自语。

同时，圣诞节临近了。还有另一件事让你头疼——

三强争霸赛有一个传统：圣诞舞会。勇士必须有舞伴，而且要领舞。

你从来没邀请过女孩跳舞……

* [迎接圣诞舞会] -> chapter4_start

---

# chapter4_start

```yaml
image:
  prompt: Hogwarts decorated for Christmas with snow, fairy lights, students excited about the Yule Ball, festive magical atmosphere
  url: https://i.muistory.com/images/harry-potter-4/1768372219681-hp4_christmas_hogwarts.webp
```

十二月了。霍格沃茨被装点得如同冰雪仙境。

到处都是圣诞装饰：漂浮的蜡烛、冰雕仙女、永不融化的雪花。

麦格教授召集了所有四年级以上学生：

"圣诞舞会将在平安夜举行。这是三强争霸赛的传统。勇士们必须有舞伴，并且要领舞。"

她严肃地看着格兰芬多的男生们，"我希望你们不要给我们学院丢脸。"

你需要找一个舞伴。但找谁呢？

* [继续寻找舞伴] -> dance_partner_search

---

# dance_partner_search

```yaml
image:
  prompt: Harry looking nervous in corridor, watching other boys getting rejected by girls, anxiety about asking someone to the ball
  character: harry
  url: https://i.muistory.com/images/harry-potter-4/1768371874078-hp4_dance_partner_search_1768182124939.webp
```

找舞伴比对战火龙还难。

每次你看到一个女孩，话就卡在喉咙里。{{ if ron\_friendship >= 40 }}罗恩也一样——他问了芙蓉·德拉库尔，差点被她的媚娃血统催眠得说不出话来。{{ /if }}

{{ if ron\_friendship >= 40 }}
"我们完蛋了。"罗恩绝望地说。
{{ /if }}

最后一刻，你必须做出决定——

* [鼓起勇气问张秋] -> ask_cho
* [问帕瓦蒂·佩蒂尔] -> ask_parvati (set: ball_partner = "parvati")
* [问卢娜·洛夫古德] -> ask_luna (if: investigation >= 40) (set: ball_partner = "luna")

---

# ask_cho

```yaml
image:
  prompt: Harry nervously approaching Cho Chang in the corridor, heart pounding, romantic tension
  characters:
    - harry
    - cho
  url: https://i.muistory.com/images/harry-potter-4/1768371874878-hp4_ask_cho_1768181026795.webp
```

你在走廊里拦住了张秋。

"嗯，呃，张秋……"你的声音有点抖，"你愿意和我一起去舞会吗？"

张秋看着你，表情有些为难。

"哈利，我很抱歉……"她轻声说，"我已经答应塞德里克了。"

当然了。塞德里克。高大英俊的塞德里克。

"哦……没关系。"你努力挤出一个微笑。

* [找其他人] -> cho_rejection

---

# ask_parvati

```yaml
image:
  prompt: Harry asking Parvati Patil to the Yule Ball in the common room, she looks pleased and surprised
  character: harry
  url: https://i.muistory.com/images/harry-potter-4/1768371875680-hp4_ask_parvati_1768181044447.webp
```

你找到帕瓦蒂·佩蒂尔，一个格兰芬多的漂亮女孩。

"帕瓦蒂，你愿意和我一起去圣诞舞会吗？"

她惊讶地看着你，然后露出灿烂的笑容。

"当然！我很乐意！"

你松了一口气。问题解决了。

"而且，"帕瓦蒂补充道，"我妹妹帕德玛可以做{{ if ron\_friendship >= 40 }}罗恩{{ else }}你的朋友{{ /if }}的舞伴。"

太好了！一箭双雕！

* [准备舞会] -> yule_ball_night

---

# ask_luna

```yaml
image:
  prompt: Harry surprisingly asking Luna Lovegood, who looks up from her upside-down magazine with dreamy pleased expression
  character: harry
  url: https://i.muistory.com/images/harry-potter-4/1768371876791-hp4_ask_luna_1768181062335.webp
```

你在图书馆角落找到了卢娜·洛夫古德。

她正倒着看《唱唱反调》杂志，萝卜形的耳环在晃动。

"卢娜，你愿意和我一起去舞会吗？"

她抬起头，梦幻的眼睛睁大了一瞬，然后露出真诚的微笑。

"哦，哈利·波特！我很高兴你问我。当然愿意。"

"太好了。"

"人们都说我很奇怪，"卢娜平静地说，"但你不在意。这很难得。"

她或许会知道一些别人不知道的事……

* [准备舞会] -> yule_ball_night (set: investigation = investigation + 10)

---

# cho_rejection

```yaml
image:
  prompt: Harry looking disappointed walking away after being rejected by Cho, contemplating who else to ask
  character: harry
  url: https://i.muistory.com/images/harry-potter-4/1768371877817-hp4_cho_rejection_1768198325373.webp
```

被拒绝的滋味不好受。

但舞会近在眼前，你必须找到舞伴。

* [去找帕瓦蒂] -> ask_parvati_2 (set: ball_partner = "parvati")
* [算了，一个人去] -> go_alone (set: ball_partner = "none")

---

# ask_parvati_2

```yaml
image:
  prompt: Harry asking Parvati after being rejected by first choice, she accepts but notices he is not fully enthusiastic
  character: harry
  url: https://i.muistory.com/images/harry-potter-4/1768371878799-hp4_ask_parvati_2_1768198344641.webp
```

你找到帕瓦蒂。她答应了——虽然她可能察觉到自己不是你的首选。

但至少你有舞伴了。{{ if ron\_friendship >= 40 }}她的妹妹帕德玛也愿意做罗恩的舞伴。{{ /if }}

危机解除。

* [准备舞会] -> yule_ball_night

---

# go_alone

```yaml
image:
  prompt: Harry deciding to go to the ball alone, looking dejected but determined
  character: harry
  url: https://i.muistory.com/images/harry-potter-4/1768371879538-hp4_go_alone_1768198364441.webp
```

算了。找不到就算了。

你决定一个人去舞会。作为勇士，你必须出席——但没人规定必须跳舞。

你会站在角落里，看着别人跳。这没什么大不了的……

对吧？

* [舞会之夜] -> yule_ball_night (set: courage = courage - 10)

---

# yule_ball_night

```yaml
image:
  prompt: Great Hall transformed for Yule Ball with ice sculptures, fairy lights, elegantly dressed students, magical winter wonderland, band playing
  characters:
    - harry
    - hermione
  url: https://i.muistory.com/images/harry-potter-4/1768372221614-hp4_yule_ball.webp
```

圣诞舞会之夜到了。

大厅被改造成冰雪仙境：巨大的冰雕、漂浮的雪花、银色的彩带。

乐队开始演奏华尔兹。

当你走进大厅时，所有人都倒吸一口凉气——但不是因为你。

赫敏站在楼梯顶端。

她穿着一袭淡蓝色丝绸礼服，头发不再毛糙而是优雅地盘起。她……她简直美得不像话！

克鲁姆走过去，伸出手。赫敏挽住他的胳膊，缓缓走下楼梯。

{{ if ron\_friendship >= 40 }}罗恩的下巴掉到了地上。{{ /if }}

* [舞会开始] -> ball_dance

---

# ball_dance

```yaml
image:
  prompt: Champions dancing in the center of Great Hall, Harry awkwardly leading, magical band playing, decorated ice sculptures
  character: harry
  url: https://i.muistory.com/images/harry-potter-4/1768371880561-hp4_ball_dance_1768198383468.webp
```

勇士们领舞。{{ if ball\_partner == "parvati" }}你挽着漂亮的帕瓦蒂{{ else }}{{ if ball\_partner == "luna" }}你和穿着银色长袍的卢娜{{ else }}你独自一人{{ /if }}{{ /if }}走到舞池中央。

说实话，你跳得很糟糕。你踩了舞伴好几次脚。

但幸好，其他人很快也加入了舞池，你终于可以躲到一边。

赫敏和克鲁姆跳得非常优雅。{{ if ron\_friendship >= 40 }}罗恩酸溜溜地盯着他们看。{{ /if }}

夜深了，舞会继续。你注意到一些人在四处走动……

* [去花园透透气] -> ball_garden
* [去走廊散散步] -> ball_hallway (set: investigation = investigation + 5)

---

# ball_garden

```yaml
image:
  prompt: Harry in magical rose garden at night during ball, overhearing Snape and Karkaroff talking urgently, hiding behind bushes
  characters:
    - harry
    - snape
  url: https://i.muistory.com/images/harry-potter-4/1768371881524-hp4_ball_garden_1768198401805.webp
```

花园里布满了魔法玫瑰，在月光下闪闪发光。

你躲进一丛灌木中休息——突然听到脚步声。

斯内普和卡卡洛夫！

"它越来越清晰了，西弗勒斯……"卡卡洛夫的声音充满恐惧，"你不可能没注意到——"

他卷起袖子，露出手臂上的什么东西。

斯内普嘶声说："别让别人看见！"

"如果它变得更黑——"

"够了。"斯内普转身离开。

卡卡洛夫手臂上那个模糊的图案……看起来像是黑魔标记！

* [记住这些信息] -> ball_end (set: investigation = investigation + 15)

---

# ball_hallway

```yaml
image:
  prompt: Harry spotting Ludo Bagman acting suspiciously in a corridor, exchanging something with goblins, nervous secretive behavior
  character: harry
  url: https://i.muistory.com/images/harry-potter-4/1768371882282-hp4_ball_hallway_1768198420546.webp
```

走廊里很安静。大多数人都在大厅跳舞。

但你看到了巴格曼——魔法体育运动部的头头。

他鬼鬼祟祟地和几个妖精在角落里交谈。他看起来很紧张，不停地擦汗。

妖精们递给他什么东西，然后他迅速塞进口袋。

巴格曼在做什么见不得人的交易？

* [记住这件事] -> ball_end (set: investigation = investigation + 10)

---

# ball_end

```yaml
image:
  prompt: Students leaving the Great Hall at dawn after the ball, tired but happy, fairy lights dimming, magical night ending
  character: harry
  url: https://i.muistory.com/images/harry-potter-4/1768371883474-hp4_ball_end_1768198439559.webp
```

舞会在黎明时分结束。

你拖着疲惫的脚步回格兰芬多塔楼。今晚发生了很多事……

最重要的是，塞德里克告诉你的那句话一直回响在脑海中：

"把金蛋泡在水里。"

是时候解开那个谜题了。

* [前往级长浴室] -> prefect_bathroom

---

# prefect_bathroom

```yaml
image:
  prompt: Harry in the luxurious prefects bathroom at night, golden egg in hand, large pool-like bath, mermaid stained glass window
  character: harry
  url: https://i.muistory.com/images/harry-potter-4/1768371884388-hp4_prefect_bathroom_1768198457662.webp
```

你披上隐形衣，溜进了级长浴室。

这里简直像一个小型游泳池！大理石地板，金色水龙头，还有一扇美人鱼彩绘玻璃窗。

你放满热水，然后把自己和金蛋一起沉入水中。

深吸一口气，把头浸入水下——

然后打开金蛋。

* [在水下听金蛋] -> egg_underwater

---

# egg_underwater

```yaml
image:
  prompt: Harry underwater in the bath, golden egg open, listening to ethereal mermaid song instead of screeching, bubbles rising
  character: harry
  url: https://i.muistory.com/images/harry-potter-4/1768371885590-hp4_egg_underwater_1768198476035.webp
```

尖叫声消失了！

取而代之的是……歌声。一首空灵的、忧郁的人鱼之歌：

"来吧，来寻找我们的声音，
我们无法在陆地歌唱……
我们拿走了你最珍贵的东西，
你有一个小时去寻找……
超过这个时限就太晚了，
你再也找不回它……"

人鱼！第二个任务和人鱼有关！

* [听完歌谣] -> mermaid_song

---

# mermaid_song

```yaml
image:
  prompt: Harry surfacing from bath water, shocked realization on his face, understanding the second task clue
  character: harry
  url: https://i.muistory.com/images/harry-potter-4/1768371886575-hp4_mermaid_song_1768198495459.webp
```

你浮出水面，喘着气。

现在一切都说得通了！第二个任务是：

但是——你怎么在水下呼吸一个小时？！

你不是鱼！你连气都憋不了两分钟！

这是个大问题。你需要尽快找到解决办法……

* [准备第二任务] -> chapter4_end

---

# chapter4_end

```yaml
image:
  prompt: Harry staring at the closed golden egg in his dorm at night, pondering how to breathe underwater for an hour
  character: harry
  url: https://i.muistory.com/images/harry-potter-4/1768371887411-hp4_chapter4_end_1768199256712.webp
```

第二个任务定在二月底。

你只有两个月时间来解决一个几乎不可能的问题：如何在水下呼吸一个小时？

赫敏开始在图书馆疯狂查阅资料。{{ if ron\_friendship >= 40 }}罗恩也在帮忙。{{ /if }}

但日子一天天过去，你离答案越来越近……还是越来越远？

* [迎接第二任务] -> chapter5_start

---

# chapter5_start

```yaml
image:
  prompt: Harry waking up on the day of the second task, Neville shaking him awake with Gillyweed in hand, dormitory scene
  characters:
    - harry
    - neville
  url: https://i.muistory.com/images/harry-potter-4/1768371888377-hp4_chapter5_start_1768199274743.webp
```

第二任务的早晨。你醒来时，发现纳威站在床边。

"哈利！你快迟到了！"

"我还是没找到在水下呼吸的方法……"你绝望地说。

"我有办法！"纳威手里拿着一团看起来像 slimy grey-green rat tails 的东西，"我在斯普劳特教授的书里看到的——鳃囊草！"

"鳃囊草？"

"吃下它，你会长出鳃和蹼！"

这听起来很恶心，也很危险。但你还有选择吗？

* [相信纳威，带上鳃囊草] -> task2_begin (set: knows_gillyweed = true, courage = courage + 5)
* [如果你的investigation很高，或许你知道其他办法？] -> gillyweed_search

---

# gillyweed_search

```yaml
image:
  prompt: Dobby the house elf appearing with Gillyweed, or Hermione handing Harry a book, montage of different ways Harry finds the solution
  character: harry
  url: https://i.muistory.com/images/harry-potter-4/1768371889368-hp4_gillyweed_search_1768199295921.webp
```

其实，你早就做好了准备。

(如果 investigation >= 50) 你记得在斯内普的办公室偷听到关于鳃囊草失窃的事……那是多比给你的提示！

多比昨天晚上溜进宿舍，给了你这团东西。"多比听到穆迪教授在说是鳃囊草！多比给哈利偷来了！"

不管怎样，你手里有了关键道具。

* [前往黑湖] -> task2_begin (set: knows_gillyweed = true)

---

# task2_begin

```yaml
image:
  prompt: Second Task starting at the Black Lake, huge stands built on the water, champions diving in, Harry eating Gillyweed
  character: harry
  url: https://i.muistory.com/images/harry-potter-4/1768371890264-hp4_task2_begin_1768199317004.webp
```

黑湖边，看台上人山人海。

"我们的勇士已经准备好了！"巴格曼的声音在水面上回荡。

"哈利，你还好吗？"赫敏和罗恩不见了。你看了一圈——除了你、塞德里克、芙蓉和克鲁姆，其他人都在。

"也许他们已经去准备庆祝派对了？"你安慰自己。

你看了一眼手中的鳃囊草，闭上眼，一口吞了下去。

感觉像是在吞下一条章鱼——突然，你的脖子两侧剧痛！你无法呼吸了！

你本能地扑进水里——

* [入水！] -> underwater_journey

---

# underwater_journey

```yaml
image:
  prompt: Harry underwater with gills and webbed hands swimming through seaweed forest, magical light filtering down, grindylows lurking in shadows
  character: harry
  url: https://i.muistory.com/images/harry-potter-4/1768371891064-hp4_underwater_journey_1768199337349.webp
minigame:
  prompt: 水下探索小游戏。迷宫类，玩家控制哈利在水下迷宫中寻找人鱼村的路径。需要躲避格林迪洛的追击，有限定氧气时间（模拟鳃囊草时效）。
  variables:
    - swim_score: 游泳得分
  url: https://i.muistory.com/images/harry-potter-4/1768218121542-harry-potter-4_underwater_journey_minigame.js
```

冰冷的湖水瞬间变得舒适。你摸了摸脖子——那是鳃！

你的手脚长出了蹼。你在水里像鱼一样自由！

你向湖底游去。周围是茂密的水草森林。

突然，一群格林迪洛（长着触手的水怪）从水草中窜出，抓住了你的脚踝！

* [摆脱水怪，游向人鱼歌声] -> mermaid_village (if: swim_score >= 50)
* [被缠住了！] -> underwater_danger (if: swim_score < 50)

---

# underwater_danger

```yaml
image:
  prompt: Harry surrounded by Grindylows, casting Relashio spell underwater to free himself, bubbles and chaos
  character: harry
  url: https://i.muistory.com/images/harry-potter-4/1768371891998-hp4_underwater_danger_1768199360211.webp
```

格林迪洛越来越多！它们把你往下拉！

"力松劲泄！"你在水下施咒，一股沸水喷出。

水怪们尖叫着散开。你趁机挣脱，拼命游向深处。

虽然耽误了时间，但你还活着。

* [继续前进] -> mermaid_village (set: health = health - 10)

---

# mermaid_village

```yaml
image:
  prompt: The Mermaid village underwater, stone dwellings with gardens of algae, merpeople with spears guarding the town square
  character: harry
  url: https://i.muistory.com/images/harry-potter-4/1768371892966-hp4_mermaid_village.webp
```

终于，你看到了人鱼村。

不是童话里的美人鱼，这里的人鱼长着灰色的皮肤、黄色的眼睛和乱蓬蓬的绿发。

在村子广场中央，有一个巨大的石像。被绑在石像上的，是你的"宝贝"——

罗恩、赫敏、张秋，还有一个银发小女孩（芙蓉的妹妹）。

他们都在沉睡，嘴里冒出一串串气泡。

每个人鱼手里都拿着长矛，不怀好意地看着你。

* [去救人！] -> hostages_choice

---

# hostages_choice

```yaml
image:
  prompt: Harry looking at the four bound hostages, Ron Hermione Cho and Gabrielle, holding wand and stone, making a difficult decision
  character: harry
  url: https://i.muistory.com/images/harry-potter-4/1768372222653-hp4_second_task_rescue.webp
```

你游到人质身边。塞德里克已经救走了张秋。

还剩下罗恩、赫敏和那个小女孩。克鲁姆还没来。芙蓉也没来。

人鱼歌词里说："超过这个时限……你再也找不回它……"

你不能只救罗恩！如果芙蓉和克鲁姆没来，其他人会死吗？

你用石头割断了罗恩的绳子。然后你游向赫敏——

"只能救一个！"一个人鱼用长矛挡住你。

* [只带走罗恩（遵守规则）] -> save_ron_only
* [坚持要救两个！] -> save_two_people (set: courage = courage + 10)
* [救芙蓉的妹妹（如果你觉得芙蓉来不了）] -> save_fleur_sister (set: courage = courage + 15)
* [试图救所有人！] -> save_all (set: magic_skill = magic_skill - 10)

---

# save_ron_only

```yaml
image:
  prompt: Harry swimming upward with only Ron, looking back guiltily at the others, darkened water
  character: harry
  url: https://i.muistory.com/images/harry-potter-4/1768444090678-hp4_save_ron_only.webp
```

规则就是规则。邓布利多不会让他们死的……对吧？

你抓住罗恩，开始上浮。

半路上，你看到克鲁姆——他的头变成了一个鲨鱼头——以极快的速度游过去救走了赫敏。

不管怎样，你完成了任务。

* [游向水面] -> task2_aftermath

---

# save_two_people

```yaml
image:
  prompt: Harry threatening merpeople with wand, cutting ropes for both Ron and Gabrielle, swimming up with two hostages
  character: harry
  url: https://i.muistory.com/images/harry-potter-4/1768444091654-hp4_save_two_people.webp
```

"让开！"你举起魔杖对准人鱼。

它们吓得后退了。你迅速割断了芙蓉妹妹的绳子。

你一手抓着罗恩，一手抓着小女孩，艰难地上浮。

这很累，而且很慢。鳃囊草的效果快消失了……

但你不能丢下她。

* [冲出水面] -> task2_aftermath (set: task_points = task_points + 45)

---

# save_fleur_sister

```yaml
image:
  prompt: Harry saving Fleur's little sister Gabrielle, heroic moment, bubbles rising as they ascend
  character: harry
  url: https://i.muistory.com/images/harry-potter-4/1768444093081-hp4_save_fleur_sister.webp
```

芙蓉还没来……她可能出事了。

你不能让这个小女孩死在这里。

你救了她。克鲁姆随后赶到救走了赫敏。罗恩……等等，罗恩也是你最珍贵的朋友！

哦，对了，你已经救了罗恩。你是顺便救了盖布丽（芙蓉的妹妹）。

这让你成为了真正的英雄。

* [冲出水面] -> task2_aftermath (set: task_points = task_points + 50)

---

# save_all

```yaml
image:
  prompt: Harry trying to carry three people underwater, struggling immensely, nearly drowning, chaotic scene
  character: harry
  url: https://i.muistory.com/images/harry-potter-4/1768444093837-hp4_save_all.webp
```

你试图救所有人，但这太重了！

你在水中挣扎。格林迪洛又来了。

最后，你不得不放弃赫敏（克鲁姆会救她的），带着罗恩和盖布丽上浮。

你的魔力耗尽了，差点没命。

* [勉强浮出水面] -> task2_aftermath (set: health = health - 20)

---

# task2_aftermath

```yaml
image:
  prompt: Harry surfacing at the lake, wet and cold, Fleur hugging him and kissing his cheeks, Ron looking confused, crowd cheering
  characters:
    - harry
    - fleur
    - ron
  url: https://i.muistory.com/images/harry-potter-4/1768371894192-hp4_task2_aftermath_1768199572012.webp
```

哗啦！

你冲出水面，大口呼吸着空气。鳃消失了。

看台上爆发出雷鸣般的掌声。

芙蓉冲过来——她被格林迪洛缠住退赛了。

"你救了她！"芙蓉哭着拥抱你，甚至亲了你的脸颊，"你救了我的妹妹！"

罗恩醒了过来，"我怎么了？全是水……{{ if ron\_friendship >= 40 }}哇，那个法国妞在亲你！"{{ else }}离我远点。"{{ /if }}

邓布利多宣布结果：

"虽然哈利·波特是最后一个回来的，但他表现出了高尚的品德——他不仅救了自己的人质，还救了德拉库尔小姐的人质！"

"第二名！"

* [享受胜利] -> chapter5_end

---

# chapter5_end

```yaml
image:
  prompt: Harry Ron and Hermione drying off by the lake, discussing the task, Moody watching from distance, mysterious atmosphere
  characters:
    - harry
    - ron
    - hermione
  url: https://i.muistory.com/images/harry-potter-4/1768444094461-hp4_chapter5_end.webp
```

第二任务结束。你在积分榜上和塞德里克并列第一。

一切看起来都很顺利。

但在你离开湖边时，你注意到穆迪教授在悄悄和巴蒂·克劳奇先生说话。

克劳奇先生看起来精神恍惚，似乎病得很重。

"奇怪，"哈利心想，"克劳奇先生不是这几天都请病假了吗？"

一种阴谋的气息在空气中弥漫。

* [继续前进] -> chapter6_start

---

# chapter6_start

```yaml
image:
  prompt: Harry walking near the Forbidden Forest at dusk, fog rolling in, eerie atmosphere, spotting movement in the trees
  character: harry
  url: https://i.muistory.com/images/harry-potter-4/1768371895604-hp4_chapter6_start_1768216412073.webp
```

五月的一个黄昏。

你和克鲁姆在禁林边缘散步（没错，他想通过你了解赫敏）。

突然，灌木丛中传来一阵沙沙声。

一个人跌跌撞撞地走了出来——是巴蒂·克劳奇先生！

但他看起来像疯了一样，对着空气说话："邓布利多……我要见邓布利多……我犯了个大错……"

"他疯了。"克鲁姆警惕地举起魔杖。

* [让克鲁姆看着他，你去找邓布利多] -> follow_crouch
* [试图帮助克劳奇] -> help_crouch

---

# follow_crouch

```yaml
image:
  prompt: Harry running to Dumbledore's office, breathless, gargoyle statue, urgent night scene
  character: harry
  url: https://i.muistory.com/images/harry-potter-4/1768444095412-hp4_follow_crouch.webp
```

"我去叫邓布利多！你看着他！"

你拼命跑向城堡。冲进校长办公室，把你看到的告诉了邓布利多。

邓布利多立刻跟你回到禁林。

但是——

克劳奇不见了。克鲁姆倒在地上，被击昏了。

"他袭击了我！"克鲁姆醒来后说，"从背后！"

克劳奇杀了克鲁姆？还是别人？

* [调查现场] -> discover_body

---

# help_crouch

```yaml
image:
  prompt: Harry trying to calm down a raving Barty Crouch Sr, Crouch grabbing Harry's robes, eyes wide with terror, whispering secrets
  character: harry
  url: https://i.muistory.com/images/harry-potter-4/1768444096203-hp4_help_crouch.webp
```

"克劳奇先生！你怎么了？"

他抓住你的长袍，眼睛瞪得大大的。"黑魔王……更强了……伯莎·乔金斯死……我的儿子……"

"你的儿子死在阿兹卡班了。"你说。

"不……不是……但他……"

突然，一道红光从树后射出，击昏了克鲁姆！

然后一道绿光射向克鲁姆——不，射向克劳奇！

* [躲避！] -> discover_body

---

# discover_body

```yaml
image:
  prompt: Harry finding Barty Crouch Sr's body transfigured into a bone, or just gone, only his shoe remaining, ominous forest scene
  character: harry
  url: https://i.muistory.com/images/harry-potter-4/1768444263084-hp4_discover_body.webp
```

当你（和邓布利多）再次搜寻时，克劳奇彻底消失了。

只留下一只鞋子。

这不仅仅是发疯。这是谋杀。在霍格沃茨的场地上。

如果是你investigation很高，你会注意到附近的脚印——有一只是木腿留下的。

穆迪？

不，穆迪是傲罗，他在抓人。一定是这样。

* [回到城堡] -> pensieve_memories

---

# pensieve_memories

```yaml
image:
  prompt: Harry looking into the Pensieve in Dumbledore's office, glowing silver memories swirling, falling into the memory
  character: harry
  url: https://i.muistory.com/images/harry-potter-4/1768444096950-hp4_pensieve_memories.webp
```

在那之后，你在邓布利多的办公室等待时，发现了一个石盆——冥想盆。

你好奇地把脸凑过去，跌进了回忆中。

那是当年的审判。你看到了卡卡洛夫出卖同伙。你看到了被审判的小巴蒂·克劳奇。

那个少年哭喊着并不是他干的，但老克劳奇冷酷地把他送进了阿兹卡班。

"这也是我父亲做的事。"你听到身后传来声音。

你从冥想盆里抬起头。邓布利多站在那里。

"好奇心不是罪过，哈利。但在这个时候……应当谨慎。"

* [询问关于梦境] -> moody_suspicion

---

# moody_suspicion

```yaml
image:
  prompt: Harry talking to Dumbledore, then scenes of Harry watching Moody suspiciously from distance, checking Marauder's Map
  characters:
    - harry
    - dumbledore
  url: https://i.muistory.com/images/harry-potter-4/1768444097645-hp4_moody_suspicion.webp
```

你把自己经常做的噩梦告诉了邓布利多。关于伏地魔，关于虫尾巴，关于那座老宅。

"这不仅仅是梦。"邓布利多神色凝重，"伏地魔正在恢复力量。"

走出办公室，你查看了活点地图。

你看到"巴蒂·克劳奇"的名字出现在斯内普的储藏室里。

但巴蒂·克劳奇不是失踪了吗？还是说……那是他的儿子？

或者，地图坏了？

迷雾重重，第三个任务——迷宫，即将到来。

* [迎接第三任务] -> chapter7_start

---

# chapter7_start

```yaml
image:
  prompt: The entrance to the Third Task maze, massive hedges towering over champions, Bagman explaining rules, sunset
  characters:
    - harry
    - cedric
    - fleur
    - krum
  url: https://i.muistory.com/images/harry-potter-4/1768372223560-hp4_maze_entrance.webp
```

六月二十四日。第三个任务。

魁地奇球场已经变成了一个巨大的迷宫。树篱高达二十英尺。

"勇士们！"巴格曼的声音有些颤抖，"三强杯就在迷宫中心！第一个碰到它的人就是冠军！"

根据积分，你和塞德里克第一批进入。

"好运，哈利。"塞德里克对你微笑。

"你也是。"

哨声吹响。你走进了阴森的迷宫。

* [进入迷宫] -> maze_entrance

---

# maze_entrance

```yaml
image:
  prompt: Harry walking through dark maze path, fog swirling, towering hedges, eerie silence, wand lit
  character: harry
  url: https://i.muistory.com/images/harry-potter-4/1768371897171-hp4_maze_entrance.webp
```

迷宫里死一般寂静。只有你的脚步声。

天色越来越暗。你必须保持警惕。

前面出现了一个分叉口。

* [向左走] -> maze_boggart
* [向右走] -> maze_sphinx
* [直走] -> maze_spider (if: courage >= 80)

---

# maze_boggart

```yaml
image:
  prompt: A Dementor gliding towards Harry in the maze, Harry raising wand, but it looks slightly wrong - a Boggart
  character: harry
  url: https://i.muistory.com/images/harry-potter-4/1768444098403-hp4_maze_boggart.webp
```

一只摄魂怪向你飘来！寒气逼人……

"呼神护卫！"你大喊。

银鹿喷涌而出——摄魂怪绊了一跤，变成了一股烟雾。

是博格特！

"滑稽滑稽！"你再次施咒，它炸成了一团烟。

好险。

* [继续前进] -> maze_navigate

---

# maze_sphinx

```yaml
image:
  prompt: Harry facing a Sphinx in the maze, creature with lion body and human woman head, asking a riddle
  character: harry
  url: https://i.muistory.com/images/harry-potter-4/1768371898698-hp4_maze_sphinx_1768216453014.webp
minigame:
  prompt: 斯芬克斯谜语问答。屏幕上出现三个选项：1. 蝙蝠，2. 风，3. 时间。玩家需要在10秒内选择正确答案。sphinx_answer记录结果。
  variables:
    - sphinx_answer: 谜语答案
  url: https://i.muistory.com/images/harry-potter-4/1768218129686-harry-potter-4_maze_sphinx_minigame.js
```

路被挡住了。一只长着狮身人面的斯芬克斯趴在地上。

"如果不回答我的谜语，我就攻击你。"它说。

"先想想这东西：即便没有声音，我也能轻声呢喃；即便没有翅膀，我也能空中飞舞；即使没有牙齿，我也能咬得痛苦。我是什么？"

* [回答谜语] -> puzzle_solved (if: sphinx_answer == "2" OR sphinx_answer == "风")
* [答错了……] -> maze_fight (set: health = health - 10)

---

# puzzle_solved

```yaml
image:
  prompt: Sphinx stepping aside to let Harry pass, nodding respectfully, maze path opening up
  character: harry
  url: https://i.muistory.com/images/harry-potter-4/1768444099208-hp4_puzzle_solved.webp
```

"是风。"你自信地回答。

斯芬克斯微笑了，它优雅地让开道路。

"最快的一条路就在前面。"

* [冲向中心] -> cedric_encounter

---

# maze_fight

```yaml
image:
  prompt: Harry running from angry Sphinx, dodging claws, maze hedges closing in, chaotic escape
  character: harry
  url: https://i.muistory.com/images/harry-potter-4/1768444100156-hp4_maze_fight.webp
```

"错。"斯芬克斯咆哮一声，扑了过来！

你不得不一边施咒一边后退，好不容易才从另一条路逃脱。

你被树篱划伤了，但至少摆脱了它。

* [绕路前进] -> cedric_encounter (set: health = health - 10)

---

# maze_spider

```yaml
image:
  prompt: Harry fighting a giant Acromantula spider in the maze, casting spells, spider rearing up
  character: harry
  url: https://i.muistory.com/images/harry-potter-4/1768444101215-hp4_maze_spider.webp
```

一只巨型蜘蛛——阿拉戈克的后代——从天而降！

"昏昏倒地！障碍重重！"

咒语击中它的肚子，它翻滚着倒在一边。

你跨过它抽搐的腿，继续奔跑。

* [发现有人] -> cedric_encounter

---

# cedric_encounter

```yaml
image:
  prompt: Cedric Diggory on the ground being tortured by Viktor Krum with Cruciatus curse, Krum's eyes looking glassy and blank
  characters:
    - cedric
    - krum
  url: https://i.muistory.com/images/harry-potter-4/1768371899992-hp4_cedric_encounter.webp
```

你听到了尖叫声！

冲过拐角，你看到克鲁姆正举着魔杖指着塞德里克——

"钻心剜骨！"

塞德里克痛苦地扭曲。克鲁姆的眼神呆滞，仿佛没有灵魂。

他是被夺魂咒控制了！

* [击昏克鲁姆，救塞德里克！] -> help_cedric (set: cedric_trust = cedric_trust + 20, courage = courage + 10)
* [趁机超过他们！] -> ignore_cedric (set: cedric_trust = 0)
* [攻击塞德里克（你是疯了吗？）] -> attack_cedric

---

# help_cedric

```yaml
image:
  prompt: Harry helping Cedric up, Krum unconscious nearby, shooting red sparks into sky for Krum, solidarity
  characters:
    - harry
    - cedric
  url: https://i.muistory.com/images/harry-potter-4/1768444101959-hp4_help_cedric.webp
```

"昏昏倒地！"你击昏了克鲁姆。

塞德里克喘着气爬起来，"哈利……谢谢你……他疯了……"

"他是被控制了。"你看着克鲁姆呆滞的眼睛，发射红色火花让人来带走他。

"你也救了我一次。"塞德里克看着你，"现在，奖杯就在前面。"

你们两个互相看了一眼。

* [一起跑向奖杯] -> triwizard_cup

---

# triwizard_cup

```yaml
image:
  prompt: The Triwizard Cup glowing blue on a plinth in the center of the maze, Harry and Cedric running towards it side by side
  characters:
    - harry
    - cedric
  url: https://i.muistory.com/images/harry-potter-4/1768371901016-hp4_triwizard_cup.webp
```

三强杯就在那里！在底座上闪烁着蓝光。

你和塞德里克同时跑向它。但一只巨大的蜘蛛突然从阴影中窜出！

你们背靠背战斗，联手击退了它。

现在，只剩下你们和奖杯了。

"你拿吧，哈利。"塞德里克喘着气说，"你{{ if cedric\_trust >= 30 }}两次{{ else }}今天{{ /if }}救了我。"

"不，我们要一起拿。"你说，"还是并列第一，怎么样？"

塞德里克笑了，"这主意不错。"

* [数到三，一起拿！] -> portkey_activate

---

# portkey_activate

```yaml
image:
  prompt: Harry and Cedric touching the cup at the same time, feeling the jerk behind the navel, world spinning, portkey activation
  characters:
    - harry
    - cedric
  url: https://i.muistory.com/images/harry-potter-4/1768371902113-hp4_portkey_activate.webp
```

"一——二——三！"

你们同时抓住了杯柄。

瞬间，那种熟悉的勾住肚脐的感觉袭来。世界旋转，风声呼啸。

你们的双脚离开了地面。但这不像是在传送回迷宫入口……

它把你们带向了远方。

* [落地] -> portkey_graveyard

---

# portkey_graveyard

```yaml
image:
  prompt: Harry and Cedric landing in a dark overgrown graveyard, old tombstones, creepy church in distance, eerie silence
  characters:
    - harry
    - cedric
  url: https://i.muistory.com/images/harry-potter-4/1768371903251-hp4_portkey_graveyard.webp
```

你们重重地摔在地上。

这里不是霍格沃茨。这是一座阴森的墓地。远处有一座老宅。

"这是哪儿？"塞德里克警惕地举起魔杖。

"梦里的地方……"你的伤疤突然剧痛，"我们要离开这里！快碰奖杯！"

太晚了。

黑暗中走过来一个矮小的身影，怀里抱着一团像婴儿一样的东西。

* [那是虫尾巴！] -> little_hangleton

---

# little_hangleton

```yaml
image:
  prompt: Wormtail approaching holding a bundle, Harry's scar hurting intensely, Cedric stepping forward protectively
  characters:
    - harry
    - cedric
    - wormtail
  url: https://i.muistory.com/images/harry-potter-4/1768371904091-hp4_little_hangleton.webp
```

你的伤疤痛得让你跪倒在地。

一个冰冷、尖厉的声音从那团东西里发出：

"干掉那个多余的。"

一道绿光闪过。

* [警告塞德里克！] -> warn_cedric (if: investigation >= 80 AND cedric_trust >= 50) (set: saved_cedric = true)
* [什么都做不了……] -> cedric_death
* [推开他！] -> push_cedric_away (if: courage >= 90 AND cedric_trust >= 30) (set: saved_cedric = true)

---

# cedric_death

```yaml
image:
  prompt: Cedric Diggory hit by green killing curse, falling to the ground dead, open eyes, Harry screaming in horror
  characters:
    - harry
    - cedric
  url: https://i.muistory.com/images/harry-potter-4/1768380313273-hp4_cedric_death.webp
```

"阿瓦达索命！"

一阵风声。塞德里克向后倒去，灰色的眼睛茫然地望着天空。他死了。

"不！！！"你尖叫。

但虫尾巴已经把你拖向一座大理石墓碑。名为"汤姆·里德尔"的墓碑。

* [仪式开始] -> ritual_begins

---

# warn_cedric

```yaml
image:
  prompt: Harry shouting warning, Cedric dodging just in time, green light hitting a tombstone, Cedric stunned by secondary spell but alive
  characters:
    - harry
    - cedric
  url: https://i.muistory.com/images/harry-potter-4/1768444102759-hp4_warn_cedric.webp
```

"躲开！"你用尽全力大喊。

塞德里克本能地倒地一滚！绿光擦着他的头发飞过击碎了墓碑！

"昏昏倒地！"虫尾巴迅速补了一记昏迷咒。塞德里克不动了，但他还活着！

你松了一口气，但紧接着被钻心咒击中。

* [被绑在墓碑上] -> ritual_begins

---

# push_cedric_away

```yaml
image:
  prompt: Harry shoving Cedric aside physically, taking the blast or spell missing, heroic sacrifice moment
  characters:
    - harry
    - cedric
  url: https://i.muistory.com/images/harry-potter-4/1768444103871-hp4_push_cedric_away.webp
```

你猛地扑向塞德里克，把他推开！

绿光击中了地面，炸出一个大坑。

你摔在地上，还没来得及爬起来，虫尾巴的魔杖已经指着你的喉咙。

"把他绑起来！"那个声音尖叫道。

塞德里克昏迷在一旁。但他没死。你改变了命运。

* [被绑在墓碑上] -> ritual_begins (set: task_points = task_points + 100)

---

# ritual_begins

```yaml
image:
  prompt: Harry tied to Tom Riddle's tombstone, Wormtail adding bone, flesh, and Harry's blood to a cauldron, dark magic ritual
  characters:
    - harry
    - wormtail
  url: https://i.muistory.com/images/harry-potter-4/1768371905524-hp4_ritual_begins.webp
```

你需要看这恐怖的一切。

"父亲的骨，无意中献出……"坟墓裂开，灰尘飞入大锅。

"仆人的肉，自愿献出……"虫尾巴砍断了自己的手！

"仇敌的血，被迫献出……"

匕首划破你的手臂，你的血滴入沸腾的药水。

大锅里的液体变成了令人目眩的白色。

* [他回来了] -> voldemort_rises

---

# voldemort_rises

```yaml
image:
  prompt: Lord Voldemort rising from the cauldron, pale skin, red eyes, snake-like face, examining his new body, terrifying atmosphere
  character: voldemort
  url: https://i.muistory.com/images/harry-potter-4/1768371906517-hp4_voldemort_rises.webp
```

迷雾散去。一个高瘦的身影从锅里升起。

苍白的皮肤，像蛇一样的脸，红色的眼睛。

伏地魔复活了。

他召唤了食死徒。卢修斯·马尔福、克拉布、高尔……那些平时道貌岸然的人都来了。

"哈利·波特。"伏地魔转向你，"我们要结束十三年前的事了。"

他让你松绑，把魔杖还给你。

"我们要决斗。"

* [决斗！] -> duel_voldemort
* [尝试逃跑！] -> try_escape

---

# duel_voldemort

```yaml
image:
  prompt: Harry and Voldemort casting spells at same time, red and green beams connecting in mid-air, golden cage of light forming
  characters:
    - harry
    - voldemort
  url: https://i.muistory.com/images/harry-potter-4/1768371907609-hp4_duel_voldemort.webp
```

"除你武器！"

"阿瓦达索命！"

两道咒语在空中相撞！

绿光和红光交织在一起，形成了一道耀眼的金色光柱。你们的魔杖连接了！

这是闪回咒！

* [坚持住！] -> priori_incantatem

---

# priori_incantatem

```yaml
image:
  prompt: Ghostly figures emerging from Voldemort's wand, Cedric (if dead), Harry's parents James and Lily, whispering encouragement to Harry
  characters:
    - harry
    - voldemort
  url: https://i.muistory.com/images/harry-potter-4/1768371908430-hp4_priori_incantatem_1768217132495.webp
```

如果是你救了塞德里克，只有老头和伯莎·乔金斯出来。如果是塞德里克已死，他也出来了。

最后，是你的父亲和母亲。

"坚持住，哈利……"莉莉甚至在你耳边低语，"当连接断开时，跑向门钥匙。"

"我们为你争取时间。"詹姆说。

"现在！"

* [断开连接！] -> grab_portkey

---

# grab_portkey

```yaml
image:
  prompt: Harry running towards the Triwizard Cup, dodging spells, grabbing Cedric (alive or body) and the cup, disappearing
  characters:
    - harry
    - cedric
  url: https://i.muistory.com/images/harry-potter-4/1768371909360-hp4_grab_portkey.webp
```

你猛地抬起魔杖！金色的网破碎了。

幽灵们包围了伏地魔。

你冲向塞德里克（无论生死），抓住他的手腕。

"门钥匙飞来！"

奖杯飞入你手中。勾住肚脐的感觉再次袭来。

伏地魔的怒吼声渐渐远去。

* [回到霍格沃茨] -> return_hogwarts

---

# return_hogwarts

```yaml
image:
  prompt: Harry and Cedric reappearing in the maze entrance, crowd cheering then screaming as they realize what happened, Dumbledore rushing over
  characters:
    - harry
    - dumbledore
  url: https://i.muistory.com/images/harry-potter-4/1768371910450-hp4_return_hogwarts_1768217173265.webp
```

你们落在草地上。

欢呼声……然后是尖叫声。

"他回来了！"你抓住邓布利多的长袍，哭喊道，"伏地魔回来了！"

如果塞德里克死了，那是无尽的悲伤。如果他活着，那就是奇迹。

穆迪把你拉起来，"跟我来，哈利。你需要休息。"

他把你带回办公室。有些不对劲……

* [揭开真相] -> moody_reveal

---

# moody_reveal

```yaml
image:
  prompt: Moody transforming into Barty Crouch Jr as Polyjuice Potion wears off, Dumbledore blasting the door open, truth revealed
  characters:
    - moody
    - dumbledore
  url: https://i.muistory.com/images/harry-potter-4/1768371911369-hp4_moody_reveal_1768217192653.webp
```

"黑魔王回来了？"穆迪问，眼神狂热，"我成功了？"

你惊恐地后退。"是你……把我的名字放进火焰杯……"

"是我！是我把奖杯变成了门钥匙！"

就在他要杀你的时候，门被轰开了！邓布利多、斯内普和麦格冲了进来。

真言剂下，真相大白：那是小巴蒂·克劳奇，喝了复方汤剂。真穆迪被锁在箱子里。

一切都结束了。但一切也刚刚开始。

你是怎么做到这一切的？根据你在旅途中的选择，你的故事迎来了不同的结局……

* [真正的勇士] -> ending_true (if: task_points >= 150 AND cedric_trust > 0 AND health > 0)
* [改变命运] -> ending_hidden (if: saved_cedric is true)
* [友谊万岁] -> ending_friend (if: ron_friendship >= 100 AND hermione_help is true)
* [幸存者] -> ending_survivor

---

# ending_true

```yaml
image:
  prompt: True Ending card with Harry standing triumphantly with Cedric (ghostly or alive), Hogwarts castle bathed in golden light, heroic music
  url: https://i.muistory.com/images/harry-potter-4/1768371912244-hp4_ending_true.webp
```

你不仅赢得了三强争霸赛，还带回了伏地魔复活的消息。

无论是面对火龙、人鱼还是斯芬克斯，你都证明了自己是真正的霍格沃茨勇士。而且，你不仅为了自己也是为了朋友而战。

这就是作为"被选中的人"的代价与荣耀。你已经准备好面对从未有过的黑暗。

GAME CLEARED: TRUE ENDING

---

# ending_hidden

```yaml
image:
  prompt: Hidden Ending card showing Harry and Cedric alive shaking hands, history changed, Dumbledore looking proud but worried
  url: https://i.muistory.com/images/harry-potter-4/1768371913105-hp4_ending_hidden.webp
```

你做到了连邓布利多都做不到的事——你改变了原本注定的死亡。

塞德里克活了下来。因为你的勇气和智慧，历史被改写了。虽然伏地魔归来，但他失去了一个杀戮的机会。

光明的一方多了一位强大的战士。未来虽然黑暗，但希望之光比以往任何时候都要强烈。

GAME CLEARED: HIDDEN ENDING

---

# ending_friend

```yaml
image:
  prompt: Harry, Ron, and Hermione laughing together by the lake, friendship triumphing over adversity, warm nostalgic light
  url: https://i.muistory.com/images/harry-potter-4/1768371913987-hp4_ending_friend.webp
```

也许那个奖杯并不重要。名誉也不重要。

重要的是，你和罗恩、赫敏的友谊经受住了所有的考验。你们并肩作战，解开了谜题，共同面对了恐惧。

无论未来有什么在等待，只要你们三个在一起，就没有什么过不去的坎。

GAME CLEARED: FRIENDSHIP ENDING

---

# ending_survivor

```yaml
image:
  prompt: Harry looking out at the sunset alone, tired but alive, holding his wand, uncertain future
  url: https://i.muistory.com/images/harry-potter-4/1768371914860-hp4_ending_survivor.webp
```

你活下来了。在面对黑魔王、食死徒和无数怪物之后，这本身就是一种伟大的胜利。

虽然也许还有遗憾，虽然也许本可以做得更好，但活着就有希望。

你知道，真正的战争才刚刚开始。而你，必须时刻准备着。

GAME CLEARED: SURVIVOR ENDING