import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';

type DateInput = Date | number | string;

function toDate(value: DateInput): Date {
  return value instanceof Date ? value : new Date(value);
}

/** 短数字日期，如 2026/7/17 */
export function formatDate(value: DateInput): string {
  return format(toDate(value), 'yyyy/M/d', { locale: zhCN });
}

/** 长文字日期，如 2026年7月17日 */
export function formatLongDate(value: DateInput): string {
  return format(toDate(value), 'yyyy年M月d日', { locale: zhCN });
}

/** 短日期 + 短时间，如 2026/7/17 14:30 */
export function formatDateTime(value: DateInput): string {
  return format(toDate(value), 'yyyy/M/d HH:mm', { locale: zhCN });
}

/** 月日 + 时分（不含年份），如 07/17 14:30 */
export function formatShortDateTime(value: DateInput): string {
  return format(toDate(value), 'MM/dd HH:mm', { locale: zhCN });
}
