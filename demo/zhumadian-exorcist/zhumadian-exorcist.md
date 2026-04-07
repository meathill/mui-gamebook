---
title: 驻马店驱魔人
description: 王利发主教在玛门的阴谋下失去能力，驱魔的重任落在了刘全肩上。面对伪装成“女基督”的贪婪恶魔，你将如何抉择？
backgroundStory: |
  驻马店，豫南腹地，看似平静的城市下暗流涌动。
  最近，“女基督”的传言在乡间疯传，信徒宣称她能带来财富与永生。
  宗教局特派员刘全奉命前来协助当地的王利发主教处理一起棘手的附身案件。
  但这仅仅是一个巨大阴谋的开始……
cover_image: https://i.muistory.com/images/zhumadian-exorcist/1768835522450-zhumadian_cover.webp
cover_prompt: A gritty, neo-noir style poster of a Chinese exorcist standing in a snowy street of Zhumadian at night, dim street lights, holding a cross and a bottle of Nongfu Spring water, dark atmosphere, mystery
tags:
  - 悬疑
  - 驱魔
  - 宗教
  - 惊悚
  - 河南
state:
  health: 100
  sanity: 100
  faith: 10
  money: 2000
  corruption: 0
  rationality: 50
  empathy: 50
  enemy_health: 100
  chips: 1000
  has_black_book: false
  has_key: false
  knows_mammon: false
  kaifeng_evidence: 0
  has_living_water: false
  has_victim_diary: false
  has_factory_photos: false
  has_sales_ledger: false
  has_chemical_list: false
  has_factory_recording: false
  has_fund_ledger: false
  has_warrant: false
  disguise_worker: false
  defeated_alchemist: false
  nanyang_evidence: 0
  has_ark_ticket: false
  zhengzhou_evidence: 0
  has_vip_card: false
  mammon_weakened: false
  has_signal_gun: false
ai:
  style:
    image: Realistic, cinematic, gritty, slightly dark tone, high contrast, snowy winter atmosphere
    audio: Suspenseful, eerie, with traditional Chinese instruments mixed with low frequency drones
  characters:
    liu_quan:
      name: 刘全
      description: 宗教局特派员，博士学历，理性冷静，身穿黑色羽绒服，戴眼镜
      image_prompt: Chinese man in his 30s, wearing glasses and a thick black down jacket, serious expression, intellectual look, standing in winter street
      image_url: https://i.muistory.com/images/zhumadian-exorcist/1768835523203-liu_quan_portrait.webp
    wang_lifa:
      name: 王利发
      description: 三自爱国会驻马店主教，身材魁梧，穿着皮夹克，满口河南土话，看起来像包工头
      image_prompt: Middle-aged Chinese man, burly build, wearing a worn leather jacket, rough appearance like a construction foreman, shouting
      image_url: https://i.muistory.com/images/zhumadian-exorcist/1768835523907-wang_lifa_portrait.webp
    liu_shufen:
      name: 刘淑芬
      description: 被附身的农村妇女，穿着花棉袄，神情诡异
      image_prompt: Rural Chinese woman, wearing traditional floral pattern cotton jacket, messy hair, possessed expression, eerie smile
      image_url: https://i.muistory.com/images/zhumadian-exorcist/1768835524759-liu_shufen_portrait.webp
    alchemist:
      name: 周炼金
      description: 邪教炼金术士，穿着白大褂，眼神狂热，手里拿着发光的烧瓶
      image_prompt: Crazy scientist, wearing dirty lab coat, holding glowing green potion, creepy smile, chemical factory background
      image_url: https://i.muistory.com/images/zhumadian-exorcist/1768835525410-alchemist_portrait.webp
    foreman:
      name: 赵工头
      description: 方舟工地工头，身材极其强壮，手持大锤，满身泥土和肌肉
      image_prompt: Giant muscular man, dirty construction clothes, holding a massive sledgehammer, angry expression, muddy background
      image_url: https://i.muistory.com/images/zhumadian-exorcist/1768835526048-foreman_portrait.webp
    banker:
      name: 钱行长
      description: 繁荣基金负责人，穿着昂贵的西装，戴着金丝眼镜，眼神阴鸷
      image_prompt: Middle-aged Chinese businessman, expensive suit, holding a cigar, sitting in a luxurious office, cold calculator eyes
      image_url: https://i.muistory.com/images/zhumadian-exorcist/1768835527251-banker_portrait.webp
    mammon:
      name: 女基督（玛门）
      description: 邪教首领，外表是慈祥的中年妇女，但身后有巨大的金色阴影（玛门真身），充满了贪婪和威压
      image_prompt: A middle-aged Chinese woman sitting on a golden throne, behind her is a giant shadowy demon figure with golden horns and coins falling, surreal and terrifying
      image_url: https://i.muistory.com/images/zhumadian-exorcist/1768835527831-mammon_portrait.webp
---

# start

```yaml
image:
  prompt: Night time, Zhumadian long distance bus station, winter, foggy street, street food stalls with steam rising, people walking in heavy clothes
  characters:
    - liu_quan
  url: https://i.muistory.com/images/zhumadian-exorcist/1768835528676-scene_start.webp
audio:
  type: background_music
  prompt: City noise, cold wind, distant traffic, melancholic noir jazz
```

刘全在驻马店长途汽车站下车的时候，已经是晚上8点多了，冬天的驻马店天黑得很早，路边小店的窗户发出朦胧的光，胡辣汤摊子上冒出的热气让街道蒙在雾气中，面无表情的乘客们从他身边走过，在人流和车流中走出客运站停车场的大门。

刘全从车下面的行李舱内拿出他的包，包很瘪，里面只有几件换洗衣服，大概三四天的量。不过他本来也只打算在这儿呆几天。

* [四处张望] -> meet_wang

---

# meet_wang

```yaml
image:
  prompt: A dark parking lot, Wang Lifa waving from the shadows, a black Chery car nearby
  characters:
    - liu_quan
    - wang_lifa
  url: https://i.muistory.com/images/zhumadian-exorcist/1768835529314-scene_meet_wang.webp
```

"刘先生是吧，这边。"远处的黑影里有个人在向他打招呼，模模糊糊看不真切。说话的人挥着手往这边来，紧走了几步接过了他手里的包，"北京的刘先生吧，我是王利发，刚才看着你了，没敢叫，等人都走了，我觉得肯定是你。怎么样？一路挺辛苦？"

"不累，挺好的，王主教您好。"刘全忙着想拿过王利发手里的包，两个人在车门边撕扯了一阵，"我是刘全，您叫我小刘就行。李牧师介绍过来找您，您看……"他在上衣兜里摸索着，掏出介绍信，"这是协会开的介绍信。"

王利发没有接介绍信，咧开嘴乐了，"李弟兄来过电话，这玩意还有啥可冒充的。你就带这点东西？路上累不累？"

"就这些东西，"刘全又把介绍信摸摸索索放回兜里，天冷，把信塞回羽绒服内兜里挺费劲，他决定不和王利发争谁拿提包，这个老主教的手劲大得出奇，刚才撕扯了一阵，现在他胳臂有些疼。"路上挺顺，现在客车也挺舒服的，不累。"

"现在客车还行。不像我刚来那会儿，200公里走他妈6个小时。"王利发还是呵呵乐着，"不累咱就先吃个饭，我先带你吃个饭，然后呢，正好我今天得去一家，你要是不累呢就一起，要是累呢就先回酒店休息，酒店给你安排了，教会的合同酒店，环境过得去，也不贵，一晚上140块钱，我跟他们说好了。"

* [先吃饭再说] -> car_ride (set: empathy = empathy + 5)
* [今晚就有驱魔？] -> ask_exorcism (set: rationality = rationality + 5)

---

# ask_exorcism

```yaml
image:
  prompt: Liu Quan looking curious, Wang Lifa walking towards the car
  characters:
    - liu_quan
    - wang_lifa
  url: https://i.muistory.com/images/zhumadian-exorcist/1768835529949-scene_ask_exorcism.webp
```

刘全想起李牧师的话，憋了半天，终于忍不住开口："王主教，今天晚上就有驱魔吗？"

"那可说不准，这事儿谁说得准啊。"王利发随口应和。

* [上车] -> car_ride

---

# car_ride

```yaml
image:
  prompt: Inside a car at night, driving on a dark country road, Wang Lifa driving, Liu Quan in passenger seat
  characters:
    - liu_quan
    - wang_lifa
  url: https://i.muistory.com/images/zhumadian-exorcist/1768835530774-scene_car_ride.webp
```

王利发在前头走，刘全在后面跟着，两个人走到一辆黑色奇瑞车旁，王利发从兜里掏出钥匙按了一下，把包扔进后备箱，又把车门打开。"咱们先吃个饭，啊，也没啥好吃的。"

这时候王利发的手机忽然响起来，王利发往旁边走了两步，开始接电话，两三句之后就开始比比画画起来。王利发的声音不小，刘全能听到个大概。

"绑起来没有？先绑起来。"

"我这儿接人呢，人刚到……那我看看过去。"

王利发把电话放进兜里，走回来，跟刘全说，"上车吧，上午说封门村有个娘们，好像有点啥问题，忽然犯病了，你要是不饿，咱们就先去一趟？"

* [那咱过去] -> village_drive

---

# village_drive

```yaml
image:
  prompt: Night driving on dark country road, headlights cutting through darkness, no streetlights
  characters:
    - liu_quan
    - wang_lifa
  url: https://i.muistory.com/images/zhumadian-exorcist/1768835531407-scene_village_drive.webp
```

奇瑞车不太新，看起来有点儿年头，门窗似乎关不太严实，总往里漏风，刘全坐在副驾驶上，看着皱着眉头开车的王利发，王利发和他想象中的主教不太一样，或者说太不一样了。王利发看起来更像是个包工头或者哪个建材商店的老板。

汽车在国道上沉默地奔驰着，刘全坐在副驾驶上，有一搭没一搭地和王利发聊着天，公路上没灯，汽车的灯光也不太亮，走在国道的人影和骑自行车的人影从黑暗中出现，然后又被奇瑞车甩到身后，消失在黑暗里。

刘全几次想开口问问，但是看到王利发的侧影，总是把话咽下去，他不说话，王利发也不说话，两个人就这样沉默着。奇瑞在国道上走了一会儿，在一个路口拐出来，然后又开了十几分钟，刘全看到前面有一小片灯光。

"到封门村了。"王利发好像是在自言自语，然后把车停在一户人家门口。

"小刘你先等一下，我去问问那家在哪儿。"

* [在车里等着] -> wait_in_car

---

# wait_in_car

```yaml
image:
  prompt: View from inside car, Wang Lifa knocking on a door, villager briefly appearing then slamming door shut
  characters:
    - liu_quan
    - wang_lifa
  url: https://i.muistory.com/images/zhumadian-exorcist/1768835532333-scene_wait_in_car.webp
```

王利发下了车，走到房门口，开始敲门，刘全在车里看着屋子里出来个人，和王利发谈了几句话，屋里的人胡乱指了一下，很激烈地就把门给关上了。

"操，这事儿都传开了。"王利发回到车里，松开手刹往前开。

"啥事儿传开了？"

"有个女子，之前都挺好，说最近这一星期开始不对劲，咱们在村子里的姐妹偷偷把信儿传出来，我知道信儿就过来看看，这边村子里到处是她妈邪教，去年还出过更邪乎的事儿。"

"政府也不管管？"

"她妈就是管不过来！"王利发猛转着方向盘，"这边邪教底子厚，一直就没断过根，去年咱们教会的李兄弟，被人绑了关在屋里，不给吃不给喝，就逼着他信邪教，都不给睡觉。李兄弟都准备殉教了，最后还是那家老太太看着不像话，偷偷报了信，要么又得出大事儿——到了，就这儿。"

* [下车] -> village_entrance

---

# village_entrance

```yaml
image:
  prompt: Village entrance at night, old lady emerging from lit doorway, snow on ground, warm light spilling out
  characters:
    - liu_quan
    - wang_lifa
  url: https://i.muistory.com/images/zhumadian-exorcist/1768835533830-scene_village_entrance.webp
```

王利发把车停到路边，先让刘全下车，然后熄火停车。刘全看着院子里屋子的门打开了，一个老太太掀起门里帘子迎出来，屋里的灯光打在雪地上，给人感觉还挺温暖。

"赵婶子是吧？"王利发迎上去，"俺们是三自爱国教会的，听说你这边有点情况。"

迎出来的老太太不太会说话，手在衣服上搓着，挺紧张，磕磕巴巴想要握手，又不知道怎么伸手，最后还是王利发主动伸出手搀着她往屋里走，刘全赶紧跟着。

* [跟着进屋] -> arrive_village

---

# arrive_village

```yaml
image:
  prompt: Dark cramped village house interior, soot-stained walls, cluttered room, a large pot simmering in corner
  characters:
    - liu_quan
    - wang_lifa
  url: https://i.muistory.com/images/zhumadian-exorcist/1768835534421-scene_arrive_village.webp
```

"这姑娘本来挺好，可信了个啥之后就变了，成天说什么女基督女基督，这基督咋就是个女的了？我也弄不清楚……"老太太絮叨着把他们让到屋里，屋里很黑，空间逼仄，墙上满是烟熏火燎后留下的痕迹，墙角的大锅里好像还炖着什么东西。

"信了个啥呀，老妈妈，那可不敢说是正信，那女基督是骗人的！是个邪教！"王主教似乎很熟悉那个什么女基督的底子，"国家就要打击他们哩。"

"本来打算让她明年去外头打工的……"老太太没听王利发说什么，带着他们小心地跨过脚下的杂物，"可现在还打啥工呢？成天说2012就要到了，末日就要来了，闹腾个不停。这不让邻居给绑起来了，要不绑起来，后脚就要跑出去卖屋！"

* [进里屋] -> enter_room

---

# enter_room

```yaml
image:
  prompt: A woman tied to a chair in a dark room, head bowed, hair covering face, very still and quiet
  characters:
    - liu_quan
    - wang_lifa
    - liu_shufen
  url: https://i.muistory.com/images/zhumadian-exorcist/1768835534973-scene_enter_room.webp
```

老太太推开门，这是个很普通的农民的屋子，有炕，有窗户，靠墙有张桌子。墙皮斑驳。在屋子正中，一个女人被绑在一把椅子上，她低着头，散落的发丝完全把脸挡住，刘全看不清她的长相，但她很安静，非常安静。

"一犯病就折腾喽，造孽呀……"

刘全站在门口，王利发倒是没犹豫，直接走进去，找了个桌子，把人造革包里的东西一件一件拿出来，矿泉水瓶装的圣水，一些纸，几根蜡烛、一圈彩灯和一个单喇叭录音机。

"得先弄好东西，万一有邪灵就不好办了。"他嘀咕着，一边在屋子里寻找着插头。

"刘全，来帮找一下插头。"

* [找插头] -> setup_ritual

---

# setup_ritual

```yaml
image:
  prompt: Wang Lifa setting up disco lights and a tape recorder, room lit up like a disco, sacred items on table
  characters:
    - liu_quan
    - wang_lifa
    - liu_shufen
  url: https://i.muistory.com/images/zhumadian-exorcist/1768835535753-scene_setup_ritual.webp
```

刘全迟疑了一下，也走进屋子里，靠墙的地上有个接线板，他拿起来，接线板上的灯是亮的，就是挺脏。他拍拍，递给王利发。

"这成。"主教把录音机和彩灯插在接线板上，屋子里立刻就变得好像一个迪厅。王利发又按下录音机的开关，录音机里传出了圣歌声。

"刘淑芬姐妹，主内平安，我叫王利发，是三自爱国会的主教，您家里人请我过来瞧瞧你。"

王利发在屋子里来回走，椅子上的女人垂着头，不做声。

"老太太说你晚上老做噩梦？有时候说胡话？是不？"

刘全很惊异于王利发对待刘淑芬的态度，主教既不严厉，也不软弱，好像拉家常一样。

"有时候……觉得有东西在俺的身上……"

刘淑芬回答。

* [观察仪式] -> exorcism_test

---

# exorcism_test

```yaml
image:
  prompt: Liu Quan sprinkling holy water on the possessed woman, steam rising from her skin
  characters:
    - liu_quan
    - liu_shufen
  url: https://i.muistory.com/images/zhumadian-exorcist/1768835536425-scene_exorcism_test.webp
```

刘全拿起矿泉水瓶装的圣水，试探性地洒了一点在女人身上。
滋滋——！
像水滴进油锅，女人身上冒起白烟，她猛地抬起头，露出一双没有眼白的眼睛，死死盯着刘全。

“你是谁……你身上没有光的味道……”女人的声音尖锐刺耳，像是金属摩擦。

刘全吓得手一抖。
“别停！”王利发吼道，“念咒！用拉丁文！”

* [念诵驱魔经文] -> exorcism_chant

---

# exorcism_chant

“Exorcizamus te, omnis immundus spiritus...” 刘全结结巴巴地念着。
随着经文念出，屋子里的气温骤降。那些贴在墙上的“求财符”开始自燃。

“你看，它们怕这个。”王利发指点道，“继续，声音再大点，要有气势！用恁的意志力压倒它！”

女人开始剧烈挣扎，椅子咯吱作响。
“我有钱！我有的是钱！你们这些穷鬼！滚开！”她开始吐出绿色的胆汁。

* [躲避胆汁] -> dodge_bile (set: rationality = rationality - 5)
* [继续念咒] -> persist_chant (set: faith = faith + 5)

---

# dodge_bile

```yaml
image:
  prompt: Liu Quan dodging backward in fear, the possessed woman lunging forward, rope breaking
  characters:
    - liu_quan
    - wang_lifa
    - liu_shufen
  url: https://i.muistory.com/images/zhumadian-exorcist/1768835537006-scene_dodge_bile.webp
audio:
  type: sfx
  prompt: Glass shattering, screaming
```

刘全下意识地往后一缩。经文断了。

屋子里的灯泡突然炸裂。黑暗中，那女人好像挣脱了绳子！

"别怂！"王利发一脚踹在椅子腿上，把刚要站起来的女人踹回原位，"它在吓唬恁！继续念！"

* [继续念] -> exorcism_climax

---

# persist_chant

```yaml
image:
  prompt: Liu Quan chanting with determination, golden light around him, bile on his jacket
  characters:
    - liu_quan
    - wang_lifa
  url: https://i.muistory.com/images/zhumadian-exorcist/1768835537622-scene_persist_chant.webp
```

刘全也是拼了，任由胆汁溅在羽绒服上，声音反而提高了一个八度。

"...in nomine Jesu Christi...!"

一道金光隐约在他身上闪现。王利发惊讶地挑了挑眉："嚯，这小子还真有点灵性。"

* [继续] -> exorcism_climax

---

# exorcism_climax

```yaml
image:
  prompt: The possessed woman screaming, eyes rolled back, black smoke, Wang Lifa holding a crucifix and squirting holy water
  characters:
    - liu_quan
    - wang_lifa
    - liu_shufen
  url: https://i.muistory.com/images/zhumadian-exorcist/1768835538231-scene_exorcism_climax.webp
audio:
  type: sfx
  prompt: Screaming, splashing water, chanting
```

刘全看着刘淑芬，这个被绑在椅子上的女人，现在她正低着头，嘴里喃喃自语着什么，她的肩膀在颤抖着，好像在笑，又像是在哭。刘全正看着出神，椅子上的女人忽然抬起头来，刘全看到她的眼睛里已经只剩白眼仁，她嘴里嘟嘟囔囔，脸上浮现出诡异的笑容，嘴角流出白沫。

"俺要随着女基督，女基督必赐福于俺……"她低声呢喃着，花布褂子下的身体剧烈地抖动起来。"女基督在考验俺了，看，天使在云彩上吹喇叭呢……"

她的……头，刘全看到她的头扭转了180度，现在她的脸部完全转到背后，后墙上有面镜子，刘全在镜子里看到她咧嘴笑了起来。

"咦……俺就要肉身成道哩，等俺上了天国，就降雷劈你个龟孙！"

这已经不是刘淑芬的声音了，这声音里满怀嘲笑意味，是魔鬼之声。刘全看到她的口中冒出黄色的烟雾，屋子里弥漫着硫磺的味道，她的头在脖子上旋转……刘全感到头晕目眩，耳边回响着魔鬼放肆的笑声，他看到防盗门打开又合上，彩灯疯狂闪烁，蜡烛的火苗剧烈摇动，看上去马上就要熄灭。他昏昏沉沉，觉得就要堕入深渊。

就在此时，王主教的声音仿佛在很遥远的地方响起，模模糊糊，逐渐清晰起来。

* [屏住呼吸] -> force_name

---

# force_name

```yaml
image:
  prompt: Wang Lifa sweating profusely, pressing crucifix against the possessed woman's forehead, intense struggle
  characters:
    - wang_lifa
    - liu_shufen
  url: https://i.muistory.com/images/zhumadian-exorcist/1768835539097-scene_force_name.webp
```

"一切宗教机关在我国需接受党的领导，一切宗教信仰自由！邪灵！滚出去！滚出去！不得在非宗教场合传教！不得在非宗教场合传教！不得向非信众传教！一切宗教信仰自由！邪灵！滚出去！滚出去！公民有信教的自由！也有不信教的自由！有信这个教的自由！也有信那个教的自由！邪灵！离开！离开！离开！"

刘全费力地睁开眼睛，看到王主教手持银色的十字架，右手高举农夫山泉的矿泉水瓶，矿泉水瓶盖正中被钻了一个孔，圣水就从孔里射到刘淑芬的脸上。主教的脸上满是汗水，身体也摇摇欲坠，但他仍然努力把十字架逼近刘淑芬的眼前，口中不断念诵。

"你以为就这绳子能把俺绑住喽？"刘淑芬，或者是邪魔，她的身体好像蛇一样在绳索下扭动，仿佛下一秒就要挣脱绳索。

王主教用十字架逼近她的脸，他的汗珠大滴大滴落到地上："闭嘴！闭嘴！！你这丑陋的东西！你这来自地狱深处的魔鬼！说出你的名字！以国家宗教办之名，我——命令你说出名字！"

"凡人无法伤害我！你这龟孙！"魔鬼大声叫喊，但她总是被圣水噎住，"滚恁娘个蛋儿，收割的时候到啦！女基督……大红龙……肉身……"

"闭嘴！闭嘴！闭嘴！你这邪灵！你冒用宗教旗号！神化首要份子！宣传迷信邪说！非法聚敛财物！快从这婶子身上滚开！我命令你！我以宗教办之名命令你！我以三自教会之名命令你！说出你的名字来！！说出你的名字！！！"

主教把十字架拍上刘淑芬的额头，刘淑芬狂乱地张口大叫，用尽全身力气想要挣脱绳索，但主教牢牢地用十字架按住她的头。

"啊\~娘勒个腿，恁这晕孙！！！把这东西拿开！"

* [名字！] -> wang_defends

---

# wang_defends

```yaml
image:
  prompt: Wang Lifa glowing with holy light, blocking the black smoke with his body
  characters:
    - wang_lifa
  url: https://i.muistory.com/images/zhumadian-exorcist/1768835539947-scene_wang_defends.webp
```

轰的一声！
圣水炸裂，黑雾发出一声不甘的嘶吼，消散在空气中。
王利发后退几步，靠在墙上大口喘气，脸色有点发白。

“乖乖……这玩意儿劲真大。”他抹了一把汗，“要是搁几年前，我非得被它冲个跟头不可。”

刘淑芬软绵绵地倒在椅子上，呼吸平稳了。

* [结束了？] -> exorcism_end

---

# exorcism_end

```yaml
image:
  prompt: Morning light shining into the messy room, old lady crying with relief, Liu Quan still stunned
  characters:
    - liu_quan
    - wang_lifa
  url: https://i.muistory.com/images/zhumadian-exorcist/1768835540569-scene_exorcism_end2.webp
```

"那咋办哩。"老太太急得好像马上就要哭出来。"俺就这么一个闺女……"

"老太太，你闺女现在呀，是被脏东西附上了，她是信了邪教，被魔鬼找上了。"王利发主教正在把彩灯往包里收，"我们回去就跟领导说，看看这么个问题怎么解决。"

刘全盯着刘淑芬，他到现在还不能相信，在河南的一个农村，一个穿着花棉袄的妇女被恶魔附体。他在北京上了四年大学，又考上研究生，直到博士，从来没有人对他说过被附体这件事可能是真的。

天亮了。老太太塞给王利发一篮子鸡蛋，还要给红包，被王利发一把推开了。

"别整这些。以后让闺女少信那些偏方，老老实实过日子比啥都强。有啥事，给我打电话。"

* [回到车上] -> act2_intro

---

# act2_intro

```yaml
image:
  prompt: Wang Lifa driving, smoking, handing a worn notebook to Liu Quan
  characters:
    - wang_lifa
    - liu_quan
  url: https://i.muistory.com/images/zhumadian-exorcist/1768835541204-scene_exorcism_end.webp
```

回到车上，刘全的心情久久不能平静，他问王利发：“驱魔结束了？”

"完个屁。"王利发点了根烟，眼睛盯着前方的公路，"这才是个小喽啰。这'女基督'的手伸得太长了。"

他从副驾驶的杂物箱里翻出一本皱皱巴巴的笔记本，扔到刘全腿上。

"这书恁先拿着。这是我这些年记的东西，没事多看看，长点心眼。"

刘全翻开笔记本，里面密密麻麻记着各种符号、名字、地点。有些地方还画着奇怪的图案，像是法阵，又像是什么地图。

"根据之前的线索，这帮人有三个大窝点：开封有个'圣水厂'，南阳有个'方舟工地'，郑州还有个'繁荣基金'。"王利发用下巴点了点笔记本，"都在里面记着呢。"

"咱们……一个个端？"

"不然呢？"王利发冷笑一声，"等着政府来管？等到猴年马月。咱们先去开封，听说那边的水能'治百病'，我倒要看看是个啥成分。"

* [坐车去开封] -> kaifeng_start (set: has_black_book = true)
* [坐火车去开封] -> interlude_kaifeng (set: has_black_book = true)

---

# kaifeng_start

```yaml
image:
  prompt: Kaifeng city street, daytime, ancient city walls in background, Wang Lifa and Liu Quan walking together
  characters:
    - liu_quan
    - wang_lifa
  url: https://i.muistory.com/images/zhumadian-exorcist/1768835541818-scene_kaifeng_start.webp
```

开封。古城。

王利发把车停在一个菜市场边上，带着刘全下了车。大街小巷都在谈论一种"活水"。

"先别急着去工厂，"王利发压低声音，"咱们先去看看他们的销售点。"

销售点设在一个临时搭的棚子里，排着长队。招牌上写着："女基督赐福，信者得活水，病痛全消除"。队伍里有老人、有病人、有衣衫褴褛的农民，一个个眼神狂热。

"一瓶200。"收钱的中年妇女面无表情地重复着。

刘全掏钱买了一瓶。王利发在旁边装作看热闹。

等离开人群，刘全把瓶子凑到鼻子底下闻了闻，脸色变了。

"这水里有沉淀物，闻起来还有股……杏仁味？"

"行啊秀才，"王利发眼睛一亮，"鼻子挺灵。杏仁味，那是氰化物的味道。这帮孙子，真他妈敢下手。"

"他们……在毒害信徒？"

"不是毒害，是掺了点东西让人上瘾。喝了这水，人就离不开他们了。走，直接去他们老巢。"

* [直接寻找工厂] -> find_factory
* [先询问路人打听情况] -> ask_locals

---

# kaifeng_end

```yaml
image:
  prompt: Ruins of the factory lab, Wang Lifa lying on the ground badly injured, police arriving
  characters:
    - liu_quan
    - wang_lifa
  url: https://i.muistory.com/images/zhumadian-exorcist/1768835542475-scene_kaifeng_end.webp
```

巨大的爆炸掀翻了屋顶。
烟尘散去，周连金已经化为了一滩黑水。
而王利发倒在血泊中，但他还活着。他的胸口有一个黑色的手印，那是玛门的最后诅咒。

“老……老王……”刘全跪在他身边，手足无措。

王利发艰难地睁开眼，嘴角却挂着笑：“哭个球……老子还没死呢……”
“这下……开封算是干净了……我不行了，得去修修零件……”
“剩下那两处……南阳……郑州……就看恁的了……”

他颤抖着从怀里掏出那把改装过的信号枪，塞到刘全手里。
"拿着……这玩意儿关键时刻能救命……"

救护车和警车的警笛声由远及近。
刘全握紧了拳头。那个曾经的书呆子，在这一刻死去了。
站起来的，是一个真正的驱魔人。

(任务完成：开封)

* [送老王去医院] -> hospital_hub (set: has_signal_gun = true)
* [前往南阳] -> interlude_nanyang (set: has_signal_gun = true)
* [前往郑州] -> interlude_zhengzhou (set: has_signal_gun = true)

---

# interlude_nanyang_start

```yaml
image:
  prompt: Crowded long-distance bus station in winter, peasants with heavy bags, steam from food stalls
  characters:
    - liu_quan
  url: https://i.muistory.com/images/zhumadian-exorcist/1768835543067-scene_nanyang_start.webp
```

南阳长途车站。

刘全从来没见过这么乱的地方。到处是扛着大包小包的农民工，地上坐满了等车的人，空气里弥漫着泡面、烟草和汗臭的味道。售票窗口前排着长队，有人推搡，有人骂街。

刘全挤在人群里，格格不入。他穿着羽绒服，背着双肩包，像个误入菜市场的城里人。

"去南阳！去方舟工地！还差一位！上车就走！"一个穿着皮夹克的售票员站在车门口大喊。

* [买票上车] -> nanyang_bus_ride
* [找黄牛买票] -> nanyang_scalper

---

# nanyang_scalper

“兄弟，去方舟发财啊？”一个猥琐的黄牛凑过来，“正规票早就没了。我这也是内部票，两百一张。”
明摆着是宰客，但为了赶时间……

* [给钱] -> nanyang_bus_ride (set: money = money - 200)
* [拒绝，去排队] -> nanyang_bus_wait

---

# nanyang_bus_wait

```yaml
image:
  prompt: Liu Quan waiting in a long queue at a crowded bus station
  characters:
    - liu_quan
  url: https://i.muistory.com/images/zhumadian-exorcist/1768835543700-scene_nanyang_bus_wait.webp
```

排了两个小时队，终于买到了票。
但这浪费了宝贵的时间。

* [上车] -> nanyang_bus_ride (set: sanity = sanity - 5)

---

# nanyang_bus_ride

```yaml
image:
  prompt: Inside a crowded, dirty bus, people smoking, chickens in cages
  characters:
    - liu_quan
  url: https://i.muistory.com/images/zhumadian-exorcist/1768835544318-scene_nanyang_bus_ride.webp
```

车厢里弥漫着烟味、脚臭味和鸡屎味。
刘全旁边坐着一个满脸沧桑的大叔，怀里紧紧抱着一个蛇皮袋。

大叔看刘全斯文，主动搭话：“大兄弟，恁也是去方舟的？”
“算是吧。大叔去做工？”
“做工？那是去享福嘞！”大叔眼里放光，“听说进了方舟，顿顿有肉吃，还没灾没病。”

刘全看着大叔干裂的手，心里很不是滋味。
这就是“女基督”的信徒基础——绝望。

* [听他讲故事] -> nanyang_passenger_story
* [闭目养神] -> nanyang_bus_event

---

# nanyang_passenger_story

```yaml
image:
  prompt: Old peasant on bus telling his story, holding a worn sack tightly, tears in his eyes
  characters:
    - liu_quan
  url: https://i.muistory.com/images/zhumadian-exorcist/1768835544912-scene_passenger_story.webp
```

"唉，俺家去年遭了难，庄稼让水给淹了，颗粒无收。老婆病了，去医院一查，癌。"大叔的声音低了下去，"欠了一屁股债。后来有人跟俺说，只要信了女基督，把剩下的房子卖了，钱捐给方舟，就能换一张'船票'。"

他拍了拍怀里的蛇皮袋，眼睛又亮了起来："等俺老婆上了方舟，啥病都能治好。这里面是俺全部的家当，三万八千块，一分不少。"

刘全看着大叔布满老茧的双手，心里堵得慌。这是一个被逼到绝境的人，被骗子抓住了最后一根救命稻草。

这就是诈骗。赤裸裸的诈骗。

(获得情报：方舟骗局)

* [继续] -> nanyang_bus_event

---

# nanyang_bus_event

```yaml
image:
  prompt: A long distance bus driving through heavy rain on a mountain road
  characters:
    - liu_quan
  url: https://i.muistory.com/images/zhumadian-exorcist/1768835545507-scene_nanyang_bus_event.webp
```

外面下起了暴雨。山路泥泞不堪。
突然，前方出现了塌方，几块巨石挡在路中间。
司机一脚急刹车。

“坏了，遇上截道的了？”

* [下车查看] -> bus_event
* [警惕四周] -> bus_ambush

---

# bus_event

一群穿着教会服装的人拦在路中间。
“前方道路施工，只许信徒通过！”

* [强行闯关] -> bus_ambush

---

# bus_ambush

几个手里拿着铁棍的壮汉围了上来。
“把值钱的东西都交出来奉献给女基督！”

刘全冷笑一声，正好拿你们练练手。

* [制服歹徒后直接去工地] -> nanyang_boss_encounter
* [先找地方休整] -> interlude_nanyang_start

---

# interlude_zhengzhou_start

```yaml
image:
  prompt: High speed train station, clean and futuristic compared to the bus station
  characters:
    - liu_quan
  url: https://i.muistory.com/images/zhumadian-exorcist/1768835546169-scene_zhengzhou_start.webp
```

郑州东站。
这里和之前的长途站简直是两个世界。
宽敞明亮的大厅，行色匆匆的商务人士。

刘全买了张商务座。他需要接近那些“高端人士”。

* [进入VIP候车室] -> zhengzhou_lounge
* [直接上车] -> zhengzhou_train

---

# zhengzhou_lounge

```yaml
image:
  prompt: Upscale VIP lounge, businessmen in suits bragging, expensive watches
  characters:
    - liu_quan
  url: https://i.muistory.com/images/zhumadian-exorcist/1768835546800-scene_zhengzhou_lounge.webp
```

郑州东站。高铁候车室。

和南阳完全是两个世界。这里有皮沙发，有免费咖啡，有穿着精致的商务人士。

刘全坐在角落里，听到旁边几个西装革履的人在高谈阔论。

"那个繁荣基金真是神了，年化收益率300%！"一个大肚子的中年人压低声音说，"我上个月投了五十万，这个月就回了十五万。"

"我把房子都抵押了投进去，"另一个秃顶的男人兴奋地说，"下个月就能换别墅。"

刘全听着这些对话，心里冷笑。邪教的触手已经从农村伸到了城市，从穷人的最后一分钱摸到了中产的房产。

疯了。都疯了。

* [上车] -> zhengzhou_train

---

# zhengzhou_train

```yaml
image:
  prompt: High speed train business class, young trader with laptop, graphics showing stock curves
  characters:
    - liu_quan
  url: https://i.muistory.com/images/zhumadian-exorcist/1768835547408-scene_zhengzhou_train.webp
```

商务座。窗外的景色飞速后退，车厢里安静得只有键盘敲击声。

刘全旁边坐着一个年轻人，西装笔挺，戴着金边眼镜，正盯着电脑屏幕上疯涨的红色曲线傻笑。

"兄弟，看你也是搞金融的？"年轻人主动递过来一张名片，上面印着金色的金字塔图案，"繁荣资本，王经理。有空去我们公司看看，那是风口，年化300%不是梦。"

刘全接过名片，翻来覆去地看。

"这种庞氏骗局，你也信？"他故意试探道。

年轻人脸色一变，收起笑容："你懂什么！这是共享经济！是新时代的金融创新！懂不懂什么叫区块链？什么叫去中心化？"

他顿了顿，又压低声音："告诉你，我们背后有人。大人物。你要是聪明，就把钱投进来，等着数钱。"

* [趁他不注意，看看他的电脑] -> hack_train (if: rationality >= 60)
* [不再理会这个韭菜] -> zhengzhou_start

---

# hack_train

```yaml
image:
  prompt: Liu Quan glancing at a laptop screen showing financial data
  characters:
    - liu_quan
  url: https://i.muistory.com/images/zhumadian-exorcist/1768835548037-scene_hack_train.webp
```

趁着年轻人去厕所的功夫，刘全快速扫视了他的电脑。
数据造假。所谓的收益全是后入场的人的本金。
而且，资金流向只有一个地方——新耶路撒冷。
(获得情报：资金流向)

* [继续] -> zhengzhou_start

---

# find_factory

```yaml
image:
  prompt: A dilapidated industrial park heavily guarded, barbed wire fences, a sign saying 'Living Water Biotechnology'
  characters:
    - liu_quan
  url: https://i.muistory.com/images/zhumadian-exorcist/1768835548686-scene_find_factory.webp
```

根据王利发笔记上的线索，刘全在城郊找到了这家“活水生物科技公司”。

工厂戒备森严，门口有两个穿着黑保安服的壮汉把守，腰间鼓鼓囊囊的，看着不像好人。

围墙很高，上面拉着电网。

* [贿赂保安] -> bribe_guard (if: money >= 500)
* [绕到后墙] -> check_perimeter
* [使用“黑皮书”关系] -> use_black_book (if: has_black_book)

---

# ask_locals

```yaml
image:
  prompt: Liu Quan talking to an old lady in the queue, she looks excited and fanatical
  characters:
    - liu_quan
  url: https://i.muistory.com/images/zhumadian-exorcist/1768835549291-scene_ask_locals.webp
```

“大妈，这水真那么神？”

大妈瞪了他一眼：“咋不神？俺喝了半个月，腰也不酸了，腿也不疼了，连高血压都好了！这是神迹！”

周围的人也附和着，眼神狂热。刘全意识到，理性的劝说在这里毫无用处。

* [寻找工厂] -> find_factory
* [买一瓶水化验] -> investigate_water

---

# investigate_water

```yaml
image:
  prompt: Liu Quan checking a water bottle in a hotel room, using a portable testing kit
  characters:
    - liu_quan
  url: https://i.muistory.com/images/zhumadian-exorcist/1768835550171-scene_investigate_water.webp
```

刘全忍痛花了200块买了一瓶水。回到临时住处，他打开随身携带的简易试纸。

水的PH值异常，而且有一股被香料掩盖的淡淡硫磺味。更重要的是，里面似乎含有某种兴奋剂成分。

“这是毒药。”刘全咬牙切齿，“他们在给信徒下毒，制造依赖。”

必须找到源头。

* [寻找工厂] -> find_factory

---

# hospital_visit

```yaml
image:
  prompt: Wang Lifa lying in a hospital bed, tubes attached, looking pale, Liu Quan standing by the bed
  characters:
    - wang_lifa
    - liu_quan
  url: https://i.muistory.com/images/zhumadian-exorcist/1768835551078-scene_hospital_visit.webp
```

驻马店市第一人民医院。重症监护室。

走廊里消毒水的味道刺鼻，白炽灯惨白惨白的。王利发躺在病床上，身上插满了管子，心电监护仪发出规律的滴滴声。

医生说他各项指标都很奇怪，像是某种……衰竭。不是任何已知的疾病，更像是被什么东西抽空了生命力。

刘全握着这位前辈粗糙的手，上面布满了老茧和疤痕，那是多年驱魔留下的痕迹。

"放心吧，老王。"他低声说，"你教我的，我都记着。开封干净了，剩下的两个，我也会搞定。"

病床上的人没有反应，只有心电图在稳定地跳动。

* [离开医院] -> act1_end (set: sanity = sanity + 5)

---

# act1_end

```yaml
image:
  prompt: Liu Quan standing at the train station, looking at the departure board, determined expression
  characters:
    - liu_quan
  url: https://i.muistory.com/images/zhumadian-exorcist/1768835551893-scene_act1_end.webp
```

刘全回到火车站，看着出发的列车时刻表。

开封的炼金术士已经被收拾了，但玛门的势力远比他想象的庞大。
南阳的"诺亚方舟"，郑州的"繁荣基金"……

这才刚刚开始。

"老王，你等着。我会把这一切都查清楚的。"

* [前往南阳] -> interlude_nanyang_start
* [前往郑州] -> zhengzhou_start (if: nanyang_evidence >= 2)

---

# safehouse_rest

```yaml
image:
  prompt: A messy apartment room, maps on wall, black notebook on table, instant noodles
  characters:
    - liu_quan
  url: https://i.muistory.com/images/zhumadian-exorcist/1768835552540-scene_safehouse_rest.webp
```

这是王利发的“安全屋”，其实就是个老旧的单身公寓。
满墙的剪报、地图，地上堆满了泡面盒子。

在这里，刘全可以整理思绪，准备下一步的行动。

* [研读黑皮书] -> research_book
* [整理装备/补给] -> resupply
* [联系北京总部] -> call_hq
* [出发前往南阳] -> interlude_nanyang_start (if: has_ark_ticket == false)
* [出发前往郑州] -> interlude_zhengzhou_start (if: has_vip_card == false)

---

# read_black_book

```yaml
image:
  prompt: An old worn notebook with handwritten notes, diagrams, and bloodstains
  characters:
    - liu_quan
  url: https://i.muistory.com/images/zhumadian-exorcist/1768835553149-scene_read_black_book.webp
```

黑皮书。

这本皱皱巴巴的笔记本，记载了王利发多年的调查心得。每一页都浸透着汗水，有些地方还沾着暗红色的……血迹。

字迹潦草，但条理清晰。刘全越看越心惊——这个邪教的规模，远超他的想象。

* [阅读第一章：初现] -> flashback_prologue
* [阅读第二章：迷惘] -> flashback_mid (if: kaifeng_evidence >= 1)
* [阅读第二章：迷惘] -> flashback_mid (if: nanyang_evidence >= 1, kaifeng_evidence < 1)
* [阅读第三章：代价] -> flashback_end (if: kaifeng_evidence >= 1, nanyang_evidence >= 1)
* [合上书] -> safehouse_rest

---

# flashback_prologue

```yaml
image:
  prompt: Sepia tone, Wang Lifa younger in a village, watching a crowd of peasants worshipping a golden statue in rain
  characters:
    - wang_lifa
  url: https://i.muistory.com/images/zhumadian-exorcist/1768835553837-scene_flashback_prologue.webp
```

雨。滂沱大雨。

王利发站在一棵老槐树下，看着不远处的人群。那是一个临时搭起的棚子，里面站着一个穿白裙子的中年妇女，正在给跪着的信徒"祝福"。

"只要信了女基督，病会好，债会还，2012的大洪水来了也能上方舟！"

那些信徒虔诚地磕头，把兜里的钱一张张塞进功德箱。有老人，有孩子，有明显是从地里刚回来的农民。

"主教，我们不去管管吗？"身旁的小神父问。

王利发吐了口唾沫，转身走进雨里："管不了。穷怕了，就容易信鬼。再说，人家有关系。但我总觉得，这后面有个大家伙。大家伙。"

* [返回现实] -> read_black_book

---

# flashback_mid

```yaml
image:
  prompt: Sepia tone, Wang Lifa standing in front of a government desk, official drinking tea dismissively
  characters:
    - wang_lifa
  url: https://i.muistory.com/images/zhumadian-exorcist/1768835554436-scene_flashback_mid.webp
```

市宗教局。一间灰扑扑的办公室。

王利发站在办公桌前，把一沓材料拍在桌上。对面坐着一个大腹便便的官员，正悠闲地泡着龙井。

"这是邪教！是诈骗！他们在毒害群众！"王利发怒道。

官员连眼皮都没抬："老王啊，你说的这个'东方闪电'，人家可是纳税大户。那个'活水'厂，解决了多少就业？那个'繁荣基金'，给市里捐了多少钱？扶贫项目都是人家赞助的。"

"那是骗来的钱！"

官员终于抬起头，脸上堆着皮笑肉不笑的表情："老王，要讲证据。现在是法治社会，不能搞有罪推定。你要是有证据，公安局欢迎你。没有的话，就别给我们添麻烦了。"

王利发一言不发，拿起材料转身就走。

"证据？我会找到的！"

* [返回现实] -> read_black_book

---

# flashback_end

```yaml
image:
  prompt: Sepia tone, Wang Lifa in a dark alley confronting a shadowed figure, clutching his chest in pain
  characters:
    - wang_lifa
  url: https://i.muistory.com/images/zhumadian-exorcist/1768835555142-scene_flashback_end.webp
```

深夜。一条无名的小巷。

王利发终于摸到了核心。他跟踪了一个可疑的黑衣人，一路追到这里。巷子里没有路灯，只有远处街道的光芒勉强照进来。

"站住！"王利发手持十字架，挡在巷子尽头，"告诉你背后的玛门，他的日子到头了。"

黑衣人停下脚步，慢慢转过身来。那张脸没有任何表情，像是一个木偶。

"神父。"黑衣人的声音沙哑，像是从很远的地方传来，"你太弱了。"

王利发刚想念咒，胸口突然一阵剧痛。他低头一看，一团黑雾正从自己身体里穿过。

"你已经被标记了，神父。"黑衣人冷笑一声，化作一缕黑烟消散，"你的心脏，现在属于我。十天。你只有十天。"

王利发跪倒在地，剧痛钻心。但他死死护住了怀里的笔记本。

那是他多年调查的心血，不能丢。绝对不能丢。

* [返回现实] -> read_black_book

---

# call_hq

```yaml
image:
  prompt: Liu Quan on phone in dimly lit room
  characters:
    - liu_quan
  url: https://i.muistory.com/images/zhumadian-exorcist/1768835555787-scene_call_hq.webp
```

电话接通了。导师的声音传来。
“刘全？调研怎么样了？要不要我派人去接你？”

* [汇报工作（隐瞒实情）] -> report_fake
* [请求支援] -> report_truth
* [提交原料清单] -> report_evidence (if: has_chemical_list) (set: has_warrant = true)
* [提交受害者日记] -> report_evidence (if: has_victim_diary) (set: has_warrant = true)
* [提交工厂照片] -> report_evidence (if: has_factory_photos) (set: has_warrant = true)
* [提交销售账本] -> report_evidence (if: has_sales_ledger) (set: has_warrant = true)
* [提交录音证据] -> report_evidence (if: has_factory_recording) (set: has_warrant = true)
* [提交基金账本] -> report_evidence (if: has_fund_ledger) (set: has_warrant = true)

---

# interlude_kaifeng

```yaml
image:
  prompt: Inside a green train carriage, crowded with people, smelling of smoke and instant noodles
  characters:
    - liu_quan
  url: https://i.muistory.com/images/zhumadian-exorcist/1768835556421-scene_interlude_kaifeng.webp
```

去开封的绿皮火车上人挤人。
刘全对面坐着一个神神叨叨的大叔，怀里紧紧抱着几瓶水。

“小伙子，也是去求圣水的吧？”大叔神秘兮兮地凑过来，“听说那水能让人返老还童！”

* [套他的话] -> train_chat
* [闭目养神] -> kaifeng_start

---

# train_chat

“大叔，这水真有那么神？”
“那我还能骗你？隔壁村老李，喝了这水，瘫痪十年都站起来了！这可是女基督显灵！”
大叔说得唾沫横飞，周围又有几个人围过来听，眼神里充满了向往。

刘全叹了口气。愚昧是恶魔最好的土壤。

* [抵达开封] -> kaifeng_start

---

# interlude_nanyang

```yaml
image:
  prompt: A long distance bus driving through heavy rain on a mountain road
  characters:
    - liu_quan
  url: https://i.muistory.com/images/zhumadian-exorcist/1768835545507-scene_nanyang_bus_event.webp
```

去南阳的大巴车在盘山公路上颠簸。
外面下着暴雨。
突然，前面那是塌方吗？

司机一脚急刹车。

* [下车查看] -> bus_event
* [警惕四周] -> bus_ambush

---

# interlude_zhengzhou

```yaml
image:
  prompt: High speed train business class, quiet and modern
  characters:
    - liu_quan
  url: https://i.muistory.com/images/zhumadian-exorcist/1768835557057-scene_interlude_zhengzhou.webp
```

高铁商务座。
旁边坐着一个穿着考究的年轻人，正在用笔记本电脑看股市。
全是红色。

“繁荣基金……”他喃喃自语，“这回报率简直逆天了。”

刘全瞥了一眼屏幕，那是一条完美的上升曲线。完美得不真实。

“有时候，太好的事情往往是陷阱。”刘全提醒了一句。
年轻人不屑一顾：“你懂什么？这是新经济！”

* [抵达郑州] -> zhengzhou_start

---

# check_perimeter

```yaml
image:
  prompt: Dark alley behind the factory, high walls with barbed wire, a stray dog barking
  characters:
    - liu_quan
    - wang_lifa
  url: https://i.muistory.com/images/zhumadian-exorcist/1768835557841-scene_check_perimeter.webp
```

工厂后方是一片荒地。围墙很高，上面拉着电网，滋滋作响。
王利发看了一眼：“乖乖，这整得跟监狱似的。”

刘全沿着墙根走了一段，发现了一棵歪脖子树，又因发现了一个排水口。

* [爬树翻墙] -> climb_tree
* [钻排水口] -> sewer_entry

---

# climb_tree

```yaml
image:
  prompt: Liu Quan helping Wang Lifa climb a tree, Wang Lifa struggling
  characters:
    - liu_quan
    - wang_lifa
  url: https://i.muistory.com/images/zhumadian-exorcist/1768835558620-scene_climb_tree.webp
```

刘全先爬上去，伸手拉王利发。
“老叔，您这身子骨还行吗？”
“少废话！当年老子武装越野的时候，恁还在穿开裆裤呢！”王利发哼哧哼哧地爬了上来。

两人跳进了院墙。

* [进入花园] -> factory_garden (set: health = health - 5)

---

# sewer_entry

```yaml
image:
  prompt: Wang Lifa holding his nose, disgusted, Liu Quan leading the way into a sewer pipe
  characters:
    - liu_quan
    - wang_lifa
  url: https://i.muistory.com/images/zhumadian-exorcist/1768835559278-scene_sewer_entry.webp
```

排水口里臭气熏天。
“这啥味儿啊！比俺那猪圈还臭！”王利发捏着鼻子。
“化学废料。”刘全冷静地说，“虽然臭，但这说明他们确实在乱排乱放。”

* [爬出下水道] -> factory_warehouse

---

# factory_garden

```yaml
image:
  prompt: Overgrown garden inside factory walls, rusty machinery hidden in weeds
  characters:
    - liu_quan
    - wang_lifa
  url: https://i.muistory.com/images/zhumadian-exorcist/1768835559942-scene_factory_garden.webp
```

花园里堆满了生锈的机器设备。
王利发压低声音：“嘘！有人。”
几个保安正在远处抽烟。

“咱们分头行动？还是……”刘全问。
“分个屁！在一起安全。走，去那边的车间看看。”

* [通过后门进车间] -> production_line
* [查看职工宿舍] -> worker_dorm
* [摸向办公楼] -> office_building

---

# factory_warehouse

```yaml
image:
  prompt: Inside a large warehouse, stacks of crates labeled 'Chemicals', dim lighting
  characters:
    - liu_quan
    - wang_lifa
  url: https://i.muistory.com/images/zhumadian-exorcist/1768835560693-scene_factory_warehouse.webp
```

两人从下水道爬出来，身处原料仓库。
四周堆满了标着骷髅头的化工原料桶。

王利发踢了一脚桶：“这是啥？”
“苯、汞、铅……”刘全看着标签，脸色铁青，“全是剧毒。他们在用这些东西做‘圣水’？”
“龟孙！这是在造孽啊！”王利发气得胡子都在抖。

(获得情报：原料清单)

* [溜进生产区] -> production_line (set: kaifeng_evidence = kaifeng_evidence + 1, has_chemical_list = true)

---

# bribe_guard

```yaml
image:
  prompt: Wang Lifa handing cigarettes to a guard, acting like a business man
  characters:
    - wang_lifa
    - liu_quan
  url: https://i.muistory.com/images/zhumadian-exorcist/1768835561302-scene_bribe_guard.webp
```

没等刘全开口，王利发大摇大摆地走上前，掏出一盒中华烟。
“兄弟，辛苦辛苦！俺是来进货的，给周经理打过电话了。”

那一嘴地道的河南话瞬间拉近了距离。
保安接过烟，看了一眼旁边的刘全：“这是谁？”
“俺侄儿！大学生，带他出来见见世面！”王利发一巴掌拍在刘全背上。

保安收了烟，又收了500块钱，挥挥手：“进去吧。周经理在前楼。”

* [进入前广场] -> factory_front_yard (set: money = money - 500)

---

# factory_front_yard

```yaml
image:
  prompt: Front yard of factory, trucks loading boxes, a fountain with 'Living Water' statue
  characters:
    - liu_quan
    - wang_lifa
  url: https://i.muistory.com/images/zhumadian-exorcist/1768835561936-scene_factory_front_yard.webp
```

前广场上停满了拉货的卡车。
雕像是一个端着瓶子的女神。

王利发对着雕像吐了口唾沫：“啥玩意儿，伤风败俗。”

* [混入车间] -> production_line
* [去业务部] -> office_building

---

# use_black_book

```yaml
image:
  prompt: Wang Lifa hugging an old janitor, both looking emotional
  characters:
    - wang_lifa
    - liu_quan
  url: https://i.muistory.com/images/zhumadian-exorcist/1768835562574-scene_use_black_book.webp
```

后门口，王利发一眼就认出了那个佝偻的身影。
“老张！”
看门的老人猛地抬头，浑浊的眼睛里放出光来：“连长？真是恁？！”

两个老战友紧紧抱在一起。
“恁咋来了？这地方吃人不吐骨头啊！”老张老泪纵横。
“就是来收拾这帮吃人的鬼！”

老张打开了后门：“快进。小心点，周连金那个炼丹的疯子今天在车间。”

* [进入食堂] -> factory_canteen (set: kaifeng_evidence = kaifeng_evidence + 1)

---

# factory_canteen

```yaml
image:
  prompt: Factory canteen, workers eating silently, watching cult propaganda on TV
  characters:
    - liu_quan
    - wang_lifa
  url: https://i.muistory.com/images/zhumadian-exorcist/1768835563261-scene_factory_canteen.webp
```

食堂里，几百个工人正在默默地吃饭，眼神呆滞。
电视上播放着洗脑视频。

王利发看着这些工人，手里的拳头攥得咯咯响。
“这帮人……魂儿都被抽走了。”

* [穿过食堂去车间] -> production_line

---

# worker_dorm

```yaml
image:
  prompt: Cramped worker dormitory, bunk beds, religious posters on walls
  characters:
    - liu_quan
    - wang_lifa
  url: https://i.muistory.com/images/zhumadian-exorcist/1768835563864-scene_worker_dorm.webp
```

宿舍里没人。床头贴满了那种诡异的符咒。
刘全发现了一本日记，读给王利发听。
“为了买神水，把家里的牛卖了……”

王利发长叹一声：“可怜之人必有可恨之处，但这帮骗子更该死！”

* [离开宿舍去车间] -> production_line (set: kaifeng_evidence = kaifeng_evidence + 1, has_victim_diary = true)

---

# production_line

```yaml
image:
  prompt: Inside the production line, workers bottling green liquid, armed guards watching
  characters:
    - liu_quan
    - wang_lifa
  url: https://i.muistory.com/images/zhumadian-exorcist/1768835564483-scene_production_line.webp
```

车间里，流水线上灌装的正是那种绿色的液体。
而在车间尽头的高台上，站着一个穿着白大褂的怪人——“炼金术士”周连金。

他正对着一锅沸腾的药剂手舞足蹈。

“就是他！”王利发拔出了腰间的铜烟斗（其实是个法器），“擒贼先擒王！”

* [先拍照留证据] -> collect_evidence
* [偷偷录音] -> record_conversation
* [直接战斗！] -> boss_encounter

---

# collect_evidence

```yaml
image:
  prompt: Liu Quan taking photos with his phone from behind a crate
  characters:
    - liu_quan
  url: https://i.muistory.com/images/zhumadian-exorcist/1768835565073-scene_collect_evidence.webp
```

证据确凿。这根本不是什么圣水，是勾兑的化学毒剂。

* [前往实验室] -> lab_entrance (set: kaifeng_evidence = kaifeng_evidence + 1, has_factory_photos = true)

---

# office_building

```yaml
image:
  prompt: Fancy office corridor, carpets on floor, guards patrolling
  characters:
    - liu_quan
    - wang_lifa
  url: https://i.muistory.com/images/zhumadian-exorcist/1768835565786-scene_office_building.webp
```

办公楼里戒备森严。
在经理办公室，这一老一少找到了账本。

“乖乖，一个月流水三千万？”王利发看得眼珠子都快掉下来了，“这哪是卖水，这是印钞票啊！”

突然，警报响了！

“不好，被发现了！”

* [杀出去！] -> boss_encounter (set: kaifeng_evidence = kaifeng_evidence + 1, has_sales_ledger = true)

---

# record_conversation

有了这段录音，足够定他们的罪了。

突然，警报声大作！

“有入侵者！抓住他！”

* [快跑！] -> lab_entrance (set: has_factory_recording = true)

---

# lab_entrance

```yaml
image:
  prompt: A heavy metal door with a biohazard sign, green light leaking from under it
  characters:
    - liu_quan
  url: https://i.muistory.com/images/zhumadian-exorcist/1768835566394-scene_lab_entrance.webp
```

所有的路都被封锁了，刘全只能冲向最深处的实验室。

门虚掩着，里面透出诡异的绿光。

* [推门而入] -> boss_encounter

---

# boss_encounter

```yaml
image:
  prompt: Inside the lab, the Alchemist standing on a platform, holding a glowing flask, laughing manically
  characters:
    - liu_quan
    - alchemist
  url: https://i.muistory.com/images/zhumadian-exorcist/1768835566987-scene_boss_encounter.webp
audio:
  type: background_music
  prompt: Fast paced industrial techno mixed with maniacal laughter
```

实验室中央，一个穿着脏兮兮白大褂的男人正爱抚着巨大的蒸馏瓶。他就是这里的负责人，被称为“炼金术士”的周周。

“你来了，迷途的羔羊。”周周转过身，半边脸已经被化学药剂腐蚀，“想来尝尝我的新配方吗？”

他手里举着一瓶冒着泡的绿色液体，猛地喝了一口，身体瞬间膨胀，肌肉撕裂衣物，变得力大无穷。

“为了女基督！！”

* [迎战！] -> boss_phase_1

---

# boss_phase_1

```yaml
image:
  prompt: Alchemist throwing acid bottles, Liu Quan dodging behind pillars, Wang Lifa shooting with a signal flare gun
  characters:
    - liu_quan
    - wang_lifa
    - alchemist
  url: https://i.muistory.com/images/zhumadian-exorcist/1768835567581-scene_boss_phase_1.webp
```

战斗开始！
周连金站在高台上，疯狂地投掷酸液瓶。
整个实验室的地面被腐蚀得滋滋作响。

“愣着干啥！躲啊！”王利发一把推开刘全，酸液溅在他的皮夹克上，冒出一股白烟。
“这孙子在高处，咱们够不着！”

王利发从怀里掏出一把信号枪（改装过的）：
“我掩护，恁想办法爬上去！踹翻他的药锅！”

* [我去爬梯子] -> boss_climb
* [我用圣水泼他] -> boss_throw

---

# boss_climb

刘全趁着王利发吸引火力，手脚并用地爬上了一侧的检修梯。
“去死吧！”周连金发现了他，扔过来一个燃烧瓶。
“小心！”王利发大吼一声，竟然直接冲出来，用身体挡住了燃烧瓶的碎片！

* [老王！] -> boss_phase_2

---

# boss_throw

刘全扔出的圣水被周连金轻易躲开。
“太慢了！书呆子！”周连金嘲笑着。
王利发却趁机开了一枪，信号弹击中了周连金脚下的药箱，引发了爆炸。
“干得好！趁现在！”

* [利用混乱进攻] -> boss_phase_2

---

# boss_phase_2

```yaml
image:
  prompt: Alchemist drinking the green potion, muscles expanding, clothes tearing
  characters:
    - alchemist
  url: https://i.muistory.com/images/zhumadian-exorcist/1768835568159-scene_boss_phase_2.webp
```

周连金被激怒了。
“是你们逼我的……”他仰头喝下了那瓶发光的最纯的药剂。
“见证神迹吧！！”

他的身体疯狂膨胀，皮肤变成了岩石般的灰绿色，骨骼发出咔咔的响声。
他像一只巨大的蛤蟆一样跳了下来，地面都在震动。

“这……这特么是生化危机啊！”刘全惊呆了。
“别怕！恶魔显形了，咱们正好收拾它！”王利发虽然受了伤，但斗志不减。

* [利用敏捷游斗] -> boss_minigame

---

# boss_minigame

```yaml
minigame:
  prompt: A reflex-based game where you dodge thrown chemical flasks and throw holy water back at the enemy.
  variables:
    score: 0
    health: health
```

利用灵活的身法躲避周连金的扑击。
王利发在一旁不断骚扰，给刘全创造机会。

* [战斗胜利] -> boss_cutscene
* [被酸液击中] -> bad_end_acid

---

# boss_cutscene

```yaml
image:
  prompt: The Alchemist cornered, preparing a final suicide attack, glowing bright green
  characters:
    - alchemist
    - liu_quan
    - wang_lifa
  url: https://i.muistory.com/images/zhumadian-exorcist/1768835568858-scene_boss_cutscene.webp
```

周连金被打得节节败退，浑身流淌着绿色的脓血。
“想赢我？一起死吧！！”
他的身体开始剧烈发光，像是一个即将爆炸的炸弹。他猛地扑向离得最近的刘全！

“刘全！趴下！！”
就在这千钧一发之际，一个身影挡在了刘全前面。

是王利发。他死死抱住了就要自爆的周连金。
“主啊……收了这妖孽吧！”

轰——！！！

* [不！！！] -> kaifeng_end

---

# hospital_hub

```yaml
image:
  prompt: Wang Lifa in hospital bed, unconscious. Liu Quan standing by window looking resolute
  characters:
    - wang_lifa
    - liu_quan
  url: https://i.muistory.com/images/zhumadian-exorcist/1768835569468-scene_hospital_hub.webp
```

还是那家医院。王利发被送进了ICU。
医生说他命大，但能不能醒过来，看造化。

刘全隔着玻璃看着老王。那个曾经生龙活虎的主教，现在插满了管子。

* [询问医生情况] -> hospital_doctor
* [在病房外独处] -> hospital_monologue
* [回想第一次来医院的情景] -> hospital_visit
* [离开医院] -> safehouse_rest

---

# hospital_doctor

```yaml
image:
  prompt: Doctor in white coat speaking to Liu Quan in hospital corridor
  characters:
    - liu_quan
  url: https://i.muistory.com/images/zhumadian-exorcist/1768835570064-scene_hospital_doctor.webp
```

医生摘下口罩：“病人身体各项指标都正常，甚至……比正常人还强壮。但他就是醒不过来，脑波很乱，像是……在做什么噩梦。”

刘全点点头。他知道，老王正在梦里和玛门角力。

* [返回] -> hospital_hub

---

# hospital_monologue

```yaml
image:
  prompt: Liu Quan sitting alone on a hospital bench, looking at a cigarette
  characters:
    - liu_quan
  url: https://i.muistory.com/images/zhumadian-exorcist/1768835571348-scene_hospital_monologue.webp
```

刘全坐在长椅上，掏出一根烟，想了想又放了回去。

“老王，你教我的这套，我还没学会呢。你可别想偷懒。”

只有心电监护仪的滴滴声回应他。

* [返回] -> hospital_hub

---

# research_book

```yaml
image:
  prompt: Close up of the black notebook, handwriting and sketches of demons
  characters:
    - liu_quan
  url: https://i.muistory.com/images/zhumadian-exorcist/1768835571992-scene_research_book.webp
```

黑皮书里记录了王利发毕生的驱魔经验。

* [阅读关于“异端”的记载] -> read_cult_lore (set: rationality = rationality + 5)
* [阅读关于“玛门”的记载] -> read_mammon_lore (set: faith = faith + 5)
* [阅读王利发的日记] -> read_wang_diary
* [合上书] -> safehouse_rest

---

# read_cult_lore

```yaml
image:
  prompt: Page from the black book showing notes about cult psychology
  characters:
    - liu_quan
  url: https://i.muistory.com/images/zhumadian-exorcist/1768835572630-scene_read_cult_lore.webp
```

“……土生土长的邪教，往往利用人们对贫穷的恐惧。他们不讲救赎，只讲‘现世报’——得病了喝水就好，没钱了信神就富……”

这不仅仅是宗教问题，更是社会问题。

(获得情报：邪教心理学)

* [继续阅读] -> research_book

---

# read_mammon_lore

```yaml
image:
  prompt: Page from the black book showing sketch of Mammon demon
  characters:
    - liu_quan
  url: https://i.muistory.com/images/zhumadian-exorcist/1768835573274-scene_read_mammon_lore.webp
```

“……玛门，并非实体，而是贪婪概念的具象化。它寄生在金钱、欲望之中。消灭它的唯一方法，不是杀戮，而是‘拒绝’。”

拒绝诱惑，就是最大的驱魔。

(获得情报：驱魔原理)

* [继续阅读] -> research_book

---

# read_wang_diary

```yaml
image:
  prompt: Page from the black book showing personal diary entries
  characters:
    - liu_quan
  url: https://i.muistory.com/images/zhumadian-exorcist/1768835573978-scene_read_wang_diary.webp
```

“x月x日。今天又没能救下那个孩子。她的父母为了买‘神水’，把救命钱都搭进去了。我揍了那个卖水的，但那是违法的。主啊，我该怎么办？有时候，我觉得拳头比祷告管用。”

看着字里行间透出的无力感，刘全似乎更理解老王了。

* [继续阅读] -> research_book

---

# resupply

```yaml
image:
  prompt: Liu Quan checking supplies in the safehouse
  characters:
    - liu_quan
  url: https://i.muistory.com/images/zhumadian-exorcist/1768835574615-scene_resupply.webp
```

这里存了一些物资。

* [吃碗泡面] -> eat_noodles (set: health = health + 20, money = money - 10)
* [制作圣水] -> craft_holy_water (if: faith >= 10) (set: has_living_water = true)
* [检修装备] -> repair_equipment (set: rationality = rationality + 2)
* [休息] -> safehouse_rest

---

# eat_noodles

```yaml
image:
  prompt: Bowl of instant noodles steaming on a cluttered desk
  characters:
    - liu_quan
  url: https://i.muistory.com/images/zhumadian-exorcist/1768835575232-scene_eat_noodles.webp
```

红烧牛肉面。虽然不健康，但在冬天里，这就是最好的慰藉。

* [继续] -> safehouse_rest

---

# craft_holy_water

```yaml
image:
  prompt: Liu Quan blessing a bottle of water with a cross
  characters:
    - liu_quan
  url: https://i.muistory.com/images/zhumadian-exorcist/1768835575831-scene_craft_holy_water.webp
```

按照书上的配方，刘全试着祝圣了一瓶矿泉水。
虽然不如老王的纯正，但也能凑合用。

* [继续] -> safehouse_rest

---

# repair_equipment

```yaml
image:
  prompt: Liu Quan fixing a signal flare gun on a workbench
  characters:
    - liu_quan
  url: https://i.muistory.com/images/zhumadian-exorcist/1768835576574-scene_repair_equipment.webp
```

之前的战斗让装备有些磨损。刘全拿出工具箱，试图修复信号枪和防弹衣。
这需要耐心和技巧。

* [小心修补] -> repair_success (set: money = money - 50)
* [暴力拆解] -> repair_fail

---

# repair_success

```yaml
image:
  prompt: Liu Quan polishing a repaired signal flare gun
  characters:
    - liu_quan
  url: https://i.muistory.com/images/zhumadian-exorcist/1768835577377-scene_repair_success.webp
```

经过一番敲打，装备焕然一新。
“看来我还有当技工的潜质。”

* [继续] -> safehouse_rest

---

# repair_fail

```yaml
image:
  prompt: Broken equipment parts scattered on the floor
  characters:
    - liu_quan
  url: https://i.muistory.com/images/zhumadian-exorcist/1768835578011-scene_repair_fail.webp
```

咔嚓一声。
“糟糕……”刘全看着手里的零件，“这下麻烦了。”
还得花钱去黑市买配件。
* [继续] -> safehouse_rest (set: money = money - 200)

---

# report_fake

```yaml
image:
  prompt: Liu Quan speaking on the phone, looking out the window
  characters:
    - liu_quan
  url: https://i.muistory.com/images/zhumadian-exorcist/1768835579170-scene_report_fake.webp
```

“一切顺利，教授。这里的民俗……很独特。我还需要点时间。”
“好，注意安全。经费不够了说话。”

* [继续] -> safehouse_rest

---

# report_truth

```yaml
image:
  prompt: Liu Quan looking worried on the phone, static interference
  characters:
    - liu_quan
  url: https://i.muistory.com/images/zhumadian-exorcist/1768835579772-scene_report_truth.webp
```

“教授，这里的情况很复杂，涉及……非法集资和邪教。”
“那就报警啊！你是个学生，别逞能！”
电话信号突然受到了干扰，全是杂音。

* [继续] -> safehouse_rest

---

# report_evidence

```yaml
image:
  prompt: Liu Quan packaging documents and photos on a desk, phone beside him
  characters:
    - liu_quan
  url: https://i.muistory.com/images/zhumadian-exorcist/1768835579772-scene_report_truth.webp
```

刘全把能整理的证据全部打包，通过加密渠道发给了总部。

导师沉默了几秒，语气罕见地严肃：“我会立刻把材料转给相关部门。你别冲动，协查函很快就到。”

* [继续] -> safehouse_rest

---

# hack_failure

```yaml
image:
  prompt: Laptop screen showing 'Access Denied', young man looking suspicious
  characters:
    - liu_quan
  url: https://i.muistory.com/images/zhumadian-exorcist/1768835580393-scene_hack_failure.webp
```

该死，有加密狗。
年轻人回来了，狐疑地看着刘全：“你动我电脑了？”
“没有，我看它屏保挺好看的。”
刘全尴尬地收回手。
* [继续] -> zhengzhou_start (set: sanity = sanity - 5)

---

# nanyang_boss_encounter

```yaml
image:
  prompt: Foreman swinging giant hammer in the mine, dust flying
  characters:
    - liu_quan
    - foreman
  url: https://i.muistory.com/images/zhumadian-exorcist/1768835581028-scene_nanyang_boss_encounter.webp
```

矿坑深处，刘全终于找到了赵工头。

这个壮汉正在指挥手下挖掘，手里的大锤子能轻易砸碎岩石。看到刘全，他狞笑着迎了上来。

"哪来的野杂种！敢坏俺的好事！"赵工头咆哮着，一口浓重的南阳话，"今儿个非把恁砸成肉泥不可！"

正面硬刚只有死路一条。刘全看了一眼周围的环境，这里是结构不稳定的矿坑深处。

* [跑！诱导他攻击支柱！] -> nanyang_chase
* [尝试正面格挡] -> nanyang_defeat

---

# nanyang_chase

```yaml
image:
  prompt: Liu Quan running through narrow tunnels, rocks falling behind him
  characters:
    - liu_quan
  url: https://i.muistory.com/images/zhumadian-exorcist/1768835581767-scene_nanyang_chase.webp
```

刘全转身就跑，赵工头在后面狂追，每一步都震得碎石落下。
“别跑！给老子站住！弄死恁个龟孙！”

前方是个死胡同，但上方悬着一块巨大的摇摇欲坠的岩石。

* [发动陷阱] -> nanyang_puzzle

---

# nanyang_puzzle

```yaml
minigame:
  prompt: A puzzle game where you need to lure the giant foreman into unstable tunnel sections to cause rockfalls on him.
  variables:
    health: health
    enemy_health: 100
```

利用矿洞不稳定的结构，引诱他破坏最后的支撑柱。
只有一次机会。

* [胜利] -> nanyang_victory (if: enemy_health <= 0)
* [失败] -> nanyang_defeat

---

# nanyang_victory

```yaml
image:
  prompt: The tunnel collapsing on the Foreman, Liu Quan running out towards the light
  characters:
    - liu_quan
  url: https://i.muistory.com/images/zhumadian-exorcist/1768835582771-scene_nanyang_victory.webp
```

随着一声巨响，一段坑道塌了下来，将赵工头埋在了下面。
“娘了个脚……”赵工头的骂声被岩石吞没。

地下水喷涌而出，所谓的“方舟”瞬间变成了水帘洞。

“快跑！这里要塌了！”刘全大喊着，组织工人们逃生。

* [逃出生天] -> nanyang_end

---

# nanyang_defeat

```yaml
image:
  prompt: The giant hammer crushing the ground near Liu Quan, Liu Quan falling into darkness
  characters:
    - liu_quan
  url: https://i.muistory.com/images/zhumadian-exorcist/1768835583331-scene_nanyang_defeat.webp
```

赵工头的一锤子砸在刘全脚边，震得他站立不稳。
一只大手掐住了刘全的脖子。

“跟俺斗？恁还嫩点！”

* [结局：无名尸骨] -> bad_end_slave

---

# nanyang_end

```yaml
image:
  prompt: Liu Quan and workers standing in the rain outside the collapsed mine, police cars arriving
  characters:
    - liu_quan
  url: https://i.muistory.com/images/zhumadian-exorcist/1768835583934-scene_nanyang_end.webp
```

警车呼啸而至。非法金矿被查封，受骗的群众被解救。
刘全看着手中带着血迹的金矿石，心中更加沉重。

他们在用信徒的血汗，挖掘贪婪的黄金。

(任务完成：南阳)

* [返回大地图] -> act1_end (set: has_ark_ticket = true, nanyang_evidence = 2)

---

# zhengzhou_start

```yaml
image:
  prompt: Zhengzhou CBD, skyscrapers, sunny day, people in suits walking fast
  characters:
    - liu_quan
  url: https://i.muistory.com/images/zhumadian-exorcist/1768835546169-scene_zhengzhou_start.webp
```

郑州东区，CBD。
高耸入云的大楼里，隐藏着“繁荣互助基金”的总部。比起前两个地方的土味，这里充满了金钱和现代化的气息。

刘全穿着刚买的西装，站在大楼下。
即使是门口的保安，说话也带着一股子“洋气”的河南普话。
“先生，没有预约是不能进嘞（le）。”

* [在前台碰运气] -> front_desk
* [出示协查函] -> warrant_entry (if: has_warrant)
* [黑进系统预约] -> hack_appointment (set: sanity = sanity - 5)

---

# warrant_entry

```yaml
image:
  prompt: Liu Quan presenting official documents at a corporate front desk, staff looking tense
  characters:
    - liu_quan
  url: https://i.muistory.com/images/zhumadian-exorcist/1768835584735-scene_front_desk.webp
```

刘全把协查函放在前台。前台小姐的笑容僵了一瞬，立刻低声拨通了内线。
几分钟后，一个穿西装的中年人快步赶来，脸色阴晴不定。

“刘先生，请随我来。”

* [进入里间] -> banker_meet

---

# front_desk

```yaml
image:
  prompt: A modern, minimalist reception area, beautiful receptionist looking suspicious
  characters:
    - liu_quan
  url: https://i.muistory.com/images/zhumadian-exorcist/1768835584735-scene_front_desk.webp
```

前台小姐非常有礼貌，但眼神冰冷。
“先生，没有预约是不能见钱行长的。这是规定，懂不懂伐？”

刘全正准备离开，忽然听到身后有人叫他。
“哎呀！这不是刘总吗？这么巧？”

回头一看，竟然是之前在火车上认识的一个也是去“考察”的商人，张老板。操着一口标准的郑州话。
“张哥！”刘全顺水推舟，“我这正愁进不去呢。”

张老板大笑：“我有VIP卡，带你进去！这都不是事儿！”

* [跟随张老板进入] -> vip_lounge

---

# hack_appointment

```yaml
image:
  prompt: Liu Quan sitting in a cafe with a laptop, typing code furiously
  characters:
    - liu_quan
  url: https://i.muistory.com/images/zhumadian-exorcist/1768835585334-scene_hack_appointment.webp
```

刘全找了个附近的咖啡馆，打开笔记本电脑。
“入侵成功……伪造预约：北京投资人刘全。”
搞定。

* [堂堂正正进入] -> vip_lounge
* [借用旁边小伙儿的电脑] -> hack_failure

---

# vip_lounge

```yaml
image:
  prompt: A luxurious lounge with panoramic view of the city, rich people drinking champagne
  characters:
    - liu_quan
  url: https://i.muistory.com/images/zhumadian-exorcist/1768835585918-scene_vip_lounge.webp
```

这里与其说是基金会，不如说是赌场。
大厅里流淌着爵士乐，但这掩盖不住空气中由于极度贪婪而散发出的腥甜味。

* [和那个输红了眼的胖子聊聊] -> talk_loser
* [和那个优雅的贵妇聊聊] -> talk_lady
* [直接找服务生问钱行长] -> ask_waiter

---

# talk_loser

胖子满头大汗，手里攥着最后一块玉佩。
“别拦我！只要这把赢了，我就能回本！我的公司……我的厂子……”
一口地道的河南话，却透着绝望。

* [回大厅] -> vip_lounge_2

---

# talk_lady

贵妇冷冷地看着刘全：“新来的？身上没有那种铜臭味。”

* [回大厅] -> vip_lounge_2

---

# ask_waiter

服务生面无表情，就像假人一样。
“钱行长在里间。只有赢够2000筹码的客人才能进。”

* [回大厅] -> vip_lounge_2

---

# vip_lounge_2

情报收集得差不多了。
这里的每个人都是玛门的奴隶。钱行长就在那扇金门后面。

* [推门而入] -> banker_meet

---

# banker_meet

```yaml
image:
  prompt: The Banker sitting at a massive table, a deck of tarot cards spread out
  characters:
    - liu_quan
    - banker
  url: https://i.muistory.com/images/zhumadian-exorcist/1768835586751-scene_banker_meet.webp
```

钱行长正坐在最大的赌桌前，抽着雪茄。
“想见我？那就得按这里的规矩来。”钱行长看着刘全，“敢赌一把吗？”

* [接受挑战] -> gamble_game
* [直接亮明身份] -> confront_banker

---

# gamble_game

```yaml
minigame:
  prompt: A card game similar to Blackjack but with tarot cards. Win to gain access to the secure archive.
  variables:
    money: money
    chips: 1000
```

“赌什么？”
“赌你的命，换我的账本。”钱行长笑得很阴险。

* [赌赢了] -> gamble_win (if: chips >= 2000)
* [输光了] -> gamble_lose (if: chips <= 0)

---

# gamble_win

```yaml
image:
  prompt: Liu Quan showing a winning hand, money piled up, Banker looks furious
  characters:
    - liu_quan
    - banker
  url: https://i.muistory.com/images/zhumadian-exorcist/1768835587314-scene_gamble_win.webp
```

刘全亮出了底牌。
“你……你出千！”钱行长气急败坏。
“愿赌服输。”刘全伸手去拿桌上的账本。
“抓住他！弄死他！”钱行长掀翻了桌子。

* [抢夺账本] -> grab_ledger

---

# gamble_lose

```yaml
image:
  prompt: Liu Quan staring at losing cards, security guards approaching
  characters:
    - liu_quan
  url: https://i.muistory.com/images/zhumadian-exorcist/1768835587987-scene_gamble_lose.webp
```

刘全输了。
“把他也做成筹码。”钱行长冷冷地下令。

* [结局：卡牌中的灵魂] -> bad_end_soul_contract

---

# confront_banker

```yaml
image:
  prompt: Liu Quan holding up his badge, confronting the Banker surrounded by guards
  characters:
    - liu_quan
    - banker
  url: https://i.muistory.com/images/zhumadian-exorcist/1768835588629-scene_confront_banker.webp
```

“我不是来赌博的。我是宗教局的。”

刘全亮出了证件。

全场哗然。钱行长却大笑起来：“宗教局？在这里，钱就是上帝！给我拿下！”

* [战斗] -> casino_fight

---

# casino_fight

```yaml
image:
  prompt: Liu Quan fighting casino security guards in a fancy gambling hall, cards and chips flying
  characters:
    - liu_quan
  url: https://i.muistory.com/images/zhumadian-exorcist/1768835589348-scene_casino_fight.webp
```

保安们蜂拥而上。

刘全掀翻了赌桌，筹码像雨点一样洒落。趁着保安们分神，他抓起一把筹码当暗器甩了出去，打翻了两个。

"抓住他！别让他跑了！"钱行长尖叫着。

刘全抓起桌上的账本，朝窗户冲去。

* [跳窗逃跑] -> grab_ledger
* [正面硬刚] -> casino_brawl

---

# casino_brawl

```yaml
image:
  prompt: Liu Quan in intense melee combat with multiple guards
  characters:
    - liu_quan
  url: https://i.muistory.com/images/zhumadian-exorcist/1768835590035-scene_casino_brawl.webp
```

刘全选择了硬刚。

三拳两脚，又放倒了几个。但保安越来越多，他渐渐体力不支。

最后一记重拳打在他后脑勺上。天旋地转。

* [被抓住了] -> gamble_lose

---

# grab_ledger

```yaml
image:
  prompt: Liu Quan grabbing the ledger and running through the casino, guards chasing
  characters:
    - liu_quan
  url: https://i.muistory.com/images/zhumadian-exorcist/1768835590732-scene_grab_ledger.webp
```

刘全一把抓起账本，向出口狂奔。

保安们蜂拥而上。

* [冲向电梯] -> elevator_fight (set: has_fund_ledger = true)

---

# elevator_fight

```yaml
image:
  prompt: Liu Quan fighting security guards in a narrow elevator
  characters:
    - liu_quan
  url: https://i.muistory.com/images/zhumadian-exorcist/1768835591543-scene_elevator_fight.webp
```

电梯里，刘全和两个保镖扭打在一起。

狭小的空间限制了保镖的人数优势。刘全利用肘击和膝撞，艰难地击退了他们。

电梯门开了，直通地下停车场。

* [逃离] -> zhengzhou_end

---

# zhengzhou_end

```yaml
image:
  prompt: Liu Quan driving away in a stolen car, looking at the ledger in passenger seat
  characters:
    - liu_quan
  url: https://i.muistory.com/images/zhumadian-exorcist/1768835592115-scene_zhengzhou_end.webp
```

刘全启动了路边的一辆车，冲出了地下车库。

副驾驶座上的账本记录了“繁荣基金”所有洗钱的证据，以及流向“女基督”的每一笔资金。

至此，玛门的三条腿——毒药工厂、非法金矿、洗钱基金，全部被刘全斩断。

他的手机响了。是一个陌生的号码。

“你毁了我的一切……来‘新耶路撒冷’吧，我们在那里了结。”

是那个声音。那个在刘淑芬身上听到过的声音。

(任务完成：郑州)

* [前往决战之地：新耶路撒冷] -> act3_base (set: zhengzhou_evidence = 2)

---

# act3_base

```yaml
image:
  prompt: A hidden fortress in the snowy mountains, searchlights scanning, armed guards patrolling
  characters:
    - liu_quan
  url: https://i.muistory.com/images/zhumadian-exorcist/1768835592715-scene_act3_base.webp
```

“新耶路撒冷”位于太行山脉深处。
积雪覆盖了进山的路。刘全的吉普车只能停在山脚下。

这是一座现代化的堡垒，但也充满了邪教的图腾。
想要这种地方，本身就是一种试炼。

* [查看地图] -> check_map
* [检查装备] -> check_gear
* [开始登山] -> mountain_ascent

---

# check_map

```yaml
image:
  prompt: A tactical map of the mountain, showing three layers of defense
  characters:
    - liu_quan
  url: https://i.muistory.com/images/zhumadian-exorcist/1768835593318-scene_check_map.webp
```

根据王利发笔记里的草图，上山有三道关卡：

(获得情报：关卡信息)

* [开始登山] -> mountain_ascent

---

# check_gear

刘全检查了一下剩余的物资：

* [出发] -> mountain_ascent

---

# mountain_ascent

```yaml
image:
  prompt: Liu Quan walking in heavy snowstrom, visibility low
  characters:
    - liu_quan
  url: https://i.muistory.com/images/zhumadian-exorcist/1768835594043-scene_mountain_ascent.webp
```

暴风雪越来越大。每走一步都像是在与大自然搏斗。

* [走大路（容易被发现）] -> main_road_ambush
* [爬峭壁（危险但隐蔽）] -> cliff_climb

---

# main_road_ambush

```yaml
image:
  prompt: Cultists on snowmobiles attacking Liu Quan
  characters:
    - liu_quan
  url: https://i.muistory.com/images/zhumadian-exorcist/1768835594688-scene_main_road_ambush.webp
```

突然，几辆雪地摩托冲了出来！
“为了女基督！”

刘全必须在雪地里与他们周旋。

* [用信号枪还击！] -> combat_snow (if: has_signal_gun)
* [躲进树林] -> forest_evasion

---

# cliff_climb

```yaml
image:
  prompt: Liu Quan climbing a frozen cliff face at night
  characters:
    - liu_quan
  url: https://i.muistory.com/images/zhumadian-exorcist/1768835595568-scene_cliff_climb.webp
```

刘全扣紧了登山镐。身下是万丈深渊。
一块落石砸了下来，刚好擦过他的脸颊。

* [坚持攀爬] -> outpost_infiltration (set: health = health - 10)

---

# combat_snow

```yaml
image:
  prompt: Liu Quan firing a signal flare at a snowmobile fuel tank, red explosion
  characters:
    - liu_quan
  url: https://i.muistory.com/images/zhumadian-exorcist/1768835596243-scene_combat_snow.webp
```

刘全举起王利发留给他的信号枪，瞄准了领头摩托的油箱。
砰——！
红色的信号弹引燃了油箱，火球冲天而起，阻挡了其他追兵。
"老王，你的枪真好使！"刘全趁机冲过了防线。

* [抵达守望塔] -> outpost_infiltration

---

# forest_evasion

刘全在树林里绕圈子，终于甩掉了追兵，但不仅冻得够呛，还迷路了。

* [寻找方向] -> outpost_infiltration (set: health = health - 15)

---

# outpost_infiltration

```yaml
image:
  prompt: A concrete watchtower guarding the bridge, snipers visible
  characters:
    - liu_quan
  url: https://i.muistory.com/images/zhumadian-exorcist/1768835596921-scene_outpost_infiltration.webp
```

第二道关卡是守望塔。这里扼守着通往主殿的唯一桥梁。

* [潜行通过] -> stealth_bridge
* [制造声东击西] -> distraction_bridge

---

# distraction_bridge

```yaml
image:
  prompt: Fire and explosion on one side of bridge, Liu Quan sneaking across on the other side
  characters:
    - liu_quan
  url: https://i.muistory.com/images/zhumadian-exorcist/1768835597682-scene_distraction_bridge.webp
```

刘全在左边的汽油桶那儿点了一把火。

爆炸声轰然响起，守卫们全跑向那边查看。

趁着混乱，刘全飞快地冲过了桥。

"还好在工地上学过两手。"他暗自庆幸。

* [抵达贪婪之门] -> greed_gate

---

# stealth_bridge

刘全利用探照灯的死角，像壁虎一样贴着桥底爬了过去。
手都冻僵了。

* [抵达贪婪之门] -> greed_gate

---

# greed_gate

```yaml
image:
  prompt: A massive golden gate with a mouth-shaped opening, inscription says 'Give all to enter'
  characters:
    - liu_quan
  url: https://i.muistory.com/images/zhumadian-exorcist/1768835598459-scene_greed_gate.webp
```

终于到了最后一道门。
大门没有锁，只有一个巨大的吞金兽浮雕，张着大嘴。
旁边写着：“舍弃身外之物，方得极乐。”

* [放入所有金钱] -> gate_open (set: money = 0)
* [用炸药炸开] -> gate_blast
* [寻找机关] -> gate_puzzle

---

# gate_open

随着现金被吞入，大门缓缓打开。
“真讽刺。”刘全冷笑。

* [进入前厅] -> atrium_of_greed

---

# gate_blast

```yaml
image:
  prompt: Explosion at the golden gate, debris flying, Liu Quan shielding his face
  characters:
    - liu_quan
  url: https://i.muistory.com/images/zhumadian-exorcist/1768835599381-scene_gate_blast.webp
```

"老子就是不信邪！"

刘全从包里掏出一块C4——这是从工地上顺来的。
他把炸药贴在吞金兽的眼睛上，拉长引线，躲到拐角。

轰隆一声巨响，大门连同吞金兽一起被炸得粉碎。

* [冲进去！] -> atrium_of_greed (set: corruption = corruption + 10)

---

# gate_puzzle

刘全发现吞金兽的眼睛是可以按动的。
根据黑皮书上的密码……左三，右二。

咔哒。门开了。

* [进入前厅] -> atrium_of_greed

---

# atrium_of_greed

```yaml
image:
  prompt: A grand atrium filled with mountains of gold coins and jewels, but they look sinister
  characters:
    - liu_quan
  url: https://i.muistory.com/images/zhumadian-exorcist/1768835599993-scene_atrium_of_greed.webp
```

大门后并不是主殿，而是一个巨大的前厅“贪婪回廊”。
地上堆满了金币、珠宝、古董。
墙上写着：“取你所需，无需代价。”
刘全感到一阵眩晕。这些金子似乎在呼唤他。

* [只拿一点点经费] -> take_small_gold (set: money = money + 1000, corruption = corruption + 5)
* [无视诱惑，继续前进] -> corridor_of_envy (set: rationality = rationality + 5)
* [全部都要！] -> bad_end_corruption (if: corruption > 20)

---

# take_small_gold

```yaml
image:
  prompt: Liu Quan grabbing gold coins, black mark appearing on palm
  characters:
    - liu_quan
  url: https://i.muistory.com/images/zhumadian-exorcist/1768835600673-scene_take_small_gold.webp
```

"就拿一点……为了正义的经费。"刘全抓了一把金币。
金币入手滚烫，手心留下了一个黑色的印记。

* [继续] -> corridor_of_envy

---

# corridor_of_envy

```yaml
image:
  prompt: A hall of mirrors, Liu Quan seeing distorted reflections of himself as a failure
  characters:
    - liu_quan
  url: https://i.muistory.com/images/zhumadian-exorcist/1768835601357-scene_corridor_of_envy.webp
```

穿过金币堆，是一条“嫉妒长廊”。
两边全是镜子。
镜子里并没有映出刘全现在的样子，而是映出了他内心最害怕的画面：
昔日的同学功成名就，他却还在读博；
导师把他的课题给了别人；
甚至连王利发都嘲笑他是个废物。

“看啊，你就是个失败者……”镜子里的“刘全”说道。

* [打碎镜子] -> break_mirror (set: sanity = sanity - 10)
* [直视镜像，承认不足] -> face_envy (set: empathy = empathy + 5)

---

# break_mirror

```yaml
image:
  prompt: Liu Quan smashing a mirror with his fist, shards flying
  characters:
    - liu_quan
  url: https://i.muistory.com/images/zhumadian-exorcist/1768835601926-scene_break_mirror.webp
audio:
  type: sfx
  prompt: Glass shattering
```

刘全愤怒地砸碎了镜子。
"闭嘴！闭嘴！"
碎片划破了他的手，血滴在地上，变成了黑色的虫子。

* [继续] -> hall_of_lust

---

# face_envy

```yaml
image:
  prompt: Liu Quan facing his mirror reflection calmly, reflection fading
  characters:
    - liu_quan
  url: https://i.muistory.com/images/zhumadian-exorcist/1768835602520-scene_face_envy.webp
```

"是啊，我是很失败。"刘全看着镜子里的自己，"但我至少还在为了正确的事情战斗。"
镜子里的幻象尖叫一声，消散了。

* [继续] -> hall_of_lust

---

# hall_of_lust

```yaml
image:
  prompt: A luxurious bedroom, illusion of beautiful figures beckoning
  characters:
    - liu_quan
  url: https://i.muistory.com/images/zhumadian-exorcist/1768835603152-scene_hall_of_lust.webp
```

"色欲之厅"。
空气中弥漫着粉色的雾气，甜腻得让人窒息。
并没有什么赤身裸体的诱惑，那是低级的。
这里展示的是刘全内心深处最渴望的安宁——一个温暖的家，一顿热腾腾的饭菜，一个模糊但温柔的身影在等他。
"累了吧？睡一会儿吧……"

* [沉溺其中] -> bad_end_frozen
* [掐自己一把，清醒过来] -> wake_up (set: rationality = rationality + 5)

---

# wake_up

```yaml
image:
  prompt: Liu Quan pinching himself awake, illusion fading into morgue
  characters:
    - liu_quan
  url: https://i.muistory.com/images/zhumadian-exorcist/1768835603849-scene_wake_up.webp
```

剧痛让刘全清醒过来。
"现在不是做梦的时候。"
温暖的幻象瞬间变成了冰冷的停尸房。

* [继续] -> chamber_of_wrath

---

# chamber_of_wrath

```yaml
image:
  prompt: A colosseum-like arena, a giant armored executioner guarding the door
  characters:
    - liu_quan
    - executioner
  url: https://i.muistory.com/images/zhumadian-exorcist/1768835604658-scene_chamber_of_wrath.webp
```

"暴怒竞技场"。
一个巨大的、穿着重甲的处刑者挡在路口。他手持巨斧，身上挂满了受害者的头颅。
"只有鲜血才能平息怒火！"

* [与之决斗] -> boss_minigame_wrath
* [用智慧取胜] -> trap_executioner

---

# boss_minigame_wrath

```yaml
minigame:
  prompt: Dodge the heavy axe swings and strike the weak points in the armor.
  variables:
    health: health
    enemy_health: 50
```

* [胜利] -> sanctuary_entrance

---

# trap_executioner

```yaml
image:
  prompt: Liu Quan pouring holy water into the executioner's armor joints
  characters:
    - liu_quan
  url: https://i.muistory.com/images/zhumadian-exorcist/1768835605314-scene_trap_executioner.webp
```

刘全注意到处刑者的盔甲虽厚，但关节处有缝隙。
他故意引诱处刑者把斧子砍在柱子上卡住。
然后将剩下的圣水全倒进了盔甲缝隙里。

* [继续] -> sanctuary_entrance

---

# sanctuary_entrance

```yaml
image:
  prompt: A quiet prayer room before the main hall, a statue of Virgin Mary crying blood
  characters:
    - liu_quan
  url: https://i.muistory.com/images/zhumadian-exorcist/1768835605906-scene_sanctuary_entrance.webp
```

终于通过了试炼。
前面就是主殿了。
这里是一个小小的祈祷室。圣母像在流着血泪。
刘全感到前所未有的疲惫，但也前所未有的坚定。

王利发的黑皮书在怀里发热。
他整理了一下装备。

* [推开主殿大门] -> main_temple (set: health = 100)

---

# main_temple

```yaml
image:
  prompt: A massive golden hall, strange symbols on walls, Mammon sitting on a throne of gold
  characters:
    - liu_quan
    - mammon
  url: https://i.muistory.com/images/zhumadian-exorcist/1768835606859-scene_main_temple.webp
audio:
  type: background_music
  prompt: Epic orchestral music, dark choir, menacing atmosphere
```

主殿内金碧辉煌，甚至连地板都是纯金的。

在大殿正中，坐着一个慈祥的中年妇女，那个“女基督”。

但在刘全眼里，她身后站着一个巨大的、由黑雾和金币组成的怪物——玛门。

“你来了，固执的凡人。”女基督开口了，声音重叠着恶魔的咆哮。

* [宣读罪状] -> present_evidence (if: has_fund_ledger, nanyang_evidence >= 2, kaifeng_evidence >= 1)
* [直接驱魔] -> final_exorcism

---

# present_evidence

```yaml
image:
  prompt: Liu Quan throwing the evidence on the floor, the golden aura around Mammon fading
  characters:
    - liu_quan
    - mammon
  url: https://i.muistory.com/images/zhumadian-exorcist/1768835607518-scene_present_evidence.webp
```

刘全把所有的证据扔在地上，纸页像雪一样散开。

{{ if has_chemical_list }}
“这是你们用来勾兑神水的原料清单——苯、汞、铅。”
{{ /if }}
{{ if has_factory_photos }}
“这是车间照片，所谓圣水不过是化学毒剂。”
{{ /if }}
{{ if has_sales_ledger }}
“这是销售账本，你们靠谎言赚走了多少人的命钱？”
{{ /if }}
{{ if has_factory_recording }}
“这是录音，工人被洗脑、被控制的声音，一句不漏。”
{{ /if }}
{{ if has_victim_diary }}
“这是受害者的日记，穷人被逼得卖牛卖地。”
{{ /if }}
{{ if nanyang_evidence >= 2 }}
“南阳的金矿已经塌了，所谓方舟就是骗局。”
{{ /if }}
{{ if has_fund_ledger }}
“至于郑州的账本……每一笔资金都流向你。”
{{ /if }}

“你的谎言已经被拆穿了！你承诺的财富和永生，都是假的！”

随着刘全的话语，玛门身上的金光开始黯淡。那些被贪婪蒙蔽的信徒们似乎也开始动摇。

“这……怎么可能？”女基督的表情开始扭曲。

* [终极驱魔] -> final_exorcism (set: mammon_weakened = true)

---

# final_exorcism

```yaml
image:
  prompt: Liu Quan holding the cross high, intense light battling the shadow monster
  characters:
    - liu_quan
    - mammon
  url: https://i.muistory.com/images/zhumadian-exorcist/1768835608154-scene_final_exorcism.webp
```

刘全举起十字架，用尽全身力气念诵驱魔经文。

“玛门！贪婪之主！我命令你——滚出这个世界！”

玛门发出震耳欲聋的咆哮，无数的金币化作利刃飞向刘全。

* [最后的抉择：信念之跃] -> true_ending (if: faith >= 15, mammon_weakened == true)
* [最后的抉择：同归于尽] -> sacrifice_ending (if: faith >= 15, mammon_weakened == false)
* [最后的抉择：法律制裁] -> law_ending (if: mammon_weakened == true, faith < 15)
* [失败] -> bad_ending

---

# true_ending

```yaml
image:
  prompt: A blinding white light banishing the shadow, the woman collapsing, Liu Quan standing tall
  characters:
    - liu_quan
    - mammon
  url: https://i.muistory.com/images/zhumadian-exorcist/1768835608777-scene_true_ending.webp
```

刘全的信念化作一道耀眼的白光，直接穿透了玛门的黑雾。

“不！！！”

恶魔在光芒中消散。女基督瘫倒在地，恢复成了普通的农妇模样。

外面的枪声停了。一切都结束了。

刘全走出大殿，阳光照在雪山上，无比刺眼。

(完美结局：驱魔人)

---

# sacrifice_ending

```yaml
image:
  prompt: Liu Quan hugging the demon, both falling into a chasm of light
  characters:
    - liu_quan
  url: https://i.muistory.com/images/zhumadian-exorcist/1768835609419-scene_sacrifice_ending.webp
```

玛门的力量太强了。刘全知道，仅凭经文无法击败它。

他冲向玛门，死死抱住了它的灵体，引爆了身上所有的圣水。

“一起下地狱吧！”

巨大的爆炸摧毁了主殿。

(结局：殉道者)

---

# law_ending

```yaml
image:
  prompt: Police arresting the cult leader, Liu Quan watching from a distance smoking a cigarette
  characters:
    - liu_quan
  url: https://i.muistory.com/images/zhumadian-exorcist/1768835610059-scene_law_ending.webp
```

玛门虽然逃走了，但女基督作为邪教头目被警方抓获。

刘全看着她被带上警车。虽然没能彻底消灭恶魔，但至少拯救了人间。

他点了一根烟，转身消失在人群中。

(结局：无名英雄)

---

# bad_ending

```yaml
image:
  prompt: Liu Quan sitting on the throne, eyes glowing yellow, holding gold coins
  characters:
    - liu_quan
  url: https://i.muistory.com/images/zhumadian-exorcist/1768835610690-scene_bad_ending.webp
```

“为什么要反抗呢？加入我们吧……”玛门的声音充满了诱惑。

刘全放下了十字架。是啊，太累了。

他捡起地上的金币。

“我是……新的先知。”

(结局：堕落)

---

# bad_end_acid

```yaml
image:
  prompt: Liu Quan dissolving in green acid, horrific scene
  characters:
    - liu_quan
  url: https://i.muistory.com/images/zhumadian-exorcist/1768835611330-scene_bad_end_acid.webp
```

你躲闪不及，被周连金的酸液泼了个正着。
剧痛瞬间传遍全身。皮肉在滋滋作响中消融。
“成为我的作品吧！”周连金狂笑着。
你的意识模糊了，最后听到的是王利发绝望的怒吼。
(结局：溶于酸液)

---

# bad_end_slave

```yaml
image:
  prompt: Liu Quan in rags, mining gold in a dark tunnel, looking hopeless
  characters:
    - liu_quan
  url: https://i.muistory.com/images/zhumadian-exorcist/1768835611953-scene_bad_end_slave.webp
```

你被当场抓住，扔进了矿坑深处。
没人知道你是谁，也没人在乎。
你成为了“诺亚方舟”的一名苦力，每天在皮鞭下挖掘着永远挖不完的黄金。
直到有一天，矿坑塌方……
(结局：无名尸骨)

---

# bad_end_soul_contract

```yaml
image:
  prompt: Liu Quan's soul being sucked into a tarot card held by the Banker
  characters:
    - liu_quan
  url: https://i.muistory.com/images/zhumadian-exorcist/1768835612722-scene_bad_end_soul_contract.webp
```

“愿赌服输。”钱行长冷笑着收起了牌。
你感觉到身体变轻了，某种重要的东西被抽离了。
你看着自己的手变得透明，最终被吸进了一张绘着“倒吊人”的塔罗牌里。
你成为了他收藏的第101个灵魂。
(结局：卡牌中的灵魂)

---

# bad_end_frozen

```yaml
image:
  prompt: Liu Quan frozen to death on a snowy mountain cliff
  characters:
    - liu_quan
  url: https://i.muistory.com/images/zhumadian-exorcist/1768835613406-scene_bad_end_frozen.webp
```

暴风雪无情地吞噬了你。
体温迅速流失，你的手脚失去了知觉。
你倒在雪地里，在这个甚至神都遗弃的地方，慢慢睡去。
(结局：冰封)

---

# bad_end_corruption

```yaml
image:
  prompt: Liu Quan sitting on Mammon's throne, eyes glowing red, holding gold
  characters:
    - liu_quan
  url: https://i.muistory.com/images/zhumadian-exorcist/1768835614054-scene_bad_end_corruption.webp
```

“为什么还要反抗呢？”那个声音在你脑海里回响，“这都是你的。”
你放下了武器，拿起了地上的金币。
是啊，为什么要反抗？这感觉……真好。
你成为了新一代的“玛门代理人”。
(结局：恶堕)
