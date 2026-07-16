/**
 * 表达式与模板求值薄适配层。
 * 实现已全部收敛到 @mui-gamebook/parser：统一表达式引擎（(if:) / (set:) / trigger /
 * {{if}} 四处共用同一文法，DSL v2 Phase 1）与条件文本模板引擎（{{ if }} 树解析，
 * 支持嵌套，issue #10），校验器与运行时同源。
 * 本文件保留原导出签名（多处站点代码引用）。
 *
 * interpolateVariables(text, state)：{{ if }}...{{ else }}...{{ /if }} 条件文本
 * （支持嵌套）+ {{变量}} 插值（Unicode 变量名，未声明原样保留）。
 */
export { evaluateCondition, executeSet } from '@mui-gamebook/parser/src/expression';
export { interpolateTemplate as interpolateVariables } from '@mui-gamebook/parser/src/template';
