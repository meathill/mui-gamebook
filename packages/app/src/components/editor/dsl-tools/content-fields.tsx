import type { AICharacter } from '@roudanio/parser';
import type { DslDraft } from '@/lib/editor/dsl-tools/types';
import { SelectField, TextField } from './fields';
import LogicField from './logic-field';

export interface DslFieldsProps {
  draft: DslDraft;
  onChange: (update: Partial<DslDraft>) => void;
  scenes: string[];
  variables: string[];
  characters: Record<string, AICharacter>;
}

export default function ContentFields({ draft, onChange, scenes, variables, characters }: DslFieldsProps) {
  const isRoute = draft.kind === 'choice' || draft.kind === 'redirect';
  return (
    <>
      {draft.kind === 'scene' && (
        <TextField
          label="场景名称"
          value={draft.name}
          onChange={(name) => onChange({ name })}
          required
          hint="可使用中文、字母、数字、下划线和连字符；同一作品内不能重名。"
        />
      )}
      {draft.kind === 'choice' && (
        <TextField
          label="选项文字"
          value={draft.text}
          onChange={(text) => onChange({ text })}
          required
          placeholder="例如：走进森林"
        />
      )}
      {isRoute && (
        <>
          <div className="space-y-2">
            {draft.createTarget ? (
              <TextField
                label="新场景名称"
                value={draft.target}
                required
                placeholder="例如：森林入口"
                onChange={(target) => onChange({ target })}
              />
            ) : (
              <SelectField
                label="目标场景"
                value={draft.target}
                onChange={(target) => onChange({ target })}
                required>
                <option
                  value=""
                  disabled>
                  {scenes.length ? '请选择目标场景' : '暂无可选场景，请新建'}
                </option>
                {draft.target && !scenes.includes(draft.target) && (
                  <option
                    value={draft.target}
                    disabled>
                    {draft.target}（场景不存在，请重新选择）
                  </option>
                )}
                {scenes.map((name) => (
                  <option
                    key={name}
                    value={name}>
                    {name}
                  </option>
                ))}
              </SelectField>
            )}
            <label className="flex items-center gap-2 text-sm text-gray-600">
              <input
                type="checkbox"
                checked={draft.createTarget}
                onChange={(event) => onChange({ createTarget: event.target.checked, target: '' })}
              />
              新建目标场景并连接
            </label>
          </div>
          {draft.kind === 'redirect' && (
            <p className="text-sm leading-6 text-gray-500">
              有正文时，读者点“继续”后跳转；仅有跳转的场景会自动分流。多条跳转按顺序匹配。
            </p>
          )}
          <details
            className="rounded-md border border-gray-200 p-3"
            open={draft.condition || draft.stateChange ? true : undefined}>
            <summary className="cursor-pointer text-sm font-medium text-gray-700">条件与数值变化（可选）</summary>
            <div className="mt-4 space-y-5">
              <LogicField
                label="可用条件"
                value={draft.condition}
                variables={variables}
                onChange={(condition) => onChange({ condition })}
              />
              <LogicField
                label="跳转时修改变量"
                value={draft.stateChange}
                mode="statements"
                variables={variables}
                onChange={(stateChange) => onChange({ stateChange })}
              />
            </div>
          </details>
        </>
      )}
      {draft.kind === 'dialogue' && (
        <>
          <SelectField
            label="说话角色"
            value={draft.speaker}
            onChange={(speaker) => onChange({ speaker })}
            required>
            <option value="">选择角色</option>
            {Object.entries(characters).map(([id, character]) => (
              <option
                key={id}
                value={id}>
                {character.name}（{id}）
              </option>
            ))}
          </SelectField>
          {!Object.keys(characters).length && (
            <p className="text-sm text-gray-500">请先在左侧“角色”面板添加角色，再插入对话。</p>
          )}
          <TextField
            label="台词"
            value={draft.text}
            onChange={(text) => onChange({ text })}
            required
          />
          <TextField
            label="语气或动作（可选）"
            value={draft.emotion}
            onChange={(emotion) => onChange({ emotion })}
            placeholder="例如：低声、惊讶"
          />
        </>
      )}
      {draft.kind === 'variable' && (
        <>
          <SelectField
            label="引用变量"
            value={draft.variable}
            onChange={(variable) => onChange({ variable })}
            required>
            <option value="">选择变量</option>
            {variables.map((name) => (
              <option
                key={name}
                value={name}>
                {name}
              </option>
            ))}
          </SelectField>
          <p className="text-sm text-gray-500">
            阅读时显示这个变量的当前值。{!variables.length && '请先在左侧“变量”面板添加变量。'}
          </p>
        </>
      )}
      {draft.kind === 'conditional' && (
        <>
          <LogicField
            label="显示条件"
            value={draft.condition}
            variables={variables}
            onChange={(condition) => onChange({ condition })}
            required
          />
          <TextField
            label="条件成立时的文字"
            value={draft.thenText}
            onChange={(thenText) => onChange({ thenText })}
            multiline
            hint="支持变量与嵌套条件；可以换行，但不能插入空行。"
          />
          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={draft.hasElse}
              onChange={(event) => onChange({ hasElse: event.target.checked })}
            />
            条件不成立时显示其他文字
          </label>
          {draft.hasElse && (
            <TextField
              label="条件不成立时的文字"
              value={draft.elseText}
              onChange={(elseText) => onChange({ elseText })}
              multiline
            />
          )}
        </>
      )}
    </>
  );
}
