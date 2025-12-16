/**
 * 配置模块 - 环境变量和客户端初始化
 */
import 'dotenv/config';
import { GoogleGenAI } from '@google/genai';
import { S3Client } from '@aws-sdk/client-s3';

// Cloudflare 配置
export const CF_ACCOUNT_ID = process.env.CF_ACCOUNT_ID!;
export const CF_API_TOKEN = process.env.CF_API_TOKEN!;
export const D1_DATABASE_ID = process.env.D1_DATABASE_ID!;

// R2 客户端
export const s3Client = new S3Client({
  region: 'auto',
  endpoint: process.env.R2_ENDPOINT!,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
});

// Google AI 客户端
export const genAI = new GoogleGenAI({
  apiKey: process.env.GOOGLE_API_KEY_NEW!,
});

// R2 配置
export const R2_BUCKET = process.env.R2_BUCKET!;
export const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL!;

// Google 图片生成模型
export const GOOGLE_IMAGE_MODEL = process.env.GOOGLE_IMAGE_MODEL!;

// Google TTS 模型
export const GOOGLE_TTS_MODEL = 'gemini-2.5-flash-preview-tts';

// TTS 默认声音（适合儿童的温和声音）
export const DEFAULT_TTS_VOICE = process.env.DEFAULT_TTS_VOICE || 'Aoede';

/**
 * 检查远程命令必需的环境变量
 */
export function validateRemoteEnv(): boolean {
  if (!CF_ACCOUNT_ID || !CF_API_TOKEN || !D1_DATABASE_ID) {
    console.error('错误: 缺少必要的环境变量');
    console.log('请确保设置了以下环境变量:');
    console.log('  CF_ACCOUNT_ID - Cloudflare 账户 ID');
    console.log('  CF_API_TOKEN - Cloudflare API Token');
    console.log('  D1_DATABASE_ID - D1 数据库 ID');
    return false;
  }
  return true;
}
