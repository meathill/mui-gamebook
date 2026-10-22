import * as yaml from 'js-yaml';
import type { Transaction } from '@tiptap/pm/state';
import { findDslTargets } from './targets';
import { CHOICE_FRAGMENT, REDIRECT_FRAGMENT } from './fragments';

export function renameSceneReferences(transaction: Transaction, oldName: string, newName: string) {
  const edits: Array<{ from: number; to: number }> = [];
  for (const target of findDslTargets(transaction.doc)) {
    if (target.kind !== 'choice' && target.kind !== 'redirect') continue;
    const match = target.text.match(target.kind === 'choice' ? CHOICE_FRAGMENT : REDIRECT_FRAGMENT);
    if (!match) continue;
    const name = match[target.kind === 'choice' ? 2 : 1];
    if (name !== oldName) continue;
    const arrow = target.kind === 'choice' ? target.text.indexOf('->', match[1].length + 2) : target.text.indexOf('->');
    const offset = target.text.indexOf(name, arrow + 2);
    edits.push({ from: target.from + offset, to: target.from + offset + name.length });
  }
  for (const edit of edits.sort((a, b) => b.from - a.from)) transaction.insertText(newName, edit.from, edit.to);

  const frontmatter = transaction.doc.attrs.dslFrontmatter as string;
  if (!frontmatter) return;
  const data: unknown = yaml.load(frontmatter.replace(/^---\r?\n/, '').replace(/\r?\n---\s*$/, ''));
  if (!data || typeof data !== 'object' || Array.isArray(data)) return;
  const config = data as Record<string, unknown>;
  let changed = false;
  for (const key of ['state', 'initialState']) {
    const state = config[key];
    if (!state || typeof state !== 'object') continue;
    for (const value of Object.values(state)) {
      if (!value || typeof value !== 'object' || !('trigger' in value)) continue;
      const trigger = value.trigger;
      if (trigger && typeof trigger === 'object' && 'scene' in trigger && trigger.scene === oldName) {
        trigger.scene = newName;
        changed = true;
      }
    }
  }
  if (changed) transaction.setDocAttribute('dslFrontmatter', '---\n' + yaml.dump(config, { lineWidth: -1 }) + '---\n');
}
