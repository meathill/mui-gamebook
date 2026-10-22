import { type BinaryOp, type ExprNode } from '@roudanio/parser';
import { FIELD_CLASS } from './fields';

const OPERATORS: Array<[BinaryOp, string]> = [
  ['and', '全部满足'],
  ['or', '任一满足'],
  ['==', '等于'],
  ['!=', '不等于'],
  ['>', '大于'],
  ['>=', '大于或等于'],
  ['<', '小于'],
  ['<=', '小于或等于'],
  ['+', '加'],
  ['-', '减'],
  ['*', '乘'],
  ['/', '除'],
  ['%', '取余'],
];

export function defaultExpression(kind: string, variables: string[]): ExprNode {
  switch (kind) {
    case 'identifier':
      return { type: 'identifier', name: variables[0] ?? '' };
    case 'string':
      return { type: 'string', value: '' };
    case 'boolean':
      return { type: 'boolean', value: true };
    case 'not':
      return { type: 'unary', op: '!', operand: { type: 'boolean', value: true } };
    case 'negative':
      return { type: 'unary', op: '-', operand: { type: 'number', value: 1 } };
    case 'binary':
      return {
        type: 'binary',
        op: '==',
        left: variables.length ? { type: 'identifier', name: variables[0] } : { type: 'number', value: 0 },
        right: { type: 'number', value: 0 },
      };
    default:
      return { type: 'number', value: 0 };
  }
}

export default function ExpressionNodeEditor({
  node,
  onChange,
  variables,
  label = '表达式',
  depth = 0,
}: {
  node: ExprNode;
  onChange: (node: ExprNode) => void;
  variables: string[];
  label?: string;
  depth?: number;
}) {
  const kind = node.type === 'unary' ? (node.op === '!' ? 'not' : 'negative') : node.type;
  return (
    <fieldset className="min-w-0 space-y-2 rounded-md border border-gray-200 p-3">
      <legend className="px-1 text-xs text-gray-500">{label}</legend>
      <div className="flex flex-wrap items-start gap-2">
        <select
          aria-label={label + '类型'}
          className={FIELD_CLASS + ' sm:w-36'}
          value={kind}
          onChange={(event) => onChange(defaultExpression(event.target.value, variables))}>
          <option value="identifier">变量</option>
          <option value="number">数字</option>
          <option value="string">文字</option>
          <option value="boolean">是／否</option>
          <option
            value="binary"
            disabled={depth >= 24}>
            比较／运算／组合
          </option>
          <option
            value="not"
            disabled={depth >= 24}>
            取反
          </option>
          <option
            value="negative"
            disabled={depth >= 24}>
            负数
          </option>
        </select>
        {node.type === 'identifier' && (
          <select
            aria-label={label + '变量'}
            className={FIELD_CLASS + ' sm:flex-1'}
            value={node.name}
            required
            onChange={(event) => onChange({ ...node, name: event.target.value })}>
            <option value="">选择变量</option>
            {node.name && !variables.includes(node.name) && <option value={node.name}>{node.name}（未定义）</option>}
            {variables.map((name) => (
              <option
                key={name}
                value={name}>
                {name}
              </option>
            ))}
          </select>
        )}
        {node.type === 'number' && (
          <input
            aria-label={label + '数字'}
            className={FIELD_CLASS + ' sm:flex-1'}
            type="number"
            step="any"
            required
            value={Number.isFinite(node.value) ? node.value : ''}
            onChange={(event) => onChange({ ...node, value: event.target.valueAsNumber })}
          />
        )}
        {node.type === 'string' && (
          <input
            aria-label={label + '文字'}
            className={FIELD_CLASS + ' sm:flex-1'}
            value={node.value}
            onChange={(event) => onChange({ ...node, value: event.target.value })}
          />
        )}
        {node.type === 'boolean' && (
          <select
            aria-label={label + '布尔值'}
            className={FIELD_CLASS + ' sm:flex-1'}
            value={String(node.value)}
            onChange={(event) => onChange({ ...node, value: event.target.value === 'true' })}>
            <option value="true">是</option>
            <option value="false">否</option>
          </select>
        )}
        {node.type === 'binary' && (
          <select
            aria-label={label + '运算'}
            className={FIELD_CLASS + ' sm:flex-1'}
            value={node.op}
            onChange={(event) => onChange({ ...node, op: event.target.value as BinaryOp })}>
            {OPERATORS.map(([value, title]) => (
              <option
                key={value}
                value={value}>
                {title}
              </option>
            ))}
          </select>
        )}
      </div>
      {node.type === 'unary' && (
        <ExpressionNodeEditor
          node={node.operand}
          variables={variables}
          label="作用于"
          depth={depth + 1}
          onChange={(operand) => onChange({ ...node, operand })}
        />
      )}
      {node.type === 'binary' && (
        <div className="grid min-w-0 gap-2">
          <ExpressionNodeEditor
            node={node.left}
            variables={variables}
            label={node.op === 'and' || node.op === 'or' ? '条件一' : '左侧'}
            depth={depth + 1}
            onChange={(left) => onChange({ ...node, left })}
          />
          <ExpressionNodeEditor
            node={node.right}
            variables={variables}
            label={node.op === 'and' || node.op === 'or' ? '条件二' : '右侧'}
            depth={depth + 1}
            onChange={(right) => onChange({ ...node, right })}
          />
        </div>
      )}
    </fieldset>
  );
}
