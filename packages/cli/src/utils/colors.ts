/**
 * 终端色彩工具：纯原生 ANSI 转义，零外部依赖，支持禁用。
 */

const isColorSupported =
  !process.env.NO_COLOR && (process.env.FORCE_COLOR || (process.stdout.isTTY && process.env.TERM !== 'dumb'));

function code(open: number, close: number) {
  return (text: string | number): string => {
    if (!isColorSupported) return String(text);
    return `\x1b[${open}m${text}\x1b[${close}m`;
  };
}

export const colors = {
  reset: code(0, 0),
  bold: code(1, 22),
  dim: code(2, 22),
  italic: code(3, 23),
  underline: code(4, 24),
  red: code(31, 39),
  green: code(32, 39),
  yellow: code(33, 39),
  blue: code(34, 39),
  magenta: code(35, 39),
  cyan: code(36, 39),
  white: code(37, 39),
  gray: code(90, 39),
  bgRed: code(41, 49),
  bgGreen: code(42, 49),
  bgYellow: code(43, 49),
};
