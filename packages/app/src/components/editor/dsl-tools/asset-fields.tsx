import type { AICharacter, SceneNode } from '@roudanio/parser';
import MediaAssetItem from '../MediaAssetItem';
import type { DslDraft } from '@/lib/editor/dsl-tools/types';
import { SelectField, TextField } from './fields';

export default function AssetFields({
  draft,
  onChange,
  gameId,
  characters,
}: {
  draft: DslDraft;
  onChange: (update: Partial<DslDraft>) => void;
  gameId?: string;
  characters: Record<string, AICharacter>;
}) {
  const asset: SceneNode =
    draft.kind === 'image'
      ? { type: 'ai_image', prompt: draft.prompt, url: draft.url, aspectRatio: draft.aspectRatio }
      : draft.kind === 'audio'
        ? {
            type: 'ai_audio',
            prompt: draft.prompt,
            url: draft.url,
            audioType: draft.audioType === 'sfx' ? 'sfx' : 'background_music',
          }
        : draft.kind === 'video'
          ? { type: 'ai_video', prompt: draft.prompt, url: draft.url }
          : { type: 'minigame', prompt: draft.prompt, url: draft.url };
  return (
    <>
      <TextField
        label="素材描述"
        value={draft.prompt}
        onChange={(prompt) => onChange({ prompt })}
        multiline
      />
      <TextField
        label="素材地址（可选）"
        value={draft.url}
        onChange={(url) => onChange({ url })}
        hint="已有素材可直接填写地址，也可上传或生成。"
      />
      {draft.kind === 'image' && (
        <TextField
          label="宽高比（可选）"
          value={draft.aspectRatio}
          onChange={(aspectRatio) => onChange({ aspectRatio })}
          placeholder="例如：16:9"
        />
      )}
      {draft.kind === 'audio' && (
        <SelectField
          label="音频用途"
          value={draft.audioType}
          onChange={(audioType) => onChange({ audioType })}>
          <option value="background_music">背景音乐</option>
          <option value="sfx">音效</option>
        </SelectField>
      )}
      {draft.kind === 'minigame' && (
        <TextField
          label="小游戏变量（可选）"
          value={draft.minigameVariables}
          onChange={(minigameVariables) => onChange({ minigameVariables })}
          multiline
          placeholder="score: 得分"
          hint="每行一个变量，格式为“变量名: 用途说明”。"
        />
      )}
      {gameId && (
        <details className="space-y-3">
          <summary className="cursor-pointer text-sm font-medium text-gray-700">上传、生成或预览素材</summary>
          <MediaAssetItem
            asset={asset}
            gameId={gameId}
            showDelete={false}
            aiCharacters={characters}
            onAssetChange={(field, value) => {
              if (field === 'url' || field === 'prompt' || field === 'aspectRatio') onChange({ [field]: value });
            }}
          />
        </details>
      )}
    </>
  );
}
