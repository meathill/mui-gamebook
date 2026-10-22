import * as yaml from 'js-yaml';
import { stringify, type Game } from '@roudanio/parser';
import { splitFrontmatter } from './dsl-tools/markdown';

export function updateScriptMetadata(source: string, game: Game): string {
  const { frontmatter } = splitFrontmatter(stringify({ ...game, scenes: {} }));
  return frontmatter + '\n' + splitFrontmatter(source).body.replace(/^\n/, '');
}

export function replacePendingAssetInScript(source: string, pendingUrl: string, nextUrl?: string): string {
  return source.replace(
    /(^```ya?ml[^\n]*\n)([\s\S]*?)(^```[ \t]*$)/gm,
    (block, opening: string, body: string, closing: string) => {
      if (!body.includes(pendingUrl)) return block;
      try {
        const data: unknown = yaml.load(body);
        if (!data || typeof data !== 'object') return block;
        let changed = false;
        for (const section of Object.values(data)) {
          if (section && typeof section === 'object' && 'url' in section && section.url === pendingUrl) {
            if (nextUrl) section.url = nextUrl;
            else delete section.url;
            changed = true;
          }
        }
        return changed ? opening + yaml.dump(data, { lineWidth: -1 }) + closing : block;
      } catch {
        return block;
      }
    },
  );
}
