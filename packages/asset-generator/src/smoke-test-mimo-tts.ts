#!/usr/bin/env node
/**
 * MiMo TTS 冒烟测试脚本
 * 用法: pnpm smoke:mimo-tts
 *
 * MiMo TTS 协议是从第三方文档镜像交叉核对出来的，从未用真实 key 验证过，
 * 预置音色 ID 是否真的对应不同的声音也没验证过——这是按角色分音色功能的前提。
 * 独立于 lib/config.ts（不牵扯 R2/D1 相关环境变量），只依赖 MIMO_API_KEY。
 */
import 'dotenv/config';
import { existsSync, mkdirSync, writeFileSync } from 'fs';
import { MimoProvider, MIMO_DEFAULT_BASE_URL } from '@mui-gamebook/core/lib/mimo-provider';
import { MIMO_VOICE_IDS } from '@mui-gamebook/core/lib/voice-config';

const TEST_SENTENCE = '从前，在一个遥远的森林里，住着一位善良的姑娘。';
const OUTPUT_DIR = './output/mimo-smoke-test';

interface VoiceTestResult {
  voice: string;
  ok: boolean;
  file?: string;
  bytes?: number;
  error?: string;
}

function maskKey(key: string): string {
  return key.length > 8 ? `${key.slice(0, 4)}...${key.slice(-4)}` : '****';
}

async function main() {
  const apiKey = process.env.MIMO_API_KEY;
  if (!apiKey) {
    console.error('错误: 未设置 MIMO_API_KEY 环境变量');
    console.error('请在 packages/asset-generator/.env 中填入真实的 MiMo API Key 后重试');
    process.exit(1);
  }

  const baseUrl = process.env.MIMO_BASE_URL || MIMO_DEFAULT_BASE_URL;

  console.log('='.repeat(50));
  console.log('MiMo TTS 冒烟测试');
  console.log(`API Key: ${maskKey(apiKey)}`);
  console.log(`Base URL: ${baseUrl}`);
  console.log(`音色数量: ${MIMO_VOICE_IDS.length}`);
  console.log('='.repeat(50));

  if (!existsSync(OUTPUT_DIR)) {
    mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  const provider = new MimoProvider(apiKey, {}, process.env.MIMO_BASE_URL);
  const results: VoiceTestResult[] = [];

  // 1. 先单独验证连通性与鉴权（默认音色），失败立刻退出，不浪费剩下音色的调用
  console.log('\n[1/2] 验证连通性与鉴权（mimo_default）...');
  try {
    const result = await provider.generateTTS(TEST_SENTENCE, 'mimo_default');
    const fileName = `${OUTPUT_DIR}/01-mimo_default.wav`;
    writeFileSync(fileName, result.buffer);
    results.push({ voice: 'mimo_default', ok: true, file: fileName, bytes: result.buffer.length });
    console.log(`  ✓ mimo_default: ${fileName} (${result.buffer.length} bytes)`);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`  ✗ mimo_default 失败: ${message}`);
    console.error('\n连通性/鉴权验证失败，MiMo TTS 协议可能不可用，停止测试。');
    console.error('请检查 MIMO_API_KEY 是否正确、MIMO_BASE_URL 是否可达。');
    process.exit(1);
  }

  // 2. 连通性没问题后，用同一句测试文本遍历其余音色，方便 A/B 对比
  console.log('\n[2/2] 遍历其余音色...');
  const remainingVoices = MIMO_VOICE_IDS.filter((voice) => voice !== 'mimo_default');

  for (let i = 0; i < remainingVoices.length; i++) {
    const voice = remainingVoices[i];
    const fileIndex = String(i + 2).padStart(2, '0'); // 01 已用于 mimo_default
    const fileName = `${OUTPUT_DIR}/${fileIndex}-${voice}.wav`;
    try {
      const result = await provider.generateTTS(TEST_SENTENCE, voice);
      writeFileSync(fileName, result.buffer);
      results.push({ voice, ok: true, file: fileName, bytes: result.buffer.length });
      console.log(`  ✓ ${voice}: ${fileName} (${result.buffer.length} bytes)`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      results.push({ voice, ok: false, error: message });
      console.error(`  ✗ ${voice} 失败: ${message}`);
    }
  }

  console.log('\n' + '='.repeat(50));
  console.log('结果汇总:');
  for (const r of results) {
    console.log(`  ${r.ok ? '✓' : '✗'} ${r.voice}${r.ok ? ` — ${r.bytes} bytes` : ` — ${r.error}`}`);
  }

  console.log('\n下一步（人工判断，无法自动化）：');
  console.log(`  请依次播放 ${OUTPUT_DIR} 目录下的 wav 文件，重点关注：`);
  console.log('  - 02-冰糖 / 03-茉莉 / 04-苏打 / 05-白桦 这 4 个中文预置音色，');
  console.log('    互相之间、以及和 01-mimo_default 之间，是否听起来是几种不同的声音。');
  console.log('  - 如果这些音色听起来都差不多（比如实际上只有 1-2 种声音），');
  console.log('    说明按角色分配不同音色这个前提不成立，需要停下来重新评估整个功能，');
  console.log('    不要继续往下做分段/manifest 批处理工具。');
  console.log('='.repeat(50));

  const failedCount = results.filter((r) => !r.ok).length;
  process.exit(failedCount > 0 ? 1 : 0);
}

main().catch((error) => {
  console.error('错误:', error instanceof Error ? error.message : String(error));
  process.exit(1);
});
