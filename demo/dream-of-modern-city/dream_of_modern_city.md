---
title: 红楼梦·摩登都市
description: 在现代都市A市，四大家族之一的贾氏集团风雨飘摇。你是厌恶商业的继承人、才华横溢的孤女、精明强干的女高管，还是务实理性的经理人？通过MBTI测试寻找你的命运角色，演绎豪门兴衰。
backgroundStory: |
  A市，现代金融中心。贾氏集团（Jia Group）是这座城市的商业航母，但庞大的帝国内部已是千疮百孔。
  奢华的"大观园"在元宇宙中重建，现实中的资金链却岌岌可危。
  四大家族的联姻、商业间谍的渗透、监管机构的调查，一场风暴即将到来。
cover_image: https://i.muistory.com/images/dream-of-modern-city/1768236606242-cover.webp
cover_prompt: Cyberpunk style modern city skyline with traditional Chinese architectural elements blended in, dark atmosphere, neon lights
tags:
  - 现代
  - 剧情
  - 多视角
  - 家族传奇
state:
  current_role: ''
  intro_completed: false
  score_e: 0
  score_i: 0
  score_n: 0
  score_s: 0
  score_t: 0
  score_f: 0
  score_j: 0
  score_p: 0
  mental_state: 80
  family_wealth: 100
  social_status: 50
  relationship_baoyu_daiyu: 50
  relationship_baoyu_baochai: 50
  relationship_xifeng_baoyu: 30
  relationship_daiyu_baochai: 30
  has_key_evidence: false
  knows_secret: false
  grand_view_project_status: normal
  path_chosen: none
  corruption_level: 0
  investigation_progress: 0
  art_preserved: false
  alliance_formed: false
  trust_level: 50
  day_count: 1
  act: 1
ai:
  style:
    image: Modern urbancore mixed with traditional Chinese aesthetics, cinematic lighting
  characters:
    baoyu:
      name: 贾宝玉
      description: 贾氏集团继承人，22岁。厌恶商业斗争，热爱艺术和电竞。
      image_prompt: Young asian man, 22, streetwear with jade accessory, soft features, melancholic
      image_url: https://i.muistory.com/images/dream-of-modern-city/1768236607066-baoyu_portrait.webp
    daiyu:
      name: 林黛玉
      description: 海归才女，20岁。自由撰稿人/艺术家。父母双亡，寄居贾家。
      image_prompt: Young asian woman, 20, elegant minimalist fashion, intelligent eyes, tablet
      image_url: https://i.muistory.com/images/dream-of-modern-city/1768236607785-daiyu_portrait.webp
    baochai:
      name: 薛宝钗
      description: 集团项目经理，23岁。名校MBA，理性务实。
      image_prompt: Young asian woman, 23, professional attire, confident, office background
      image_url: https://i.muistory.com/images/dream-of-modern-city/1768236608381-baochai_portrait.webp
    xifeng:
      name: 王熙凤
      description: 贾氏集团执行CEO，28岁。精明强干，掌管财政大权。
      image_prompt: Asian woman, 28, designer clothing, commanding expression, boardroom
      image_url: https://i.muistory.com/images/dream-of-modern-city/1768236609036-xifeng_portrait.webp
---

# start

```yaml
image:
  prompt: Futuristic psychological testing room, minimalist, holographic MBTI screen
  url: https://i.muistory.com/images/dream-of-modern-city/1768467555929-scene_mbti_test.webp
```

欢迎来到贾氏集团人力资源评估中心。
请凭直觉回答以下问题。

* [开始测试] -> q1

---

# q1

```yaml
image:
  prompt: 'Split screen: party scene vs person reading alone'
  url: https://i.muistory.com/images/dream-of-modern-city/1768467557839-intro_question_1.webp
```

问题 1/4：工作后如何恢复能量？

* [和朋友聚会] -> q2 (set: score_e = score_e + 1)
* [独自休息] -> q2 (set: score_i = score_i + 1)

---

# q2

```yaml
image:
  prompt: 'Split screen: abstract vision vs concrete data charts'
  url: assets/intro_split_2.webp
```

问题 2/4：面对新项目，你关注什么？

* [宏大的愿景和可能性] -> q3 (set: score_n = score_n + 1)
* [具体的数据和操作步骤] -> q3 (set: score_s = score_s + 1)

---

# q3

```yaml
image:
  prompt: 'Split screen: brain with logic lines vs heart with emotion'
  url: assets/intro_split_3.webp
```

问题 3/4：做艰难决定时，首要考量是？

* [客观公正，为整体效率] -> q4 (set: score_t = score_t + 1)
* [考虑他人感受，寻找温和方案] -> q4 (set: score_f = score_f + 1)

---

# q4

```yaml
image:
  prompt: 'Split screen: organized calendar vs messy creative desk'
  url: assets/intro_split_4.webp
```

问题 4/4：你更喜欢哪种生活方式？

* [井井有条，按计划行事] -> calculate_role (set: score_j = score_j + 1)
* [灵活随性，应对突发] -> calculate_role (set: score_p = score_p + 1)

---

# calculate_role

```yaml
image:
  prompt: Digital avatar forming, matrix code flowing
  url: assets/transition_matrix.webp
```

系统正在分析你的性格数据...

* [查看结果] -> role_baoyu (if: score_i > score_e, score_f > score_t, score_p > score_j)
* [查看结果] -> role_daiyu (if: score_i > score_e, score_n > score_s, score_j > score_p)
* [查看结果] -> role_xifeng (if: score_e > score_i, score_t > score_f, score_n > score_s)
* [查看结果] -> role_baochai (if: score_e > score_i, score_s > score_n, score_j > score_p)
* [查看结果] -> role_baochai (if: score_s > 0)
* [查看结果] -> role_baoyu

---

# role_baoyu

```yaml
image:
  prompt: Baoyu in modern clothing, rebellious but soft, luxury car background
  character: baoyu
  url: https://i.muistory.com/images/dream-of-modern-city/1768467558978-role_baoyu.webp
```

匹配结果：贾宝玉 (INFP)
你是贾氏集团的继承人，但你对商业毫无兴趣。你厌恶虚伪的社交，只想沉浸在艺术世界里。

* [接受命运] -> baoyu_prologue (set: current_role = "baoyu")

---

# role_daiyu

```yaml
image:
  prompt: Daiyu in modern clothing, sketchbook, rainy window
  character: daiyu
  url: https://i.muistory.com/images/dream-of-modern-city/1768467559837-role_daiyu.webp
```

匹配结果：林黛玉 (INFJ)
你寄居在贾氏资助的公寓里，虽然衣食无忧，但始终感到寄人篱下。你有敏锐的洞察力和过人的才华。

* [接受命运] -> daiyu_prologue (set: current_role = "daiyu")

---

# role_baochai

```yaml
image:
  prompt: Baochai in business suit, tablet, corporate lobby
  character: baochai
  url: https://i.muistory.com/images/dream-of-modern-city/1768467560527-role_baochai.webp
```

匹配结果：薛宝钗 (ESTJ)
你是薛氏企业的代表，也是贾氏集团最得力的项目经理。你理性、务实，懂得平衡各方利益。

* [接受命运] -> baochai_prologue (set: current_role = "baochai")

---

# role_xifeng

```yaml
image:
  prompt: Xifeng in high fashion, making phone call, serious
  character: xifeng
  url: https://i.muistory.com/images/dream-of-modern-city/1768467561188-xifeng_call.webp
```

匹配结果：王熙凤 (ENTJ)
你是贾氏集团实际的掌舵人。董事长年事已高，真正的权力在你手中。但集团内部早已被挪用公款掏空。

* [接受命运] -> xifeng_prologue (set: current_role = "xifeng")

---

# baoyu_prologue

```yaml
image:
  prompt: Luxury bedroom with VR equipment, gaming setup, art supplies scattered
  character: baoyu
  url: https://i.muistory.com/images/dream-of-modern-city/1768467561951-baoyu_room.webp
```

清晨，你的手机在震动。今天是"大观园元宇宙"项目的发布会，作为名义上的负责人，你必须出席。
你摘下整晚没摘的VR头显，现实世界的沉重感瞬间袭来。

* [看看手机] -> baoyu_phone

---

# baoyu_phone

```yaml
image:
  prompt: Smartphone screen showing multiple missed calls and messages
  url: assets/baoyu_phone.webp
```

手机上有23条未读消息。父亲的助理打了5个电话。还有一条黛玉发来的消息："今天的发布会，我不想去。"

* [先回复黛玉] -> baoyu_reply_daiyu (set: relationship_baoyu_daiyu = relationship_baoyu_daiyu + 5)
* [先回复父亲的助理] -> baoyu_reply_father (set: social_status = social_status + 5)
* [继续无视，再躺五分钟] -> baoyu_ignore (set: mental_state = mental_state + 5)

---

# baoyu_reply_daiyu

```yaml
image:
  prompt: Phone chat interface with Daiyu
```

你打开和黛玉的对话框："我也不想去。但如果你来，至少我不会那么无聊。"
黛玉回复了一个苦笑的表情包："好吧，看在你的份上。"
心情好了一点。

* [准备出门] -> baoyu_prepare

---

# baoyu_reply_father

```yaml
image:
  prompt: Phone call interface showing Father Office
```

你回拨给父亲的助理："告诉他我马上到。"
电话那头传来如释重负的声音："二少爷，老爷说今天很重要，您一定要准时。"
责任感让你有些窒息。

* [准备出门] -> baoyu_prepare

---

# baoyu_ignore

```yaml
image:
  prompt: Baoyu lying in bed staring at ceiling, sunlight through curtains
  character: baoyu
  url: https://i.muistory.com/images/dream-of-modern-city/1768467562635-baoyu_ceiling.webp
```

你把手机扔到一边，盯着天花板发呆。
五分钟变成了十五分钟。管家袭人焦急地敲门："二爷，再不出发就真的来不及了！"

* [终于起床] -> baoyu_prepare

---

# baoyu_prepare

```yaml
image:
  prompt: Baoyu looking at mirror in expensive suit, uncomfortable expression
  character: baoyu
  url: https://i.muistory.com/images/dream-of-modern-city/1768467563274-baoyu_mirror.webp
```

你换上那套昂贵但令人窒息的高定西装。镜子里的你看起来像个完美的傀儡继承人。
脖子上那块通灵宝玉造型的翡翠挂坠格外显眼——那是祖母送的，据说是家族的传家宝。

* [检查一下今天的行程] -> baoyu_schedule
* [直接出发] -> baoyu_car

---

# baoyu_schedule

```yaml
image:
  prompt: Digital calendar showing packed schedule
  url: assets/baoyu_schedule.webp
```

行程表密密麻麻：

* [硬着头皮出发] -> baoyu_car

---

# baoyu_car

```yaml
image:
  prompt: Luxury car interior, Baoyu looking out window at city
  url: assets/baoyu_car.webp
  character: baoyu
```

车子在A市繁华的街道上行驶。窗外是鳞次栉比的高楼大厦，每一栋都代表着野心和资本。
你想起小时候，祖母带你去郊外的老宅，那里有真正的园林，而不是这些钢筋水泥的丛林。
司机的声音打断了你的思绪："二少爷，我们到了。"

* [下车] -> baoyu_arrive_venue

---

# baoyu_arrive_venue

```yaml
image:
  prompt: Grand hotel entrance, red carpet, media cameras
  url: https://i.muistory.com/images/dream-of-modern-city/1768467564051-gala_entrance.webp
```

洲际酒店门口，红毯铺开，闪光灯如潮水般涌来。
"贾公子！请问对大观园项目有什么期待？"
"贾二少爷，传言您反对这个项目，是真的吗？"
你露出职业性的微笑，一言不发地走过记者群。

* [进入酒店] -> baoyu_lobby

---

# baoyu_lobby

```yaml
image:
  prompt: Luxurious hotel lobby with giant holographic display of Grand View Garden
  url: https://i.muistory.com/images/dream-of-modern-city/1768467564742-grand_view_hologram.webp
```

酒店大堂里已经搭建好了巨大的全息展示区。"大观园元宇宙"的logo悬浮在空中，传统的亭台楼阁与赛博朋克风格完美融合。
"宝玉！"一个熟悉的声音从身后传来。
是宝钗，穿着得体的职业装，手里拿着平板电脑。

* [和宝钗打招呼] -> baoyu_meet_baochai

---

# baoyu_meet_baochai

```yaml
image:
  prompt: Baoyu and Baochai meeting in hotel lobby, professional vs casual contrast
  characters:
    - baoyu
    - baochai
  url: https://i.muistory.com/images/dream-of-modern-city/1768467565359-baoyu_meet_baochai.webp
```

"你终于来了，"宝钗松了一口气，"彩排马上开始，你的演讲稿准备好了吗？"
"演讲稿？"你一脸茫然。
宝钗叹了口气，从平板上调出文档："我帮你准备了一份，路上背一下。"

* [感谢宝钗] -> baoyu_thank_baochai (set: relationship_baoyu_baochai = relationship_baoyu_baochai + 10)
* [表示不想演讲] -> baoyu_refuse_speech (set: relationship_baoyu_baochai = relationship_baoyu_baochai - 5)

---

# baoyu_thank_baochai

```yaml
image:
  prompt: Baochai handing tablet to Baoyu, helpful expression
  characters:
    - baoyu
    - baochai
  url: https://i.muistory.com/images/dream-of-modern-city/1768467565970-baoyu_thank_baochai.webp
```

"谢谢你，宝钗。"你接过平板，"没有你，我早就搞砸无数次了。"
宝钗微微一笑："这是我的工作。而且……"她顿了顿，"我不希望看到你为难。"
你们一起走向后台。

* [前往彩排] -> baoyu_rehearsal

---

# baoyu_refuse_speech

```yaml
image:
  prompt: Baoyu looking reluctant, Baochai frowning
  characters:
    - baoyu
    - baochai
  url: assets/baoyu_refuse_speech.webp
```

"我真的必须上台吗？让熙凤姐去不行吗？"
宝钗皱眉："你是项目的名义负责人，投资人想看到的是贾家的继承人。熙凤姐再能干，她姓王，不姓贾。"
你知道她说得对，但这并不能让你感到好受。

* [勉强接受] -> baoyu_rehearsal

---

# baoyu_rehearsal

```yaml
image:
  prompt: Stage rehearsal, technical crew, large screens showing presentation
  url: assets/baoyu_rehearsal.webp
```

后台一片忙碌。技术人员在调试全息投影，灯光师在校对角度。
导演看到你，迎了上来："贾公子，请到舞台中央站位。"
你站在巨大的屏幕前，感觉自己渺小得可笑。

* [开始彩排] -> baoyu_rehearsal_speech

---

# baoyu_rehearsal_speech

```yaml
image:
  prompt: Baoyu on stage reading from teleprompter, looking nervous
  character: baoyu
  url: https://i.muistory.com/images/dream-of-modern-city/1768467566554-baoyu_stage_nervous.webp
```

"大观园不仅是一个数字资产项目，"你照着提词器念道，"它是贾氏集团对传统文化与未来科技融合的……"
话说到一半，你看到台下的工作人员在窃窃私语。
一个声音在你耳边响起："继续，不要停。"是宝钗通过耳麦提醒你。

* [硬着头皮念完] -> baoyu_rehearsal_done
* [即兴发挥] -> baoyu_improvise (set: courage = courage + 10)

---

# baoyu_rehearsal_done

```yaml
image:
  prompt: Baoyu finishing speech, relieved expression
  character: baoyu
```

你机械地念完了稿子。导演点点头："还行，正式演出时再自然一点。"
你走下台，感觉像是打完了一场仗。

* [休息一下] -> baoyu_break

---

# baoyu_improvise

```yaml
image:
  prompt: Baoyu speaking passionately on stage, genuine expression
  url: assets/baoyu_improvise.webp
  character: baoyu
```

你放下提词器，开始说自己真正想说的话：
"其实我不太懂商业。但我知道，大观园对我来说，意味着儿时和祖母在一起的记忆，意味着诗词和艺术，意味着……一种正在消失的美好。"
台下安静了几秒，然后响起了掌声。

* [走下台] -> baoyu_break

---

# baoyu_break

```yaml
image:
  prompt: Backstage rest area, coffee and snacks
  url: assets/baoyu_break.webp
```

后台的休息区，你端着一杯咖啡，试图让自己冷静下来。
手机震动，是黛玉发来的消息："我到了，在哪里能找到你？"

* [告诉她位置] -> baoyu_meet_daiyu
* [让她在宴会厅等] -> baoyu_daiyu_wait

---

# baoyu_meet_daiyu

```yaml
image:
  prompt: Baoyu and Daiyu meeting backstage, intimate moment
  characters:
    - baoyu
    - daiyu
  url: assets/daiyu_backstage.webp
  url: assets/daiyu_backstage.webp
```

几分钟后，黛玉出现在后台入口。她穿着一件淡紫色的连衣裙，头发随意地披散着。
"这里真乱，"她皱着眉头四处张望，"到处都是假惺惺的笑脸。"
"所以我才躲在后台。"你苦笑。

* [和她聊聊] -> baoyu_daiyu_chat

---

# baoyu_daiyu_wait

```yaml
image:
  prompt: Text message to Daiyu
```

你回复："在宴会厅等我，我彩排完就过去。"
黛玉回了一个"好"字，没有任何表情符号。你知道她有点不高兴，但现在脱不开身。

* [继续准备] -> baoyu_continue_prep

---

# baoyu_daiyu_chat

```yaml
image:
  prompt: Baoyu and Daiyu sitting together backstage, talking intimately
  url: assets/baoyu_daiyu_chat.webp
  characters:
    - baoyu
    - daiyu
```

"你刚才的即兴演讲，我在外面听到了。"黛玉的语气难得地柔和，"比那些官方辞令好多了。"
"真的？"你有些意外。
"至少听起来像是你说的话。"她轻轻叹了口气，"在这个家族里，能说真话的机会太少了。"

* [询问她今天的心情] -> baoyu_daiyu_feeling (set: relationship_baoyu_daiyu = relationship_baoyu_daiyu + 10)
* [邀请她晚上一起离开] -> baoyu_daiyu_escape_plan (set: relationship_baoyu_daiyu = relationship_baoyu_daiyu + 15)

---

# baoyu_daiyu_feeling

```yaml
image:
  prompt: Close up of Daiyu looking melancholic
  url: assets/baoyu_daiyu_feeling.webp
  character: daiyu
```

"你怎么了？来的路上不开心吗？"
黛玉低下头："今天早上收到了出版社的拒稿信。说我的文章'太过尖锐，不适合当前的市场环境'。"
"那些庸人根本不懂你的才华。"
"可没有他们，我的文章永远只能存在电脑里。"

* [安慰她] -> baoyu_comfort_daiyu

---

# baoyu_daiyu_escape_plan

```yaml
image:
  prompt: Baoyu whispering to Daiyu, conspiratorial
  url: assets/baoyu_daiyu_escape_plan.webp
  characters:
    - baoyu
    - daiyu
```

"晚宴的时候，我们偷偷溜走吧。"你压低声音，"我知道一个地方，可以看到整个A市的夜景。"
黛玉的眼睛亮了一下："你不怕被你爸发现？"
"被发现又怎样？最多挨顿骂，我早就习惯了。"

* [约定好时间] -> baoyu_escape_later

---

# baoyu_comfort_daiyu

```yaml
image:
  prompt: Baoyu holding Daiyus hand gently
  url: assets/baoyu_comfort_daiyu.webp
  characters:
    - baoyu
    - daiyu
```

你握住她的手："总有一天，你的作品会被世界看到。我相信。"
黛玉抬起头，眼眶微红："只有你会这么说。"
这一刻，周围的喧嚣仿佛都消失了。

* [继续活动] -> baoyu_continue_prep

---

# baoyu_escape_later

```yaml
image:
  prompt: Two people sharing a secret smile
  url: assets/baoyu_escape_later.webp
  characters:
    - baoyu
    - daiyu
```

"晚宴八点开始，我们九点溜走。"你和她约定，"在停车场见。"
黛玉点点头，嘴角浮现出难得的笑容。
有了这个约定，接下来的活动似乎也没那么难熬了。

* [继续活动] -> baoyu_continue_prep

---

# baoyu_continue_prep

```yaml
image:
  prompt: Time passing montage, meetings and handshakes
```

午餐会、投资人见面会……一个接一个的场合，你像一个提线木偶一样被推着走。
终于，时间来到了傍晚。发布会即将正式开始。

* [前往发布会现场] -> gala_start

---

# daiyu_prologue

```yaml
image:
  prompt: Minimalist apartment with large windows, rainy city view, laptop on desk
  character: daiyu
  url: assets/daiyu_apartment.webp
```

窗外的雨又下了一整夜。你在这间集团分配的高级公寓里醒来，感到一阵莫名的凉意。
电脑屏幕上停留着你昨晚写好的专栏文章《繁华背后的虚无：评大观园项目》。

* [重读一遍文章] -> daiyu_reread_article
* [查看邮件] -> daiyu_check_email
* [先洗漱] -> daiyu_morning_routine

---

# daiyu_reread_article

```yaml
image:
  prompt: Laptop screen showing article text with critical title
```

你的文章措辞犀利：
"大观园项目，本质上是资本对传统文化的又一次掠夺。当亭台楼阁变成NFT，当诗词歌赋变成元宇宙资产，我们失去的不仅是物质遗产，更是一种无法标价的精神……"
这篇文章如果发布，肯定会惹怒贾家。但你不在乎。

* [发布文章] -> daiyu_publish (set: social_status = social_status - 10, mental_state = mental_state + 10)
* [暂时保存] -> daiyu_save_article

---

# daiyu_check_email

```yaml
image:
  prompt: Email inbox showing rejection letter
  url: assets/daiyu_check_email.webp
```

邮箱里有一封新邮件。是你投稿的那家出版社。
标题：关于您的投稿《都市浮世绘》
内容却让你心凉："经过慎重考虑，我们认为您的作品风格过于尖锐，不太适合当前的市场定位……"
又一次被拒了。

* [删除邮件] -> daiyu_delete_email (set: mental_state = mental_state - 10)
* [保存起来，以后证明他们错了] -> daiyu_save_email

---

# daiyu_morning_routine

```yaml
image:
  prompt: Modern bathroom, medicine bottles on counter
  character: daiyu
  url: assets/daiyu_medicine.webp
```

你走进浴室，镜子里的自己面色苍白。
洗手台上放着好几瓶药：止咳药、安眠药、维生素。你的身体一直不太好，A市的空气污染让你的呼吸道更加脆弱。
咳嗽了几声，你开始洗漱。

* [吃过早饭后准备出门] -> daiyu_breakfast

---

# daiyu_publish

```yaml
image:
  prompt: Finger pressing publish button on screen
```

你深吸一口气，点击了"发布"。
文章瞬间出现在你的匿名博客上。虽然只有几百个粉丝，但这让你心里痛快了不少。
手机响了，是宝玉发来的消息："今天的发布会，我不想去。"

* [回复他] -> daiyu_reply_baoyu

---

# daiyu_save_article

```yaml
image:
  prompt: Document being saved to drafts folder
```

你把文章存入草稿箱。也许还不是发布的时机。
在这个屋檐下，有些话说出来，代价太大了。

* [准备出门] -> daiyu_prepare_leave

---

# daiyu_delete_email

```yaml
image:
  prompt: Email being deleted, trash icon
```

你把邮件拖进垃圾箱，心里空空的。
这是第几次被拒了？你已经记不清了。
手机震动，是宝玉的消息。

* [查看消息] -> daiyu_see_baoyu_msg

---

# daiyu_save_email

```yaml
image:
  prompt: Email being moved to a folder called Evidence
```

你把邮件存入一个叫"证明他们错了"的文件夹。里面已经有十几封类似的拒稿信。
总有一天，你要让他们看看，他们错过了什么。

* [准备出门] -> daiyu_prepare_leave

---

# daiyu_breakfast

```yaml
image:
  prompt: Simple breakfast, oatmeal and tea, lonely dining table
  url: assets/daiyu_breakfast.webp
```

你吃着简单的早餐，看着窗外灰蒙蒙的天空。
手机震动，是宝玉的消息："今天的发布会，我不想去。"
你忍不住苦笑。他是继承人，都不想去；你只是个寄居的亲戚，更没有理由想去。

* [回复他] -> daiyu_reply_baoyu

---

# daiyu_see_baoyu_msg

```yaml
image:
  prompt: Phone notification from Baoyu
```

宝玉的消息："今天的发布会，我不想去。"
他总是这样，像一只被关在金丝笼里的鸟。至少他有笼子，而你连笼子都不属于。

* [回复他] -> daiyu_reply_baoyu

---

# daiyu_reply_baoyu

```yaml
image:
  prompt: Daiyu typing on phone, slight smile
  url: assets/daiyu_reply_baoyu.webp
  character: daiyu
```

你回复："我也不想去。但如果你去，我可以勉强陪你装一会儿假笑。"
宝玉的回复很快："那说定了。我需要一个喘息的角落，你来当我的避风港。"
你不自觉地嘴角上扬。

* [准备出门] -> daiyu_prepare_leave

---

# daiyu_prepare_leave

```yaml
image:
  prompt: Daiyu choosing outfit from closet, elegant dresses
  character: daiyu
```

你打开衣柜，犹豫着该穿什么。
一件淡紫色的连衣裙引起了你的注意——那是去年和宝玉一起逛街时买的。他说这个颜色很衬你的气质。

* [穿淡紫色连衣裙] -> daiyu_dress_purple (set: relationship_baoyu_daiyu = relationship_baoyu_daiyu + 5)
* [穿黑色艺术风外套] -> daiyu_dress_black (set: social_status = social_status - 5, mental_state = mental_state + 5)

---

# daiyu_dress_purple

```yaml
image:
  prompt: Daiyu in elegant purple dress, looking in mirror
  url: assets/daiyu_dress_purple.webp
  character: daiyu
```

你换上淡紫色的连衣裙，对着镜子看了看。
不算太隆重，但也不失礼。最重要的是，也许宝玉会记得这件衣服。

* [出发] -> daiyu_leave_apartment

---

# daiyu_dress_black

```yaml
image:
  prompt: Daiyu in artistic black outfit, defiant expression
  url: assets/daiyu_dress_black.webp
  character: daiyu
```

你选择了黑色的设计师款风衣。如果非要去参加这个虚伪的派对，至少要保持自己的风格。
不需要讨好任何人。

* [出发] -> daiyu_leave_apartment

---

# daiyu_leave_apartment

```yaml
image:
  prompt: Daiyu walking out of luxury apartment building, city street
  url: assets/daiyu_leave.webp
  character: daiyu
```

你走出公寓楼。外面的雨刚刚停，空气中弥漫着潮湿的气息。
没有司机来接你。虽然住在贾家资助的公寓里，但你从来没有享受过家族核心成员的待遇。
你叫了一辆网约车。

* [前往酒店] -> daiyu_car_ride

---

# daiyu_car_ride

```yaml
image:
  prompt: View from inside car, city passing by, Daiyu looking out window pensively
  character: daiyu
  url: https://i.muistory.com/images/dream-of-modern-city/1768467568362-daiyu_car.webp
```

车子穿过A市的街道。你看着窗外那些光鲜亮丽的建筑，心想：这座城市有多少人像你一样，住在别人给的屋檐下，过着看似体面实则飘摇的生活？
司机突然问："小姐，你是去参加那个大观园发布会吗？听说很隆重。"

* [是的] -> daiyu_confirm_destination
* [保持沉默] -> daiyu_silent_ride

---

# daiyu_confirm_destination

```yaml
image:
  prompt: Driver making conversation, rearview mirror
```

"是的。"你简短地回答。
"哇，那肯定是大人物吧！我听说贾家的二公子今天会出席，网上都在讨论呢。"
你淡淡一笑，没有接话。大人物？也许吧。但你不觉得自己和他们是同一个世界的人。

* [到达酒店] -> daiyu_arrive_venue

---

# daiyu_silent_ride

```yaml
image:
  prompt: Daiyu putting in earphones, ignoring driver
  character: daiyu
```

你戴上耳机，播放着喜欢的独立音乐，隔绝了车内的一切。
窗外的城市像一幅流动的画，你看着它，心里却想着别的事情。

* [到达酒店] -> daiyu_arrive_venue

---

# daiyu_arrive_venue

```yaml
image:
  prompt: Daiyu arriving at hotel entrance, media and crowds
  url: assets/daiyu_arrive_venue.webp
  character: daiyu
```

酒店门口人山人海。红毯、闪光灯、记者群……这一切都与你无关。
你没有走红毯的资格，也不想要。从侧门进去就好。
但正当你绕向侧门时，一个声音叫住了你。

* [回头看] -> daiyu_stopped_by

---

# daiyu_stopped_by

```yaml
image:
  prompt: Baochai calling out to Daiyu at hotel entrance
  characters:
    - daiyu
    - baochai
```

"林小姐？"是宝钗，穿着得体的职业装，正从一辆商务车上下来。
"今天怎么从侧门走？来来来，和我一起进去。"宝钗笑着招手。
你有些犹豫。和宝钗一起走红毯，意味着被镜头拍到。

* [接受邀请] -> daiyu_walk_with_baochai (set: relationship_daiyu_baochai = relationship_daiyu_baochai + 10)
* [婉拒，坚持走侧门] -> daiyu_go_side_door

---

# daiyu_walk_with_baochai

```yaml
image:
  prompt: Daiyu and Baochai walking together towards hotel entrance
  url: assets/daiyu_walk_with_baochai.webp
  characters:
    - daiyu
    - baochai
```

你走向宝钗，两人一起踏上红毯。
"林小姐难得打扮这么漂亮，"宝钗挽着你的手臂，"今天一定有很多人会注意到你。"
你知道她是好意，但这种关注并不是你想要的。

* [进入酒店] -> gala_start

---

# daiyu_go_side_door

```yaml
image:
  prompt: Daiyu walking towards side entrance alone
  character: daiyu
```

"谢谢宝钗姐，但我不太喜欢那种场面。"你礼貌地拒绝。
宝钗点点头，露出理解的表情："那我们里面见。"
你从侧门进入酒店，避开了所有镜头。

* [进入酒店] -> gala_start

---

# baochai_prologue

```yaml
image:
  prompt: Modern office at dawn, Baochai doing morning routine with data on screens
  character: baochai
  url: https://i.muistory.com/images/dream-of-modern-city/1768467568919-baochai_morning.webp
```

你的闹钟在早上6点准时响起。
晨跑、阅读财报、回复邮件——每一天都按照精密的计划运转。今天是"大观园"项目的发布会，也是薛家与贾家深度绑定的关键时刻。
虽然项目里有很多不切实际的泡沫，但你必须确保今天的演示完美无缺。

* [检查发布会准备情况] -> baochai_check_prep
* [给团队开早会] -> baochai_morning_meeting
* [先去健身房] -> baochai_gym

---

# baochai_check_prep

```yaml
image:
  prompt: Tablet showing presentation files and checklists
```

你打开工作软件，检查发布会的准备情况。
演示文稿：已完成
嘉宾名单：已确认
媒体接待：已安排
技术调试：进行中
一切都在掌控之中。除了一件事——宝玉的演讲稿还没有确认。

* [给宝玉发消息] -> baochai_msg_baoyu
* [自己准备一份备用稿] -> baochai_backup_speech

---

# baochai_morning_meeting

```yaml
image:
  prompt: Video conference with team members on multiple screens
  url: assets/baochai_morning_meeting.webp
```

你召集团队进行线上早会。
"今天是关键的一天，"你对着屏幕里的同事们说，"每个人都要做到120分。任何问题，第一时间向我汇报。"
团队成员纷纷表示收到。

* [结束会议，准备出发] -> baochai_leave_office

---

# baochai_gym

```yaml
image:
  prompt: Baochai on treadmill in gym, determined expression
  character: baochai
  url: https://i.muistory.com/images/dream-of-modern-city/1768467569498-baochai_gym.webp
```

即使再忙，你也不会放弃健身的习惯。健康的身体是革命的本钱。
跑步机上，你一边跑一边在脑海中过着今天的流程。
没有什么是不能通过计划和执行来解决的。

* [结束健身，准备出发] -> baochai_leave_office

---

# baochai_msg_baoyu

```yaml
image:
  prompt: Phone message to Baoyu
```

你给宝玉发了一条措辞温和但坚定的微信：
"宝玉，今天的场合很重要，记得准时到。我帮你准备了演讲稿，到时候看一下。"
没有回复。你早已习惯。

* [准备备用方案] -> baochai_backup_speech

---

# baochai_backup_speech

```yaml
image:
  prompt: Baochai typing on laptop, focused expression
  url: assets/baochai_backup_speech.webp
  character: baochai
```

你快速起草了一份备用演讲稿。万一宝玉临场发挥糟糕，你可以在后台通过耳麦提词。
这就是你——永远有Plan B。

* [准备出发] -> baochai_leave_office

---

# baochai_leave_office

```yaml
image:
  prompt: Baochai in elevator, checking phone, professional outfit
  character: baochai
  url: https://i.muistory.com/images/dream-of-modern-city/1768467570098-baochai_elevator.webp
```

你乘电梯下楼，一边查看手机上的最新消息。
母亲发来一条语音："宝钗，今天的发布会一定要表现好。薛家的未来就靠你了。"
你没有回复，只是默默地叹了口气。

* [前往酒店] -> baochai_car

---

# baochai_car

```yaml
image:
  prompt: Business car interior, Baochai reviewing documents
  url: assets/baochai_car.webp
  character: baochai
```

公司的商务车早已等在楼下。你坐进后座，继续处理工作。
司机问："薛总，今天交通可能有点堵，要绕路吗？"
你看了一眼时间："不用，按原计划走。我需要在路上处理一些事情。"

* [前往酒店] -> baochai_arrive_early

---

# baochai_arrive_early

```yaml
image:
  prompt: Baochai arriving at hotel, staff greeting her
  url: assets/baochai_arrive_early.webp
  character: baochai
```

你比预定时间早到了半小时。这正是你想要的。
酒店的工作人员认出了你："薛经理，里面都准备好了。技术团队在调试最后一点细节。"
"好，我去看看。"

* [检查现场] -> baochai_inspect_venue

---

# baochai_inspect_venue

```yaml
image:
  prompt: Baochai inspecting event setup, giving instructions
  character: baochai
```

你在会场里走了一圈，挑出了几个需要调整的地方：
"这边的灯光太暗了，调亮10%。"
"嘉宾座位的名牌字体太小，重新打印。"
"茶歇区的甜点种类不够，再加几样无糖的选项。"
一切都在你的掌控之中。

* [等待其他人到来] -> baochai_wait_others

---

# baochai_wait_others

```yaml
image:
  prompt: Baochai at VIP lounge, tablet in hand, calm
  character: baochai
```

你在VIP休息室坐下，等待其他主要人员的到来。
手机震动，是熙凤发来的消息："宝钗，我可能会晚一点到，有点事情要处理。"
你回复："好的，这边我盯着。"

* [继续等待] -> gala_start

---

# xifeng_prologue

```yaml
image:
  prompt: Luxury car interior, Xifeng on phone, stressed
  character: xifeng
  url: https://i.muistory.com/images/dream-of-modern-city/1768467570659-xifeng_car_interior.webp
```

车子在拥堵的高架上缓慢移动。你正在接听第三个催债电话。
"大观园项目的首付款今天就会到账，你们急什么！"你压低声音吼道，然后迅速挂断，换上一副笑脸接听董事长的电话。

* [应付婆婆的电话] -> xifeng_call_madam
* [先吃一颗止痛药] -> xifeng_take_medicine

---

# xifeng_call_madam

```yaml
image:
  prompt: Xifeng talking on phone with fake smile
  url: assets/xifeng_call_madam.webp
  character: xifeng
```

"老太太，您放心，今天的发布会一切都安排妥当了。"
电话那头传来老人家的声音："熙凤啊，家里的事都靠你了。政儿（贾政）太迂腐，宝玉又不成器，就你最靠谱。"
"老太太过奖了。"你的笑容越来越僵硬。

* [挂断电话] -> xifeng_hang_up

---

# xifeng_take_medicine

```yaml
image:
  prompt: Xifeng taking medication with water, exhausted
  url: assets/xifeng_take_medicine.webp
  character: xifeng
```

头痛欲裂。你吞下一颗止痛药，闭上眼睛深呼吸。
压力太大了。那个三亿的窟窿就像一把悬在头顶的刀，随时可能落下。
今天，只要今天撑过去，新的融资进来，一切都会好起来的。

* [继续处理事务] -> xifeng_handle_business

---

# xifeng_hang_up

```yaml
image:
  prompt: Xifeng exhaling after phone call, rubbing temples
  character: xifeng
```

你挂断电话，按了按太阳穴。
手机上又跳出几条消息。有的是催款的，有的是问进度的，还有一条是匿名发来的：
"王总，证监会的人在查离岸账户，小心点。"

* [回复匿名消息] -> xifeng_reply_anonymous (set: investigation_progress = investigation_progress + 10)
* [暂时忽略，先到酒店再说] -> xifeng_ignore_msg

---

# xifeng_handle_business

```yaml
image:
  prompt: Xifeng making multiple phone calls, stressed
  character: xifeng
```

你开始处理今天必须搞定的几件事：

* [到达酒店] -> xifeng_arrive_venue

---

# xifeng_reply_anonymous

```yaml
image:
  prompt: Xifeng typing reply carefully on phone
  character: xifeng
```

你回复那条匿名消息："谁？有什么具体消息？"
对方没有立刻回复。你盯着屏幕，心跳加速。
如果证监会真的在查……今天的发布会可能比你想象的更加凶险。

* [到达酒店] -> xifeng_arrive_venue

---

# xifeng_ignore_msg

```yaml
image:
  prompt: Xifeng putting phone away, determined expression
  character: xifeng
```

你把手机收起来。现在不是担心这些的时候。
先把今天的发布会办好，其他的事以后再说。
车子终于驶出了堵车区域。

* [到达酒店] -> xifeng_arrive_venue

---

# xifeng_arrive_venue

```yaml
image:
  prompt: Xifeng stepping out of luxury car, power pose
  url: assets/xifeng_arrive_venue.webp
  character: xifeng
```

你比其他人都早到。这是你的习惯——永远要掌控全场。
酒店的经理亲自迎接："王总，一切都按您的吩咐准备好了。"
"很好。"你点点头，快步走进酒店。

* [检查安保情况] -> xifeng_check_security
* [直接去后台] -> xifeng_backstage

---

# xifeng_check_security

```yaml
image:
  prompt: Xifeng talking to security chief
  character: xifeng
```

你找到安保负责人："今天有没有什么可疑的访客名单？"
"王总，都是经过审核的嘉宾和媒体。"
"记住，任何没有邀请函的人，一律不许进入。"
你可不想今天出什么岔子。

* [前往后台] -> xifeng_backstage

---

# xifeng_backstage

```yaml
image:
  prompt: Xifeng in VIP backstage area, checking preparations
  character: xifeng
```

后台区域，宝钗已经在那里了。
"熙凤姐，"宝钗迎上来，"一切准备就绪，宝玉也快到了。"
"很好。"你满意地点点头，"今天不能出任何差错。"

* [等待发布会开始] -> gala_start

---

# gala_start

```yaml
image:
  prompt: Grand ballroom with holographic displays of traditional gardens, futuristic gala
  url: https://i.muistory.com/images/dream-of-modern-city/1768383691492-grand_view_gala.webp
```

第一幕：盛世华年
A市最顶级的洲际酒店宴会厅，"大观园元宇宙"发布会现场灯光璀璨。
全息投影将传统的亭台楼阁与赛博朋克风格完美融合，正如贾氏集团试图展示的形象——传统与未来的结合。
四位主角，各怀心事，齐聚一堂。

* [寻找安静的角落（宝玉/黛玉）] -> scene_meet_corner (if: current_role == "baoyu" or current_role == "daiyu")
* [准备上台致辞（熙凤）] -> scene_speech_prep (if: current_role == "xifeng")
* [接待重要投资人（宝钗）] -> scene_networking_prep (if: current_role == "baochai")

---

# scene_meet_corner

```yaml
image:
  prompt: Quiet balcony away from party, night city view, two figures talking
  url: https://i.muistory.com/images/dream-of-modern-city/1768383692294-baoyu_daiyu_balcony.webp
```

你躲到了露台上，试图逃离里面的喧嚣。
出乎意料的是，这里已经有人了——正是你一直在找的那个人。
城市的夜景在你们身后展开，霓虹灯的光芒映照着两张年轻的面庞。

* [打招呼] -> scene_balcony_talk

---

# scene_balcony_talk

```yaml
image:
  prompt: Baoyu and Daiyu intimate conversation on balcony
  url: assets/scene_balcony_talk.webp
  characters:
    - baoyu
    - daiyu
```

(如果是宝玉)
"你果然在这里。"你走过去站在她身边。

(如果是黛玉)
"果然，你也受不了里面了。"你给他让了个位置。

两人的目光在夜空中交汇，无需多言就能懂得彼此的疲惫。

* [聊聊这个发布会] -> scene_discuss_gala
* [聊聊最近的心事] -> scene_share_feelings

---

# scene_discuss_gala

```yaml
image:
  prompt: Two people looking at holographic display through window
  characters:
    - baoyu
    - daiyu
```

"你看那个全息投影，"黛玉指着里面的大观园虚拟景观，"多讽刺啊。真正的大观园早就被拆了，现在却要把它变成NFT来卖。"

宝玉叹了口气："我也觉得荒谬。但这是家族的决定，我改变不了什么。"

"你是继承人，怎么会改变不了？"

"正因为是继承人，才更没有选择。"

* [继续深入交谈] -> scene_deep_talk
* [转换话题] -> scene_share_feelings

---

# scene_share_feelings

```yaml
image:
  prompt: Close intimate conversation, emotional atmosphere
  characters:
    - baoyu
    - daiyu
```

"最近怎么样？那个出版社有消息了吗？"宝玉关心地问。

黛玉苦笑："又被拒了。说我的风格太尖锐，不符合市场定位。"

"那些人不懂艺术。"

"可不懂艺术的人，掌握着出版的权力。"黛玉的声音里带着一丝无奈，"有时候我真想放弃。"

* [安慰她] -> scene_comfort_daiyu (set: relationship_baoyu_daiyu = relationship_baoyu_daiyu + 10)
* [一起吐槽这个世界] -> scene_complain_together

---

# scene_deep_talk

```yaml
image:
  prompt: Two silhouettes against city lights, deep discussion
  url: assets/scene_deep_talk.webp
  characters:
    - baoyu
    - daiyu
```

"你有没有想过，"黛玉低声问，"如果不是贾家的人，你想做什么？"

宝玉沉默了一会："也许……开一个小画廊？或者做独立游戏？反正不是现在这样。"

"那为什么不去做？"

"我欠这个家族太多。"宝玉的语气里有说不出的沉重，"祖母把所有希望都寄托在我身上。我不能让她失望。"

* [理解他的困境] -> scene_understand (set: relationship_baoyu_daiyu = relationship_baoyu_daiyu + 5)
* [鼓励他反抗] -> scene_encourage_rebel (set: mental_state = mental_state + 5)

---

# scene_comfort_daiyu

```yaml
image:
  prompt: Baoyu comforting Daiyu gently
  url: assets/scene_comfort_daiyu.webp
  characters:
    - baoyu
    - daiyu
```

宝玉握住黛玉的手："别放弃。总有一天，会有人看到你的才华。"

"你总是这么说。"黛玉的眼眶微红。

"因为这是真的。在这个浮华的世界里，你的文字是最真实的东西。"

* [继续谈话] -> scene_interrupted

---

# scene_complain_together

```yaml
image:
  prompt: Two people laughing together cynically
  characters:
    - baoyu
    - daiyu
```

"这个世界太假了。"宝玉附和道，"你看里面那些人，脸上的笑容都像是3D打印出来的。"

黛玉忍不住笑了："你这比喻太贴切了。"

两人相视而笑，突然间，周围的一切都不那么令人窒息了。

* [继续聊天] -> scene_interrupted

---

# scene_understand

```yaml
image:
  prompt: Understanding expression between two people
  characters:
    - baoyu
    - daiyu
```

"我懂你的感受。"黛玉轻声说，"我们都是被困在笼子里的人。只是笼子的材质不同。"

"你的笼子是什么？"

"寄人篱下的身份。"黛玉苦笑，"没有贾家的资助，我连住的地方都没有。"

两人沉默了。原来彼此都是如此身不由己。

* [被打断] -> scene_interrupted

---

# scene_encourage_rebel

```yaml
image:
  prompt: Daiyu speaking passionately to Baoyu
  characters:
    - baoyu
    - daiyu
```

"可是，"黛玉认真地看着他，"如果你一直因为责任而放弃自己，最后你还剩下什么？"

宝玉愣住了。

"我知道家族很重要。但你的人生也很重要。你不能永远为了别人而活。"

* [被打断] -> scene_interrupted

---

# scene_interrupted

```yaml
image:
  prompt: Baochai appearing at balcony door
  character: baochai
```

正当谈话越来越深入时，露台的门被推开了。

"原来你们在这里！"是宝钗的声音，"发布会快开始了，宝玉，你该上台了。"

两人的私密时刻被打断。

* [跟宝钗去] -> scene_back_to_gala
* [再待一会儿] -> scene_stay_moment (set: relationship_baoyu_daiyu = relationship_baoyu_daiyu + 5)

---

# scene_stay_moment

```yaml
image:
  prompt: Baoyu hesitating, looking at Daiyu then Baochai
  characters:
    - baoyu
    - daiyu
    - baochai
```

"再给我一分钟。"你说。

宝钗皱了皱眉，但还是点头走了。

你转向黛玉："今晚晚宴的时候，我们溜出去吧。去那个我说过的地方。"

黛玉的眼睛亮了一下："好。"

* [回到会场] -> scene_back_to_gala

---

# scene_back_to_gala

```yaml
image:
  prompt: Walking back into crowded gala
```

你回到灯火辉煌的会场。
距离正式发布会开始还有十分钟。人们三五成群地交谈，香槟杯碰撞的声音不绝于耳。

* [准备上台（宝玉）] -> scene_baoyu_speech (if: current_role == "baoyu")
* [找个角落等待（黛玉）] -> scene_daiyu_wait (if: current_role == "daiyu")

---

# scene_speech_prep

```yaml
image:
  prompt: Xifeng checking notes before speech, backstage
  character: xifeng
  url: https://i.muistory.com/images/dream-of-modern-city/1768383692972-xifeng_crisis.webp
```

作为今天的主持人和实际操盘手，你需要做一个5分钟的开场致辞。
稿子早就背熟了，但你还是又过了一遍。不能有任何差错。
助理走过来低声说："王总，有几个记者在问关于集团财务状况的问题。"

* [让公关处理] -> scene_delegate_pr
* [亲自回应] -> scene_handle_media

---

# scene_delegate_pr

```yaml
image:
  prompt: Xifeng giving orders to assistant
  character: xifeng
```

"告诉他们，今天只谈大观园项目。其他问题不在讨论范围内。"你冷冷地说。

助理点头离开。

你知道这些记者为什么来。最近关于贾氏集团资金链断裂的传言甚嚣尘上。今天的发布会，必须把这些流言彻底压下去。

* [準備上台] -> scene_xifeng_stage

---

# scene_handle_media

```yaml
image:
  prompt: Xifeng smoothly talking to journalists
  character: xifeng
```

你决定亲自出马。在媒体区，几个记者正在等待。

"各位，"你露出职业性的微笑，"今天是大观园项目的大日子，我们很乐意回答任何关于项目的问题。至于其他传言，我相信明眼人都能分辨真假。"

你的自信态度暂时让记者们安静了下来。

* [準備上台] -> scene_xifeng_stage

---

# scene_xifeng_stage

```yaml
image:
  prompt: Xifeng walking towards stage, confident
  character: xifeng
```

灯光暗下，你走上舞台。

聚光灯打在你身上，全场的目光都集中过来。这一刻，你是这个舞台上最耀眼的人。

"各位嘉宾，欢迎来到贾氏集团'大观园元宇宙'项目发布会……"

你的声音沉稳有力，每一个字都充满自信。

* [继续演讲] -> scene_xifeng_speech

---

# scene_xifeng_speech

```yaml
image:
  prompt: Xifeng giving powerful speech on stage, large audience
  character: xifeng
```

"大观园，曾经是明清时期最美丽的私家园林之一。今天，我们将用最前沿的技术，让它在元宇宙中重生……"

台下掌声雷动。媒体的镜头对准你，闪光灯此起彼伏。

然而，就在这时，你注意到会场后方有几个西装革履的陌生人正在和安保交涉。他们的表情很严肃。

* [假装没看见，继续演讲] -> scene_continue_speech
* [缩短演讲，尽快下台] -> scene_cut_speech

---

# scene_continue_speech

```yaml
image:
  prompt: Xifeng continuing speech while glancing at back of room
  character: xifeng
```

你强迫自己集中注意力，继续演讲。

"……这不仅是一个商业项目，更是文化传承与科技创新的完美结合。我们相信，大观园元宇宙将成为未来数字资产的标杆……"

演讲终于结束了。在掌声中，你快步走下台，心跳加速。

* [去查看那些人] -> scene_check_strangers

---

# scene_cut_speech

```yaml
image:
  prompt: Xifeng wrapping up speech quickly
  character: xifeng
```

你迅速跳过了几个段落，简短地结束了演讲。

"……感谢各位的支持。接下来，请欣赏我们的项目展示。"

掌声有些稀疏——显然大家对如此仓促的结尾感到意外。但你顾不上这些了。

* [去查看那些人] -> scene_check_strangers (set: social_status = social_status - 5)

---

# scene_check_strangers

```yaml
image:
  prompt: Xifeng confronting officials in corner
  character: xifeng
```

你走向那群陌生人。近了才发现，带头的是证监会的调查员。

"王总，关于集团近期的一笔离岸资金流动，我们需要您配合调查。"

你的心沉到谷底，但表面上依然镇定："现在是发布会，几千家媒体在场。我们可以改天约时间吗？"

* [威胁他们] -> scene_threaten_officials (set: corruption_level = corruption_level + 10)
* [试图拖延] -> scene_delay_officials
* [请宝钗来帮忙] -> scene_call_baochai_help

---

# scene_threaten_officials

```yaml
image:
  prompt: Xifeng threatening officials with cold expression
  character: xifeng
```

"各位，"你压低声音，"我不知道是谁安排你们今天来的。但如果你们想把事情闹大，我可以保证，你们的上司明天就会接到电话。"

调查员对视了一眼，表情变得僵硬。

"王总，我们只是例行公事。"

"那就改天再说。"你转身离开，留下一群尴尬的调查员。

但你知道，这只是暂时的。

* [继续发布会] -> scene_gala_continues

---

# scene_delay_officials

```yaml
image:
  prompt: Xifeng negotiating with officials
  character: xifeng
```

"各位辛苦了。今天确实不太方便，这样吧，明天早上，我亲自去贵单位拜访，把所有材料都准备好。"

調查員猶豫了一下："那好吧。但明天一早，我們見。"

你点头，目送他们离开。暂时逃过一劫，但明天怎么办？你需要尽快想办法。

* [继续发布会] -> scene_gala_continues

---

# scene_call_baochai_help

```yaml
image:
  prompt: Xifeng signaling Baochai
  character: xifeng
```

你向宝钗使了个眼色。她立刻走了过来。

"这几位是？"宝钗微笑着问。

你用眼神告诉她情况紧急。宝钗立刻明白了，开始用她天衣无缝的外交辞令安抚这群不速之客。

"各位，张行长正在VIP室等你们呢，要不我带你们过去？"

调查员们面面相觑，最后还是跟着宝钗走了。

* [继续发布会] -> scene_gala_continues (set: relationship_xifeng_baoyu = relationship_xifeng_baoyu + 5)

---

# scene_networking_prep

```yaml
image:
  prompt: Baochai preparing for VIP networking
  character: baochai
```

发布会开始前，你需要接待几位重要的投资人。
今天最重要的是王总——他代表着30亿的潜在投资。如果能拿下这笔钱，大观园项目就能真正启动。
你整理了一下领口，朝VIP区走去。

* [迎接王总] -> scene_meet_investor

---

# scene_meet_investor

```yaml
image:
  prompt: Baochai greeting elderly businessman warmly
  character: baochai
```

"王总，久仰大名！"你热情地迎上去。

王总是个六十多岁的老人，精明的眼睛在你身上打量了一圈："薛小姐，贾家派你来接待我？看来他们很重视这笔投资。"

"您是我们最重要的合作伙伴，当然要最周到的接待。"

* [介绍项目亮点] -> scene_pitch_project
* [先闲聊建立关系] -> scene_small_talk

---

# scene_pitch_project

```yaml
image:
  prompt: Baochai showing tablet with project details to investor
  character: baochai
```

你拿出平板，开始介绍项目的亮点："王总，大观园元宇宙不仅仅是一个NFT项目。我们整合了虚拟地产、数字藏品和沉浸式社交三大板块……"

王总认真地听着，不时点头。

"回报率呢？"

"保守估计，三年内可以实现本金的两倍增值。"你自信地说。

* [继续谈判] -> scene_negotiation

---

# scene_small_talk

```yaml
image:
  prompt: Baochai and investor chatting casually
  character: baochai
```

"王总最近身体怎么样？听说您在练太极？"

王总笑了："你们年轻人消息这么灵通啊。是的，我最近迷上了陈式太极。"

"太巧了，我父亲也是太极爱好者。改天我安排你们一起切磋？"

关系迅速拉近了。

* [进入正题] -> scene_negotiation (set: trust_level = trust_level + 10)

---

# scene_negotiation

```yaml
image:
  prompt: Business negotiation in VIP room
  character: baochai
```

"薛小姐，项目我很感兴趣。"王总放下茶杯，"但我听说贾家最近资金链有些紧张？"

你心里一紧，但表情不变："王总，商场上哪有不遇到困难的？关键是如何解决。这个项目一旦启动，资金问题自然迎刃而解。"

"嗯……"王总沉吟着，"我需要再考虑考虑。"

* [加大说服力度] -> scene_push_harder
* [给他时间决定] -> scene_give_time

---

# scene_push_harder

```yaml
image:
  prompt: Baochai making passionate pitch
  character: baochai
```

"王总，我理解您的顾虑。但我可以告诉您，这个项目的政府背书已经拿到了。三个月后，会有更多的资本进入。您现在投资，就是抢占先机。"

王总的眼睛亮了一下："政府背书？哪个部门？"

"我可以安排一位领导和您见面。"你微笑着说。

这是你的杀手锏——虽然那位"领导"只是个处级干部，但对投资人来说，这就是足够的信号。

* [等待结果] -> scene_investor_decision

---

# scene_give_time

```yaml
image:
  prompt: Baochai nodding respectfully
  character: baochai
```

"当然，王总。这是大事，不急。您先看完今天的发布会，有什么问题随时给我打电话。"

王总满意地点点头："薛小姐做事周到，贾家有你是福气。"

"您过奖了。"

有时候，不着急反而更容易成功。

* [继续发布会] -> scene_gala_continues

---

# scene_investor_decision

```yaml
image:
  prompt: Investor shaking hands with Baochai
  character: baochai
```

王总站起身，伸出手："好，薛小姐。我原则上同意投资。具体条款，让律师团队下周对接。"

你握住他的手："王总英明！您不会后悔这个决定的。"

心里的大石头终于落了地。这一关，算是过了。

* [继续发布会] -> scene_gala_continues (set: family_wealth = family_wealth + 20)

---

# scene_baoyu_speech

```yaml
image:
  prompt: Baoyu nervously approaching stage
  character: baoyu
```

轮到你上台了。
宝钗在耳麦里提醒你："放松，就按照稿子来。"
你深吸一口气，走向舞台中央。几千双眼睛注视着你。

* [按稿子念] -> scene_baoyu_scripted
* [即兴发挥] -> scene_baoyu_unscripted

---

# scene_baoyu_scripted

```yaml
image:
  prompt: Baoyu reading speech stiffly from teleprompter
  character: baoyu
```

"各位嘉宾，感谢莅临。大观园元宇宙，是贾氏集团对未来的承诺，是传统与科技的完美融合……"

你机械地念着稿子，每一个字都像是从别人嘴里说出来的。

台下的反应平平，几个投资人甚至在看手机。

但至少，没有出错。

* [结束演讲] -> scene_speech_done

---

# scene_baoyu_unscripted

```yaml
image:
  prompt: Baoyu speaking from heart on stage
  character: baoyu
  url: https://i.muistory.com/images/dream-of-modern-city/1768404247164-baoyu_speech.webp
```

你放下提词器，开始说自己的话：

"我知道你们期待听到商业计划和回报率。但我想说点别的。"

会场安静了下来。

"大观园，不只是一串代码或一组NFT。它是我祖母年轻时玩耍的地方，是几代人的记忆，是一种正在消失的中国之美。"

你的眼眶有些湿润。

"如果这个项目能让更多人了解这种美，无论赚不赚钱，我觉得都值得。"

掌声雷动。

* [结束演讲] -> scene_speech_done (set: mental_state = mental_state + 20, courage = courage + 15)

---

# scene_speech_done

```yaml
image:
  prompt: Baoyu leaving stage, mixed emotions
  character: baoyu
```

演讲结束了。
你走下台，感觉精疲力竭。
黛玉在人群中朝你点了点头，那个动作让你安心了一些。
晚宴快开始了。你期待着之前约好的"逃亡计划"。

* [参加晚宴] -> scene_dinner_start

---

# scene_daiyu_wait

```yaml
image:
  prompt: Daiyu standing alone at edge of party
  character: daiyu
```

你站在会场边缘，看着那些衣着光鲜的人们来来往往。
你觉得自己像是一个旁观者，观察着一场与自己无关的表演。
这时，一个人走了过来。

* [是熟人] -> scene_daiyu_encounter

---

# scene_daiyu_encounter

```yaml
image:
  prompt: Daiyu meeting another woman at the party
```

是薛蟠的妹妹——夏金桂。一个尖酸刻薄、眼高于顶的女人。

"哟，这不是林小姐吗？怎么一个人站在角落里？是不认识人吗？"

"我只是不喜欢凑热闹。"你淡淡地回应。

"也是，毕竟像你这种寄人篱下的身份，确实不太方便四处交际。"

你感到一阵刺痛，但没有表现出来。

* [反唇相讥] -> scene_daiyu_retort (set: social_status = social_status + 5, mental_state = mental_state - 5)
* [默默走开] -> scene_daiyu_walk_away (set: mental_state = mental_state - 10)
* [用智慧化解] -> scene_daiyu_clever (set: social_status = social_status + 10)

---

# scene_daiyu_retort

```yaml
image:
  prompt: Daiyu responding sharply to another woman
  character: daiyu
```

"寄人篱下？"你微微一笑，"我只是住在贾家提供的公寓里，就像你住在薛家名下的房子里一样。说到底，咱们都是依附着男人的姓氏活着。区别只是，我知道这一点而已。"

夏金桂的脸色变了。

你转身离开，不给她反驳的机会。

* [去找宝玉] -> scene_find_baoyu

---

# scene_daiyu_walk_away

```yaml
image:
  prompt: Daiyu walking away, hurt expression
  character: daiyu
```

你没有说话，只是转身离开。

夏金桂的嘲笑声在身后响起："怪不得是个孤女，连架都不敢吵。"

眼眶有些发酸，但你不会让眼泪落下来。至少不在这里。

* [去找宝玉] -> scene_find_baoyu

---

# scene_daiyu_clever

```yaml
image:
  prompt: Daiyu smiling mysteriously
  character: daiyu
```

"金桂姐姐说得是。"你微微点头，"不过我听说，姐姐最近和薛蟠闹得不太愉快？希望姐姐也能保持好心情，毕竟一个家的和谐比什么都重要。"

你故意提起她和丈夫的矛盾，夏金桂的脸色瞬间变了。

"你！"她想说什么，却又不知道怎么接话。

你礼貌地微笑，转身离去。

* [去找宝玉] -> scene_find_baoyu

---

# scene_find_baoyu

```yaml
image:
  prompt: Daiyu searching for Baoyu in crowd
  character: daiyu
```

你在人群中寻找宝玉的身影。
终于，你在靠近出口的地方看到了他。他正在和一个中年男人应付着什么。
他的眼神里有一种疲惫和无奈，让你心疼。

* [等他忙完] -> scene_dinner_start

---

# scene_gala_continues

```yaml
image:
  prompt: Gala continuing with performances and networking
```

发布会的主体部分结束了，进入自由交流环节。
全息投影继续展示着大观园的虚拟景观。香槟在人群中传递，笑声与掌声交织。
表面上，一切都很完美。但水面下，暗流涌动。

* [进入晚宴环节] -> scene_dinner_start

---

# scene_dinner_start

```yaml
image:
  prompt: Formal dinner scene in grand ballroom, tables set elegantly
```

第二幕：裂痕

晚宴开始了。
圆桌上坐满了贾家的亲戚、合作伙伴和各路名流。全息投影的大观园在头顶缓缓转动，仿佛一个美丽的梦境。
但梦境总有醒来的时候。

* [观察周围（宝玉）] -> scene_baoyu_observe (if: current_role == "baoyu")
* [应付社交（黛玉）] -> scene_daiyu_social (if: current_role == "daiyu")
* [继续工作（宝钗）] -> scene_baochai_work (if: current_role == "baochai")
* [处理危机（熙凤）] -> scene_xifeng_crisis (if: current_role == "xifeng")

---

# scene_baoyu_observe

```yaml
image:
  prompt: Baoyu sitting at dinner table, looking around disinterested
  character: baoyu
```

你坐在主桌上，父亲就在你旁边。
他正在和一位银行家谈笑风生，时不时把话题引向你："我儿子今天的演讲怎么样？"

你礼貌地微笑，心思却早就飞到别处去了。

九点钟，你和黛玉约好了要溜走。现在才八点半，还有三十分钟要熬。

* [偷偷看手机] -> scene_baoyu_phone_check
* [和邻座搭话] -> scene_baoyu_talk_neighbor

---

# scene_baoyu_phone_check

```yaml
image:
  prompt: Baoyu checking phone under table
  character: baoyu
```

你趁父亲不注意，偷偷看了一眼手机。

黛玉发来消息："我在西门等你。"

你回复："再等我二十分钟。"

"别让我等太久。"

你忍不住微笑。

* [假装上厕所溜走] -> scene_baoyu_escape (set: relationship_baoyu_daiyu = relationship_baoyu_daiyu + 10)

---

# scene_baoyu_talk_neighbor

```yaml
image:
  prompt: Baoyu forced to talk to elderly guest
  character: baoyu
```

邻座是个集团的老股东，一直在说当年和你祖父一起创业的故事。

"……那时候我们什么都没有，就靠着一股冲劲！现在的年轻人啊，太缺乏吃苦精神了。"

你敷衍地点头，心里想着怎么脱身。

* [找借口离开] -> scene_baoyu_escape

---

# scene_baoyu_escape

```yaml
image:
  prompt: Baoyu quietly leaving dinner table
  character: baoyu
```

"爸，我去一下洗手间。"你小声说。

父亲点点头，继续他的社交。

你快步离开宴会厅，心跳加速。在走廊的尽头，西门就在那里。

* [去见黛玉] -> scene_escape_together

---

# scene_daiyu_social

```yaml
image:
  prompt: Daiyu at less prominent table, politely engaging
  character: daiyu
```

你被安排在一个不太显眼的桌子。旁边是几个贾家的远亲，对你还算客气。

"林小姐，听说你是做自由撰稿的？现在这行好做吗？"

"还行吧，够养活自己。"你淡淡地回答。

"年轻人有理想真好。"对方笑着说，"不过你也要考虑考虑现实问题，找个好人家嫁了才是正经事。"

你差点没忍住翻白眼。

* [敷衍几句] -> scene_daiyu_platitude
* [直接反驳] -> scene_daiyu_argue

---

# scene_daiyu_platitude

```yaml
image:
  prompt: Daiyu nodding politely but annoyed
  character: daiyu
```

"是啊，您说得对。"你敷衍道。

反正也不指望这些人能理解你。等着和宝玉溜走就行了。

你看了一眼时间，还有十五分钟。

* [找借口离开] -> scene_daiyu_leave

---

# scene_daiyu_argue

```yaml
image:
  prompt: Daiyu speaking firmly
  character: daiyu
```

"婶婶，"你微笑着说，"我觉得一个人活得好不好，不是靠嫁谁决定的。况且现在这个时代，女人完全可以自己创造价值。"

对方愣了一下，然后尴尬地笑笑："年轻人有想法，好好好。"

你知道她心里肯定在骂你不懂事。但无所谓了。

* [找借口离开] -> scene_daiyu_leave (set: mental_state = mental_state + 5)

---

# scene_daiyu_leave

```yaml
image:
  prompt: Daiyu excusing herself from table
  character: daiyu
```

"不好意思，我去透透气。"你站起身。

没有人在意你的离开。

你快步走向西门，心跳加速。

* [去见宝玉] -> scene_escape_together

---

# scene_baochai_work

```yaml
image:
  prompt: Baochai working during dinner, talking to various guests
  character: baochai
```

对你来说，晚宴不是休息时间，而是另一个工作场合。
你在各桌之间穿梭，和每一位重要嘉宾打招呼，确认投资意向，解答疑问。
一个助理跑过来低声说："薛经理，王总的投资意向书已经签了，但他要求见一下熙凤总确认细节。"

* [去找熙凤] -> scene_baochai_find_xifeng
* [先拖一下] -> scene_baochai_delay

---

# scene_baochai_find_xifeng

```yaml
image:
  prompt: Baochai looking for Xifeng in the crowd
  character: baochai
```

你在人群中寻找熙凤的身影。
奇怪，她不在主桌，也不在VIP区。
这时你注意到，熙凤正在走廊角落里和几个陌生男人激烈地讨论着什么。

* [过去查看] -> scene_baochai_witness

---

# scene_baochai_delay

```yaml
image:
  prompt: Baochai making phone call
  character: baochai
```

"告诉王总，熙凤总正在处理重要事务，稍后会亲自过来。"

你需要先搞清楚情况。熙凤今天的状态不太对劲。

* [去找熙凤] -> scene_baochai_witness

---

# scene_baochai_witness

```yaml
image:
  prompt: Baochai observing Xifeng confrontation from distance
```

你远远地看着那场对话。
熙凤的表情很紧张，那不像是正常的商业谈判。那几个男人像是……官员？

你走近了一些，隐约听到"调查""账户""配合"这样的词。

这不妙。

* [走过去解围] -> scene_baochai_intervene
* [先观察情况] -> scene_baochai_observe

---

# scene_baochai_intervene

```yaml
image:
  prompt: Baochai smoothly intervening in tense situation
  character: baochai
```

你优雅地走过去，露出职业性的微笑。

"熙凤姐，王总正在找您呢。他想和您确认投资意向书的细节。"

熙凤看了你一眼，眼神里有一丝感激。

"好，我马上过去。"她转向那些人，"各位，我们改天再聊。"

你成功地把她从那个尴尬的场面中解救出来。

* [和熙凤私下交谈] -> scene_baochai_xifeng_talk (set: relationship_xifeng_baoyu = relationship_xifeng_baoyu + 10)

---

# scene_baochai_observe

```yaml
image:
  prompt: Baochai watching from shadow
  character: baochai
```

你决定先不打草惊蛇。
那个对话持续了几分钟，然后那群人离开了。熙凤一个人站在那里，神情复杂。
你看到她掏出手机，似乎在给谁发消息。
这里面一定有问题。但现在不是追问的时候。

* [回到晚宴] -> scene_dinner_continue

---

# scene_baochai_xifeng_talk

```yaml
image:
  prompt: Baochai and Xifeng talking privately in corridor
  characters:
    - baochai
    - xifeng
```

"熙凤姐，"你压低声音，"那些人是谁？"

熙凤叹了口气："证监会的。他们在查一些账目问题。"

"严重吗？"

"……还在控制范围内。"熙凤的回答让你不太放心，但你知道现在不是追问的时候。

"需要我帮什么忙吗？"

"先帮我稳住王总。这笔投资必须拿下。"

* [去见王总] -> scene_baochai_meet_wang
* [继续关心熙凤] -> scene_baochai_more_concern

---

# scene_xifeng_crisis

```yaml
image:
  prompt: Xifeng in private room dealing with crisis
  character: xifeng
```

你借口身体不舒服，离开了宴会厅。
实际上，你需要马上处理刚才那些人带来的麻烦。
一个电话打给你的律师。
"证监会的人来了。他们查到了什么？"

* [听取汇报] -> scene_xifeng_lawyer

---

# scene_xifeng_lawyer

```yaml
image:
  prompt: Xifeng on phone with serious expression
  character: xifeng
```

律师的声音很紧张："王总，他们拿到了一些离岸账户的交易记录。目前还没有直接证据指向您，但他们在顺藤摸瓜。"

你的心沉了下去。那个账户是你用来周转资金的——如果被查实，就是挪用公款。

"能拖多久？"

"最多一个月。但如果他们找到新的证据……"

"想办法拖。我需要时间。"

你挂了电话，脑子里飞速运转。一个月，够吗？

* [思考对策] -> scene_xifeng_think

---

# scene_xifeng_think

```yaml
image:
  prompt: Xifeng deep in thought, stressed
  character: xifeng
```

现在有三个选项：

一、尽快拿到新的融资，填补窟窿。
二、找人"疏通关系"，让调查无疾而终。
三、把责任推给下面的人。

每一个选项都有风险。但你没有更好的办法了。

* [选择拉投资] -> scene_xifeng_plan_invest (set: corruption_level = corruption_level + 5)
* [选择疏通关系] -> scene_xifeng_plan_bribe (set: corruption_level = corruption_level + 20)
* [暂时不决定] -> scene_dinner_continue

---

# scene_xifeng_plan_invest

```yaml
image:
  prompt: Xifeng making determined decision
  character: xifeng
```

拉投资是最干净的办法。只要钱到位，一切问题都能解决。

王总的那笔投资必须拿下。还有，薛家的钱也可以考虑。

如果需要，就是牺牲一些东西，也值得。

你整理好情绪，准备回到宴会厅。

* [回到宴会] -> scene_dinner_continue

---

# scene_xifeng_plan_bribe

```yaml
image:
  prompt: Xifeng with dark determination
  character: xifeng
```

有时候，商场就是这样。干净的方法解决不了的问题，就得用不干净的方法。

你给一个"朋友"发了条信息："老张，有个事想请你帮忙，明天见面聊。"

这条路一旦走上去，就没有回头路了。但你已经别无选择。

* [回到宴会] -> scene_dinner_continue

---

# scene_escape_together

```yaml
image:
  prompt: Baoyu and Daiyu meeting secretly at side door
  characters:
    - baoyu
    - daiyu
```

西门的走廊里，黛玉正在等你。
看到你出现，她的眼睛亮了起来。
"终于！我以为你不来了。"
"怎么可能。"你拉起她的手，"走吧，逃离这个地方。"

两人快步走出酒店，消失在A市的夜色中。

* [私奔夜游] -> scene_night_escape

---

# scene_night_escape

```yaml
image:
  prompt: Two people walking through city night streets, holding hands
  characters:
    - baoyu
    - daiyu
  url: https://i.muistory.com/images/dream-of-modern-city/1768404248039-scene_night_escape.webp
```

A市的夜晚，霓虹灯闪烁，车水马龙。
但你们避开了繁华的商业区，走向一条安静的老街。
这是你们的秘密基地——一个隐藏在老城区的天台。

* [登上天台] -> scene_rooftop

---

# scene_rooftop

```yaml
image:
  prompt: Two people on rooftop overlooking city at night
  characters:
    - baoyu
    - daiyu
  url: https://i.muistory.com/images/dream-of-modern-city/1768404248783-scene_rooftop.webp
```

天台上，整个A市尽收眼底。
远处是贾氏集团的总部大楼，霓虹灯招牌闪闪发光。但在这里，那一切都显得那么遥远和虚幻。
"这里真好。"黛玉轻声说，"没有应酬，没有假笑，只有你我。"

* [聊聊未来] -> scene_talk_future
* [沉默地享受这一刻] -> scene_silent_moment

---

# scene_talk_future

```yaml
image:
  prompt: Intimate conversation on rooftop
  characters:
    - baoyu
    - daiyu
```

"你想过以后吗？"黛玉问。
"以后？"
"如果不是贾家的继承人，你想过什么样的生活？"
你沉默了一会儿："也许……有一个小画室，住在某个安静的地方。每天画画，不用见任何不想见的人。"
"那我呢？"
"你……"你看着她，"你当然和我在一起。"

* [认真告白] -> scene_confession (set: relationship_baoyu_daiyu = relationship_baoyu_daiyu + 20)
* [话锋一转] -> scene_change_topic

---

# scene_silent_moment

```yaml
image:
  prompt: Two silhouettes sitting together watching city lights
  characters:
    - baoyu
    - daiyu
```

你们什么都没说，只是并肩坐着，看着夜空。
城市的喧嚣仿佛被隔绝在很远的地方。
这一刻，时间仿佛静止了。

* [被打断] -> scene_phone_interrupt

---

# scene_confession

```yaml
image:
  prompt: Baoyu looking at Daiyu earnestly
  characters:
    - baoyu
    - daiyu
```

你转过身，认真地看着她：
"黛玉，我知道你不喜欢那个世界。我也不喜欢。但如果……如果将来有一天，我能决定自己的人生，我希望那里有你。"
黛玉的眼眶红了。
"你知道你在说什么吗？贾家不会同意的。你妈妈、你奶奶……"
"我知道。但我不在乎。"

* [亲吻她] -> scene_kiss (set: relationship_baoyu_daiyu = relationship_baoyu_daiyu + 30)
* [握住她的手] -> scene_hold_hands (set: relationship_baoyu_daiyu = relationship_baoyu_daiyu + 15)

---

# scene_change_topic

```yaml
image:
  prompt: Conversation turning lighter
  characters:
    - baoyu
    - daiyu
```

你看到她眼中闪过复杂的情绪，于是话锋一转：
"不过，说这些太遥远了。先把今晚过好再说。"
黛玉轻轻叹了口气，似乎有些失落，但还是笑了笑。

* [被打断] -> scene_phone_interrupt

---

# scene_kiss

```yaml
image:
  prompt: Romantic kiss on rooftop with city lights
  characters:
    - baoyu
    - daiyu
  url: https://i.muistory.com/images/dream-of-modern-city/1768383693563-rooftop_kiss.webp
```

你轻轻吻了她。
城市的灯火在你们身后闪烁，风从高处吹过，带来一丝凉意。
但这一刻，你们都感到无比温暖。
这是你们之间的秘密，属于两个人的永恒瞬间。

* [被打断] -> scene_phone_interrupt

---

# scene_hold_hands

```yaml
image:
  prompt: Hands held together, city lights in background
  characters:
    - baoyu
    - daiyu
```

你握紧她的手。
黛玉的手指细长而凉，你感到一阵心疼。
"不管发生什么，我都不会放开你。"你说。
她没有回答，只是把头靠在你的肩上。

* [被打断] -> scene_phone_interrupt

---

# scene_phone_interrupt

```yaml
image:
  prompt: Phone ringing, breaking the moment
```

手机突然响了起来，打破了这一刻的宁静。
是父亲打来的。
你看了一眼屏幕，犹豫着要不要接。

* [接电话] -> scene_answer_phone
* [挂断] -> scene_ignore_phone (set: family_wealth = family_wealth - 5)

---

# scene_answer_phone

```yaml
image:
  prompt: Baoyu answering phone reluctantly
  character: baoyu
```

"喂？"
"你在哪？！"父亲的声音充满怒气，"发布会还没结束，你就跑了？！"
"我……身体不舒服。"
"马上给我回来！王总在问你呢！"
你看了黛玉一眼，无奈地点点头。

* [回去] -> scene_return_party

---

# scene_ignore_phone

```yaml
image:
  prompt: Baoyu rejecting call
  character: baoyu
```

你按了挂断键。
"不接吗？"黛玉问。
"接了也是挨骂。"你苦笑，"让我再待一会儿。"
但你知道，今晚回去肯定有一场暴风雨在等着你。

* [继续待一会儿] -> scene_stay_longer

---

# scene_return_party

```yaml
image:
  prompt: Baoyu and Daiyu walking back reluctantly
  characters:
    - baoyu
    - daiyu
```

你们只能回去了。
黛玉从另一个入口进去，你则直接去找父亲。
短暂的自由时光结束了，现实再次将你们拉回那个令人窒息的世界。

* [面对父亲] -> scene_face_father

---

# scene_stay_longer

```yaml
image:
  prompt: Two people staying on rooftop a bit longer
  characters:
    - baoyu
    - daiyu
```

你们又待了一会儿。
手机不断震动，你索性关了机。
"你会后悔吗？"黛玉问。
"和你在一起的每一刻，我都不会后悔。"
终于，你们还是不得不离开。现实总在那里等着。

* [返回] -> scene_face_father

---

# scene_face_father

```yaml
image:
  prompt: Angry father confronting Baoyu in private room
  character: baoyu
```

父亲在酒店的一个小房间里等你。他的脸色铁青。
"你知道你今天有多丢人吗？发布会才开始，你就跑了！王总问你呢，我怎么回答？说我儿子去约会了？"
"爸，我……"
"你什么？！"父亲打断你，"你什么时候才能长大？你以为这个家族是靠你躲着就能撑下去的吗？！"

* [认错] -> scene_apologize (set: mental_state = mental_state - 15)
* [反驳] -> scene_rebel (set: mental_state = mental_state + 10, family_wealth = family_wealth - 10)

---

# scene_apologize

```yaml
image:
  prompt: Baoyu bowing head in apology
  character: baoyu
```

"对不起，爸。我错了。"
父亲的怒气稍微平息了一些。
"知道错就好。回去休息吧，明天还有一场投资人见面会，你必须出席。"
你点点头，心里空空的。

* [回家] -> scene_chapter1_end

---

# scene_rebel

```yaml
image:
  prompt: Baoyu arguing with father
  character: baoyu
```

"爸，我真的不想继续这样！"你终于忍不住爆发了，"我不喜欢这些应酬，不喜欢这些虚假的笑脸，我只想做我自己喜欢的事！"
父亲愣住了，然后他的表情变得更加复杂。
"你喜欢的事？你知道养活这个家有多难吗？你知道我每天承受着多少压力吗？"
"那是你的选择，不是我想要的！"
房间里陷入了沉默。

* [摔门离开] -> scene_leave_angry (set: path_chosen = "rebellion")

---

# scene_leave_angry

```yaml
image:
  prompt: Baoyu storming out of room
  character: baoyu
```

你转身离开，摔上了门。
走在酒店的走廊里，你感到前所未有的解脱，但也有一丝恐惧。
你不知道明天会发生什么。但今晚，你选择了做自己。

* [第一幕结束] -> scene_chapter1_end

---

# scene_dinner_continue

```yaml
image:
  prompt: Dinner party continuing, various conversations
```

晚宴继续进行着。
觥筹交错间，每个人都在扮演着自己的角色。
但水面下，一场风暴正在酝酿。

* [第一幕结束] -> scene_chapter1_end

---

# scene_baochai_meet_wang

```yaml
image:
  prompt: Baochai meeting investor Wang in VIP room
  character: baochai
```

你找到王总，专业地确认了投资意向书的每一个细节。
"薛小姐办事果然靠谱。"王总满意地点头，"这个项目，我看好。"
"谢谢王总信任。"
一场危机暂时化解了。但你知道，这只是开始。

* [第一幕结束] -> scene_chapter1_end

---

# scene_baochai_more_concern

```yaml
image:
  prompt: Baochai showing concern for Xifeng
  characters:
    - baochai
    - xifeng
```

"熙凤姐，如果有什么需要帮忙的，你告诉我。"
熙凤看着你，眼神复杂："宝钗，有些事情，知道得越少越好。相信我，这是为了保护你。"
你想追问，但她已经转身离开了。

* [第一幕结束] -> scene_chapter1_end

---

# scene_chapter1_end

```yaml
image:
  prompt: Night city skyline, transition scene
```

第一幕完

夜深了。A市的灯火依然璀璨。
发布会圆满结束，媒体的报道都是正面的。外人看来，贾氏集团正迎来一个新的辉煌时代。
但只有局内人知道，表面的光鲜之下，裂痕早已出现。
而这，只是故事的开始。

* [继续第二幕] -> act2_start

---

# act2_start

```yaml
image:
  prompt: Time passing montage, calendar pages, city scenes transitioning from night to day
```

第二幕：裂痕（一个月后）

大观园项目发布后的一个月。
表面上，一切进展顺利。媒体好评如潮，投资人排着队想要参与。
但在幕后，问题正在逐渐显现。

* [继续宝玉路线] -> act2_baoyu (if: current_role == "baoyu")
* [继续黛玉路线] -> act2_daiyu (if: current_role == "daiyu")
* [继续宝钗路线] -> act2_baochai (if: current_role == "baochai")
* [继续熙凤路线] -> act2_xifeng (if: current_role == "xifeng")

---

# act2_baoyu

```yaml
image:
  prompt: Baoyu in his room working on art project, messy creative space
  character: baoyu
```

自从发布会那晚和父亲吵架后，你们的关系更加紧张了。
你把大部分时间都花在自己的艺术项目上——一款独立游戏，讲述的是一个年轻人逃离家族束缚的故事。
黛玉是你唯一的倾诉对象。

* [继续创作] -> baoyu_create_game
* [和黛玉见面] -> baoyu_meet_daiyu_cafe

---

# baoyu_create_game

```yaml
image:
  prompt: Game development screen with indie game design
  character: baoyu
```

你正在设计游戏的主角——一个被困在豪门的年轻人，渴望自由却无法挣脱。
"这不就是你自己吗？"黛玉在视频通话里说。
"也许吧。"你苦笑，"至少在游戏里，主角可以选择结局。"
"现实里呢？"
"现实里……还不知道。"

* [接到家族召集] -> baoyu_family_meeting

---

# baoyu_meet_daiyu_cafe

```yaml
image:
  prompt: Baoyu and Daiyu meeting at a quiet cafe
  characters:
    - baoyu
    - daiyu
```

你们约在一家安静的咖啡馆见面。
黛玉最近看起来气色不太好，她的咳嗽又犯了。
"你的文章怎么样了？"
"又被拒了。"她淡淡地说，"不过无所谓，我决定自己出版。"
"自费？你有这个钱吗？"
"……没有。但我可以想办法。"

* [提出帮助] -> baoyu_offer_help (set: relationship_baoyu_daiyu = relationship_baoyu_daiyu + 10)
* [担心她] -> baoyu_worry_daiyu

---

# baoyu_offer_help

```yaml
image:
  prompt: Baoyu offering support to Daiyu
  characters:
    - baoyu
    - daiyu
```

"我帮你出。"你脱口而出。
黛玉愣住了："你哪来的钱？"
"我这些年攒了一些……虽然不多，但应该够出一本书。"
"我不需要你的施舍。"黛玉的语气有些硬。
"这不是施舍。这是我相信你的才华。"

* [最终说服她] -> baoyu_convince_daiyu (set: family_wealth = family_wealth - 10, relationship_baoyu_daiyu = relationship_baoyu_daiyu + 20)

---

# baoyu_worry_daiyu

```yaml
image:
  prompt: Baoyu looking concerned at Daiyu
  characters:
    - baoyu
    - daiyu
```

"你的身体……"你欲言又止。
"老毛病了，没什么大不了的。"黛玉轻描淡写。
但你看得出，她在硬撑。寄人篱下的日子，加上事业的不顺，正在慢慢消耗她。

* [接到家族召集] -> baoyu_family_meeting

---

# baoyu_convince_daiyu

```yaml
image:
  prompt: Daiyu finally accepting with tears in eyes
  characters:
    - baoyu
    - daiyu
```

经过一番争论，黛玉终于点了头。
"好吧……但这是借的，我会还你。"
"你的书畅销了再说。"你笑着说。
她的眼眶有些红："为什么你对我这么好？"
"因为……"你看着她，"你值得。"

* [接到家族召集] -> baoyu_family_meeting

---

# baoyu_family_meeting

```yaml
image:
  prompt: Phone notification about family meeting
```

手机响了，是管家袭人发来的消息：
"二爷，老太太召集全家开会，很急。请务必出席。"
你叹了口气。又是什么麻烦事？

* [回去开会] -> family_crisis_meeting

---

# act2_daiyu

```yaml
image:
  prompt: Daiyu in her apartment writing on laptop, tea beside her
  character: daiyu
  url: https://i.muistory.com/images/dream-of-modern-city/1768404249456-daiyu_writing.webp
```

这一个月，你一直在埋头写作。
你的新书已经完成了初稿，讲述的是一个寄居豪门的女孩的故事。半自传体。
但出版的事情依然毫无进展。

* [继续修改稿件] -> daiyu_edit_book
* [尝试新的出版渠道] -> daiyu_new_channel

---

# daiyu_edit_book

```yaml
image:
  prompt: Daiyu editing manuscript on laptop
  character: daiyu
```

你逐字逐句地修改着稿件。每一个字都是从心里挖出来的。
窗外下起了雨，你忍不住咳嗽了几声。身体越来越差了。
手机震动，是宝玉发来的消息："今天能见面吗？"

* [回复他] -> daiyu_reply_baoyu_act2

---

# daiyu_new_channel

```yaml
image:
  prompt: Daiyu researching self-publishing options online
  character: daiyu
```

你开始研究自费出版和电子书平台。
传统出版社不认可你，那就绕过他们。
"也许是时候自己掌控命运了。"你心想。

* [收到宝玉消息] -> daiyu_reply_baoyu_act2

---

# daiyu_reply_baoyu_act2

```yaml
image:
  prompt: Daiyu texting Baoyu back
  character: daiyu
```

你回复宝玉，约定下午在咖啡馆见面。
和他在一起的时候，你会觉得不那么孤独。
这算什么？友情？还是别的什么？你不敢深想。

* [去赴约] -> daiyu_meet_baoyu_cafe

---

# daiyu_meet_baoyu_cafe

```yaml
image:
  prompt: Daiyu and Baoyu at cafe, intimate conversation
  characters:
    - baoyu
    - daiyu
```

咖啡馆里，你们聊了很多。
关于各自的梦想，关于这个令人窒息的世界，关于未来。
宝玉说他在做一款游戏，主角和你很像。
"借用我的故事？"你半开玩笑地问。
"是致敬。"他认真地说。

* [话题转向更深] -> daiyu_deep_talk (set: relationship_baoyu_daiyu = relationship_baoyu_daiyu + 10)

---

# daiyu_deep_talk

```yaml
image:
  prompt: Intense emotional conversation between two people
  characters:
    - baoyu
    - daiyu
```

"黛玉，"宝玉突然说，"如果有一天，我离开贾家，你会跟我走吗？"
你愣住了。
"你说什么？"
"我是说……"他有些紧张，"如果我放弃继承权，去做自己想做的事。你愿意陪我吗？"

* [心动但犹豫] -> daiyu_hesitate
* [直接问他是否认真] -> daiyu_ask_serious

---

# daiyu_hesitate

```yaml
image:
  prompt: Daiyu looking away with complex emotions
  character: daiyu
```

你沉默了很久。
"宝玉，你知道我的处境。没有贾家的资助，我连住的地方都没有。"
"我可以养你。"
"你养得起吗？你一个人在外面，连工作都没有。"
现实的残酷，让浪漫变得苍白。

* [接到家族消息] -> daiyu_get_news

---

# daiyu_ask_serious

```yaml
image:
  prompt: Daiyu looking at Baoyu seriously
  characters:
    - baoyu
    - daiyu
```

"你是认真的吗？"你直视着他的眼睛。
"从来没有这么认真过。"
"那你想过后果吗？你妈妈会怎么说？你祖母会怎么想？"
"我不在乎。"
"可是我在乎。"你轻声说，"我不想成为贾家的敌人。"

* [接到家族消息] -> daiyu_get_news

---

# daiyu_get_news

```yaml
image:
  prompt: Phone notification about family issue
```

你们的对话被打断了。宝玉的手机响了，是家里催他回去。
"家里出事了。"他看着屏幕，表情凝重，"我得回去看看。"
"什么事？"
"不知道……但看起来很严重。"

* [分开] -> family_crisis_meeting

---

# act2_baochai

```yaml
image:
  prompt: Baochai in office reviewing financial reports
  character: baochai
```

这一个月，你几乎住在了公司。
王总的投资虽然到账了，但项目的开发成本远超预算。更糟糕的是，熙凤那边的财务问题似乎越来越大。
你开始秘密调查集团的真实财务状况。

* [深入调查] -> baochai_investigate
* [和熙凤摊牌] -> baochai_confront_xifeng

---

# baochai_investigate

```yaml
image:
  prompt: Baochai secretly looking at hidden financial documents
  character: baochai
  url: https://i.muistory.com/images/dream-of-modern-city/1768404250210-baochai_investigate.webp
```

你利用职务之便，调取了一些不该看的账目。
越看越心惊——集团的负债远比公开数据严重。有超过三亿的资金去向不明。
这意味着什么？有人在挪用公款？

* [发现可疑线索] -> baochai_find_clue (set: investigation_progress = investigation_progress + 20)

---

# baochai_confront_xifeng

```yaml
image:
  prompt: Baochai asking Xifeng direct questions
  characters:
    - baochai
    - xifeng
```

"熙凤姐，我想问你一些事。"
熙凤抬起头，眼神警惕："什么事？"
"集团的账目……有些地方对不上。我想知道是怎么回事。"
熙凤沉默了一会儿："宝钗，有些事情，你不该知道。"
"但如果这会影响到整个家族——"
"相信我，我在处理。"

* [接受她的回答] -> baochai_accept (set: trust_level = trust_level - 10)
* [继续追问] -> baochai_persist (set: investigation_progress = investigation_progress + 10)

---

# baochai_find_clue

```yaml
image:
  prompt: Baochai discovering hidden transaction records
  character: baochai
```

你发现了一系列可疑的转账记录，全都指向一个离岸账户。
最令人震惊的是，这些转账的授权人都是……王熙凤。
你不敢相信自己的眼睛。熙凤姐在掏空公司？

* [决定怎么做] -> baochai_decision

---

# baochai_accept

```yaml
image:
  prompt: Baochai nodding reluctantly
  character: baochai
```

你决定暂时不逼问了。
但心里的疑虑越来越重。如果熙凤真的出了问题，整个家族都会被拖下水。
你需要保护自己，也需要保护薛家。

* [接到家族召集] -> family_crisis_meeting

---

# baochai_persist

```yaml
image:
  prompt: Baochai insisting on answers
  characters:
    - baochai
    - xifeng
```

"熙凤姐，我不是想找麻烦。但如果有问题，越早解决越好。"
熙凤看着你，眼神复杂："宝钗，你是聪明人。但有时候，太聪明反而不是好事。"
她起身离开，留下你一个人思考。

* [接到家族召集] -> family_crisis_meeting

---

# baochai_decision

```yaml
image:
  prompt: Baochai contemplating difficult choice
  character: baochai
```

这个发现让你陷入两难。
揭发熙凤，可能导致整个家族崩溃。
不揭发，你就成了帮凶。
还有一个选择——利用这个信息，为薛家谋取利益。

* [决定先保密] -> baochai_keep_secret
* [准备揭发] -> baochai_prepare_expose (set: investigation_progress = investigation_progress + 20)
* [利用这个把柄] -> baochai_leverage (set: corruption_level = corruption_level + 15)

---

# baochai_keep_secret

```yaml
image:
  prompt: Baochai closing files, deciding to wait
  character: baochai
```

你决定先观望。
也许熙凤有她的苦衷。也许事情还有转机。
但你会做好准备，以防万一。

* [接到家族召集] -> family_crisis_meeting

---

# baochai_prepare_expose

```yaml
image:
  prompt: Baochai secretly copying evidence
  character: baochai
```

你悄悄复制了那些证据文件。
如果事情恶化，这可能是保护自己和薛家的唯一筹码。
你不想背叛熙凤，但你更不想被拖下水。

* [接到家族召集] -> family_crisis_meeting (set: has_key_evidence = true)

---

# baochai_leverage

```yaml
image:
  prompt: Baochai with calculating expression
  character: baochai
```

你开始思考如何利用这个信息。
谁说商场上没有墙头草？在这个家族生存，有时候需要一些手段。
但这条路一旦走上，就没有回头了。

* [接到家族召集] -> family_crisis_meeting

---

# act2_xifeng

```yaml
image:
  prompt: Xifeng in office, stressed, multiple phones
  character: xifeng
```

这一个月，你像是走在钢丝上。
证监会的调查虽然暂时被压下去了，但问题还在。更糟的是，几个债主开始催款。
资金链就快断了。

* [想办法周转] -> xifeng_find_money
* [考虑极端手段] -> xifeng_extreme_measures

---

# xifeng_find_money

```yaml
image:
  prompt: Xifeng making desperate phone calls
  character: xifeng
```

你打了无数个电话，试图借到钱。
"王总，最近周转有点紧，能不能……"
"不好意思，我们也有困难。"
电话挂断。又一个拒绝。

* [越来越绝望] -> xifeng_desperate

---

# xifeng_extreme_measures

```yaml
image:
  prompt: Xifeng considering dangerous options
  character: xifeng
```

你想到了几个极端的办法：
动用老太太的养老钱。
向高利贷借款。
或者……让宝玉和宝钗联姻，用薛家的钱填补窟窿。

* [选择联姻方案] -> xifeng_marriage_plan (set: alliance_formed = true)
* [暂时不决定] -> xifeng_desperate

---

# xifeng_desperate

```yaml
image:
  prompt: Xifeng breaking down alone in office
  character: xifeng
```

你趴在桌上，第一次感到如此绝望。
"为什么走到这一步？"你问自己。
从一开始，你只是想让家族变得更好。但不知从何时起，你迷失了。

* [接到紧急通知] -> family_crisis_meeting

---

# xifeng_marriage_plan

```yaml
image:
  prompt: Xifeng scheming about marriage alliance
  character: xifeng
  url: https://i.muistory.com/images/dream-of-modern-city/1768404250808-xifeng_plotting.webp
```

联姻。这是最传统、也是最有效的解决方案。
宝玉和宝钗的婚姻可以绑定薛家的资源，一举解决资金问题。
至于宝玉的意愿……那不重要。在这个家，从来没有人问过任何人愿不愿意。

* [开始行动] -> family_crisis_meeting (set: path_chosen = "marriage")

---

# family_crisis_meeting

```yaml
image:
  prompt: Entire family gathered in grand meeting room, elderly matriarch at head
  url: https://i.muistory.com/images/dream-of-modern-city/1768383694055-family_meeting.webp
```

贾母召集了全家核心成员。
大厅里，气氛凝重。贾母坐在主位，表情严肃得可怕。
"今天叫你们来，是有要事宣布。"她的声音沙哑但有力。
"集团的事，我都知道了。"

* [听取宣布] -> family_announcement

---

# family_announcement

```yaml
image:
  prompt: Elderly matriarch making serious announcement
```

"熙凤，"贾母看向王熙凤，"账上的问题，你准备怎么解释？"
熙凤的脸色刷地白了。
"老太太，我……"
"不用解释。"贾母抬手打断她，"我只要知道一件事：这个窟窿，能不能补上？"
全场鸦雀无声。

* [等待熙凤回答] -> xifeng_response

---

# xifeng_response

```yaml
image:
  prompt: Xifeng responding under pressure
  character: xifeng
```

熙凤深吸一口气："能。但需要一笔大额资金注入。"
"多少？"
"……三亿。"
在场的人都倒吸一口凉气。三亿，对于一个资金链已经紧张的集团来说，无异于天文数字。

* [听取解决方案] -> proposal_scene

---

# proposal_scene

```yaml
image:
  prompt: Family discussing marriage alliance proposal
```

熙凤继续说道："有一个方案……薛家愿意注资，条件是——"
她的目光看向宝玉和宝钗。
"宝玉和宝钗的婚事，立刻定下来。"

全场哗然。宝玉的脸色变了。你（如果是黛玉）感觉心被刺了一下。

* [听取各方反应] -> reactions_scene

---

# reactions_scene

```yaml
image:
  prompt: Various family members reacting with shock
```

贾政（宝玉的父亲）皱着眉："这……是不是太草率了？"
王夫人（宝玉的母亲）却眼前一亮："宝钗是个好孩子，这桩婚事我一直很满意。"
宝钗低着头，表情难以捉摸。
所有人都在等待贾母的决定。

* [贾母做决定] -> grandmother_decision

---

# grandmother_decision

```yaml
image:
  prompt: Elderly matriarch making final decision
```

贾母沉默了很长时间。
"这件事……"她缓缓开口，"需要宝玉自己同意。"
她看向宝玉："宝玉，你怎么说？"

所有目光都集中在宝玉身上。

* [宝玉反应（根据角色）] -> baoyu_choice_marriage (if: current_role == "baoyu")
* [观察局面（其他角色）] -> observe_choice (if: current_role != "baoyu")

---

# baoyu_choice_marriage

```yaml
image:
  prompt: Baoyu standing up under immense pressure
  character: baoyu
```

你感到所有人的目光像针一样刺在身上。
脑海中浮现出黛玉的面容，你们在天台许下的诺言。
但眼前是祖母期待的眼神，是家族存亡的重压。

* [接受联姻] -> accept_marriage (set: path_chosen = "marriage", relationship_baoyu_daiyu = relationship_baoyu_daiyu - 30)
* [拒绝联姻] -> refuse_marriage (set: path_chosen = "rebellion", family_wealth = family_wealth - 30)
* [请求时间考虑] -> ask_for_time

---

# observe_choice

```yaml
image:
  prompt: Watching Baoyu make difficult decision
```

你注视着宝玉。他的脸上写满了挣扎。
不管他做什么选择，都会有人受伤。
这就是这个家族的悲剧——每个人都是棋子，没有人能真正做自己。

（系统根据之前的选择决定宝玉的反应）

* [联姻被接受] -> marriage_accepted (if: relationship_baoyu_daiyu < 60)
* [联姻被拒绝] -> marriage_refused (if: relationship_baoyu_daiyu >= 60)

---

# accept_marriage

```yaml
image:
  prompt: Baoyu nodding with defeated expression
  character: baoyu
```

"我……同意。"你的声音很小，像是用尽了全部力气。
母亲露出了欣慰的笑容。宝钗抬起头，眼神复杂。
而你心里只有一个念头：黛玉会怎么想？

* [黛玉的反应] -> daiyu_learns_truth

---

# refuse_marriage

```yaml
image:
  prompt: Baoyu standing up defiantly
  character: baoyu
  url: https://i.muistory.com/images/dream-of-modern-city/1768404251346-baoyu_refuse_marriage.webp
```

"不。"你的声音坚定，"我不会因为钱而结婚。"
全场哗然。母亲的脸色变了："宝玉！你知道你在说什么吗？"
"我知道。这是我的人生，不是家族的交易筹码。"
你转身离开，留下一屋子震惊的人。

* [离开后] -> rebellion_start

---

# ask_for_time

```yaml
image:
  prompt: Baoyu asking for time to think
  character: baoyu
```

"奶奶，"你努力让声音平稳，"这是一辈子的事。能不能给我几天时间考虑？"
贾母点点头："三天。三天后，给我一个答复。"
你知道，这三天，会是你人生中最艰难的抉择。

* [三天后] -> three_days_choice

---

# marriage_accepted

```yaml
image:
  prompt: Marriage announcement being made
```

宝玉点了头。婚事就这样定了下来。
你看着这一切，心情复杂。这个决定，会改变所有人的命运。

* [时间跳跃] -> time_skip_preparations

---

# marriage_refused

```yaml
image:
  prompt: Baoyu rejecting the proposal publicly
```

"不。"宝玉站起来，声音出乎意料地坚定，"我不会接受这样的安排。"
全场陷入混乱。这是贾家有史以来最大的叛逆。

* [后续发展] -> rebellion_start

---

# daiyu_learns_truth

```yaml
image:
  prompt: Daiyu hearing the news, shock and pain on her face
  character: daiyu
```

消息很快传到了黛玉的耳朵里。
你（如果是黛玉）感觉天塌了。
他答应了？他真的答应了？
你所有的坚持、所有的期待，在这一刻都变成了笑话。

* [黛玉的绝望] -> daiyu_despair

---

# daiyu_despair

```yaml
image:
  prompt: Daiyu alone in apartment, crying
  character: daiyu
```

你把自己关在房间里，一遍遍回想那些对话、那些承诺。
"他说会陪我……他说不在乎家族……全都是假的吗？"
胸口像是被堵住了。你咳嗽起来，手帕上隐隐有血丝。

* [决定离开] -> daiyu_leave_decision

---

# daiyu_leave_decision

```yaml
image:
  prompt: Daiyu packing bags with determination
  character: daiyu
```

你开始收拾行李。
"既然这个地方容不下我，那我就离开。"
你不知道要去哪里，只知道不能再待在这里了。

* [告别还是不告而别] -> daiyu_goodbye_choice

---

# daiyu_goodbye_choice

```yaml
image:
  prompt: Daiyu looking at phone, deciding whether to text Baoyu
  character: daiyu
```

手机里有宝玉发来的无数条消息。你一条都没看。
告别吗？还是就这样消失？

* [发一条最后的消息] -> daiyu_final_message (set: relationship_baoyu_daiyu = relationship_baoyu_daiyu + 5)
* [不告而别] -> daiyu_disappear

---

# daiyu_final_message

```yaml
image:
  prompt: Daiyu typing emotional message
  character: daiyu
```

你打了一条消息：
"宝玉，祝你幸福。我走了。不用找我。"
发送之后，你关了机。然后拎起行李，走出了那间属于贾家的公寓。

* [时间跳跃] -> time_skip_tragedy

---

# daiyu_disappear

```yaml
image:
  prompt: Daiyu walking out with suitcase, not looking back
  character: daiyu
```

你什么都没说，就这样离开了。
在A市灰蒙蒙的天空下，你拖着行李箱，走向未知的前方。
也许这就是你的命运——永远是寄人篱下，永远无法拥有自己的家。

* [时间跳跃] -> time_skip_tragedy

---

# rebellion_start

```yaml
image:
  prompt: Baoyu leaving the family mansion
  character: baoyu
```

你离开了贾家大宅，住进了一间破旧的公寓。
没有了家族的资源，生活变得艰难。但至少，你终于自由了。
黛玉来找你了。她的眼里有泪，也有光。

* [和黛玉一起] -> freedom_path

---

# freedom_path

```yaml
image:
  prompt: Baoyu and Daiyu in small apartment, poor but happy
  characters:
    - baoyu
    - daiyu
```

你们住在一起，过着简朴的生活。
你白天打工，晚上做游戏。黛玉则继续写作。
虽然拮据，但你们拥有彼此。
这不就是你们曾经梦想的生活吗？

* [时间跳跃] -> time_skip_freedom

---

# three_days_choice

```yaml
image:
  prompt: Baoyu contemplating decision alone
  character: baoyu
```

三天很快就过去了。
你见了黛玉，听了宝钗的想法，也和祖母进行了长谈。
最终，你必须做出选择。

* [接受联姻，为了家族] -> accept_marriage (set: path_chosen = "marriage")
* [拒绝联姻，为了自己] -> refuse_marriage (set: path_chosen = "rebellion")

---

# time_skip_preparations

```yaml
image:
  prompt: Wedding preparations and business deals, montage
```

婚事定下后，一切都在加速进行。
薛家的资金如约注入，贾氏集团暂时渡过了难关。
宝玉和宝钗的婚礼，成为了A市年度最盛大的社交事件。

* [时间跳跃] -> time_skip_marriage

---

# time_skip_marriage

```yaml
image:
  prompt: Grand wedding ceremony, newspapers, time passing rapidly
  url: https://i.muistory.com/images/dream-of-modern-city/1768383695219-time_skip_wedding.webp
```

时间跳跃：二十年后

婚礼如期举行。那是一场盛大的商业秀。
宝玉像个木偶一样完成了仪式。当晚传来黛玉病重的消息，但他被拦在了婚房里。
资金注入，危机暂时解除。在宝钗的打理下，家族企业似乎恢复了生机。
然而，命运的齿轮并未停止转动。
二十年后，最终的审判到来了。

* [进入结局] -> act3_start

---

# time_skip_freedom

```yaml
image:
  prompt: Two people building life together, time passing, small art gallery opening
  characters:
    - baoyu
    - daiyu
```

时间跳跃：二十年后

你们断绝了与家族的一切联系，在南方的一个小城定居。
没有了锦衣玉食，生活变得艰难。你需要打工养家，黛玉的身体也时好时坏。
但至少，你们拥有彼此。
二十年后，你开了一间小画廊。黛玉的书终于出版了，还获了奖。
那一刻，所有的苦都值得了。

* [进入结局] -> ending_freedom

---

# time_skip_tragedy

```yaml
image:
  prompt: Empty hospital bed, gravestone, seasons changing
```

时间跳跃：二十年后

黛玉在那年秋天离开了这个世界。
据说是积郁成疾，郁郁而终。
宝玉大病一场，醒来后仿佛变了一个人。他不再反抗，也不再欢笑。
他接受了所有的安排，变成了一个行尸走肉般的合格继承人。
二十年后，当贾家真正崩塌的时候，他只是平静地看着一切化为灰烬。

* [进入结局] -> ending_tragedy

---

# act3_start

```yaml
image:
  prompt: Ruined office building, police tape, sense of desolation
```

第三幕：崩塌

A市的冬天格外寒冷。
二十年的时间，足以让一座摩天大楼拔地而起，也足以让一个帝国轰然倒塌。
最终的审判还是来了。监管机构查实了贾氏集团长达数十年的财务造假和非法集资。

(根据你之前的选择，你将迎来不同的结局)

* [查看结局] -> ending_normal (if: path_chosen == "marriage", mental_state > 30)
* [查看结局] -> ending_bad (if: corruption_level >= 30)
* [查看结局] -> ending_hidden (if: has_key_evidence == true, investigation_progress >= 40)

---

# ending_normal

```yaml
image:
  prompt: Middle-aged couple leaving courthouse, ordinary life ahead
  url: https://i.muistory.com/images/dream-of-modern-city/1768404251918-ending_normal.webp
```

结局：中兴（苟活）

作为集团的负责人，你和宝钗承担了所有的责任。变卖了所有家产，勉强补上了亏空，免于牢狱之灾。
你们保住了性命，但失去了所有荣耀。
现在的你，是一个普通的上班族。偶尔路过那片已经被拆除的"大观园"遗址，你会想起很多年前的那个发布会。
你活成了你父亲的样子，平庸、忙碌，为了生计奔波。
也许，这就是普通人的生活。

---

# ending_bad

```yaml
image:
  prompt: Prison cell, mental institution, dark ending
  url: assets/ending_bad.webp
```

结局：白茫茫大地真干净

熙凤因为非法集资被判无期。
宝玉在黛玉死后彻底精神崩溃，在疗养院度过余生。他嘴里总是念叨着"都走了，都走了"。
贾氏集团彻底破产，成为了商学院教科书里的反面教材。
这曾是一场繁华的梦，现在梦醒了，只剩下一片荒芜。

---

# ending_freedom

```yaml
image:
  prompt: Art gallery with painting of Grand View Garden, elderly couple smiling
  characters:
    - baoyu
    - daiyu
  url: https://i.muistory.com/images/dream-of-modern-city/1768383695754-ending_freedom.webp
```

结局：石头记（真结局）

你也听说了A市贾家的覆灭。但那对你来说，像是上辈子的事了。
你现在是一个小有名气的画家，专门画以前的记忆。黛玉写的小说也出版了。
虽然生活清贫，但这二十年，你们活得真实。
你看着画中那个穿着华丽西装的少年，轻轻摇了摇头。
那是块原本要补天的石头，最后却只想做一块普通的顽石。

---

# ending_tragedy

```yaml
image:
  prompt: Man sitting alone watching sunset, empty eyes
  character: baoyu
  url: https://i.muistory.com/images/dream-of-modern-city/1768404253085-ending_tragedy.webp
```

结局：无情

一切都结束了。
那些曾经的繁华，那些曾经的人，都已经消散在风中。
你站在天台上，看着这座城市的落日。
你早已没有了感情，只剩下空洞的躯壳。
"都走了……都走了……"你喃喃自语。
风吹过，带走了最后一点温度。

---

# ending_hidden

```yaml
image:
  prompt: Baochai as powerful CEO, bittersweet success
  character: baochai
  url: https://i.muistory.com/images/dream-of-modern-city/1768383696161-ending_hidden.webp
```

隐藏结局：凤凰涅槃

你是最后的赢家。
当贾家崩塌的时候，你手中握有所有的证据。你用这些证据保护了薛家，甚至反戈一击，收购了贾氏集团的核心资产。
现在，你是A市商界的新星。薛氏集团在你的带领下蒸蒸日上。
但每当深夜，你会想起那些年的事情。宝玉、黛玉、熙凤……他们都是棋盘上的棋子，而你，选择成为了执棋的人。
这是你想要的结局吗？你不知道。
但至少，你活下来了。
