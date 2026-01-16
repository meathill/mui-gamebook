---
title: "哈利·波特与阿兹卡班的囚徒"
description: "逃犯小天狼星·布莱克越狱追杀，摄魂怪守护校园。在英式漫画风格中体验守护神咒语、时间穿越与真相揭露。"
backgroundStory: |
  这是哈利在霍格沃茨的第三年。杀人逃犯小天狼星·布莱克从阿兹卡班越狱，据说正在追杀哈利。
  摄魂怪——阿兹卡班的看守——驻守霍格沃茨，危险四伏。
  但随着真相渐渐揭开，小天狼星的真实身份远比传言复杂...
cover_prompt: "Harry Potter casting a silver stag Patronus against dark Dementors, classic British comic book style, dramatic lighting, magical silver glow"
cover: "https://i.muistory.com/images/harry-potter-3/1767943535039-cover.webp"
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
    trigger:
      condition: "<= 0"
      scene: game_over_dementor
  patronus_power:
    value: 0
    visible: true
    display: progress
    max: 100
    label: 守护神力量
  courage:
    value: 50
    visible: false
  trust_sirius:
    value: false
    visible: false
  has_marauders_map:
    value: false
    visible: false
  buckbeak_saved:
    value: false
    visible: false
ai:
  style:
    image: "Classic British colored comic book style, 1990s aesthetic, hand-drawn with clear ink outlines, vibrant colors, expressive characters, magical atmosphere"
    audio: "Orchestral fantasy themes, mysterious and magical, John Williams inspired"
  characters:
    harry:
      name: "Harry Potter"
      description: "哈利·波特，额头上有闪电形伤疤的男孩，父母被伏地魔杀害，寄养在德思礼家。"
      image_prompt: "13 year old boy, messy black hair, round glasses, lightning scar, Gryffindor robes"
      image_url: "https://i.muistory.com/images/harry-potter-3/1767943535611-harry_potter_portrait_1767852883460.webp"
    ron:
      name: "Ron Weasley"
      description: "罗恩·韦斯莱，哈利最好的朋友，来自纯血统巫师家庭，有一只名叫斑斑的宠物鼠。"
      image_prompt: "13 year old boy, red hair, freckles, tall and lanky, pet rat Scabbers"
      image_url: "https://i.muistory.com/images/harry-potter-3/1767943537151-ron_weasley_portrait_1767852902243.webp"
    hermione:
      name: "Hermione Granger"
      description: "赫敏·格兰杰，聪明好学的女孩，麻瓜出身但成绩优异，哈利和罗恩的好友。"
      image_prompt: "13 year old girl, bushy brown hair, intelligent look, carrying many books"
      image_url: "https://i.muistory.com/images/harry-potter-3/1767943534910-hermione_granger_portrait_1767852920669.webp"
    sirius:
      name: "Sirius Black"
      description: "小天狼星·布莱克，从阿兹卡班越狱的囚犯，传闻是杀人凶手，实际上是哈利的教父。"
      image_prompt: "Escaped prisoner, gaunt face, long matted black hair, tattered robes, can transform into large black dog"
      image_url: "https://i.muistory.com/images/harry-potter-3/1767943537172-sirius_black_portrait_1767852939189.webp"
    lupin:
      name: "Remus Lupin"
      description: "莱姆斯·卢平，新任黑魔法防御术教授，温和善良，是哈利父亲的老朋友。"
      image_prompt: "New DADA teacher, tired and shabby appearance, kind eyes, patched robes, werewolf"
      image_url: "https://i.muistory.com/images/harry-potter-3/1767943537617-remus_lupin_portrait_1767852955287.webp"
    pettigrew:
      name: "Peter Pettigrew"
      description: "小矮星彼得，曾是詹姆·波特的朋友，实际上是背叛者，可以变成老鼠。"
      image_prompt: "Short, balding, rat-like features, missing finger, usually disguised as rat Scabbers"
      image_url: "https://i.muistory.com/images/harry-potter-3/1767943537244-peter_pettigrew_portrait_1767852986361.webp"
    dementor:
      name: "Dementor"
      description: "摄魂怪，阿兹卡班的看守，能吸取人的快乐记忆，令人感到绝望和寒冷。"
      image_prompt: "Tall cloaked figure, rotting skeletal hands, no visible face, floating, radiating cold and despair"
      image_url: "https://i.muistory.com/images/harry-potter-3/1767943535030-dementor_portrait_1767853004945.webp"
    buckbeak:
      name: "Buckbeak"
      description: "巴克比克，鹰头马身有翼兽，骄傲而高贵，是海格的神奇动物保护课教材。"
      image_prompt: "Hippogriff, eagle head with fierce orange eyes, horse body with grey feathers, proud posture"
      image_url: "https://i.muistory.com/images/harry-potter-3/1767943534997-buckbeak_portrait_1767853023666.webp"
    snape:
      name: "Severus Snape"
      description: "西弗勒斯·斯内普，魔药学教授，总是对哈利充满敌意，与卢平有过节。"
      image_prompt: "Tall, thin, sallow skin, hooked nose, greasy black hair, black robes, hostile expression"
      image_url: "https://i.muistory.com/images/harry-potter-3/1767943538368-snape_portrait_1767853041799.webp"
    malfoy:
      name: "Draco Malfoy"
      description: "德拉科·马尔福，斯莱特林学生，哈利的死对头，父亲是食死徒。"
      image_prompt: "13 year old boy, pale pointed face, slicked blonde hair, Slytherin robes, sneering"
      image_url: "https://i.muistory.com/images/harry-potter-3/1767943537129-malfoy_portrait_1767853144913.webp"
---

# start
```image-gen
prompt: Harry Potter sitting alone in his small bedroom at 4 Privet Drive, looking at a photo album of his parents. Moonlight through window, lonely atmosphere.
character: harry
url: https://i.muistory.com/images/harry-potter-3/1767943558645-scene_start_1767873367129.webp
```
又是一个漫长的暑假。你坐在女贞路4号狭小的卧室里，翻看着父母的照片。

德思礼一家对你依然冷漠，但今年情况更糟——玛姬姑妈要来做客了。弗农姨父特别警告你要"表现正常"。

窗外，一只猫头鹰掠过月光。霍格沃茨的来信... 你多么想念那里的一切。

* [下楼迎接玛姬姑妈] -> aunt_marge_arrival
* [继续看照片，假装没听到门铃] -> aunt_marge_arrival

---

# aunt_marge_arrival
```image-gen
prompt: Aunt Marge, a large bulldog-like woman with a red face, arriving at the Dursleys' door with her vicious dog Ripper. Vernon welcoming her.
url: https://i.muistory.com/images/harry-potter-3/1767943539172-scene_aunt_marge_arrival_1767891447394.webp
```
玛姬姑妈像一只斗牛犬般气势汹汹地闯进门来，她的恶犬"利帕"在她脚边龇牙咧嘴。

"这就是那个... 外甥？"她打量着你，眼中满是鄙夷，"该打！就是该打！"

整个晚餐，她不停地嘲讽你的父母。你咬紧牙关，试图忍耐。

* [继续忍耐] -> marge_insults
* [反驳她] -> marge_insults (set: courage = courage + 10)

---

# marge_insults
```image-gen
prompt: Aunt Marge at dinner table, red-faced and drunk, pointing rudely. Harry gripping the table edge with fury, magical sparks starting to appear.
character: harry
url: https://i.muistory.com/images/harry-potter-3/1767943551882-scene_marge_insults_1767922046362.webp
```
"你爸爸是个无业游民，"玛姬姑妈灌下第四杯白兰地，"你妈妈也是个废物。坏基因，只能生出坏种子——"

你感到体内有什么东西在沸腾。魔法不受控制地涌动着。

"不准侮辱我的父母！"

* [释放怒火！] -> marge_inflation
* [努力压制魔法] -> marge_inflation (set: health = health - 10)

---

# marge_inflation
```image-gen
prompt: Aunt Marge inflating like a balloon, floating up to the ceiling, buttons popping off her clothes. The Dursleys screaming in horror. Dramatic comic panel style.
url: https://i.muistory.com/images/harry-potter-3/1767943550058-scene_marge_inflation_1767873389114.webp
```
玛姬姑妈开始像气球一样膨胀！她的纽扣崩飞，身体越涨越大，最后飘到了天花板上！

德思礼一家惊恐万分。弗农姨父冲向你，脸涨得通红。

"你这个怪物！给我站住！"

你已经不在乎了。你抓起行李箱，拖着海德薇的笼子，冲出了这个从来不属于你的"家"。

* [逃进黑夜] -> night_street

---

# night_street
```image-gen
prompt: Harry dragging his trunk down a dark empty street at night, looking scared and lost. Street lamps casting long shadows. A large black dog watching from the shadows.
character: harry
url: https://i.muistory.com/images/harry-potter-3/1767943551923-scene_night_street_1767891699687.webp
```
你独自一人走在黑暗的街道上，不知道该去哪里。你刚刚对麻瓜使用了魔法... 会被开除吗？

突然，你感到一股寒意。

在对面的灌木丛里，有一双闪亮的眼睛正在注视着你——一只巨大的黑狗！

你惊慌后退，绊倒在地——

**砰！**

一辆紫色三层巴士凭空出现！

* [登上骑士公共汽车] -> knight_bus

---

# knight_bus
```image-gen
prompt: The Knight Bus, a purple triple-decker bus, interior with sliding beds. Stan Shunpike the conductor with pimples greeting Harry. Ernie Prang driving wildly.
character: harry
url: https://i.muistory.com/images/harry-potter-3/1767943546910-scene_knight_bus_1767873406771.webp
```
"欢迎乘坐骑士公共汽车！"一个满脸青春痘的年轻人说道，"我是斯坦·桑派克，随时为您服务！"

巴士以疯狂的速度行驶，在街道间闪避穿梭。床铺在车厢里滑来滑去。

斯坦从报纸上抬起头："喂，你知道小天狼星·布莱克的事吗？"

他给你看报纸头条：**阿兹卡班囚犯越狱——据悉正在追杀哈利·波特**

照片上是一个瘦削的男人，长发凌乱，眼神疯狂。

* [询问小天狼星是谁] -> knight_bus_info
* [保持沉默] -> leaky_cauldron

---

# knight_bus_info
```image-gen
prompt: Newspaper front page showing wanted poster of Sirius Black, gaunt face with wild hair, "HAVE YOU SEEN THIS WIZARD?" headline. Stan pointing at it excitedly.
character: sirius
url: https://i.muistory.com/images/harry-potter-3/1767943546864-scene_knight_bus_info_1767921956435.webp
```
"你不知道？"斯坦瞪大眼睛，"他是神秘人最忠实的追随者！据说他杀了十三个人！一个巫师和十二个麻瓜，就在大街上！"

"现在他逃出来了... 要干什么可想而知。"

巴士剧烈颠簸，你抓紧床柱。那个男人的眼睛... 为什么让你感到如此不安？

* [继续前往破釜酒吧] -> leaky_cauldron

---

# leaky_cauldron
```image-gen
prompt: The Leaky Cauldron pub interior, Cornelius Fudge the Minister of Magic in bowler hat waiting for Harry. Dim lighting, mysterious atmosphere.
character: harry
url: https://i.muistory.com/images/harry-potter-3/1767943549284-scene_leaky_cauldron_1767891464746.webp
```
骑士公共汽车最终停在破釜酒吧门口。

令你惊讶的是，魔法部长康奈利·福吉亲自在等你！

"波特先生，"福吉部长露出一个勉强的微笑，"关于你姑妈的事... 我们已经处理好了。你不会被开除的。"

"现在，在开学前，请待在破釜酒吧。不要去麻瓜的伦敦。明白吗？"

为什么魔法部长会亲自处理这件事？为什么对你如此宽容？

* [同意留下] -> diagon_alley
* [询问为什么] -> fudge_warning

---

# fudge_warning
```image-gen
prompt: Minister Fudge looking nervous, leaning close to Harry and whispering urgently. Dark shadows in background suggesting danger.
url: https://i.muistory.com/images/harry-potter-3/1767943543629-scene_fudge_warning_1767891843764.webp
```
福吉的表情变得严肃："波特先生... 外面很危险。小天狼星·布莱克... 据说他在找你。"

"找我？为什么？"

福吉犹豫了一下，没有回答。"总之，待在安全的地方。霍格沃茨会保护你的。"

他匆匆离去，留下你满腹疑问。

* [前往对角巷度过剩余假期] -> diagon_alley

---

# diagon_alley
```image-gen
prompt: Harry looking at broomsticks in Quality Quidditch Supplies window, the Firebolt on display glowing magnificently. Ron and Hermione approaching excitedly.
characters: [harry, ron, hermione]
url: https://i.muistory.com/images/harry-potter-3/1767943542442-scene_diagon_alley_1767891482723.webp
```
在对角巷的最后几天，你和罗恩、赫敏重逢了。

"哈利！听说你把姑妈吹成气球了？太棒了！"罗恩大笑。

赫敏则在神奇动物商店买了一只橘色的猫——克鲁克山。斑斑（罗恩的老鼠）看起来对这只猫惊恐万分。

在精品魁地奇用品店，一把全新的**火弩箭**闪耀着光芒。那是世界上最快的飞天扫帚！

* [登上霍格沃茨特快] -> hogwarts_express

---

# hogwarts_express
```image-gen
prompt: Harry, Ron and Hermione in a Hogwarts Express compartment. A shabby man (Lupin) sleeping in the corner covered by cloak. Scenic countryside through window.
characters: [harry, ron, hermione, lupin]
url: https://i.muistory.com/images/harry-potter-3/1767943547402-scene_hogwarts_express_1767891508191.webp
```
9月1日，你们登上了霍格沃茨特快列车。

你们找到了一个车厢，但里面已经有一个人——一个穿着破旧长袍的男人正在角落里睡觉。他的手提箱上写着：**R.J.卢平教授**

"新的黑魔法防御术老师？"赫敏猜测。

火车平稳地行驶着。窗外，天开始变暗了...

* [告诉朋友们你听到的事] -> tell_friends_sirius
* [保持沉默看向窗外] -> train_darkness

---

# tell_friends_sirius
```image-gen
prompt: Harry telling Ron and Hermione something serious on the train. Their worried expressions. The sleeping Professor in background.
characters: [harry, ron, hermione]
url: https://i.muistory.com/images/harry-potter-3/1767943558621-scene_tell_friends_sirius_1767922192618.webp
```
"小天狼星·布莱克正在找我。"你低声说。

罗恩和赫敏震惊地看着你。

"什么？那个杀人犯？"罗恩的雀斑都白了。

"福吉部长告诉我的... 但他没说为什么。"

就在这时，火车突然停了下来。车灯闪烁，然后熄灭。

窗户上开始结霜。

* [发生了什么？] -> train_darkness

---

# train_darkness
```image-gen
prompt: The Hogwarts Express stopped, frost forming on windows from inside. Complete darkness except for faint blue light from windows. Breath visible in cold air.
url: https://i.muistory.com/images/harry-potter-3/1767943559624-scene_train_darkness_1767922272833.webp
```
一股刺骨的寒意弥漫开来。你能看到自己呼出的白气。

这不是普通的寒冷。这是一种深入骨髓的绝望感...

你感到所有快乐都在被抽离。

车厢门缓缓打开。

一个高大的、裹着黑色斗篷的身影飘了进来。它没有脸——只有一个黑洞般的兜帽。腐烂的手指向你伸来...

* [试图反抗] -> dementor_attack
* [后退躲避] -> dementor_attack

---

# dementor_attack
```image-gen
prompt: A Dementor reaching toward Harry in the train compartment, rotting hand extended. Harry falling backward, green light flashing. Intense horror comic style.
character: dementor
url: https://i.muistory.com/images/harry-potter-3/1767943542426-scene_dementor_attack_1767891821487.webp
```
你听到了尖叫声... 不，是你自己在尖叫吗？不... 是别人的声音...

是一个女人在尖叫："不要伤害哈利！求求你！"

你的视线开始模糊。黑暗吞噬了一切...

* [陷入黑暗] -> wake_up_train

---

# wake_up_train
```image-gen
prompt: Harry waking up on the train floor, Professor Lupin kneeling beside him offering chocolate. Ron and Hermione looking worried. Warm lighting restored.
characters: [harry, lupin]
url: https://i.muistory.com/images/harry-potter-3/1767943560697-scene_wake_up_train_1767941068501.webp
```
"哈利！哈利！"

你睁开眼睛。你躺在地板上，罗恩和赫敏焦急地看着你。

那个睡着的教授——卢平——正跪在你身边，手里拿着一大块巧克力。

"吃点这个，"他温和地说，"会好一些的。那是摄魂怪——阿兹卡班的看守。他们在搜查火车。"

"为什么... 为什么只有我晕倒了？"

卢平沉默了一瞬间。"吃巧克力吧。"

* [吃下巧克力] -> arrive_hogwarts (set: health = health + 10)
* [询问更多关于摄魂怪的事] -> lupin_dementor_info

---

# lupin_dementor_info
```image-gen
prompt: Professor Lupin explaining something to Harry with a kind but serious expression. Magical silver light in his eyes suggesting the Patronus spell.
character: lupin
url: https://i.muistory.com/images/harry-potter-3/1767943548503-scene_lupin_dementor_info_1767921991299.webp
```
"摄魂怪吸取人的快乐和希望，"卢平解释道，"如果让它们靠得太近... 它们会执行'摄魂怪之吻'——吸走你的灵魂。"

"有办法对抗它们吗？"

卢平的眼中闪过一丝光芒。"有。守护神咒语。这是非常高级的魔法... 但如果你愿意，我可以教你。"

他递给你巧克力。"以后再说。先恢复体力。"

* [吃下巧克力，记住这个承诺] -> arrive_hogwarts (set: patronus_power = patronus_power + 5, health = health + 10)

---

# arrive_hogwarts
```image-gen
prompt: Hogwarts castle at night with Dementors floating around the gates. Dark and ominous atmosphere. Students looking up nervously from carriages.
url: https://i.muistory.com/images/harry-potter-3/1767943539383-scene_arrive_hogwarts_1767921808092.webp
```
霍格沃茨终于到了。但今年的城堡看起来不同了。

摄魂怪盘旋在校门周围，它们的存在让空气都变得沉重。邓布利多在开学典礼上宣布：

"在小天狼星·布莱克被捕获之前，摄魂怪将驻守霍格沃茨。我必须警告你们——不要给它们任何理由伤害你们。"

新学期开始了。但危险的气息笼罩着这座古老的城堡...

* [前往神奇动物课] -> care_magical_creatures

---

# care_magical_creatures
```image-gen
prompt: Hagrid teaching outdoors near his hut, showing a majestic Hippogriff (Buckbeak) to nervous students. Forest in background. Bright daylight.
characters: [harry, buckbeak]
url: https://i.muistory.com/images/harry-potter-3/1767943540953-scene_care_magical_creatures_1767921861919.webp
```
海格的第一堂神奇动物课在他的小屋外举行。

"今天，我要给你们介绍... 鹰头马身有翼兽！"海格骄傲地宣布。

巴克比克昂首站立，橙色的眼睛傲视群雄。灰色的羽毛在阳光下闪闪发光。

"它们很骄傲，"海格解释道，"你们得先鞠躬。等它鞠躬了，才能靠近。"

马尔福在后面嘲笑。"谁想第一个试试？"

* [主动上前] -> bow_to_buckbeak (set: courage = courage + 10)
* [等待别人先试] -> bow_to_buckbeak

---

# bow_to_buckbeak
```image-gen
prompt: Harry bowing deeply to Buckbeak the Hippogriff, making eye contact. Tense moment. Other students watching nervously from behind.
characters: [harry, buckbeak]
url: https://i.muistory.com/images/harry-potter-3/1767943539202-scene_bow_to_buckbeak_1767891882687.webp
```
你走向巴克比克，心跳加速。

"鞠躬，哈利！"海格喊道，"别眨眼！看着它的眼睛！"

你深深鞠躬，保持眼神接触。巴克比克的橙色眼睛盯着你，像在评判你的灵魂...

漫长的几秒钟过去了。

然后，巴克比克也低下了它高傲的头。

"太棒了！"海格欣喜若狂，"现在你可以骑它了！"

* [骑上巴克比克（开始小游戏）] -> buckbeak_flight

---

# buckbeak_flight
```minigame-gen
prompt: '鹰头马身有翼兽飞行小游戏。玩家需要保持平衡并控制方向。左右倾斜控制转向，避开树枝和障碍物。围绕霍格沃茨城堡飞行一圈即可成功。保持稳定可获得额外勇气值。'
variables:
  flight_score: 飞行得分
url: https://i.muistory.com/images/harry-potter-3/1767943538330-harry-potter-3_buckbeak_flight_minigame.js
```
```image-gen
prompt: Harry riding Buckbeak flying over Hogwarts castle and the Black Lake, wind in his hair, exhilarating freedom. Panoramic view of the grounds.
characters: [harry, buckbeak]
url: https://i.muistory.com/images/harry-potter-3/1767943540802-scene_buckbeak_flight_1767873485777.webp
```
你跨上巴克比克的背。它展开巨大的翅膀，一跃而起！

风呼啸着掠过你的脸庞。霍格沃茨在下方变得越来越小。湖水如镜，禁林如毯...

这是真正的自由！

（小游戏：骑乘巴克比克）

* [成功完成飞行] -> buckbeak_success (if: flight_score >= 50) (set: courage = courage + 15)
* [勉强完成] -> buckbeak_success

---

# buckbeak_success
```image-gen
prompt: Harry landing safely with Buckbeak, looking thrilled. Hagrid clapping happily. Other students amazed. Malfoy looking jealous in background.
characters: [harry, buckbeak, malfoy]
url: https://i.muistory.com/images/harry-potter-3/1767943540814-scene_buckbeak_success_1767921844199.webp
```
你安全着陆，心脏还在狂跳。那是你经历过最美妙的飞行！

"干得好，哈利！"海格大声叫好。

但马尔福不屑地走上前来。"有什么了不起的？我来——"

他没有鞠躬就走向巴克比克。

巴克比克怒吼一声，巨大的爪子挥向马尔福！

"啊！！！它杀了我！"马尔福倒在地上，捂着手臂嚎叫。

* [帮助马尔福] -> malfoy_injured
* [这是他自找的] -> malfoy_injured

---

# malfoy_injured
```image-gen
prompt: Malfoy on the ground clutching his arm and screaming dramatically. Buckbeak being restrained by Hagrid. Other students panicking.
character: malfoy
url: https://i.muistory.com/images/harry-potter-3/1767943550231-scene_malfoy_injured_1767891921851.webp
```
海格惊慌地把马尔福送去医疗翼。其实只是擦伤，但马尔福大肆夸张。

几周后，坏消息传来：

巴克比克将被送上危险生物处置委员会，可能会被处死。

海格崩溃了。赫敏发誓要帮他打赢这场官司。

与此同时，你有更紧迫的事要处理——摄魂怪让你无法正常生活。

* [请求卢平教授教你守护神咒语] -> patronus_lesson_1

---

# patronus_lesson_1
```image-gen
prompt: Professor Lupin teaching Harry in a dark classroom, a trunk with a Boggart-Dementor inside. Silver mist coming from Harry's wand. Intense magical training scene.
characters: [harry, lupin]
url: https://i.muistory.com/images/harry-potter-3/1767943551943-scene_patronus_lesson_1_1767941243231.webp
```
卢平教授同意在课后教你守护神咒语。

"这是非常高级的魔法，"他严肃地说，"大多数成年巫师都无法完成。"

"守护神需要你集中精力想一段快乐的回忆——不是普通的快乐，而是最强烈的、最纯粹的快乐。"

他打开一个箱子，里面有一个博格特。"它会变成你最害怕的东西——摄魂怪。准备好了吗？"

* [想起第一次骑扫帚时的快乐] -> patronus_attempt_1
* [想起朋友们在身边的感觉] -> patronus_attempt_1

---

# patronus_attempt_1
```minigame-gen
prompt: '守护神练习小游戏。屏幕会出现金色光点代表"快乐回忆碎片"，玩家需要在正确时机点击收集它们。积累能量条，当能量满时释放守护神。博格特摄魂怪会逐渐逼近，增加压力。成功产生银色光芒即可通过。'
variables:
  patronus_strength: 守护神强度
url: https://i.muistory.com/images/harry-potter-3/1767943538335-harry-potter-3_patronus_attempt_1_minigame.js
```
```image-gen
prompt: Harry concentrating hard, wand raised, faint silver mist forming at the wand tip. A dark Dementor shape approaching from the trunk.
character: harry
```
"呼神护卫！"

你的魔杖尖端冒出了一缕银色的烟雾... 但博格特摄魂怪的影响太强了。

那个声音又出现了... 你母亲的尖叫...

（小游戏：守护神练习）

* [坚持住！] -> patronus_result_1

---

# patronus_result_1
```image-gen
prompt: Professor Lupin feeding Harry chocolate after a draining training session. Encouraging expression on Lupin's face. Warm classroom lighting.
characters: [harry, lupin]
url: https://i.muistory.com/images/harry-potter-3/1767943553481-scene_patronus_result_1_1767941296729.webp
```
卢平挥杖让博格特退回箱子。你倒在椅子上，精疲力竭。

"做得不错，"卢平递给你巧克力，"第一次就能产生银雾，已经很了不起了。"

"但我还是晕倒了..."

"你需要更强烈的回忆。我们会继续练习的。"

卢平看着你，眼中有一种奇怪的温柔。他好像... 认识你父母？

* [继续练习守护神（选择更强的回忆）] -> patronus_lesson_2 (set: patronus_power = patronus_power + 15)
* [询问卢平是否认识父母] -> lupin_parents

---

# lupin_parents
```image-gen
prompt: Lupin looking at Harry with sad nostalgia, an old photo of the Marauders (young James, Sirius, Remus, Peter) visible in his hand.
character: lupin
url: https://i.muistory.com/images/harry-potter-3/1767943550268-scene_lupin_parents_1767891866582.webp
```
"卢平教授... 你认识我的父母吗？"

卢平沉默了一会儿。他从口袋里拿出一张泛黄的照片。

照片上是四个年轻人在笑——你的父亲詹姆、一个长发男人、年轻的卢平，还有一个矮胖的男人。

"我们是同学，"卢平轻声说，"最好的朋友。"

那个长发男人... 看起来很眼熟。但卢平把照片收起来了，没有多说。

* [继续练习守护神] -> patronus_lesson_2 (set: patronus_power = patronus_power + 15)

---

# patronus_lesson_2
```image-gen
prompt: Harry casting a stronger Patronus, silver shield-like shape forming between him and the Boggart-Dementor. Determined expression.
character: harry
url: https://i.muistory.com/images/harry-potter-3/1767943553512-scene_patronus_lesson_2_1767941260923.webp
```
更强烈的回忆... 你闭上眼睛。

你想起第一次发现自己是巫师时的震撼和喜悦。你想起海格告诉你父母是英雄。你想起在霍格沃茨找到真正的家...

"呼神护卫！"

这一次，银光更加耀眼！一道银色的盾牌在你和博格特之间形成！

"太棒了！"卢平激动地喊道。

虽然还不是完整的守护神形态，但你正在进步。

* [下课，前往图书馆] -> marauders_map_intro (set: patronus_power = patronus_power + 20)

---

# marauders_map_intro
```image-gen
prompt: Fred and George Weasley winking mischievously, handing Harry an old blank parchment in a secret corridor. Torchlight, conspiratorial atmosphere.
characters: [harry, ron]
url: https://i.muistory.com/images/harry-potter-3/1767943550122-scene_marauders_map_intro_1767922029125.webp
```
在一个下午，韦斯莱双胞胎把你拉到一条隐秘的走廊。

"哈利，"弗雷德露出狡黠的笑容，"我们觉得你比我们更需要这个。"

乔治递给你一张看起来空白的羊皮纸。

"它看起来是空的，但是..."弗雷德用魔杖点着它，"我庄严宣誓我不干好事。"

羊皮纸上浮现出墨水画的线条——那是霍格沃茨的完整地图！还有每个人的脚印和名字！

**活点地图**。

* [接受活点地图] -> explore_with_map (set: has_marauders_map = true)

---

# explore_with_map
```image-gen
prompt: The Marauders Map fully opened, showing Hogwarts corridors with moving footprints and name labels. Harry's face illuminated by the magical parchment.
character: harry
url: https://i.muistory.com/images/harry-potter-3/1767943543747-scene_explore_with_map_1767921922691.webp
```
"这是谁创造的？"你惊叹道。

地图顶端写着：**月亮脸、虫尾巴、大脚板和尖头叉子先生荣幸呈献...**

"不知道，"乔治耸耸肩，"但这是霍格沃茨最伟大的宝物之一。"

"现在你可以偷溜去霍格莫德了！"弗雷德眨眨眼，"这里有条秘密通道直通蜂蜜公爵糖果店。"

* [使用地图前往霍格莫德] -> hogsmeade_trip
* [先研究一下地图] -> study_map

---

# study_map
```image-gen
prompt: Harry studying the Marauders Map intently, noticing something strange - a dot labeled "Peter Pettigrew" in Ron's dormitory. Confused expression.
character: harry
url: https://i.muistory.com/images/harry-potter-3/1767943558487-scene_study_map_1767922174930.webp
```
你仔细研究这张神奇的地图。每个人的位置都清清楚楚...

等等。

在格兰芬多塔楼，罗恩床边，有一个脚印标签：**彼得·佩迪鲁**

但彼得·佩迪鲁不是死了吗？被小天狼星杀了？

你揉揉眼睛再看——脚印还在那里。

这一定是地图出了问题... 对吧？

* [暂时不管它，去霍格莫德] -> hogsmeade_trip
* [把这件事记在心里] -> hogsmeade_trip (set: courage = courage + 5)

---

# hogsmeade_trip
```image-gen
prompt: Harry sneaking into Hogsmeade village through a secret passage, snow falling. Shops like Honeydukes and Three Broomsticks visible. Festive winter atmosphere.
character: harry
url: https://i.muistory.com/images/harry-potter-3/1767943545243-scene_hogsmeade_trip_1767891681946.webp
```
通过活点地图显示的秘密通道，你溜进了霍格莫德村。

白雪覆盖的街道上，蜂蜜公爵糖果店、三把扫帚酒吧热闹非凡。

你在三把扫帚酒吧偷听到麦格教授、福吉部长和海格的对话...

他们在谈论小天狼星·布莱克。

* [躲在附近偷听] -> truth_about_sirius

---

# truth_about_sirius
```image-gen
prompt: Harry hiding under a table in Three Broomsticks, shocked expression, overhearing adults talking. McGonagall, Fudge and Hagrid at a nearby table.
character: harry
url: https://i.muistory.com/images/harry-potter-3/1767943559598-scene_truth_about_sirius_1767941005467.webp
```
"布莱克是波特家的保密人，"麦格教授说，"詹姆和莉莉把他们的藏身地点托付给他。"

"然后他把一切都告诉了神秘人，"福吉部长叹息，"那一晚，波特夫妇就被杀了。"

"而且，"海格抽泣着，"他还是哈利的教父啊！"

你的血液似乎凝固了。

小天狼星·布莱克... 你父母最好的朋友... 你的教父... 你曾经信任的人...

**背叛了你的父母，导致他们死亡？！**

* [愤怒地离开] -> leave_hogsmeade (set: health = health - 10)

---

# leave_hogsmeade
```image-gen
prompt: Harry walking alone in the snow outside Hogsmeade, tears frozen on his face, overwhelming anger and grief. Dramatic emotional comic panel.
character: harry
url: https://i.muistory.com/images/harry-potter-3/1767943548678-scene_leave_hogsmeade_1767941397543.webp
```
你冲出酒吧，不顾一切地往回走。雪花落在你脸上，化成冰冷的眼泪。

小天狼星·布莱克害死了你的父母。

现在他越狱了... 是来杀你的。

你发誓，你会先找到他。你会让他付出代价...

但就在这时——一股熟悉的寒意袭来。

* [摄魂怪出现了！] -> dementor_hogsmeade

---

# dementor_hogsmeade
```image-gen
prompt: Multiple Dementors swooping down toward Harry in the snowy field outside Hogsmeade. Harry falling to his knees, wand raised desperately.
characters: [harry, dementor]
url: https://i.muistory.com/images/harry-potter-3/1767943542641-scene_dementor_hogsmeade_1767921882042.webp
```
三个摄魂怪从空中俯冲而下！

在这里，没有卢平教授来救你。你只能靠自己。

"呼...呼神护卫...！"

你想起那些快乐的回忆... 但愤怒和悲伤正在吞噬它们...

你母亲的尖叫声越来越大...

* [集中精力！释放守护神！] -> patronus_battle_hogsmeade

---

# patronus_battle_hogsmeade
```minigame-gen
prompt: '摄魂怪对抗小游戏。三个摄魂怪从不同方向逼近。玩家需要保持专注，在恐惧干扰中收集快乐回忆碎片，积累能量释放守护神。摄魂怪每靠近一步，屏幕会变暗，干扰会增加。能量满后点击释放，击退所有摄魂怪即可获胜。失败则生命值大幅减少。'
variables:
  battle_result: 战斗结果
url: https://i.muistory.com/images/harry-potter-3/1767943538335-harry-potter-3_patronus_battle_hogsmeade_minigame.js
```
寒冷侵入骨髓。你的视线开始模糊...

不！你不能倒下！

想起霍格沃茨！想起朋友们！想起... 想起你渴望有一个真正的家...

（小游戏：摄魂怪对抗）

* [成功击退摄魂怪] -> patronus_success_hogsmeade (if: battle_result >= 60) (set: patronus_power = patronus_power + 25)
* [勉强逃脱] -> patronus_fail_hogsmeade (set: health = health - 25)

---

# patronus_success_hogsmeade
```image-gen
prompt: A silver shield of light erupting from Harry's wand, driving back the Dementors. Harry standing strong despite exhaustion. Triumphant moment.
character: harry
url: https://i.muistory.com/images/harry-potter-3/1767943555193-scene_patronus_success_hogsmeade_1767922088375.webp
```
"呼神护卫！！！"

一道强烈的银光从你的魔杖中爆发！

虽然还不是完整的守护神形态，但这道光足以击退三个摄魂怪。它们发出刺耳的尖啸，飞向天空消失了。

你瘫倒在雪地里，浑身颤抖，但... 你活下来了。

你做到了。

* [返回霍格沃茨] -> quidditch_match

---

# patronus_fail_hogsmeade
```image-gen
prompt: Harry collapsed in the snow, barely conscious, a large black dog pulling him away from retreating Dementors. Mysterious rescue.
character: harry
url: https://i.muistory.com/images/harry-potter-3/1767943552063-scene_patronus_fail_hogsmeade_1767922068127.webp
```
银光只闪烁了一瞬间就消失了。你倒在雪地里，摄魂怪越来越近...

就在你失去意识前，你看到了一个模糊的身影——一只巨大的黑狗冲向摄魂怪？

当你醒来时，你已经躺在医疗翼里了。没有人知道是谁救了你。

* [继续前进] -> quidditch_match

---

# quidditch_match
```image-gen
prompt: Quidditch match in a terrible thunderstorm, Harry on his broom searching for the Golden Snitch. Lightning and rain making visibility poor.
character: harry
url: https://i.muistory.com/images/harry-potter-3/1767943555170-scene_quidditch_match_1767891526447.webp
```
一切准备就绪，魁地奇赛季开始了！格兰芬多对赫奇帕奇。

但比赛当天，暴风雨来临。雷电交加，雨水倾盆。

你几乎看不见金色飞贼在哪里。闪电划过，你瞥见了一道金光——

就在那一刻，你感到那股熟悉的寒意...

看台上方，无数摄魂怪正在聚集。

* [继续追飞贼！] -> quidditch_dementors
* [准备施放守护神] -> quidditch_dementors (set: patronus_power = patronus_power + 5)

---

# quidditch_dementors
```image-gen
prompt: Harry falling from his broomstick high in the sky as Dementors swarm. His Nimbus 2000 flying toward the Whomping Willow. Dramatic falling pose.
character: harry
url: https://i.muistory.com/images/harry-potter-3/1767943555210-scene_quidditch_dementors_1767891720073.webp
```
数十个摄魂怪涌向球场。你的扫帚开始颤抖，你的手指僵硬...

你母亲的声音再次响起："不是哈利，求求你！"

然后是绿光，尖叫声，还有——

你坠落了。

* [陷入黑暗...] -> wake_up_hospital

---

# wake_up_hospital
```image-gen
prompt: Harry waking up in the Hospital Wing, Ron and Hermione beside him looking worried. A broken broomstick showing in the background.
characters: [harry, ron, hermione]
url: https://i.muistory.com/images/harry-potter-3/1767943560671-scene_wake_up_hospital_1767941048049.webp
```
你再次在医疗翼里醒来。

"你掉了下来，"赫敏颤抖着说，"邓布利多用魔法接住了你..."

"但是你的扫帚..."罗恩指向床边一堆碎木头，"它飞进了打人柳..."

你的光轮2000，变成了一堆残渣。

"我们输了比赛，"罗恩低声说，"但至少你活着。"

你必须变得更强。下一次，你不会再倒下。

* [继续守护神训练] -> patronus_lesson_final

---

# patronus_lesson_final
```image-gen
prompt: Harry casting a powerful silver stag Patronus in a classroom, the majestic deer form galloping through the air. Lupin watching with pride.
characters: [harry, lupin]
url: https://i.muistory.com/images/harry-potter-3/1767943553526-scene_patronus_lesson_final_1767941278841.webp
```
经过数周的刻苦训练，卢平认为你已经准备好面对真正的考验了。

"这一次，我不会干预。"他严肃地说。

箱子打开，博格特变成摄魂怪的那一刻，你集中了所有的意志。

你想起的不再只是飞行的快乐... 你想起了父母牺牲自己保护你的爱。

"**呼神护卫！**"

一头银色的雄鹿从你魔杖尖端奔腾而出！

* [太棒了！完整的守护神！] -> full_patronus (set: patronus_power = patronus_power + 40)

---

# full_patronus
```image-gen
prompt: A magnificent silver stag Patronus standing protectively next to Harry, antlers gleaming. Lupin wiping a tear from his eye.
character: harry
url: https://i.muistory.com/images/harry-potter-3/1767943543755-scene_full_patronus_1767891641609.webp
```
银色雄鹿昂首挺立，散发着温暖的光芒。博格特摄魂怪被驱散得无影无踪。

卢平的眼眶湿润了。"你父亲... 他的守护神也是雄鹿。"

"你继承了他的灵魂。"

此时，学年已近尾声。巴克比克的上诉失败了——它将在今晚被处决。

赫敏说有办法救它... 但她没有解释。

* [前往海格的小屋告别] -> hagrid_hut

---

# hagrid_hut
```image-gen
prompt: Hagrid's hut at sunset, Harry, Ron and Hermione walking toward it. Buckbeak tied up nearby. Sad, golden hour lighting.
characters: [harry, ron, hermione, buckbeak]
url: https://i.muistory.com/images/harry-potter-3/1767943545150-scene_hagrid_hut_1767891620793.webp
```
海格泣不成声。"巴克比克不该死... 它什么都没做错..."

你们试图安慰他，但都无能为力。

就在这时，赫敏在牛奶壶里发现了斑斑！罗恩一直认为它被克鲁克山吃掉了，但它一直躲在这里。

"它咬我！"罗恩惊叫着追出去抓住斑斑。

然后——一只巨大的黑狗从暗处冲出来！

它咬住罗恩的腿，把他拖进了打人柳的树洞！

* [追进去！] -> whomping_willow

---

# whomping_willow
```image-gen
prompt: Harry and Hermione crawling through a tunnel under the Whomping Willow, wands lit. Dark, cramped passage leading toward the Shrieking Shack.
characters: [harry, hermione]
url: https://i.muistory.com/images/harry-potter-3/1767943562095-scene_whomping_willow_1767891559748.webp
```
打人柳拼命抽打，但你们设法钻进了树下的隧道。

爬行了很久，隧道尽头出现了一间破旧的房屋——

尖叫棚屋。霍格莫德最闹鬼的地方。

罗恩在一间满是灰尘的房间里，腿受了伤。

那只黑狗站在他身边... 然后它开始变形。

* [那不是狗——是人！] -> sirius_reveal

---

# sirius_reveal
```image-gen
prompt: Sirius Black transforming from a large black dog into human form, gaunt and wild-eyed, in the dusty Shrieking Shack. Harry pointing his wand, torn between fear and rage.
characters: [harry, sirius]
url: https://i.muistory.com/images/harry-potter-3/1767943557035-scene_sirius_reveal_1767873542080.webp
```
黑狗变成了小天狼星·布莱克。

那个害死你父母的人。那个逃出阿兹卡班追杀你的人。

"哈利... 终于见到你了..."他的声音沙哑。

愤怒在你胸中燃烧。你举起魔杖——

"等等！"一个声音从楼下传来。卢平教授冲进房间！

令你震惊的是，他走向小天狼星... 拥抱了他？！

* [什么意思？！] -> shrieking_shack_truth
* [袭击小天狼星！] -> attack_sirius

---

# attack_sirius
```image-gen
prompt: Harry firing a spell at Sirius, who dodges. Lupin restraining Harry desperately. Tense magical confrontation.
characters: [harry, sirius, lupin]
url: https://i.muistory.com/images/harry-potter-3/1767943539185-scene_attack_sirius_1767921826819.webp
```
"他杀了我父母！"你冲向小天狼星。

但卢平拦住了你。"哈利，听我说！你不知道真相！"

"小天狼星没有背叛你的父母——是彼得·佩迪鲁！"

你愣住了。"佩迪鲁？十二年前就死了！"

"他没死。"小天狼星的眼中燃烧着怒火，"他就在这个房间里。"

他的手指向罗恩——不，是指向罗恩手里的那只老鼠。

"斑斑... 是彼得·佩迪鲁。"

* [什么？！] -> shrieking_shack_truth

---

# shrieking_shack_truth
```image-gen
prompt: Scabbers the rat being forced to transform into Peter Pettigrew, a balding, rat-like man cowering on the floor. Harry, Ron, Hermione, Sirius and Lupin surrounding him.
characters: [harry, sirius, lupin, pettigrew]
url: https://i.muistory.com/images/harry-potter-3/1767943556996-scene_shrieking_shack_truth_1767922151889.webp
```
卢平和小天狼星用魔法强迫斑斑变形。

老鼠扭曲膨胀，变成了一个矮胖的男人——彼得·佩迪鲁，和照片上一模一样，只是少了一根手指。

"是他！"小天狼星咆哮，"他是真正的叛徒！他把你父母出卖给伏地魔！然后炸毁街道假死，嫁祸给我！他作为老鼠躲了十二年！"

佩迪鲁跪在地上哭求："哈利... 你漂亮的妈妈... 她不会希望我被杀的..."

"你出卖了她！"你的声音颤抖着。

你相信小天狼星吗？

* [相信小天狼星] -> trust_sirius (set: trust_sirius = true)
* [还是无法完全信任] -> distrust_continues

---

# trust_sirius
```image-gen
prompt: Harry lowering his wand, looking at Sirius with new understanding. Sirius's expression softening with hope. Emotional reconciliation moment.
characters: [harry, sirius]
url: https://i.muistory.com/images/harry-potter-3/1767943559555-scene_trust_sirius_1767940983861.webp
```
证据太明显了。地图上的名字... 克鲁克山的直觉... 还有小天狼星眼中的真诚。

"你是我的教父。"你说。

小天狼星的眼中闪过泪光。"詹姆和莉莉曾经... 让我做你的监护人。如果你愿意... 你可以来和我一起住。离开德思礼家。"

一个真正的家？

"我愿意。"

* [押送佩迪鲁回城堡] -> leave_shack

---

# distrust_continues
```image-gen
prompt: Harry still pointing wand at both Sirius and Pettigrew, uncertain and conflicted. Hermione watching tensely.
character: harry
url: https://i.muistory.com/images/harry-potter-3/1767943542491-scene_distrust_continues_1767941363183.webp
```
"我... 我不知道..."

你需要更多证据。但就在这时，斯内普教授破门而入！

他一直在跟踪你们。他用魔杖指着小天狼星，准备把他交给摄魂怪。

"不！"你、罗恩和赫敏同时冲上去——

你们三个同时对斯内普施了缴械咒。斯内普飞出去撞在墙上，昏了过去。

现在，必须做出决定。

* [相信小天狼星，押送佩迪鲁] -> leave_shack (set: trust_sirius = true)

---

# leave_shack
```image-gen
prompt: The group emerging from the Whomping Willow tunnel at night, full moon rising. Peter Pettigrew bound by magical ropes. Ominous atmosphere.
characters: [harry, sirius, lupin, pettigrew]
url: https://i.muistory.com/images/harry-potter-3/1767943548517-scene_leave_shack_1767921973609.webp
```
你们从隧道里爬出来。夜空中，一轮满月升起...

卢平忽然停下脚步。他的脸开始扭曲。

"不... 我忘了喝药水..."

他是狼人！今晚是满月！

卢平开始痛苦地变形，他的身体拉长，皮毛生长，发出狼嚎——

佩迪鲁趁乱变回老鼠，逃进了黑暗中！

* [追！] -> werewolf_chaos

---

# werewolf_chaos
```image-gen
prompt: Werewolf Lupin howling at the moon, Sirius in dog form fighting against him to protect the children. Chaos and fear in the moonlight.
characters: [sirius, lupin]
url: https://i.muistory.com/images/harry-potter-3/1767943560593-scene_werewolf_chaos_1767941345489.webp
```
小天狼星变回大黑狗，扑向狼人卢平，试图阻止他伤害你们。

你们没办法追佩迪鲁——他逃了。

小天狼星被狼人打伤，跌落湖边。你跑去救他。

但就在这时——天空变得更黑了。

一股刺骨的寒意从湖面升起。

数百个摄魂怪正从各个方向涌来。

* [不！] -> lake_dementors

---

# lake_dementors
```image-gen
prompt: Hundreds of Dementors descending upon Harry and Sirius by the lake. Harry trying to cast Patronus but failing. Overwhelming darkness and despair.
characters: [harry, sirius, dementor]
url: https://i.muistory.com/images/harry-potter-3/1767943548475-scene_lake_dementors_1767873650495.webp
```
你举起魔杖。"呼神护卫！"

银光闪烁... 但太弱了。摄魂怪太多了。

它们开始吸取小天狼星的灵魂——摄魂怪之吻！

"不！！！"你尖叫着，但自己也即将失去意识。

就在你即将倒下的那一刻——

湖对岸爆发出一道无比耀眼的银光。一头巨大的银色雄鹿守护神冲向摄魂怪群！

是谁？

那个身影... 看起来像...

然后，黑暗吞噬了你。

* [醒来] -> hospital_time

---

# hospital_time
```image-gen
prompt: Harry waking up in the Hospital Wing again. Hermione leaning close with an urgent expression, holding a strange hourglass necklace - the Time Turner.
characters: [harry, hermione]
url: https://i.muistory.com/images/harry-potter-3/1767943546937-scene_hospital_time_1767921938578.webp
```
"哈利！醒醒！"

你在医疗翼里。赫敏在你身边，表情焦急。

"小天狼星被抓了！他们要对他执行摄魂怪之吻——今晚！"

"我们必须救他！但怎么可能——"

赫敏从脖子上取下一条项链，上面挂着一个小沙漏。

"这是时间转换器。麦格教授给我用的（上额外的课）。我们可以回到过去——"

邓布利多刚才来过。他暗示你们需要"多一点时间"。

"我们可以救两条无辜的生命。"赫敏说。

巴克比克... 和小天狼星。

* [使用时间转换器！] -> time_turn_start

---

# time_turn_start
```image-gen
prompt: Harry and Hermione turning the Time Turner together, world blurring around them as time reverses. Magical golden trails and clock imagery.
characters: [harry, hermione]
url: https://i.muistory.com/images/harry-potter-3/1767943559710-scene_time_turn_start_1767922227062.webp
```
赫敏把项链套在你们两个脖子上，转动三次。

世界开始旋转——颜色模糊，时间倒流...

你们站在数小时前的霍格沃茨。太阳还没落山。

"记住，"赫敏严肃地说，"我们绝对不能被过去的自己看见！否则会发生可怕的事！"

海格的小屋在远处。"过去的我们"正走过去...

巴克比克还活着。

* [救巴克比克！] -> rescue_buckbeak

---

# rescue_buckbeak
```minigame-gen
prompt: '时间追逐小游戏。玩家需要在不被发现的情况下潜入救巴克比克。屏幕上会显示"过去的人物"的位置和视野范围。避开它们的视线，在时限内解开巴克比克的绳索即可成功。被发现则造成时间悖论，任务失败。'
variables:
  rescue_success: 救援成功
url: https://i.muistory.com/images/harry-potter-3/1767943538993-harry-potter-3_rescue_buckbeak_minigame.js
```
```image-gen
prompt: Harry and Hermione hiding behind Hagrid's pumpkins, watching their past selves inside the hut. Buckbeak tied up nearby. Tense stealth moment.
characters: [harry, hermione, buckbeak]
url: https://i.muistory.com/images/harry-potter-3/1767943557080-scene_rescue_buckbeak_1767873628069.webp
```
你们躲在海格的南瓜田后面，看着"过去的自己"进入小屋。

行刑队正在走来。时间不多了！

"过去的我们"离开时会分散行刑者的注意力。那就是你们的机会！

（小游戏：时间追逐——救巴克比克）

* [成功解救！] -> buckbeak_freed (if: rescue_success >= 50) (set: buckbeak_saved = true)
* [被发现了！] -> time_paradox_fail

---

# time_paradox_fail
```image-gen
prompt: Harry accidentally seen by his past self, both staring in shock. Reality cracking and distorting around them with temporal energy.
character: harry
url: https://i.muistory.com/images/harry-potter-3/1767943558393-scene_time_paradox_fail_1767922210721.webp
```
一个失误——你踩到了干树枝！

"过去的你"转过头来，直直地看向你的方向...

时间裂缝开始出现。现实扭曲。

一切开始崩塌...

**时间悖论。任务失败。**

---

# buckbeak_freed
```image-gen
prompt: Harry leading Buckbeak away into the Forbidden Forest, Hermione covering their retreat. The executioner's axe falling on an empty stump.
characters: [harry, buckbeak]
url: https://i.muistory.com/images/harry-potter-3/1767943540711-scene_buckbeak_freed_1767891741050.webp
```
就在行刑者举起斧头的那一刻——

你牵着巴克比克消失在禁林中！

远处传来斧头落下的声音... 但它砍中的只是栅栏。

巴克比克得救了。

"现在我们需要等。"赫敏说。

你们必须等到"过去的你们"进入尖叫棚屋，然后去到湖边...

* [等待正确的时机] -> wait_for_lake

---

# wait_for_lake
```image-gen
prompt: Harry and Hermione hiding in the forest edge at night, watching the distant lake where Dementors are gathering. Full moon overhead.
characters: [harry, hermione]
url: https://i.muistory.com/images/harry-potter-3/1767943560757-scene_wait_for_lake_1767941027896.webp
```
时间过得很慢。满月升起。

远处你看到了"过去的自己"从打人柳出来... 狼人出现... 小天狼星倒下...

摄魂怪开始涌向湖边。

"那个救了我们的守护神... 是谁施的？"你喃喃道。

你一直以为... 是你父亲。但现在你意识到了。

那个守护神，那头银色雄鹿——

**是你自己。**

* [冲出去！施放守护神！] -> final_patronus

---

# final_patronus
```minigame-gen
prompt: '最终守护神决战小游戏。数百个摄魂怪围攻湖边。玩家需要集中所有意志，释放有史以来最强大的守护神。难度最高，需要完美收集所有快乐回忆碎片，在黑暗完全吞噬屏幕前填满能量条。成功则释放完整雄鹿守护神驱散一切；失败则前功尽弃。'
variables:
  final_result: 最终结果
url: https://i.muistory.com/images/harry-potter-3/1767943538381-harry-potter-3_final_patronus_minigame.js
```
```image-gen
prompt: Harry standing at the lake edge, wand raised toward the sky, face illuminated by rising silver light. Hundreds of Dementors recoiling. Epic magical moment.
character: harry
```
你从树林里冲出来，站在湖岸边。

数百个摄魂怪正在吸取"过去的你"和小天狼星的灵魂。

这一次，你不能失败。你知道自己能做到——因为你*已经*做到了。

想起父母的爱。想起朋友。想起有一天，你会有家的那个希望。

"**呼神护卫！！！**"

（小游戏：最终守护神决战）

* [完美释放！银色雄鹿！] -> patronus_victory (if: final_result >= 80)
* [失败了...] -> game_over_dementor (set: health = 0)

---

# patronus_victory
```image-gen
prompt: A majestic silver stag Patronus charging through hundreds of Dementors, scattering them like leaves in a storm. Harry watching in awe. Triumphant silver light flooding the scene.
character: harry
url: https://i.muistory.com/images/harry-potter-3/1767943555238-scene_patronus_victory_1767922110087.webp
```
一头无比巨大的银色雄鹿从你的魔杖中奔腾而出！

它冲入摄魂怪群，银光如日光般耀眼！

摄魂怪发出刺耳的尖啸，被完全驱散！它们像阴影遇到日出一样消失在天际！

"过去的你"抬头看向这边——

他看到的是你。他以为那是詹姆·波特... 但那是你自己。

你救了自己。

* [完成最后一步——救出小天狼星] -> rescue_sirius (if: courage < 90)
* [等等，克鲁克山在追什么？] -> ending_hidden (if: courage >= 90, patronus_power >= 90)

---

# rescue_sirius
```image-gen
prompt: Harry and Hermione flying on Buckbeak up to Hogwarts tower at night, approaching a barred window where Sirius is imprisoned. Heroic rescue mission.
characters: [harry, hermione, buckbeak, sirius]
url: https://i.muistory.com/images/harry-potter-3/1767943556995-scene_rescue_sirius_1767873686402.webp
```
你们骑着巴克比克飞向城堡顶层——小天狼星被关在那里。

赫敏用咒语炸开铁栏，小天狼星爬上巴克比克的背。

"哈利..."小天狼星的眼中满是感激，"你真的很像詹姆。但内心... 你更像莉莉。"

"逃走吧，"你说，"总有一天... 我会和你一起住的。"

巴克比克展翅飞向夜空，载着小天狼星消失在星光之中。

* [返回医疗翼] -> ending_success

---

# ending_success
```image-gen
prompt: Harry looking out the Hogwarts window at dawn, smiling. A letter from Sirius and a magnificent Firebolt broomstick beside him. Hopeful new beginning.
character: harry
url: https://i.muistory.com/images/harry-potter-3/1767943543774-scene_ending_success_1767873740257.webp
```
一周后，你收到了一封信和一个包裹。

信来自小天狼星，他和巴克比克安全了。

包裹里... 是一把崭新的**火弩箭**！世界上最快的飞天扫帚！

"是我让你丢了扫帚，"信上写道，"就当是教父给教子的礼物。"

你微笑着握紧扫帚。

虽然佩迪鲁逃走了，虽然小天狼星还是逃犯，但一切都会好起来的。

你终于有了家人。

> "决定我们成为什么样的人的，不是我们的能力，而是我们的选择。"

**恭喜通关！**

---

# game_over_dementor
```image-gen
prompt: Harry's soul being extracted by Dementors, ghostly ethereal wisps leaving his body. Dark horrifying scene of the Dementor's Kiss.
characters: [harry, dementor]
url: https://i.muistory.com/images/harry-potter-3/1767943545240-scene_game_over_dementor_1767941380737.webp
```
摄魂怪的手抓住了你的脸。

那股冰冷直接刺入你的灵魂。

你感到自己被抽离... 一切记忆... 一切快乐... 一切自我...

摄魂怪之吻。

哈利·波特成为了一具空壳。活下来的男孩的传奇... 就此终结。

**GAME OVER**

---

# ending_hidden
```image-gen
prompt: Pettigrew captured in magical bonds, being dragged toward the Ministry of Magic by Aurors. Sirius free and vindicated. Justice finally served.
characters: [sirius, pettigrew]
url: https://i.muistory.com/images/harry-potter-3/1767943543646-scene_ending_hidden_1767891760868.webp
```
（隐藏结局条件：勇气 > 90 且 守护神力量 > 90）

在最后关头，克鲁克山从天而降！

那只橘色的猫追上了变成老鼠的佩迪鲁，死死咬住不放！

佩迪鲁被迫变回人形，被赶来的傲罗逮捕！

有了佩迪鲁作证，小天狼星终于洗清了冤屈！

他成为了你合法的监护人。

你再也不用回德思礼家了——

你终于有了一个真正的、永远的家。

**完美结局！**
