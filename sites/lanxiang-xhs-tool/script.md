---
title: 兰香如故·性转逆后宫
description: 你是顶替亡女入府的许兰香。冷面嫡长子林锦楼、新贵公子赵星棠、江湖游医杜翠雀、商帮少东薛桂花——态度皆随你而变。四场风波、三十余次抉择，洗冤与心动，结局由你写就。
backgroundStory: |
  沈家蒙冤灭门那夜，大学士府长孙女沈嘉兰被家奴之女替下，从此以「许兰香」之名活在林府后宅。

  她要做三等丫鬟，要低头，要活下去。
  她也要查清那桩谋逆旧案，让沈氏之名重见天日。

  林府深深，人心更深深：
  嫡长子林锦楼，冷面下藏着退婚旧愧；
  赵家公子赵星棠，笑意里全是算计；
  游医杜翠雀，药箱中似有故人遗音；
  商帮少东薛桂花，爽朗背后是未结的沈案线头。

  四场风波将至。你的每一次选择，都在改写他们对你的态度——也在改写你自己的命运。
tags:
  - 性转
  - 逆后宫
  - 明代宅门
  - 多结局
  - 兰香如故
cover_image: https://i.muistory.com/images/-7180/cover-1790087585812.png
cover_prompt: Ming dynasty mansion romantic reverse harem key art, painterly
published: false
display_mode: immersive
text_box_position: bottom
typewriter_speed: 35
state:
  favor_jinlou: 0
  favor_xingtang: 0
  favor_cuique: 0
  favor_guihua: 0
  guilt_jinlou: 0
  has_token: false
  knows_secret: false
  has_evidence: false
  knows_xingtang_plot: false
  used_token: false
  forgive_jinlou: false
  evidence_holder: ''
  path_style: ''
  act: 0
ai:
  style:
    image: Ming dynasty mansion interiors and gardens, soft lantern light, elegant hanfu, painterly cinematic, warm amber and jade green palette, no text
  characters:
    lanxiang:
      name: 许兰香
      description: 女主，沈嘉兰顶替入府。玩家视角。
      image_prompt: young Ming dynasty maid, 18, delicate determined face, plain servant dress with hidden orchid embroidery, full body
    jinlou:
      name: 林锦楼
      description: 林家嫡长子，二十二。冷面克己，规矩森严，对退婚沈家旧约暗怀愧意。
      image_prompt: young Ming dynasty nobleman, 22, severe elegant features, dark blue robe, jade hairpin, cold restrained gaze, full body
      image_url: https://i.muistory.com/images/-7180/characters/jinlou-1790087592938.png
    xingtang:
      name: 赵星棠
      description: 御前新贵赵家公子，二十。外热内冷，长袖善舞，视联姻为棋局。
      image_prompt: young Ming dynasty nobleman, 20, warm smile sharp eyes, pale rose robe, folding fan, courtly charming, full body
    qiowen:
      name: 秋纹
      description: 正院大丫鬟，刻薄跋扈。
      image_prompt: stern Ming dynasty senior maid, mean eyes, dark red servant dress
    mama:
      name: 管事妈妈
      description: 浆洗房管事，严厉但认账目。
      image_prompt: middle-aged Ming dynasty matron, strict face, dark clothes
    cuique:
      name: 杜翠雀
      description: 江湖游医，二十一。温和散漫，与许家有旧，知兰香身世一角。
      image_prompt: young Ming dynasty physician, 21, gentle eyes, light green robe, medicine box on back, kind smile, full body
    guihua:
      name: 薛桂花
      description: 商帮少东，二十。爽利义气，走南闯北，暗查沈家旧案。
      image_prompt: young Ming dynasty merchant, 20, bright confident smile, ochre travel robe, abacus beads bracelet, energetic, full body
---

# start

```yaml
image:
  prompt: Night before entering the Lin mansion, a young woman in plain clothes looks at a simple bundle, moonlit courtyard gate, melancholy resolve
  url: assets/scenes/start.png
```

马车停下时，你只有一只布包。

包里是许兰香的旧衣，和你从沈家废墟里抠出来的一枚绣样铜牌——不能让人看见。

@lanxiang: （默念）从今日起，我是许兰香。沈嘉兰已随那一场大火死了。

* [深吸一口气，走进林府] -> start_mansion

---

# start_mansion

```yaml
image:
  prompt: Grand Ming dynasty mansion gate at dawn, servants bowing, towering eaves, cold morning mist
  url: assets/scenes/start_mansion.png
```

林府的门比你记忆里更高。

当年两家议亲时，你随祖母来过一回。如今你是角门里递补的三等丫鬟，连抬头看匾额，都要先看管事妈妈的眼色。

@mama: 许家的？站到队尾去。手脚放干净些，府里不养闲人。

* [低头应是] -> start_chores
* [不卑不亢行礼] -> start_chores (set: path_style = 'fierce')

---

# start_chores

```yaml
image:
  prompt: Servants quarters in Ming mansion, laundry baskets, a bullied young maid standing alone while others whisper
  url: assets/scenes/start_chores.png
```

浆洗、扫院、跑腿。第三日，你因打翻半盆水，被大丫鬟秋纹堵在廊下。

@qiowen: 乡下来的野丫头，也配在正院当差？跪下，把地舔干净。

有人远远看着，无人出声。

* [忍下，跪] -> start_incline (set: path_style = 'soft')
* [跪，但记下今日这笔] -> start_incline (set: path_style = 'soft')
* [顶回去：水是我打翻的，我赔；辱人不必] -> start_incline (set: path_style = 'fierce')

---

# start_incline

```yaml
image:
  prompt: Crossroads in a Ming mansion corridor, a cold young master on the left, a smiling young noble on the right, dusk light
  url: assets/scenes/start_incline.png
```

僵持时，两个人影先后出现。

左侧是林家嫡长子林锦楼，目光如霜，扫过众人。
右侧是来府上议事的赵家公子赵星棠，折扇一合，笑得温润。

@jinlou: 闹什么。府里的规矩，是这么用的？

@xingtang: 哟，小丫头骨头倒硬。锦楼兄，不如下官做个和事佬？

他们都在看你。你可以求一个庇护，也可以什么都不求。

* [向林锦楼行礼，陈述是非] -> e1_bully (set: favor_jinlou = favor_jinlou + 1) (set: guilt_jinlou = guilt_jinlou + 1)
* [向赵星棠谢和事之恩] -> e1_bully (set: favor_xingtang = favor_xingtang + 1)
* [谁也不求，自己担下责罚] -> e1_bully (set: path_style = 'independent')

---

# e1_bully

```yaml
image:
  prompt: Ming mansion servants corridor, tension, a stern senior maid and a young maid standing firm
  url: assets/scenes/e1_bully.png
```

风波暂歇，秋纹的报复来得比想象快。

你的铺盖被泼了冷水，夜里的差事也总是最脏最累的。同屋的丫鬟劝你：忍忍，三等丫鬟，斗不过正院的人。

* [忍，把力气花在差事上] -> e1_stand
* [反击——抓她偷拿府中物件的把柄] -> e1_stand (set: path_style = 'fierce')
* [反击，但只对管事妈妈说明缘由，不撕破脸] -> e1_stand

---

# e1_stand

```yaml
image:
  prompt: Ming dynasty study entrance, young woman presenting a neatly copied account page, candlelight
  url: assets/scenes/e1_stand.png
```

你把浆洗账目重新理了一遍，字迹工整，数目清楚。管事妈妈多看了你两眼。

@mama: 倒是个仔细人。去，把这叠册子送到外书房。

外书房。那是林锦楼理事的地方。

* [送册子，不多话] -> e1_jinlou
* [送册子，若被问起便条理分明地答] -> e1_jinlou (set: favor_jinlou = favor_jinlou + 1)

---

# e1_jinlou

```yaml
image:
  prompt: Ming dynasty study, cold elegant young master at desk, young maid presenting ledgers, restrained tension
  characters: [jinlou]
  url: assets/scenes/e1_jinlou.png
```

@jinlou: （抬眼）那日廊下的事，你可觉得委屈？

* [「奴婢不委屈，只求公道二字。」] -> e1_xingtang (set: favor_jinlou = favor_jinlou + 1) (set: guilt_jinlou = guilt_jinlou + 1)
* [「委屈。但林府讲规矩，奴婢信规矩。」] -> e1_xingtang (set: guilt_jinlou = guilt_jinlou + 1)
* [「不提也罢。」] -> e1_xingtang

---

# e1_xingtang

```yaml
image:
  prompt: Mansion garden pavilion, charming young nobleman with fan talking to a maid, ambiguous smile
  characters: [xingtang]
  url: assets/scenes/e1_xingtang.png
```

出书房时，赵星棠竟等在花厅。

@xingtang: 许姑娘。上回没帮上忙，这回补一份薄面——西市的蜜饯，可要？

他笑得无害。可你记得，赵家，正是林家退亲后要结亲的那一家。

* [收下，道谢，保持距离] -> e1_shelter (set: favor_xingtang = favor_xingtang + 1)
* [收下，并点破：公子有话不妨直说] -> e1_shelter (set: favor_xingtang = favor_xingtang + 1) (set: knows_xingtang_plot = true)
* [不收，告退] -> e1_shelter

---

# e1_shelter

```yaml
image:
  prompt: Rainy night in servants wing, a young woman mending clothes under a dim lamp, a small embroidered copper token on the table
  url: assets/scenes/e1_shelter.png
```

夜里落雨。秋纹又把你的活计丢过来。你明白，靠忍，忍不出一条路。

窗台上，那枚绣样铜牌压在针线筐底。它是沈家绣坊的记号，也是可能引来杀身之祸的东西。

明日，内院要挑人去灯会当差——那是离开浆洗房、靠近真正主子们的机会。

* [收好铜牌，凭差事挣前程] -> e1_token
* [试探：向方才对你略带善意的人递一句软话] -> e1_token (if: favor_jinlou >= 1) (set: favor_jinlou = favor_jinlou + 1)
* [试探赵星棠那边的消息网] -> e1_token (if: favor_xingtang >= 1) (set: favor_xingtang = favor_xingtang + 1)

---

# e1_token

```yaml
image:
  prompt: Close-up of an embroidered copper token with orchid pattern, candlelight, secretive mood
  url: assets/scenes/e1_token.png
```

铜牌上的兰草纹，是母亲手把手教你的绣样。

带在身上，是对质的信物；被人搜出，就是催命的罪证。明日灯会人多手杂，你必须做个决定。

* [贴身收好铜牌] -> e1_night (set: has_token = true)
* [藏进浆洗房砖缝，空手去灯会] -> e1_night (set: has_token = false)
* [磨去兰草纹的一角，贴身带着] -> e1_night (set: has_token = true) (set: path_style = 'fierce')

---

# e1_night

```yaml
image:
  prompt: Quiet night in servants quarters, moon through lattice window, young woman resolved expression
  url: assets/scenes/e1_night.png
```

秋纹之流，不过是宅门里的小风浪。
真正的大浪，在联姻的传闻里，在赵林两家的算盘里，在那桩沈家谋逆旧案里。

明日灯会。你有一种预感：有些人，会露出真面目。

* [熄灯歇下] -> e2_prep (set: act = 1)

---

# e2_prep

```yaml
image:
  prompt: Ming dynasty servants preparing lantern festival costumes and props, bustling cheerful courtyard
  url: assets/scenes/e2_prep.png
```

上元灯会，林府女眷要出门观灯。你被分到跟随提灯、看管物件的差事。

同队的丫鬟们叽叽喳喳：听说赵公子包了临河雅座，听说外头来了个游医在西市施药……

* [记下每一条消息] -> e2_lantern
* [只专心当差，少听闲话] -> e2_lantern (set: path_style = 'independent')

---

# e2_lantern

```yaml
image:
  prompt: Bustling Ming dynasty lantern festival street at night, glowing rabbit and lotus lanterns, crowd, river reflection
  url: assets/scenes/e2_lantern.png
```

满街灯火。你护着女眷的斗篷，眼睛却在找——找那条可能藏着沈案线索的旧巷。

人潮一挤，你与队伍散开半步。

* [先回队伍，稳妥为上] -> e2_cuique
* [趁乱往旧巷看一眼] -> e2_cuique (set: has_evidence = false)

---

# e2_cuique

```yaml
image:
  prompt: Street medicine stall at lantern festival, gentle young physician with medicine box, warm lantern glow
  characters: [cuique]
  url: assets/scenes/e2_cuique.png
```

西市医摊前，青衫游医正在给孩童挑刺。他动作轻，声音也轻。

@cuique: 小心些，别跑那么快。……咦？

他看见你，目光停在你袖口半枚露出的兰草结上——那是沈家绣法。

@cuique: （低声）姑娘这结，打得很旧。像是……故人所授。

* [含糊应过，抽手] -> e2_trap (set: favor_cuique = favor_cuique + 1)
* [压低声音：先生认得这绣法？] -> e2_trap (set: favor_cuique = favor_cuique + 2) (set: knows_secret = true)
* [装作不懂，行礼离开] -> e2_trap

---

# e2_trap

```yaml
image:
  prompt: Lantern festival riverside pavilion, charming young nobleman offering a riddle lantern, calculating smile
  characters: [xingtang]
  url: assets/scenes/e2_trap.png
```

临河雅座，赵星棠拦住你的去路，手里转着一盏灯谜。

@xingtang: 许姑娘好眼力，竟能从人堆里脱身。我有一谜——『兰生幽谷，不以无人而不芳』。打一旧案。

他的眼睛在笑，话却像针。这是试探。试探你是不是沈家旧人。

* [装柔弱：奴婢愚钝，猜不出] -> e2_face (set: favor_xingtang = favor_xingtang + 1)
* [露锋芒：「兰香如故」——公子这谜，未免太旧了] -> e2_face (set: favor_xingtang = favor_xingtang + 2) (set: knows_xingtang_plot = true)
* [反问：公子这般打哑谜，是赵家的规矩？] -> e2_face (set: favor_xingtang = favor_xingtang + 1) (set: path_style = 'fierce')

---

# e2_face

```yaml
image:
  prompt: Lantern light on faces, tense conversation between a maid and a nobleman, festival crowd blurred
  characters: [xingtang]
  url: assets/scenes/e2_face.png
```

@xingtang: （合扇，笑意更深）有趣。许姑娘，你比账册有趣多了。

他说「有趣」，像把人放进棋盒。你背后发凉，却也清楚：他对你，已不只是对丫鬟的兴趣。

* [敷衍告退，回队伍] -> e2_rumor
* [再留半步，听他还能吐出什么] -> e2_rumor (set: knows_xingtang_plot = true)

---

# e2_rumor

```yaml
image:
  prompt: Night street corner, two messengers whispering, a young woman choosing whom to trust, lantern bokeh
  url: assets/scenes/e2_rumor.png
```

回府前，两个消息同时砸到你跟前：

东边小厮说：林大公子吩咐人，把你的名字从「冲撞女眷」的责罚单上划掉了。
西边小厮说：赵公子问过你的身籍，还提了一句「故人之后」。

有人递来一张字条，只有四个字：药到，病除。落款是一枚雀鸟。

* [信东边——林锦楼那边的善意] -> e2_after (set: favor_jinlou = favor_jinlou + 1) (set: guilt_jinlou = guilt_jinlou + 1)
* [信西边——赵星棠在查你，那便将计就计] -> e2_after (set: favor_xingtang = favor_xingtang + 1)
* [信雀鸟字条——医摊那人，似乎真认得沈家] -> e2_after (set: favor_cuique = favor_cuique + 1) (set: knows_secret = true)

---

# e2_after

```yaml
image:
  prompt: Dawn return to mansion, tired maids, a folded note hidden in a sleeve, quiet tension
  url: assets/scenes/e2_after.png
```

灯会散了。你把字条折成极小的一块，缝进袜底。

有人在查你，有人在护你，有人在试你。还有一条商船的传闻——薛家船队，下月要走漕运，专跑沈家旧案牵连的那几州。

* [把商船传闻记在心里] -> e3_alliance (set: favor_guihua = favor_guihua + 1) (set: act = 2)
* [暂时压下，应付眼前的联姻风声] -> e3_alliance (set: act = 2)

---

# e3_alliance

```yaml
image:
  prompt: Grand hall announcement, servants whispering, red silk banners for engagement preparations
  url: assets/scenes/e3_alliance.png
```

林府挂起了红绸。

赵林联姻，议得很急。你站在廊柱阴影里，听见管事们念礼单——那上面有几样，是沈家当年被判「谋逆」时被抄走的旧物。

旧物重新出现，说明抄家的手脚不干净。说明有人留了证据。

* [记下礼单细节] -> e3_expose (set: has_evidence = true)
* [先求自保，别碰礼单] -> e3_expose

---

# e3_expose

```yaml
image:
  prompt: Tense inspection in mansion, a dropped embroidered token on the floor, pointing fingers, dramatic light
  url: assets/scenes/e3_expose.png
```

查验新衣时，你俯身去拾剪刀，袜底里的字条滑出半角，绣样铜牌也跟着砸在地上。

秋纹眼尖：「这是什么！拿去给太太看！」

替身的身份，悬于一线。

* [硬抢回来，宁可受罚] -> e3_help (set: path_style = 'fierce')
* [跪下陈情：这是亡母遗物，求太太恩典] -> e3_help
* [什么都不说，看谁出面] -> e3_help

---

# e3_help

```yaml
image:
  prompt: Four-way crossroads of a Ming mansion courtyard, four different young men appearing from different sides, storm clouds
  characters: [jinlou, xingtang, cuique, guihua]
  url: assets/scenes/e3_help.png
```

围拢过来的人里，有四道目光。

林锦楼皱着眉，手已按上腰间玉佩——那是他思虑时的习惯。
赵星棠摇了摇扇，像在看一局好棋。
杜翠雀不知何时进的府，药箱带子绷得很紧。
还有一个陌生的青年，风尘仆仆，把算盘往掌心一拍：

@guihua: 诸位，冤有头债有主。一枚旧铜牌，犯得着喊打喊杀？我薛家船队，最见不得好人被踩。

你必须选一个人求助。此刻的态度，会影响他们，也会影响后面所有事。

* [求林锦楼：请大公子按府规明断] -> e3_chase (set: favor_jinlou = favor_jinlou + 2) (set: guilt_jinlou = guilt_jinlou + 1)
* [投赵星棠：借他的势，压下眼前风波] -> e3_chase (set: favor_xingtang = favor_xingtang + 2)
* [靠杜翠雀：请他作证铜牌是医家所赠] -> e3_chase (set: favor_cuique = favor_cuique + 2) (set: knows_secret = true)
* [与薛桂花并肩：他像是冲着旧案来的] -> e3_chase (set: favor_guihua = favor_guihua + 2)

---

# e3_chase

```yaml
image:
  prompt: Night chase through mansion storehouse corridor, lanterns swinging, young woman running with a ledger page
  url: assets/scenes/e3_chase.png
```

风波被压下去了，可你清楚：礼单上的旧物，才是真正的刀。

当夜，你摸向库房方向，想核对那几件抄家旧物的来路。背后有脚步声——不是秋纹。

* [躲进库房夹道] -> e3_evidence
* [回头，看是谁跟来] -> e3_evidence (if: has_token == true)

---

# e3_evidence

```yaml
image:
  prompt: Dim storehouse, uncovering a dusty chest with confiscated family treasures and a hidden ledger, dust motes
  url: assets/scenes/e3_evidence.png
```

夹道尽头的旧箱里，压着半本受潮的册子：沈家女眷绣坊的往来账，末页有经手印——不是沈家的印，是赵家门客的私记。

这足以证明「抄没」中有侵吞与构陷。是证据。滚烫的证据。

* [抄录关键页，原物放回] -> e3_step (set: has_evidence = true)
* [整本带走] -> e3_step (set: has_evidence = true) (set: path_style = 'fierce')
* [只记住线索，不要打草惊蛇] -> e3_step

---

# e3_step

```yaml
image:
  prompt: Courtyard at night, a young master returning a dropped hairpin and speaking softly, moonlight
  characters: [jinlou]
  url: assets/scenes/e3_step.png
```

回廊下，林锦楼拦住你。他掌心躺着的，是你慌乱中掉落的兰草结——不是铜牌，是你自己打的结。

当年两家议亲，他见过沈家姑娘的绣样。他一直知道，却从未点破。

@jinlou: ……那年退婚，是林家对不住沈家。今日这一步，你打算走到哪里？

E1 的恩怨、灯会的回响、方才谁替你说话——都在他眼里。

* [「走到沈家冤屈昭雪为止。」] -> e3_night (set: favor_jinlou = favor_jinlou + 2) (set: guilt_jinlou = guilt_jinlou + 2)
* [「走到我能护住自己为止。至于公子——退过一次的人，我不敢托付。」] -> e3_night (set: favor_jinlou = favor_jinlou + 1)
* [「公子若真有愧，联姻那日，请站到公道这边。」] -> e3_night (set: favor_jinlou = favor_jinlou + 2) (set: forgive_jinlou = true)
* [若你在灯会信了雀鸟] -> e3_night (if: knows_secret == true) (set: favor_cuique = favor_cuique + 1)

---

# e3_night

```yaml
image:
  prompt: Pre-dawn servants room, ink-stained fingers hiding copied pages, determined face, cold blue hour
  url: assets/scenes/e3_night.png
```

抄录页缝进了被褥。你知道，接下来只有两条路：
把证据交给可信之人，走一条可能被截杀的公道；
或者，用证据做筹码，与虎谋皮。

联姻将近。沈冤将近。定情，也近了。

* [准备摊牌] -> e4_truth (set: act = 3)

---

# e4_truth

```yaml
image:
  prompt: Ming mansion main hall at night, four young men and a young woman facing each other, oil lamps, high stakes mood
  characters: [jinlou, xingtang, cuique, guihua]
  url: assets/scenes/e4_truth.png
```

你把人约到偏厅。铜牌、抄录页、雀鸟字条，并排放在灯下。

@lanxiang: 我是沈嘉兰。今夜，有人要听真相，有人要拦真相。诸位，请选。

* [等待他们表态] -> e4_stance

---

# e4_stance

```yaml
image:
  prompt: Dramatic faces in lamplight, a cold nobleman, a smiling schemer, a gentle doctor, a bold merchant
  characters: [jinlou, xingtang, cuique, guihua]
  url: assets/scenes/e4_stance.png
```

@jinlou: 沈家旧案，我早疑有内情。联姻是我的枷锁，也是我的刀。

@xingtang: （收扇）嘉兰……果然是你。赵家在旧案里不干净，可我对你，不全是棋。

@cuique: 对不住。许家救过我，我认出你的绣法，却不敢早说。秘密压得人疼。

@guihua: 我爹的船，替人运过「赃物」。这证据，有我薛家一份债。翻案，算我一个。

* [质问赵星棠：你查我多久了？] -> e4_trust (set: knows_xingtang_plot = true)
* [先谢翠雀守密之苦] -> e4_trust (set: favor_cuique = favor_cuique + 1)
* [先问锦楼：你敢不敢抗婚？] -> e4_trust (set: favor_jinlou = favor_jinlou + 1)
* [与桂花碰一碰拳：江湖人，办正事] -> e4_trust (set: favor_guihua = favor_guihua + 1)

---

# e4_trust

```yaml
image:
  prompt: A folded evidence packet being passed hand to hand under lamplight, decisive moment
  characters: [jinlou, xingtang, cuique, guihua]
  url: assets/scenes/e4_trust.png
```

证据只有一份可信抄录。交到谁手里，便是把身家性命押给谁。

@lanxiang: 我信一个人。其余人，请做壁上观——或，做刀。

* [交给林锦楼，借林家之力翻案] -> e4_court (set: evidence_holder = 'jinlou') (set: favor_jinlou = favor_jinlou + 2)
* [交给杜翠雀，走江湖医案暗线] -> e4_court (set: evidence_holder = 'cuique') (set: favor_cuique = favor_cuique + 2) (set: knows_secret = true)
* [交给薛桂花，走漕运与商会明线] -> e4_court (set: evidence_holder = 'guihua') (set: favor_guihua = favor_guihua + 2) (set: has_evidence = true)
* [交给赵星棠——以毒攻毒，让他先清自家门户] -> e4_court (set: evidence_holder = 'xingtang') (set: favor_xingtang = favor_xingtang + 2) (set: knows_xingtang_plot = true)

---

# e4_court

```yaml
image:
  prompt: Choice between a yamen court gate and a quiet riverside boat at night, two paths
  url: assets/scenes/e4_court.png
```

路铺开了。

一条：递状纸，敲登闻鼓，把旧案摊在青天之下——快，也险。
一条：密呈巡按，借联姻宴上人多口杂时发难——稳，也慢。

* [公堂：把沈家的名，堂堂正正讨回来] -> e4_forgive (set: has_evidence = true) (set: path_style = 'fierce')
* [私了：先保人，再翻案] -> e4_forgive (set: path_style = 'soft')
* [公私并行——让桂花走商会，我走公堂] -> e4_forgive (if: favor_guihua >= 3) (set: has_evidence = true) (set: favor_guihua = favor_guihua + 1)

---

# e4_forgive

```yaml
image:
  prompt: Young woman speaking to a guilt-ridden young master under a plum tree, snow petals, emotional restraint
  characters: [jinlou]
  url: assets/scenes/e4_forgive.png
```

发难前夜，林锦楼在梅树下等你。风雪落满他肩。

@jinlou: 退婚书是我父亲写的，我未能拦下。嘉兰——你可还肯，看我一眼？

* [「旧约如故，人心难故。锦楼，我要看你明日站在哪边。」] -> e4_lock (set: favor_jinlou = favor_jinlou + 2) (set: forgive_jinlou = true)
* [「我原谅林家的难处，不原谅那一纸退婚。你若真愧，用明日来还。」] -> e4_lock (set: favor_jinlou = favor_jinlou + 1) (set: forgive_jinlou = true)
* [「不提了。各走各的路。」] -> e4_lock (set: favor_jinlou = favor_jinlou + 0)

---

# e4_lock

```yaml
image:
  prompt: Dawn before a great confrontation, banners, determined faces, Ming dynasty city gate
  characters: [jinlou, xingtang, cuique, guihua]
  url: assets/scenes/e4_lock.png
```

该说的，都说了。该押的，都押了。

四个人，四种心思，却在同一场风雪里，为你、为沈家、也为他们自己，选了立场。

@lanxiang: （默念）不论结局如何——今日起，沈嘉兰不必再躲。

* [迎向终局] -> e4_climax

---

# e4_climax

```yaml
image:
  prompt: Climactic scene, court hall and merchant ships and medicine box and broken engagement document, montage style dramatic
  url: assets/scenes/e4_climax.png
```

旧账被掀开：赵家门客私记、被吞没的绣坊账目、薛家船队的证词、林家退婚当日的内幕、杜翠雀守了多年的故人遗言——

沈家，不是谋逆。是构陷。

而你站在灯下，听着众人对你、对沈家的最终态度。风停了。

* [等待命运宣判] -> end_resolve

---

# end_resolve

-> end_alone (if: favor_jinlou <= 2 and favor_xingtang <= 2 and favor_cuique <= 2 and favor_guihua <= 2)
-> end_jinlou_he (if: favor_jinlou >= favor_xingtang and favor_jinlou >= favor_cuique and favor_jinlou >= favor_guihua and has_evidence == true and guilt_jinlou >= 2 and forgive_jinlou == true)
-> end_jinlou_be (if: favor_jinlou >= favor_xingtang and favor_jinlou >= favor_cuique and favor_jinlou >= favor_guihua)
-> end_xingtang_he (if: favor_xingtang > favor_jinlou and favor_xingtang >= favor_cuique and favor_xingtang >= favor_guihua and knows_xingtang_plot == true and has_token == true)
-> end_xingtang_be (if: favor_xingtang > favor_jinlou and favor_xingtang >= favor_cuique and favor_xingtang >= favor_guihua)
-> end_cuique_he (if: favor_cuique > favor_jinlou and favor_cuique > favor_xingtang and favor_cuique >= favor_guihua and knows_secret == true)
-> end_cuique_be (if: favor_cuique > favor_jinlou and favor_cuique > favor_xingtang and favor_cuique >= favor_guihua)
-> end_guihua_he (if: favor_guihua > favor_jinlou and favor_guihua > favor_xingtang and favor_guihua > favor_cuique and has_evidence == true)
-> end_guihua_be (if: favor_guihua > favor_jinlou and favor_guihua > favor_xingtang and favor_guihua > favor_cuique)
-> end_alone

---

# end_jinlou_he

```yaml
image:
  prompt: Happy ending, a couple in Ming wedding robes before a cleared family memorial tablet, orchid incense, warm light
  characters: [jinlou]
  url: assets/scenes/end_jinlou_he.png
```

**结局·如故兰香**

林锦楼当众撕了与赵家的婚书，以嫡长子之名，为沈家作证。
旧案昭雪那日，他把兰草结重新系回你腕上。

@jinlou: 沈家的名，我陪你讨回来了。兰香如故——往后，换我守着你。

* [圆满] -> start

---

# end_jinlou_be

```yaml
image:
  prompt: Bittersweet ending, a man watching a carriage leave in snow, broken engagement paper on the ground, cold light
  characters: [jinlou]
  url: assets/scenes/end_jinlou_be.png
```

**结局·退婚雪**

他终究把「林家」二字，又放在了你前面一次。
证据不足，或愧意未深——他退了半步，你便退了整场。

@jinlou: 对不住。保重。

雪落满你们中间那条退婚旧路。香如故，人不在。

* [再走一遍命运] -> start

---

# end_xingtang_he

```yaml
image:
  prompt: Happy ending, charming young nobleman discarding a fan, standing with a woman before exposed ledgers, sunrise
  characters: [xingtang]
  url: assets/scenes/end_xingtang_he.png
```

**结局·棋盘上的真心**

他当着赵家长老的面，把私记与礼单掷在案上，先清自家门户。

@xingtang: 我算计过你，也算丢了自己。嘉兰——这局棋，我认输。余生，请你执子。

蜜饯还甜。人，终于真了。

* [圆满] -> start

---

# end_xingtang_be

```yaml
image:
  prompt: Tragic ending, smiling nobleman holding a chess piece while a woman walks away from a court hall, cold rain
  characters: [xingtang]
  url: assets/scenes/end_xingtang_be.png
```

**结局·新贵棋局**

他赢了朝堂，赢了体面，把你的信任折成了进身之阶。

@xingtang: 你会懂的。棋盘上，真心最是累赘。

你回头时，他还在笑。笑意里，空无一物。

* [重开一局] -> start

---

# end_cuique_he

```yaml
image:
  prompt: Happy ending, physician and woman opening a small clinic under plum blossoms, medicine chest, soft morning
  characters: [cuique]
  url: assets/scenes/end_cuique_he.png
```

**结局·药香如故**

杜翠雀把守了多年的故人遗言，一句一句说给你听。然后他收起药箱，牵你离开宅门。

@cuique: 守秘是罪，我认。往后的药方，都写你的名字。我们去开一间小医庐——清苦，但香如故。

沈冤另有明路昭雪，你们在人间烟火里，把日子过得安稳。

* [圆满] -> start

---

# end_cuique_be

```yaml
image:
  prompt: Sad ending, a medicine prescription left on a windowsill, a figure walking away in mist, rain
  characters: [cuique]
  url: assets/scenes/end_cuique_be.png
```

**结局·未寄的药方**

为护你，他把危险引向自己，又在天明前消失。
窗台上只留一张药方，墨迹未干，落款是那只雀鸟。

@cuique (字条): 病根已除，药方未寄。保重——不必寻我。

你把药方贴在心口。有些温柔，是用来错过的。

* [重走灯会] -> start

---

# end_guihua_he

```yaml
image:
  prompt: Happy ending on a river merchant boat, lanterns on water, a bold young merchant and a woman laughing with wine jar
  characters: [guihua]
  url: assets/scenes/end_guihua_he.png
```

**结局·桂花载酒**

薛家船队载着证据下了江南，也载着你去看了沈家旧宅的春天。
事了那夜，他把一坛桂花酒抛给你。

@guihua: 公道讨回来了，人也该讨一个。嘉兰，上船吗？往后江湖与漕运，都有你一份。

* [圆满] -> start

---

# end_guihua_be

```yaml
image:
  prompt: Tragic ending, a woman alone on a dock in night rain, a broken abacus bead bracelet on wet wood
  characters: [guihua]
  url: assets/scenes/end_guihua_be.png
```

**结局·江湖夜雨**

证据链断在最后一环，他替你顶了干系，身陷囹圄。
码头夜雨，你捏着那颗断线的算盘珠，听见船笛像呜咽。

@guihua (狱中口信): 先跑。别回头。桂花来年还开——人也一定还见。

* [夜雨重逢前，先重开] -> start

---

# end_alone

```yaml
image:
  prompt: Solo ending, a woman in refined Ming dress standing before a restored family plaque, independent and calm, dawn
  url: assets/scenes/end_alone.png
```

**结局·自掌命运**

你没有把余生交给任何一只手。

以兰香之名立了女户，以沈嘉兰之名递了状纸。绣坊重开，兰草如故。
四个人有的远走，有的守望，有的成了故人——而你，终于把命运握在自己掌心。

@lanxiang: 不依附，不将就。沈家的雪化了，路是我自己的。

* [新的开始] -> start
