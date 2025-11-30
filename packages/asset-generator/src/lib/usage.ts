/**
 * AI 用量统计模块
 */
import type { AiUsageInfo } from '@mui-gamebook/core/lib/ai';

// 用量统计
let totalUsage: AiUsageInfo = {
  promptTokens: 0,
  completionTokens: 0,
  totalTokens: 0,
};

/**
 * 累加用量
 */
export function addUsage(usage: AiUsageInfo): void {
  totalUsage.promptTokens += usage.promptTokens;
  totalUsage.completionTokens += usage.completionTokens;
  totalUsage.totalTokens += usage.totalTokens;
}

/**
 * 获取当前用量
 */
export function getUsage(): AiUsageInfo {
  return { ...totalUsage };
}

/**
 * 重置用量统计
 */
export function resetUsage(): void {
  totalUsage = {
    promptTokens: 0,
    completionTokens: 0,
    totalTokens: 0,
  };
}

/**
 * 打印用量统计
 */
export function printUsageStats(): void {
  console.log('\n[AI 用量统计]');
  console.log(`  输入 Token: ${totalUsage.promptTokens}`);
  console.log(`  输出 Token: ${totalUsage.completionTokens}`);
  console.log(`  总计 Token: ${totalUsage.totalTokens}`);
}
