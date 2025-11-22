---
title: 凡人修仙传
description: 一个普通凡人踏上修仙之路的冒险故事，你的选择将决定你的命运和修为境界。
cover_image: https://picsum.photos/400/600
tags:
  - 修仙
  - 冒险
  - 多分支
  - 东方玄幻
published: true
state:
  cultivation_level: 0
  has_manual: false
  has_pill: false
  qi_refined: false
  met_elder: false
ai:
  style:
    image: Chinese xianxia cultivation fantasy art, ancient Chinese style, ethereal, mystical mountains and clouds
    audio: traditional Chinese music with mystical elements, serene yet powerful
  characters:
    protagonist:
      name: 韩立
      image_prompt: a young man in simple ancient Chinese robes, determined expression, ordinary appearance
    elder:
      name: 墨老
      image_prompt: an old immortal master with white beard, wearing daoist robes, wise and mysterious
    demon:
      name: 魔修
      image_prompt: a dark cultivator with sinister aura, black robes, demonic energy swirling around
---

# start
```image-gen
prompt: A humble village in ancient China, a young man working in fields, mountains in the distance shrouded in mist
character: protagonist
url: https://images.baifo.life/images/mortal-cultivation/start.png
```
你叫韩立，是一个普通的山村少年。日复一日，你在田间劳作，过着平凡的生活。然而，你心中总有一个梦想——踏上修仙之路，追求长生不老。

一天，你听说附近的山中有一位隐世高人，或许能指点你修仙之道。
* [前往山中寻找机缘] -> mountain_search
* [继续平凡生活，放弃修仙梦想] -> mortal_life

---

# mountain_search
```audio-gen
type: background_music
prompt: mysterious, ancient Chinese music with flute and guqin, ethereal atmosphere
```
```image-gen
prompt: A young man climbing a misty mountain path, ancient Chinese mountains with floating clouds, mystical atmosphere
character: protagonist
url: https://images.baifo.life/images/mortal-cultivation/mountain.png
```
你踏上了寻仙之路。山路崎岖，云雾缭绕。经过数日的跋涉，你终于在一处隐秘的山洞前，发现了一位白发苍苍的老者正在打坐。

老者睁开眼睛，目光如电。"年轻人，你为何来此？"
* [恭敬地说明来意，请求收徒] -> meet_elder (set: met_elder = true)
* [观察老者，谨慎应对] -> cautious_approach

---

# meet_elder
```image-gen
prompt: An old immortal master examining a young disciple, ancient Chinese cultivation scene
character: elder
url: https://images.baifo.life/images/mortal-cultivation/elder.png
```
老者打量了你一番，点了点头。"你资质虽然普通，但心性尚可。老夫可以传你一部基础功法，但能否有所成就，全看你的造化了。"

他递给你一本泛黄的古籍——《长春功》。
* [恭敬地接过功法，立即开始修炼] -> receive_manual (set: has_manual = true)
* [询问修炼的注意事项] -> ask_advice

---

# cautious_approach
```image-gen
prompt: A young man observing an old master from a distance, cautious and alert
character: protagonist
url: https://images.baifo.life/images/mortal-cultivation/cautious.png
```
你并没有立即表明来意，而是仔细观察着老者。你发现老者虽然仙风道骨，但眼神中似乎隐藏着什么。老者似乎察觉到了你的谨慎，微微一笑。

"年轻人，修仙之路充满危险，但也充满机遇。你愿意冒险一试吗？"
* [决定相信老者，请求指点] -> meet_elder (set: met_elder = true)
* [保持警惕，先离开] -> leave_mountain

---

# receive_manual
```image-gen
prompt: A young man reading an ancient cultivation manual by candlelight in a cave
character: protagonist
url: https://images.baifo.life/images/mortal-cultivation/reading.png
```
你接过《长春功》，如获至宝。回到村中，你开始日夜研读。这是一部基础功法，能够引气入体，炼化天地灵气。

经过数月的苦修，你终于感受到了体内第一缕真气的流动。
* [继续苦修，提升修为] -> cultivation_training (set: cultivation_level = 1)
* [寻找灵药辅助修炼] -> search_herbs

---

# ask_advice
```image-gen
prompt: An old master teaching a young disciple about cultivation principles
character: elder
url: https://images.baifo.life/images/mortal-cultivation/teaching.png
```
老者满意地点了点头。"很好，知道询问说明你并非鲁莽之人。修炼之道，首重心性，其次才是资质。记住，欲速则不达，基础要打牢。"

他详细地为你讲解了修炼的要点，然后才将《长春功》交给你。
* [感谢老者，开始修炼] -> receive_manual (set: has_manual = true, cultivation_level = 1)

---

# cultivation_training
```audio-gen
type: background_music
prompt: meditative, peaceful music with flowing energy
```
```image-gen
prompt: A young cultivator meditating, spiritual energy swirling around him, ancient Chinese cultivation scene
character: protagonist
url: https://images.baifo.life/images/mortal-cultivation/meditation.png
```
你日复一日地修炼，体内的真气逐渐壮大。你感受到了炼气期的门槛。然而，突破需要契机。

一天，你在山中采药时，发现了一株散发着灵光的灵草。
* [采摘灵草，尝试炼化] -> found_spirit_herb
* [继续苦修，等待自然突破] -> breakthrough_attempt

---

# search_herbs
```image-gen
prompt: A young man searching for spiritual herbs in a mystical forest, glowing plants
character: protagonist
url: https://images.baifo.life/images/mortal-cultivation/herbs.png
```
你决定寻找灵药来辅助修炼。经过数日的搜寻，你在一处隐秘的山谷中发现了一株百年灵参，散发着浓郁的灵气。

同时，你也注意到附近似乎有其他人的气息。
* [立即采摘灵参] -> found_spirit_herb (set: has_pill = true)
* [先观察周围情况] -> observe_surroundings

---

# found_spirit_herb
```image-gen
prompt: A glowing spiritual herb being harvested, mystical energy radiating
url: https://images.baifo.life/images/mortal-cultivation/herb-harvest.png
```
你小心翼翼地采摘了灵草/灵参。回到修炼之地，你将其炼化。磅礴的灵气涌入你的体内，你感到修为在飞速提升！

你成功突破到了炼气期第一层！
* [继续修炼，巩固境界] -> breakthrough_attempt (set: cultivation_level = 2, qi_refined = true)

---

# observe_surroundings
```image-gen
prompt: A dark figure watching from the shadows, sinister aura
character: demon
url: https://images.baifo.life/images/mortal-cultivation/demon.png
```
你仔细观察，发现一个黑衣修士正潜伏在暗处，显然也在打这株灵参的主意。他身上的气息让你感到不安——那是魔道修士的气息。

你意识到这是一场争夺。
* [先下手为强，抢夺灵参] -> fight_demon
* [悄悄离开，避免冲突] -> leave_quietly

---

# breakthrough_attempt
```audio-gen
type: background_music
prompt: powerful, ascending music with energy building up
```
```image-gen
prompt: A cultivator breaking through cultivation realm, spiritual energy explosion, light radiating
character: protagonist
url: https://images.baifo.life/images/mortal-cultivation/breakthrough.png
```
经过长时间的积累，你感到体内的真气已经达到了临界点。你决定尝试突破。

你盘膝而坐，运转功法，引导真气冲击瓶颈。经过一番努力，你终于突破了！
* [成功突破，继续修炼之路] -> cultivation_success (set: cultivation_level = 3, qi_refined = true)

---

# fight_demon
```audio-gen
type: sfx
prompt: intense battle music, clashing swords, magical energy explosions
```
```image-gen
prompt: A fierce battle between a young cultivator and a dark demonic cultivator, energy blasts and flying swords
character: demon
url: https://images.baifo.life/images/mortal-cultivation/battle.png
```
你决定先发制人！你运转真气，向魔修发起了攻击。然而，对方的修为明显在你之上。经过一番激战，你虽然受了伤，但凭借着机智和运气，你成功击退了对方，获得了灵参。

你炼化了灵参，修为大增！
* [疗伤后继续修炼] -> cultivation_success (set: cultivation_level = 3, has_pill = true, qi_refined = true)

---

# leave_quietly
```image-gen
prompt: A young man leaving quietly, avoiding conflict, wise decision
character: protagonist
url: https://images.baifo.life/images/mortal-cultivation/leave.png
```
你明智地选择了离开。虽然失去了灵参，但你保住了性命。你明白，在修仙界，有时候退让比硬拼更明智。

你继续苦修，虽然没有灵药辅助，但你的基础更加扎实。
* [继续修炼，稳扎稳打] -> cultivation_success (set: cultivation_level = 2)

---

# cultivation_success
```audio-gen
type: background_music
prompt: triumphant, ascending music, achievement unlocked
```
```image-gen
prompt: A successful cultivator standing on a mountain peak, looking at the vast world below, new horizons ahead
character: protagonist
url: https://images.baifo.life/images/mortal-cultivation/success.png
```
恭喜！你成功踏上了修仙之路。虽然这只是开始，但你已经不再是那个普通的凡人少年了。

前方的路还很长，更高的境界、更强的敌人、更多的机缘在等待着你。你的修仙之路才刚刚开始...
* [继续冒险] -> start

---

# mortal_life
```image-gen
prompt: A peaceful village scene, a young man working in fields, content with simple life
character: protagonist
url: https://images.baifo.life/images/mortal-cultivation/mortal.png
```
你选择了平凡的生活。虽然心中偶尔还会想起修仙的梦想，但你明白，不是每个人都有仙缘。

你娶妻生子，过着普通人的生活，虽然平凡，但也算幸福。也许，这就是你的命运。
* [重新开始，选择修仙] -> start

---

# leave_mountain
```image-gen
prompt: A young man descending the mountain, looking back with regret
character: protagonist
url: https://images.baifo.life/images/mortal-cultivation/regret.png
```
你选择了离开。回到村中，你继续过着平凡的生活。然而，你心中始终有一个遗憾——如果当初选择了修仙，会怎样呢？

也许，这就是命运。但也许，还有机会...
* [重新开始] -> start

