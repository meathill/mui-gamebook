import { useEffect, useState } from 'react';
import {
  parseExpression,
  parseStatementList,
  stringifyExpression,
  stringifyAssignments,
  type Assignment,
  type ExprNode,
} from '@roudanio/parser';
import { PlusIcon, TrashIcon, ArrowUpIcon, ArrowDownIcon } from '@phosphor-icons/react';
import ExpressionNodeEditor, { defaultExpression } from './expression-node-editor';
import { Textarea } from '@/components/ui/textarea';
import { NativeSelect } from '@/components/ui/native-select';

export default function LogicField({
  label,
  value,
  onChange,
  variables,
  mode = 'condition',
  required = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  variables: string[];
  mode?: 'condition' | 'statements';
  required?: boolean;
}) {
  const [tree, setTree] = useState<ExprNode | null>(null);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [sourceMode, setSourceMode] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    try {
      if (mode === 'condition') setTree(value.trim() ? parseExpression(value) : null);
      else setAssignments(value.trim() ? parseStatementList(value) : []);
      setError('');
    } catch (cause) {
      setError((cause as Error).message);
      setSourceMode(true);
    }
  }, [value, mode]);

  function updateTree(next: ExprNode) {
    setTree(next);
    try {
      const text = stringifyExpression(next);
      setError('');
      onChange(text);
    } catch (cause) {
      setError((cause as Error).message);
    }
  }
  function updateAssignments(next: Assignment[]) {
    setAssignments(next);
    try {
      const text = stringifyAssignments(next);
      setError('');
      onChange(text);
    } catch (cause) {
      setError((cause as Error).message);
    }
  }
  function moveAssignment(index: number, direction: number) {
    const next = [...assignments];
    [next[index], next[index + direction]] = [next[index + direction], next[index]];
    updateAssignments(next);
  }
  return (
    <section
      className="space-y-2"
      data-expression-invalid={Boolean(error) || (required && !value.trim())}>
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm font-medium text-gray-800">{label}</span>
        <button
          type="button"
          className="text-xs text-gray-500 underline underline-offset-4"
          onClick={() => setSourceMode(!sourceMode)}>
          {sourceMode ? '使用表单' : '编辑表达式'}
        </button>
      </div>
      {sourceMode ? (
        <Textarea
          aria-label={label + '表达式'}
          className="font-mono"
          value={value}
          required={required}
          rows={2}
          onChange={(event) => onChange(event.target.value)}
        />
      ) : mode === 'condition' ? (
        tree ? (
          <>
            <ExpressionNodeEditor
              node={tree}
              onChange={updateTree}
              variables={variables}
            />
            {!required && (
              <button
                type="button"
                className="text-xs text-gray-500"
                onClick={() => {
                  onChange('');
                  setTree(null);
                  setError('');
                }}>
                移除条件，始终可用
              </button>
            )}
          </>
        ) : (
          <button
            type="button"
            className="rounded-md border border-dashed border-gray-300 px-3 py-2 text-sm text-gray-600"
            onClick={() => updateTree(defaultExpression('binary', variables))}>
            <PlusIcon
              size={14}
              className="mr-1 inline"
            />
            {required ? '设置条件' : '添加条件（默认始终可用）'}
          </button>
        )
      ) : (
        <div className="space-y-3">
          {assignments.map((assignment, index) => (
            <div
              key={index}
              className="space-y-2 rounded-md bg-gray-50 p-3">
              <div className="flex items-center gap-2">
                <NativeSelect
                  aria-label={'第 ' + (index + 1) + ' 条赋值的变量'}
                  wrapperClassName="flex-1"
                  value={assignment.key}
                  required
                  onChange={(event) =>
                    updateAssignments(
                      assignments.map((item, itemIndex) =>
                        itemIndex === index ? { ...item, key: event.target.value } : item,
                      ),
                    )
                  }>
                  <option value="">选择变量</option>
                  {assignment.key && !variables.includes(assignment.key) && (
                    <option value={assignment.key}>{assignment.key}（未定义）</option>
                  )}
                  {variables.map((name) => (
                    <option
                      key={name}
                      value={name}>
                      {name}
                    </option>
                  ))}
                </NativeSelect>
                <button
                  type="button"
                  aria-label="上移赋值"
                  className="p-2 disabled:opacity-30"
                  disabled={index === 0}
                  onClick={() => moveAssignment(index, -1)}>
                  <ArrowUpIcon size={16} />
                </button>
                <button
                  type="button"
                  aria-label="下移赋值"
                  className="p-2 disabled:opacity-30"
                  disabled={index === assignments.length - 1}
                  onClick={() => moveAssignment(index, 1)}>
                  <ArrowDownIcon size={16} />
                </button>
                <button
                  type="button"
                  aria-label="删除赋值"
                  className="p-2 text-red-600"
                  onClick={() => updateAssignments(assignments.filter((_, itemIndex) => itemIndex !== index))}>
                  <TrashIcon size={16} />
                </button>
              </div>
              <ExpressionNodeEditor
                node={assignment.value}
                variables={variables}
                label="设为"
                onChange={(next) =>
                  updateAssignments(
                    assignments.map((item, itemIndex) => (itemIndex === index ? { ...item, value: next } : item)),
                  )
                }
              />
            </div>
          ))}
          <button
            type="button"
            className="rounded-md border border-dashed border-gray-300 px-3 py-2 text-sm text-gray-600"
            onClick={() =>
              updateAssignments([...assignments, { key: variables[0] ?? '', value: { type: 'number', value: 0 } }])
            }>
            <PlusIcon
              size={14}
              className="mr-1 inline"
            />
            添加数值变化
          </button>
          {assignments.length > 1 && (
            <p className="text-xs text-gray-500">从上到下执行，后面的规则使用前面更新后的值。</p>
          )}
        </div>
      )}
      {error && (
        <p
          role="alert"
          className="text-sm text-red-600">
          {error}
        </p>
      )}
    </section>
  );
}
