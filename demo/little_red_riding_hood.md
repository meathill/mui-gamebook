---
title: 小红帽
description: 一个经典童话的互动版本，你的选择将决定小红帽的命运。
cover_image: https://picsum.photos/400/600
tags:
  - 童话
  - 多分支
  - 经典改编
published: true
state:
  wolf_knows_destination: false
  is_late: false
ai:
  style:
    image: children's storybook illustration, watercolor, friendly, warm colors
    audio: gentle, pastoral, lighthearted fantasy music
  characters:
    lrrh:
      name: 小红帽
      image_prompt: a young girl with a bright red hooded cape, carrying a basket
    wolf:
      name: 大灰狼
      image_prompt: a cunning and sly gray wolf, hiding behind a tree, cartoon style
    mom:
      name: 妈妈
      image_prompt: a kind-looking woman in an apron, waving goodbye
    grandma:
      name: 外婆
      image_prompt: an old, sweet-faced woman, sick in bed
---

# start
```image-gen
prompt: A cozy kitchen, a mother gives her daughter a basket of food
character: mom
url: https://images.baifo.life/images//1763810850286.png
```
妈妈把一个装满点心的篮子交给你。“外婆生病了，”她说，“把这个带给她，但记住，一定要沿着大路走，不要和陌生人说话。”
* [好的，妈妈！我直接去外婆家。] -> forest_path_start

---

# forest_path_start
```image-gen
prompt: A cheerful young girl in a red cape walking on a path through a sunny forest
character: lrrh
url: https://images.baifo.life/images//1763810934218.png
```
你走在通往外婆家的森林小径上。阳光透过树叶洒下来，周围开着美丽的鲜花。突然，一只大灰狼从树后跳了出来。
“你好呀，小姑娘，”他笑着问，“你要去哪里呀？”
* [告诉他我要去外婆家] -> wolf_learns_destination (set: wolf_knows_destination = true)
* [“妈妈说不能和陌生人说话！”] -> wolf_is_curious

---

# wolf_learns_destination
```image-gen
prompt: A friendly-looking wolf talking to a little girl in a forest
character: wolf
url: https://images.baifo.life/images//1763811028501.png
```
“哦，去看望外婆！真是个好孩子。”大灰狼的眼睛闪烁着光芒。“你看周围的花多漂亮，为什么不摘一些送给外婆呢？”
说完，他摇着尾巴，一溜烟地跑进了森林深处。
* [他说得对，摘些花吧] -> picking_flowers (set: is_late = true)
* [我得赶紧，直接去外婆家] -> grandma_house_direct

---

# wolf_is_curious
```image-gen
prompt: A suspicious wolf watching a little girl from behind a tree
character: wolf
url: https://images.baifo.life/images//1763811117902.png
```
你记起了妈妈的警告，紧紧抱着篮子，没有回答大灰狼，继续向前走。大灰狼有些恼怒，但他没有追上来，只是悄悄地跟在你后面，想看看你到底要去哪里。
* [继续快步走向外婆家] -> grandma_house_direct

---

# picking_flowers
```audio-gen
type: background_music
prompt: playful, slightly mischievous music
```
```image-gen
prompt: A little girl in a red cape happily picking colorful flowers in a forest meadow
character: lrrh
url: https://images.baifo.life/images//1763811195223.png
```
你被美丽的鲜花吸引，忘记了时间。你摘了一大束五颜六色的花，心想外婆一定会喜欢它们。
* [花摘够了，继续去外婆家] -> grandma_house_arrival

---

# grandma_house_direct
```audio-gen
type: background_music
prompt: calm, happy, safe-feeling music
```
```image-gen
prompt: A little girl and her grandmother sharing cookies in a cozy cottage
character: lrrh
url: https://images.baifo.life/images//1763811270772.png
```
你没有理会大灰狼或路边的野花，直接来到了外婆家。你敲了敲门，外婆亲切地让你进去了。你们一起分享了点心，度过了一个愉快的下午。大灰狼的阴谋没有得逞。
* [游戏结束 - 重新开始] -> start

---

# grandma_house_arrival
```audio-gen
type: background_music
prompt: suspenseful, slow, quiet eerie music
```
```image-gen
prompt: A little red-hooded girl knocking on the door of a small, spooky-looking cottage in the woods
url: https://images.baifo.life/images//1763811353769.png
```
你来到了外婆家门口，门只是虚掩着。你敲了敲门。
一个沙哑的声音从里面传来：“进来吧，我亲爱的。”
* [推门进去] -> wolf_in_bed (if: is_late == true)

---

# wolf_in_bed
```image-gen
prompt: A wolf disguised as an old woman, lying in a bed with a nightcap on
character: wolf
url: https://images.baifo.life/images//1763811434527.png
```
你走进房间，看到“外婆”正躺在床上，戴着睡帽，盖着被子，看起来怪怪的。
* [“外婆，你的眼睛好大呀！”] -> dialogue_eyes
* [“外婆，你的耳朵好大呀！”] -> dialogue_ears

---

# dialogue_eyes
“那是为了更清楚地看到你，我亲爱的。” “外婆”回答。
* [“那……外婆，你的耳朵为什么也这么大？”] -> dialogue_ears

---

# dialogue_ears
“那是为了更清楚地听到你说话，我亲爱的。” “外婆”回答。
* [“那……外婆，你的手为什么也这么大？”] -> dialogue_hands

---

# dialogue_hands
“那是为了更好地抱住你，我亲爱的。” “外婆”回答。
* [“可是外婆……你的嘴巴为什么……那么大？”] -> dialogue_mouth

---

# dialogue_mouth
```audio-gen
type: sfx
prompt: a loud wolf roar, followed by a dramatic musical sting
```
```image-gen
prompt: A giant wolf lunging from a bed towards the screen, mouth wide open, sharp teeth
url: https://images.baifo.life/images//1763811527142.png
```
“那是为了——一口吃掉你！”
大灰狼从床上一跃而起！
* [游戏结束 - 重新开始] -> start
