import { describe, expect, it } from 'vitest';
import {
  BING_DESCRIPTION_MIN_CHARS,
  buildGameMetaDescription,
  buildGameSearchMetadata,
  charCount,
  displayWidth,
  meetsBingDescription,
  meetsBingTitle,
  SITE_TITLE_SUFFIX,
} from '@/lib/search-snippet';

const BIBLE_BLURB = '通过性格测试发现你的圣经人物原型，开启现代美国背景下的信仰之旅';

function documentTitle(segment: string): string {
  return `${segment}${SITE_TITLE_SUFFIX}`;
}

describe('displayWidth', () => {
  it('中文算 2，间隔号算 1，全角冒号算 2', () => {
    expect(displayWidth('平安符')).toBe(6);
    expect(displayWidth('哈利·波特与火焰杯')).toBe(17);
    expect(displayWidth('圣经之路：现代美国篇')).toBe(20);
    expect(charCount('哈利·波特与火焰杯')).toBe(9);
  });
});

describe('buildGameDocumentTitle', () => {
  it('短书名追加最短的达标后缀，不改书名本身', () => {
    const meta = buildGameSearchMetadata({ title: '平安符' });
    expect(meta.title.startsWith('平安符 - ')).toBe(true);
    expect(meta.title).toBe('平安符 - 在线免费玩互动小说游戏');
    expect(meetsBingTitle(documentTitle(meta.title))).toBe(true);
    expect(meta.socialTitle).toBe(documentTitle(meta.title));
  });

  it('有短题材时把题材写进标题，比纯平台后缀更短也达标', () => {
    const meta = buildGameSearchMetadata({ title: '平安符', tags: ['奇幻'] });
    expect(meta.title).toBe('平安符 - 互动小说在线玩（奇幻）');
    expect(meetsBingTitle(documentTitle(meta.title))).toBe(true);
  });

  it('issue 里偏短的书名补齐后不超过显示宽度', () => {
    for (const title of ['凡人修仙传', '哈利·波特与火焰杯', '圣经之路：现代美国篇', '红楼梦·摩登都市']) {
      const segment = buildGameSearchMetadata({ title }).title;
      const full = documentTitle(segment);
      expect(meetsBingTitle(full), full).toBe(true);
      expect(segment.startsWith(title)).toBe(true);
    }
  });

  it('已经达标的书名保持原样', () => {
    const title = '一二三四五六七八九十一二三四五六七';
    expect(charCount(documentTitle(title))).toBe(25);
    expect(buildGameSearchMetadata({ title }).title).toBe(title);
  });

  it('刚好差一点的长书名只用最短后缀，显示宽度仍不超过 65', () => {
    const title = '一二三四五六七八九十一二三四五六';
    const segment = buildGameSearchMetadata({ title }).title;
    const full = documentTitle(segment);
    expect(segment).toBe(`${title} - 互动小说在线玩`);
    expect(charCount(full)).toBeGreaterThanOrEqual(25);
    expect(displayWidth(full)).toBeLessThanOrEqual(65);
  });

  it('空书名用固定片段，而不是空标题', () => {
    const meta = buildGameSearchMetadata({ title: '   ' });
    expect(meetsBingTitle(documentTitle(meta.title))).toBe(true);
  });
});

describe('buildGameMetaDescription', () => {
  it('短简介保留作者原文，并补到 120 字', () => {
    const description = buildGameMetaDescription({ title: '圣经之路', description: BIBLE_BLURB });
    expect(description.startsWith(`${BIBLE_BLURB}。`)).toBe(true);
    expect(meetsBingDescription(description)).toBe(true);
    expect(charCount(description)).toBeGreaterThanOrEqual(BING_DESCRIPTION_MIN_CHARS);
  });

  it('已有句号的短简介不重复加句号', () => {
    const blurb = '一个普通凡人踏上修仙之路的冒险故事，你的选择将决定你的命运和修为境界。';
    const description = buildGameMetaDescription({ title: '凡人修仙传', description: blurb });
    expect(description.startsWith(blurb)).toBe(true);
    expect(description.startsWith(`${blurb}。`)).toBe(false);
    expect(meetsBingDescription(description)).toBe(true);
  });

  it('达标的简介不再追加套话', () => {
    const blurb =
      '这是一段已经足够长的互动小说简介，用来确认模板不会在作者写够长度之后继续堆砌平台说明。读者应先看到作品自己的话，而不是每一页都相同的后缀。不同的选择会通向不同的结局，故事本身已经把要说的话说完了，后面不该再接一段每部作品都一样的平台介绍了。';
    expect(charCount(blurb)).toBeGreaterThanOrEqual(BING_DESCRIPTION_MIN_CHARS);
    expect(buildGameMetaDescription({ title: '长简介', description: blurb, tags: ['悬疑'], sceneCount: 12 })).toBe(
      blurb,
    );
  });

  it('不够长时带上题材和场景数，再按需补平台说明', () => {
    const description = buildGameMetaDescription({
      title: '平安符',
      description: '一块旧平安符。',
      tags: ['悬疑', ''],
      sceneCount: 8,
    });
    expect(description.startsWith('一块旧平安符。题材：悬疑。共 8 个场景。')).toBe(true);
    expect(meetsBingDescription(description)).toBe(true);
  });

  it('没有简介时用背景故事，再没有才用带书名的回退句', () => {
    const fromStory = buildGameMetaDescription({
      title: '平安符',
      backgroundStory: '# 序章\n\n雾气笼罩着小镇。',
    });
    expect(fromStory.startsWith('序章 雾气笼罩着小镇。')).toBe(true);

    const fallback = buildGameMetaDescription({ title: '平安符' });
    expect(fallback.includes('《平安符》')).toBe(true);
    expect(meetsBingDescription(fallback)).toBe(true);
  });
});
