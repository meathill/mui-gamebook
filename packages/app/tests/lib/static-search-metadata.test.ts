import { describe, expect, it } from 'vitest';
import { privacyMetadata, termsMetadata } from '@/lib/legal-metadata';
import { meetsBingDescription, meetsBingTitle, SITE_TITLE_SUFFIX } from '@/lib/search-snippet';
import zh from '../../src/i18n/messages/zh.json';

const pages: Array<[string, string, string]> = [
  ['about', zh.about.pageTitle, zh.about.pageDescription],
  ['contact', zh.contact.pageTitle, zh.contact.pageDescription],
  ['open', zh.open.pageTitle, zh.open.pageDescription],
  ['games', zh.games.pageTitle, zh.games.pageDescription],
  ['create', zh.create.pageTitle, zh.create.pageDescription],
  ['howToPlay', zh.howToPlay.pageTitle, zh.howToPlay.pageDescription],
  ['terms', termsMetadata.title, termsMetadata.description],
  ['privacy', privacyMetadata.title, privacyMetadata.description],
];

describe('静态页搜索摘要', () => {
  it('中文标题和描述达到 Bing 的长度', () => {
    for (const [name, title, description] of pages) {
      const documentTitle = `${title}${SITE_TITLE_SUFFIX}`;
      expect(meetsBingTitle(documentTitle), `${name} title: ${documentTitle}`).toBe(true);
      expect(meetsBingDescription(description), `${name} description length`).toBe(true);
    }
  });
});
