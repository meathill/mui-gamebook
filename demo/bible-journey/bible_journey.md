---
title: 圣经之路：现代美国篇
description: 通过性格测试发现你的圣经人物原型，开启现代美国背景下的信仰之旅
backgroundStory: |
  每个人心中都有一段属于自己的旅程。

  在这个游戏中，你将通过几个简单的情境选择，发现自己与哪位圣经人物最为相似。
  然后，你将以现代美国人的身份，重新走过他们的命运之路。

  你的选择将决定你的结局——是获得救赎，还是迷失方向？
cover_image: https://i.muistory.com/images/bible-journey/1768012476041-cover.webp
cover_prompt: A modern American city skyline at sunset with a subtle golden divine light breaking through clouds, symbolic of faith and journey, cinematic style
tags:
  - 信仰
  - 互动故事
  - 性格测试
  - MBTI
state:
  personality_type: ''
  ei: 0
  sn: 0
  tf: 0
  jp: 0
  faith:
    value: 50
    visible: true
    display: progress
    max: 100
    label: 信仰
  courage:
    value: 50
    visible: true
    display: progress
    max: 100
    label: 勇气
ai:
  style:
    image: cinematic, modern American setting, dramatic lighting, realistic style
    audio: modern orchestral, emotional, inspirational
  characters:
    narrator:
      name: 旁白
      description: 神秘而温暖的引导之声
      image_prompt: abstract divine light rays through clouds
    marcus:
      name: Marcus Chen
      description: 35岁华裔美国人，硅谷AI创业公司CEO，戴着眼镜，穿着简约的科技圈风格
      image_prompt: 35 year old Asian American man, glasses, casual tech CEO style, confident
      image_url: https://i.muistory.com/images/bible-journey/1768012477086-marcus_portrait.webp
    david_m:
      name: David Miller
      description: 25岁白人青年，来自德州的独立音乐人，留着卷发，穿着牛仔夹克
      image_prompt: 25 year old white American man, curly hair, denim jacket, guitar, Brooklyn indie musician
      image_url: https://i.muistory.com/images/bible-journey/1768012477963-david_portrait.webp
    joseph_m:
      name: Joseph Rodriguez
      description: 28岁墨西哥裔美国人，华尔街天才分析师，穿着精致西装
      image_prompt: 28 year old Latino American man, sharp suit, Wall Street analyst, intelligent look
      image_url: https://i.muistory.com/images/bible-journey/1768012478635-joseph_portrait.webp
    peter_m:
      name: Peter Olsen
      description: 45岁挪威裔美国人，阿拉斯加渔船船长，浓密胡须，饱经风霜
      image_prompt: 45 year old Norwegian American man, thick beard, weathered face, fisherman captain, Alaska
      image_url: https://i.muistory.com/images/bible-journey/1768012479301-peter_portrait.webp
---

# start
```image-gen
prompt: A person standing at a crossroads under a vast American sky, multiple paths leading to different city skylines
url: https://i.muistory.com/images/bible-journey/1768012480524-scene_start.webp
```
**欢迎来到圣经之路**

每个人的生命旅程都有其独特的意义。在接下来的测试中，请根据直觉快速选择最符合你内心的答案。

这些选择将帮助我们找到与你灵魂最契合的圣经人物，开启专属于你的现代信仰之旅。

准备好了吗？
* [开始性格测试] -> personality_test

---

# personality_test
```image-gen
prompt: Abstract colorful personality dimensions visualization, four pathways of light representing different personality types
url: https://i.muistory.com/images/bible-journey/1768012481962-scene_personality_test.webp
```
```minigame-gen
prompt: MBTI性格测试小游戏，8道快速选择题判断四个维度(E/I, S/N, T/F, J/P)，每题限5秒，结束后返回四个维度分数
variables:
  - ei: E/I维度分数
  - sn: S/N维度分数
  - tf: T/F维度分数
  - jp: J/P维度分数
url: https://i.muistory.com/images/bible-journey/1768012482510-bible-journey_start_minigame.js
```
正在分析你的性格维度...
* [查看结果] -> result_nt (if: sn < 0 && tf > 0)
* [查看结果] -> result_nf (if: sn < 0 && tf <= 0)
* [查看结果] -> result_sj (if: sn >= 0 && jp > 0)
* [查看结果] -> result_sp (if: sn >= 0 && jp <= 0)

---

# result_nt
```image-gen
prompt: Silicon Valley office with glass windows overlooking the bay, modern tech environment
character: marcus
url: https://i.muistory.com/images/bible-journey/1768012483398-scene_result_nt.webp
```
**你的圣经原型：摩西 (Moses)**

你是一位**分析家型**（NT）人格。

像摩西一样，你拥有远见卓识和战略性思维。你能够看到他人看不到的可能性，并有勇气带领他人走向应许之地。

在现代美国，你将化身为硅谷创业者 **Marcus Chen**，一位AI公司的CEO。你即将面对的考验，与摩西带领以色列人出埃及一样艰难...
* [开启摩西之路] -> moses_1 (set: personality_type = "NT")

---

# result_nf
```image-gen
prompt: Brooklyn street at night with live music venue lights, indie music scene
character: david_m
url: https://i.muistory.com/images/bible-journey/1768012484698-scene_result_nf.webp
```
**你的圣经原型：大卫 (David)**

你是一位**外交家型**（NF）人格。

像大卫一样，你充满热情和创造力。你用内心的火焰感染他人，即使面对巨人也毫不畏惧。

在现代美国，你将化身为独立音乐人 **David Miller**，一位来自德州乡村的歌手。你即将在纽约的音乐丛林中，面对属于你的"歌利亚"...
* [开启大卫之路] -> david_1 (set: personality_type = "NF")

---

# result_sj
```image-gen
prompt: Wall Street buildings with American flags, financial district morning rush
character: joseph_m
url: https://i.muistory.com/images/bible-journey/1768012486232-scene_result_sj.webp
```
**你的圣经原型：约瑟 (Joseph)**

你是一位**守护者型**（SJ）人格。

像约瑟一样，你重视责任和诚信。即使被命运抛入深渊，你也能凭借坚定的信念和卓越的才能东山再起。

在现代美国，你将化身为金融分析师 **Joseph Rodriguez**，一位华尔街的天才。你即将经历背叛、沉沦与救赎...
* [开启约瑟之路] -> joseph_1 (set: personality_type = "SJ")

---

# result_sp
```image-gen
prompt: Alaska fishing boat on dramatic ocean waters, stormy sky
character: peter_m
url: https://i.muistory.com/images/bible-journey/1768012487520-scene_result_sp.webp
```
**你的圣经原型：彼得 (Peter)**

你是一位**探险家型**（SP）人格。

像彼得一样，你热情直率，敢于行动。虽然有时会冲动犯错，但你的忠诚和勇气终将带你走向救赎。

在现代美国，你将化身为渔船船长 **Peter Olsen**，阿拉斯加的第三代渔民。你即将在暴风雨中，找到生命的真正意义...
* [开启彼得之路] -> peter_1 (set: personality_type = "SP")

---

# moses_1
```image-gen
prompt: Modern Silicon Valley office with floor-to-ceiling windows, Marcus looking at city lights at dusk
character: marcus
url: https://i.muistory.com/images/bible-journey/1768012488380-scene_moses_1.webp
```
**第一章：燃烧的代码**

你是 Marcus Chen，NexusAI 的创始人兼CEO。你开发的AI系统正在改变世界——至少你曾经这样相信。

今晚，你在办公室加班审核代码时，发现了一些不该存在的东西：公司最大投资方 Pharaoh Capital 悄悄植入了监控模块。他们正在用你的技术监控数百万用户。

你的首席技术官 Aaron 走进来："Marcus，Victor Kane 明天要来视察。我们需要谈谈。"
* [告诉 Aaron 你的发现] -> moses_2a (set: courage = courage + 10)
* [暂时保密，独自调查] -> moses_2b

---

# moses_2a
```image-gen
prompt: Two Asian American tech executives having an intense private conversation in a glass office at night
url: https://i.muistory.com/images/bible-journey/1768012488981-scene_moses_2a.webp
```
Aaron 听完后脸色苍白："Marcus，Pharaoh Capital 占了我们60%的股份。如果你公开这件事..."

"我知道。"你说，"但这不是我创办公司的初衷。"

Aaron 沉默了一会儿："需要我帮你吗？"
* [接受Aaron的帮助] -> moses_3 (set: faith = faith + 10)
* [不，这是我自己的战斗] -> moses_3

---

# moses_2b
```image-gen
prompt: Marcus alone in server room, blue LED lights, investigating computer systems
url: https://i.muistory.com/images/bible-journey/1768012489687-scene_moses_2b.webp
```
你决定独自深入调查。在接下来的几周里，你秘密收集证据，同时在公开场合假装一切正常。

但 Victor Kane 似乎察觉到了什么。他开始派人监视你的一举一动。

一天深夜，你收到一封匿名邮件：**"他们知道了。快跑。"**
* [立即召集核心团队] -> moses_3 (set: courage = courage + 5)
* [联系媒体曝光真相] -> moses_3 (set: faith = faith + 5)

---

# moses_3
```image-gen
prompt: Victor Kane, 60 year old powerful businessman in expensive suit, intimidating presence in a boardroom
url: https://i.muistory.com/images/bible-journey/1768012490289-scene_moses_3.webp
```
**第二章：法老的威胁**

第二天，Victor Kane 亲自来到你的办公室。这位硅谷最有权势的投资人，此刻正用冰冷的目光看着你。

"Marcus，"他的声音低沉，"我听说你对我们的...合作方式有些疑虑。"

他在你对面坐下："让我给你一个选择。继续做个乖孩子，你的期权价值五亿美元。或者..."他顿了顿，"成为我的敌人。"
* [我需要时间考虑] -> moses_4a
* [我不会出卖用户的隐私] -> moses_4b (set: courage = courage + 15)

---

# moses_4a
```image-gen
prompt: Marcus standing alone on a rooftop garden at night, city lights below, contemplating
url: https://i.muistory.com/images/bible-journey/1768012491021-scene_moses_4a.webp
```
你为自己争取了时间。但在接下来的日子里，你内心的挣扎越来越强烈。

每天走进办公室，你都能感觉到同事们投来的目光。有些人知道了真相。他们在等待你的决定。

一个周末，你独自来到公司天台。城市的灯火在脚下闪烁，就像无数等待被保护的隐私。

然后你做出了决定。
* [我要带领团队离开这里] -> moses_5 (set: courage = courage + 10, faith = faith + 10)
* [也许我可以从内部改变] -> moses_bad_end

---

# moses_4b
```image-gen
prompt: Intense confrontation between Marcus and Victor Kane across a conference table
url: https://i.muistory.com/images/bible-journey/1768012491611-scene_moses_4b.webp
```
"你会后悔的。"Victor Kane 站起身，"在这个行业，没有人能和 Pharaoh Capital 作对。"

门关上后，你知道一场战争已经开始。

几天后，你发现公司账户被冻结，核心员工收到猎头公司的挖角电话，而你本人正面临一场莫须有的"性骚扰"指控新闻。
* [召集信任的人，准备离开] -> moses_5 (set: faith = faith + 10)

---

# moses_5
```image-gen
prompt: Marcus addressing a small group of loyal employees in a warehouse startup space, determination in their faces
url: https://i.muistory.com/images/bible-journey/1768012492245-scene_moses_5.webp
```
**第三章：出走**

你站在一个旧仓库里，面前是愿意追随你的核心团队——只有12个人。

"我不能承诺你们什么，"你说，"只能承诺我们会用技术做正确的事。"

Aaron 第一个站出来："我在。"

然后是你的首席科学家，安全主管，几位核心工程师...

这是你的"出埃及"。
* [开始重新创业] -> moses_6

---

# moses_6
```image-gen
prompt: Small team working in a garage startup, whiteboards full of code, pizza boxes, late night
url: https://i.muistory.com/images/bible-journey/1768012493463-scene_moses_6.webp
```
**第四章：旷野岁月**

接下来的两年是最艰难的时期。资金紧张，竞争对手——许多是 Pharaoh 支持的——不断打压你们。

有几次，团队濒临解散。有人开始怀疑这条路是否正确。

"Marcus，也许我们应该接受那些投资人的条件..."一位联合创始人说。

你看着窗外的星空，想起了当初为什么开始这一切。
* [坚持我们的原则，继续走下去] -> moses_7 (set: faith = faith + 15, courage = courage + 10)
* [接受妥协，换取生存] -> moses_compromise_end

---

# moses_7
```image-gen
prompt: Marcus giving a keynote speech at a major tech conference, audience of thousands, dramatic stage lighting
url: https://i.muistory.com/images/bible-journey/1768012494094-scene_moses_7.webp
```
**第五章：应许之地**

五年后。

你站在 TechCrunch 大会的舞台上，宣布你的开源 AI 平台月活用户突破一亿。

"我们证明了，"你说，"技术可以既强大又尊重隐私。"

台下掌声雷动。在人群中，你看到了曾经追随你走出埃及的那些人。

而 Pharaoh Capital，因为多起丑闻，已经名誉扫地。

你做到了，带领你的人民到达了应许之地。
* [结局] -> moses_good_end

---

# moses_good_end
```image-gen
prompt: Marcus standing on a mountain overlooking Silicon Valley at sunrise, peaceful and triumphant
url: https://i.muistory.com/images/bible-journey/1768012494708-scene_moses_good_end.webp
```
**好结局：应许之地**

你用十年时间，证明了技术可以既造福人类，又尊重每个人的尊严。

那些曾经追随你的人，如今都成为了行业领袖，继续传递着你们共同的信念。

而你，终于可以站在山顶，看着曾经走过的路。

---

# moses_bad_end
```image-gen
prompt: Marcus in an expensive but soulless corporate office, looking empty and defeated, golden handcuffs
url: https://i.muistory.com/images/bible-journey/1768012495753-scene_moses_bad_end.webp
```
**坏结局：金色的枷锁**

你选择了妥协。五亿美元的期权如期到账。

但每天走进那座玻璃大厦，你都感到一种说不出的空虚。你的技术继续监控着数百万人，而你...你只是假装不知道。

三年后的一天，你在公司卫生间的镜子里看到一个陌生人——一个你不再认识的自己。

*"人若赚得全世界，却赔上自己的生命，有什么益处呢？"*
— 马太福音 16:26

---

# moses_compromise_end
```image-gen
prompt: Marcus walking alone on a beach at sunset, contemplative, bittersweet mood
url: https://i.muistory.com/images/bible-journey/1768012496374-scene_moses_compromise_end.webp
```
**隐藏结局：孤独的先知**

你选择了折中的道路。公司生存下来了，但不再是你最初梦想的样子。

多年后，当你看到新一代创业者继承你的理念，做出你当年没有勇气做的选择时，你笑了。

也许这就是你的使命——不是亲自到达应许之地，而是指引方向。

*"一粒麦子若不落在地里死了，仍旧是一粒；若是死了，就结出许多子粒来。"*
— 约翰福音 12:24

---

# david_1
```image-gen
prompt: Small Brooklyn bar at night, young musician playing guitar on a tiny stage, warm amber lighting
character: david_m
url: https://i.muistory.com/images/bible-journey/1768012497176-scene_david_1.webp
```
**第一章：谷中歌者**

你是 David Miller，来自德州 Abilene 小镇的独立音乐人。三年前你来到纽约追梦，现在每周在布鲁克林的小酒吧驻唱。

今晚，台下只有寥寥几个客人。但你还是用心唱完了每一首歌。

散场后，一个穿着考究的女人递给你一张名片："我是 Melody Records 的星探。我觉得你有潜力。"
* [接过名片，表示感谢] -> david_2 (set: courage = courage + 5)
* [婉拒她，我喜欢现在的生活] -> david_2b

---

# david_2
```image-gen
prompt: Modern record label office with gold records on walls, David looking around nervously
```
一周后，你来到 Melody Records 的办公室。接待你的是公司副总裁 Jonathan。

"David，你的声音很有特点，"他说，"但我们需要你做一些改变。你的乡村风格太老派了，我们需要更流行的东西。"

他播放了一些电子舞曲给你听："这才是现在年轻人喜欢的。"
* [我愿意尝试改变] -> david_3a
* [但这不是我的音乐] -> david_3b (set: faith = faith + 10)

---

# david_2b
```image-gen
prompt: David walking alone through Brooklyn streets at night, passing by closed shops
```
你婉拒了那位星探。继续在小酒吧唱歌，日复一日。

但几个月后，一个噩耗传来：你常驻演出的酒吧要关门了。新房东要把这里改成高档餐厅。

你突然发现，你在这座城市里无处可去。

这时，你想起了那张名片...
* [联系那位星探] -> david_3b (set: courage = courage + 5)

---

# david_3a
```image-gen
prompt: Recording studio session, David looking uncomfortable wearing trendy clothes, producers watching
url: https://i.muistory.com/images/bible-journey/1768012498224-scene_david_3a.webp
```
**第二章：王的行列**

你签约了 Melody Records。公司给你包装了全新的形象——新发型、新衣服、新的艺名"D-Mill"。

你的第一首商业单曲发行了。它登上了 Billboard 榜单前50。

但每次在镜子里看到自己，你都觉得那不是真正的你。

一天，你在录音室遇到了独立音乐人 Hannah，她问你："你还记得当初为什么开始唱歌吗？"
* [我需要重新思考] -> david_4
* [这就是成功的代价] -> david_bad_end

---

# david_3b
```image-gen
prompt: David performing at a small open mic night, raw emotion, authentic musician
url: https://i.muistory.com/images/bible-journey/1768012498916-scene_david_3b.webp
```
**第二章：牧羊人的竖琴**

你拒绝了唱片公司的条件。回到街头卖艺，回到Williamsburg的地下演出场所。

但你的音乐开始在网上流传。一段你在地铁站弹唱的视频被人拍下，获得了百万播放。

突然，大唱片公司注意到了你。Goliath Media——音乐产业的巨无霸——发来律师函：你翻唱的一首歌涉嫌侵权，他们要起诉你。

这是一场大卫对歌利亚的战争。
* [找律师应战] -> david_4 (set: courage = courage + 15)

---

# david_4
```image-gen
prompt: Courtroom scene, David sitting alone at defendant table, massive corporate lawyers on other side
url: https://i.muistory.com/images/bible-journey/1768012499502-scene_david_4.webp
```
**第三章：五块石头**

法庭上，Goliath Media 派出了最豪华的律师团队。他们要求你赔偿五十万美元。

你的免费法律援助律师看起来毫无胜算。

但你决定自己上台作证。你讲述了你的音乐之路，你对这首歌的理解，以及独立音乐人的困境。

你的证词视频被泄露到网上，引发了巨大的舆论反响。
* [用音乐反击] -> david_5 (set: faith = faith + 15, courage = courage + 10)

---

# david_5
```image-gen
prompt: David in a home studio writing a protest song, intense focus, papers scattered around
url: https://i.muistory.com/images/bible-journey/1768012501086-scene_david_5.webp
```
**第四章：击倒巨人**

你决定用音乐反击。你写了一首歌——《歌利亚》。

现在，是时候让全世界听到你的声音了！
```minigame-gen
prompt: 音乐节奏小游戏，点击下落的音符节奏点击败歌利亚，15秒内命中5次获胜，连击可增加伤害
variables:
  - music_score: 命中次数
  - goliath_defeated: 是否击败歌利亚
url: https://i.muistory.com/images/bible-journey/1768012501675-bible-journey_david_5_minigame.js
```
* [查看结果] -> david_5_victory (if: goliath_defeated == true)
* [查看结果] -> david_5_continue (if: goliath_defeated == false)

---

# david_5_victory
```image-gen
prompt: Viral video going viral on social media, millions of views counter, David's song spreading across the internet
url: https://i.muistory.com/images/bible-journey/1768012502278-scene_david_5_victory.webp
```
你的歌曲《歌利亚》像野火一样传播开来！

24小时内播放量突破千万。整个音乐圈都在讨论这件事。其他独立音乐人开始站出来支持你。

Goliath Media 面临巨大的公关压力，最终撤销了诉讼。

你赢了！
* [继续独立之路] -> david_6 (set: faith = faith + 15, courage = courage + 15)

---

# david_5_continue
```image-gen
prompt: David looking at computer screen with moderate view count, thoughtful expression
url: https://i.muistory.com/images/bible-journey/1768012502954-scene_david_5_continue.webp
```
你的歌曲没有立即爆红，但它慢慢地在独立音乐圈传播开来。

虽然没有病毒式传播，但你的真诚打动了很多人。一些法律援助组织注意到了你的案子。

最终，Goliath Media 选择了庭外和解。你保住了你的音乐。
* [继续独立之路] -> david_6 (set: faith = faith + 10)

---

# david_6
```image-gen
prompt: David at a rooftop party with other indie musicians, New York skyline in background, celebrating
url: https://i.muistory.com/images/bible-journey/1768012503908-scene_david_6.webp
```
**第五章：宫廷岁月**

你成了独立音乐圈的英雄。演出邀约不断，唱片销量飙升。

但成名也带来了诱惑。派对、金钱、崇拜者...

一天晚上，在一个奢华的庆功派对上，你喝得太多。你做了一件你后来非常后悔的事——你在社交媒体上发表了攻击其他音乐人的言论。

第二天醒来，你发现自己成了被全网批判的对象。
* [公开道歉] -> david_7 (set: faith = faith + 5)
* [删帖当无事发生] -> david_bad_end_2

---

# david_7
```image-gen
prompt: David sitting alone in empty apartment, guitar beside him, looking out rainy window
url: https://i.muistory.com/images/bible-journey/1768012504717-scene_david_7.webp
```
**第六章：旷野**

你的道歉并没有平息风波。演出被取消，朋友渐渐疏远。

你回到了出发的起点——一个人，一把吉他，一个小房间。

有很长一段时间，你无法写出任何东西。

但在最黑暗的夜晚，你终于拿起吉他，写下了一首关于失败和悔改的歌。

那是你写过的最真诚的歌。
* [重新出发] -> david_8 (set: faith = faith + 15)

---

# david_8
```image-gen
prompt: David performing at small church venue, intimate setting, genuine connection with audience
url: https://i.muistory.com/images/bible-journey/1768012505426-scene_david_8.webp
```
**第七章：真正的歌**

你从头开始。这次，你不再追求名利。

你在教堂演出，在社区中心演出，在任何愿意听你歌唱的地方演出。

渐渐地，人们开始重新接受你。不是因为你是明星，而是因为你的歌是真实的。

多年后，你成为了一位音乐导师，帮助年轻的独立音乐人找到自己的声音。
* [结局] -> david_good_end

---

# david_good_end
```image-gen
prompt: David playing guitar under big oak tree in countryside, teaching a group of young musicians, peaceful sunset
url: https://i.muistory.com/images/bible-journey/1768012506590-scene_david_good_end.webp
```
**好结局：牧羊之歌**

你没有成为超级巨星，但你成为了比那更重要的东西——一个真正的音乐人。

你的歌陪伴无数人度过他们生命中的黑暗时刻。

而你，终于找到了心灵的平静。

---

# david_bad_end
```image-gen
prompt: Fake pop star on stage with pyrotechnics, flashy but empty performance, face hidden behind sunglasses
url: https://i.muistory.com/images/bible-journey/1768012507911-scene_david_bad_end.webp
```
**坏结局：假面舞会**

你成为了"D-Mill"——一个成功的流行偶像。

但每次登台，你都感觉像是在演一出戏。那些欢呼的观众，喜欢的其实不是你本人。

多年后，当潮流改变，你被更年轻的偶像取代时，你发现自己什么也没有留下。

*"人若赚得全世界，却赔上自己的生命，有什么益处呢？"*
— 马太福音 16:26

---

# david_bad_end_2
```image-gen
prompt: Lonely musician in dark empty room, broken guitar strings, bottles around, defeat
url: https://i.muistory.com/images/bible-journey/1768012509026-scene_david_bad_end_2.webp
```
**坏结局：跌落的星**

你选择逃避。但互联网不会忘记。

你的音乐生涯就此终结。没有人愿意和一个不敢面对错误的人合作。

你带着遗憾回到了德州老家，再也没有拿起过吉他。

*"人若赚得全世界，却赔上自己的生命，有什么益处呢？"*
— 马太福音 16:26

---

# joseph_1
```image-gen
prompt: Young Latino man in suit walking through Wall Street morning crowd, skyscrapers towering above
character: joseph_m
url: https://i.muistory.com/images/bible-journey/1768012509629-scene_joseph_1.webp
```
**第一章：彩衣少年**

你是 Joseph Rodriguez，来自加州 Fresno 的墨西哥移民家庭。凭借数学天赋，你从社区大学一路考入 MIT，又被顶级投行 Pyramid Securities 录用。

你是家族中第一个穿西装上班的人。父母和五个兄弟姐妹都为你骄傲——也许，有些人心里也有点嫉妒。

今天是你入职三个月后的业绩评审。你的数据模型为公司创造了两千万美元的利润。

你的上司 Diana Wells 叫你去她的办公室。
* [去见Diana] -> joseph_2

---

# joseph_2
```image-gen
prompt: Luxurious corner office with city view, elegant businesswoman in her 40s seated at desk
url: https://i.muistory.com/images/bible-journey/1768012510274-scene_joseph_2.webp
```
Diana Wells 是 Pyramid 最年轻的高级副总裁，也是你的直属上司。

"Joseph，你的表现超出预期，"她站起来，走到你身边，"公司决定提前给你升职。"

她的手搭在你的肩上，停留的时间似乎有点长。

"今晚我有一个私人派对，"她说，"我希望你能来。"
* [婉拒邀请，保持职业距离] -> joseph_3a (set: faith = faith + 15)
* [接受邀请] -> joseph_3b

---

# joseph_3a
```image-gen
prompt: Joseph walking out of office building at night, looking back at illuminated tower, determined
url: https://i.muistory.com/images/bible-journey/1768012510964-scene_joseph_3a.webp
```
**第二章：波提乏之困**

你礼貌而坚定地拒绝了 Diana。她的表情瞬间变冷。

接下来的几周，你发现办公室的氛围变了。重要的会议不再通知你，你的项目被莫名其妙地转给别人。

然后，HR 找你谈话：有人匿名举报你"工作态度问题"。

一个月后，你被解雇了。而且，一场内幕交易调查正指向你。
* [找律师争辩清白] -> joseph_4 (set: courage = courage + 10)

---

# joseph_3b
```image-gen
prompt: Elegant Wall Street party in penthouse, champagne glasses, Joseph looking uncomfortable among wealthy elites
url: https://i.muistory.com/images/bible-journey/1768012512099-scene_joseph_3b.webp
```
你去了 Diana 的派对。那是你见过的最奢华的场面。

Diana 整个晚上都在你身边。在其他高管面前，她表现得像你们已经是一对。

第二天，办公室里的人看你的眼神都变了。有人在背后议论你是"靠关系上位"。

你开始后悔。
* [疏远Diana，专注工作] -> joseph_3a
* [接受这段关系] -> joseph_bad_end

---

# joseph_4
```image-gen
prompt: Joseph in handcuffs being led away by federal agents, news cameras flashing
character: joseph_m
url: https://i.muistory.com/images/bible-journey/1768012512774-scene_joseph_4.webp
```
**第三章：深坑**

尽管你的律师尽力辩护，但证据对你极为不利。有人精心伪造了交易记录，而那些记录都指向你。

你被判处两年联邦监狱。

在入狱的那天，你想起了《圣经》中约瑟的故事——他也曾被冤枉入狱。

你决定，像他一样，不让仇恨吞噬自己。
* [在狱中保持希望] -> joseph_5 (set: faith = faith + 20)

---

# joseph_5
```image-gen
prompt: Prison library, Joseph helping other inmates with paperwork, warm lighting
url: https://i.muistory.com/images/bible-journey/1768012513392-scene_joseph_5.webp
```
**第四章：解梦者**

在狱中，你开始帮助其他囚犯。你用你的金融知识帮他们理解他们的案件，帮他们的家人规划财务。

一个狱友曾是某大公司的会计，他告诉你一个秘密：他知道即将有一场经济危机，但没人相信他。

"如果有人能把这些数据分析出来..."他说。

你用纸和笔，在监狱里建立了一个预测模型。
* [继续研究这个预测] -> joseph_6 (set: courage = courage + 10)

---

# joseph_6
```image-gen
prompt: Joseph being released from prison, walking through gates into sunlight, simple clothes
url: https://i.muistory.com/images/bible-journey/1768012513995-scene_joseph_6.webp
```
**第五章：出狱**

两年后，你出狱了。没有工作，没有钱，只有一个装满你分析笔记的箱子。

但你的预测是对的——一场经济危机正在酝酿，大多数人还浑然不觉。

你试图警告人们，但没人愿意听一个前囚犯的话。

直到有一天，你偶遇了一位老朋友——MIT 的教授。他相信你的分析。
* [向他展示你的研究] -> joseph_7 (set: faith = faith + 10)

---

# joseph_7
```image-gen
prompt: Congressional hearing room, Joseph testifying at witness table, senators listening intently
url: https://i.muistory.com/images/bible-journey/1768012515170-scene_joseph_7.webp
```
**第六章：法老的梦**

你的教授把你的研究推荐给了国会。在一场听证会上，你详细阐述了即将到来的危机。

三个月后，你的预测成真了。你成了"预见危机的人"。

华尔街的门重新向你敞开。包括当初陷害你的 Pyramid Securities。

他们甚至愿意提供你一个高管职位——前提是你不追究过去的事。
* [拒绝，追求真正的正义] -> joseph_8 (set: courage = courage + 15, faith = faith + 10)
* [接受和解，向前看] -> joseph_compromise_end

---

# joseph_8
```image-gen
prompt: Joseph meeting his estranged family in a modest home, emotional reunion, forgiveness
url: https://i.muistory.com/images/bible-journey/1768012515739-scene_joseph_8.webp
```
**第七章：兄弟重逢**

你选择了正义的道路。Diana Wells 和其他涉案人员最终被起诉。

但更重要的是，你回到了 Fresno 老家。

你的兄弟姐妹们——那些曾经嫉妒你的人——现在用不同的眼光看着你。

"我们当初不该那样。"你的大哥 Carlos 说。

你拥抱了他："过去的事，就让它过去吧。"
* [结局] -> joseph_good_end

---

# joseph_good_end
```image-gen
prompt: Joseph with his large family at outdoor gathering, children playing, sunset, peaceful happiness
url: https://i.muistory.com/images/bible-journey/1768012516442-scene_joseph_good_end.webp
```
**好结局：饶恕与丰盛**

多年后，你成为了一位金融教育家，专门帮助移民社区理解理财。

你没有住在曼哈顿的豪宅里，但你有一个温暖的家，和一个和解的大家庭。

你终于明白了约瑟的故事真正的意义——不是关于成功，而是关于饶恕。

---

# joseph_bad_end
```image-gen
prompt: Joseph in luxury apartment alone, looking at city view, empty champagne glass, hollow success
url: https://i.muistory.com/images/bible-journey/1768012517037-scene_joseph_bad_end.webp
```
**坏结局：空洞的胜利**

你利用和 Diana 的关系快速升迁。几年后，你成了高级副总裁。

但你失去了自己的家庭——他们再也不愿意和你来往。

而 Diana，在你失去利用价值后，也把你抛弃了。

你拥有一切，却什么也没有。

*"人若赚得全世界，却赔上自己的生命，有什么益处呢？"*
— 马太福音 16:26

---

# joseph_compromise_end
```image-gen
prompt: Joseph in corner office, successful but melancholy, looking at family photo on desk
url: https://i.muistory.com/images/bible-journey/1768012517670-scene_joseph_compromise_end.webp
```
**隐藏结局：未完成的和解**

你选择了和解。你得到了财富和地位的恢复。

但每次回家过节，你都能感觉到家人之间那道无形的墙。

他们原谅了你，但你始终没有勇气开口道歉。

*"一粒麦子若不落在地里死了，仍旧是一粒；若是死了，就结出许多子粒来。"*
— 约翰福音 12:24

---

# peter_1
```image-gen
prompt: Alaska crab fishing boat on dark ocean, captain Peter steering through rough waters, dramatic sky
character: peter_m
url: https://i.muistory.com/images/bible-journey/1768012518320-scene_peter_1.webp
```
**第一章：暴风之前**

你是 Peter Olsen，阿拉斯加 Kodiak 岛的第三代渔民。你继承了父亲的捕蟹船"北极星号"，每年冬天出海捕捞帝王蟹。

这是一份危险但收入丰厚的工作。你的船员们把命交给你，你也从未让他们失望。

今晚，暴风雨来临前，你收到了一封奇怪的信。一个叫做"海洋守护者"的环保组织邀请你加入他们的运动——反对过度捕捞。
* [把信扔进垃圾桶] -> peter_2a
* [读完这封信] -> peter_2b (set: faith = faith + 5)

---

# peter_2a
```image-gen
prompt: Peter throwing letter in trash, crew members working on deck in background
url: https://i.muistory.com/images/bible-journey/1768012518947-scene_peter_2a.webp
```
环保主义者？他们懂什么？这是你祖辈的生计。

你扔掉信，准备出海。但这一季的收成格外差。蟹群似乎在减少。

一个月后，在码头酒吧，你又遇到了那个环保组织的人。这次是面对面。

他叫 Thomas，一个浑身散发着奇怪平静感的中年人。
* [听听他怎么说] -> peter_3 (set: courage = courage + 5)

---

# peter_2b
```image-gen
prompt: Peter reading letter by lamplight in captain's cabin, thoughtful expression
url: https://i.muistory.com/images/bible-journey/1768012519566-scene_peter_2b.webp
```
信里的内容让你不安。数据显示，按照目前的捕捞速度，二十年内这片海域的蟹群将会枯竭。

你的儿子将无鱼可捕，你父亲和祖父留下的遗产将彻底消失。

信的末尾是一个地址和一个约见时间。
* [去赴约] -> peter_3 (set: faith = faith + 10)

---

# peter_3
```image-gen
prompt: Small coastal coffee shop, Peter meeting mysterious middle-aged man Thomas, ocean visible through window
url: https://i.muistory.com/images/bible-journey/1768012520248-scene_peter_3.webp
```
**第二章：跟随**

Thomas 不像你想象中的激进环保分子。他曾经也是渔民，后来亲眼目睹了一片渔场的彻底枯竭。

"Peter，"他说，"我不是要你放弃捕鱼。我是请你帮我们证明，可持续的捕捞是可能的。"

他想让你驾驶"北极星号"参与一个科研项目，用传感器监测蟹群数量，证明保护性捕捞的可行性。
* [我需要考虑一下] -> peter_4a
* [好，我加入] -> peter_4b (set: faith = faith + 15, courage = courage + 10)

---

# peter_4a
```image-gen
prompt: Peter on dock at sunset looking at his fishing boat, contemplating life decisions
url: https://i.muistory.com/images/bible-journey/1768012520846-scene_peter_4a.webp
```
你没有立即答应。回到船上，你看着这艘陪伴你二十年的船。

这里有太多回忆——你父亲教你掌舵的地方，你第一次独立出海的时刻，还有那些生死与共的船员们。

如果加入 Thomas，你可能会失去很多老朋友。渔民圈子里不喜欢"叛徒"。

但如果不做点什么，这一切早晚都会失去。
* [加入Thomas] -> peter_5 (set: courage = courage + 10)
* [维持现状] -> peter_bad_end

---

# peter_4b
```image-gen
prompt: Peter shaking hands with Thomas, Coast Guard boat visible in background, determined expression
url: https://i.muistory.com/images/bible-journey/1768012521467-scene_peter_4b.webp
```
**第三章：水上行走**

你加入了"海洋守护者"的项目。消息传开后，很多老朋友开始疏远你。

"Olsen家族也成了环保婊子，"有人在酒吧里嘲笑你。

你的大副 Mike 辞职了。他说他不想和"叛徒"共事。

但也有人开始理解你。一些年轻渔民私下找你谈话，他们也担心未来。
* [继续坚持] -> peter_5 (set: faith = faith + 10)

---

# peter_5
```image-gen
prompt: Dramatic storm at sea, Peter's boat being tossed by massive waves, crew struggling on deck
url: https://i.muistory.com/images/bible-journey/1768012522154-scene_peter_5.webp
```
**第四章：暴风雨中**

一天夜里，"北极星号"遭遇了罕见的风暴。

船开始进水，引擎失灵。你必须做出选择：抛弃那些昂贵的科研设备减轻负重，还是冒生命危险保住数据。

在最危急的时刻，你想起了 Thomas 的话："有时候，你必须相信波涛下面有一只托住你的手。"
* [保住设备，相信我们能撑过去] -> peter_6 (set: faith = faith + 20)
* [抛弃设备，安全第一] -> peter_6b

---

# peter_6
```image-gen
prompt: Peter standing at wheel of boat in storm, calm expression despite chaos, divine light breaking through clouds
url: https://i.muistory.com/images/bible-journey/1768012523344-scene_peter_6.webp
```
**第五章：信仰的考验**

奇迹般地，你们熬过了那个夜晚。设备保住了，数据完好。

但回到岸上，更大的危机在等着你。

一个大型渔业公司联合其他渔民起诉你"非法收集商业机密"。他们还散布谣言，说你在帮政府关闭渔场。

你的妻子 Sarah 和你大吵了一架。她说你选择了救鱼，却不管家人的死活。

那天晚上，压力之下，你做了一件让自己后悔终生的事——你在媒体面前否认了自己与"海洋守护者"的关系。
* [面对自己的懦弱] -> peter_7 (set: courage = courage - 10)

---

# peter_6b
```image-gen
prompt: Peter watching equipment sink into stormy sea, relief mixed with regret on his face
url: https://i.muistory.com/images/bible-journey/1768012523893-scene_peter_6b.webp
```
你选择了安全。船和船员都保住了，但六个月的数据化为乌有。

回到岸上，Thomas 没有责备你。但你能看到他眼中的失望。

"你不是那个人，Peter，"他说，"你可以是，但你不敢。"
* [决定重新开始] -> peter_7 (set: faith = faith + 5, courage = courage + 5)

---

# peter_7
```image-gen
prompt: Empty church pew, Peter sitting alone, weak morning light through stained glass window
url: https://i.muistory.com/images/bible-journey/1768012525030-scene_peter_7.webp
```
**第六章：鸡鸣时分**

你坐在空荡荡的教堂里。第一次，你感到彻底的失败。

你否认了自己相信的事。那些信任你的人，那些追随你的年轻渔民，他们现在怎么看你？

你想起了彼得三次否认耶稣的故事。小时候你觉得他太软弱了。现在你明白了——恐惧可以让任何人背叛自己的信念。

但故事还没有结束。彼得后来获得了原谅，成为教会的磐石。

也许你也可以。
* [求得原谅，重新开始] -> peter_8 (set: faith = faith + 25)

---

# peter_8
```image-gen
prompt: Peter speaking at town hall meeting, fishing community listening, passionate speech
url: https://i.muistory.com/images/bible-journey/1768012525615-scene_peter_8.webp
```
**第七章：第二次机会**

你公开道歉了。在渔民工会的会议上，你承认自己曾经因为恐惧而退缩。

然后，你详细解释了过度捕捞的数据，以及你参与的可持续捕捞计划。

会场一片沉默。然后，一个年轻渔民站起来鼓掌。接着是另一个，又一个...

不是所有人都同意你。但对话开始了。
* [结局] -> peter_good_end

---

# peter_good_end
```image-gen
prompt: Peter on boat with next generation of young fishermen, healthy ocean, whales visible in distance, hopeful future
url: https://i.muistory.com/images/bible-journey/1768012526231-scene_peter_good_end.webp
```
**好结局：牧养我的羊**

多年后，阿拉斯加成为可持续捕捞的典范。蟹群开始恢复。

你的儿子继承了"北极星号"——他仍然可以做一个渔民，一个比你更好的渔民。

而你，成为了那些年轻渔民的导师，教导他们如何在索取与保护之间找到平衡。

Thomas 说得对：有时候，你需要先溺水，才能学会行走在水上。

---

# peter_bad_end
```image-gen
prompt: Abandoned fishing boat rusting on shore, empty ocean, desolate mood
url: https://i.muistory.com/images/bible-journey/1768012526813-scene_peter_bad_end.webp
```
**坏结局：枯竭**

你选择了维持现状。继续捕鱼，继续赚钱。

十五年后，蟹群彻底崩溃了。政府关闭了整个渔场。

你站在空荡荡的码头上，看着"北极星号"被拍卖。没有买家。

你的儿子成了建筑工人。他说他这辈子都不想再看到海。

*"人若赚得全世界，却赔上自己的生命，有什么益处呢？"*
— 马太福音 16:26