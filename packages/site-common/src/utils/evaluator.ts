/**
 * 表达式求值薄适配层。
 * 实现已收敛到 @mui-gamebook/parser 的统一表达式引擎（DSL v2 Phase 1）：
 * (if:) / (set:) / trigger / {{if}} 四处共用同一文法，校验器与运行时同源。
 * 本文件保留原导出签名（多处站点代码引用），仅负责文本插值的模板扫描。
 */
import { evaluateCondition, executeSet } from '@mui-gamebook/parser/src/expression';
import type { RuntimeState } from '@mui-gamebook/parser/src/types';

export { evaluateCondition, executeSet };

/**
 * 在文本中插值变量
 * 支持 {{变量名}} 语法（Unicode 变量名，两侧空格可选）与
 * {{ if condition }} ... {{ else }} ... {{ /if }} 条件文本（不支持嵌套）
 */
export function interpolateVariables(text: string, state: RuntimeState): string {
  if (!text) return text;

  let processed = text;

  // 1. Handle conditionals: {{ if condition }} ... {{ else }} ... {{ /if }}
  // RegExp matches:
  // Group 1: condition string
  // Group 2: content for TRUE
  // Group 3: content for FALSE (optional, inside {{ else }} block)
  const ifRegex = /{{\s*if\s+(.+?)\s*}}([\s\S]*?)(?:{{\s*else\s*}}([\s\S]*?))?{{\s*\/if\s*}}/gi;

  if (processed.match(ifRegex)) {
    processed = processed.replace(ifRegex, (match, condition, trueBlock, falseBlock) => {
      const isTrue = evaluateCondition(condition, state);
      return isTrue ? trueBlock : falseBlock || '';
    });
  }

  // 2. Handle variable interpolation: {{varName}} / {{ varName }}（Unicode 标识符）
  return processed.replace(/\{\{\s*([\p{L}_][\p{L}\p{N}_]*)\s*\}\}/gu, (match, varName) => {
    if (Object.prototype.hasOwnProperty.call(state, varName)) {
      const value = state[varName];
      return String(value);
    }
    return match;
  });
}
