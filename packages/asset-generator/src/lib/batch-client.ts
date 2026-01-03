/**
 * Batch API 客户端
 * 支持 OpenAI 和 Gemini 的批量图片生成，节省 50% 成本
 */
import OpenAI from 'openai';
import { GoogleGenAI, type InlinedRequest, type InlinedResponse } from '@google/genai';
import { existsSync, readFileSync, writeFileSync, createReadStream, mkdirSync, unlinkSync } from 'fs';
import { join } from 'path';

/**
 * Batch 任务记录
 */
export interface BatchRecord {
  batch_id: string;
  provider: 'openai' | 'google';
  created_at: string;
  status: string;
  tasks: BatchTask[];
}

/**
 * 单个任务
 */
export interface BatchTask {
  custom_id: string;
  sceneId: string;
  prompt: string;
}

/**
 * 图片生成结果
 */
export interface ImageResult {
  custom_id: string;
  success: boolean;
  base64?: string;
  error?: string;
}

/**
 * Batch 状态
 */
export interface BatchStatus {
  id: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  progress: {
    total: number;
    completed: number;
    failed: number;
  };
  results?: ImageResult[];
}

/**
 * 获取 batch 记录文件路径
 */
function getBatchRecordPath(gameSlug: string): string {
  return join('cache', gameSlug, '.batch.json');
}

/**
 * 检查是否有进行中的 batch
 */
export function hasPendingBatch(gameSlug: string): BatchRecord | null {
  const recordPath = getBatchRecordPath(gameSlug);
  if (!existsSync(recordPath)) {
    return null;
  }

  const record = JSON.parse(readFileSync(recordPath, 'utf-8')) as BatchRecord;
  return record;
}

/**
 * 保存 batch 记录
 */
function saveBatchRecord(gameSlug: string, record: BatchRecord): void {
  const recordPath = getBatchRecordPath(gameSlug);
  const dir = join('cache', gameSlug);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
  writeFileSync(recordPath, JSON.stringify(record, null, 2));
}

/**
 * 清除 batch 记录
 */
export function clearBatchRecord(gameSlug: string): void {
  const recordPath = getBatchRecordPath(gameSlug);
  if (existsSync(recordPath)) {
    unlinkSync(recordPath);
  }
}

// ============ OpenAI 实现 ============

let _openaiClient: OpenAI | null = null;
function getOpenAIClient(): OpenAI {
  if (!_openaiClient) {
    _openaiClient = new OpenAI();
  }
  return _openaiClient;
}

/**
 * 构建 OpenAI Responses API 请求体
 */
function buildOpenAIRequest(task: BatchTask, imageStyle?: string): object {
  const fullPrompt = imageStyle ? `${imageStyle}, ${task.prompt}` : task.prompt;

  return {
    custom_id: task.custom_id,
    method: 'POST',
    url: '/v1/responses',
    body: {
      model: 'gpt-4o',
      input: `Generate an image: ${fullPrompt}`,
      tools: [{ type: 'image_generation' }],
    },
  };
}

/**
 * 创建 OpenAI batch 任务
 */
async function createOpenAIBatch(gameSlug: string, tasks: BatchTask[], imageStyle?: string): Promise<string> {
  // 1. 创建 JSONL 文件
  const tempDir = join('cache', gameSlug, 'temp');
  if (!existsSync(tempDir)) {
    mkdirSync(tempDir, { recursive: true });
  }

  const inputPath = join(tempDir, 'batch-input.jsonl');
  const lines = tasks.map((task) => JSON.stringify(buildOpenAIRequest(task, imageStyle)));
  writeFileSync(inputPath, lines.join('\n') + '\n');

  // 2. 上传文件
  console.log('[OpenAI] 上传任务文件...');
  const file = await getOpenAIClient().files.create({
    file: createReadStream(inputPath),
    purpose: 'batch',
  });

  // 3. 创建 batch
  console.log('[OpenAI] 提交 Batch 任务...');
  const batch = await getOpenAIClient().batches.create({
    input_file_id: file.id,
    endpoint: '/v1/responses',
    completion_window: '24h',
  });

  console.log(`[OpenAI] Batch ID: ${batch.id}`);
  return batch.id;
}

/**
 * 检查 OpenAI batch 状态
 */
async function checkOpenAIBatchStatus(batchId: string): Promise<BatchStatus> {
  const batch = await getOpenAIClient().batches.retrieve(batchId);

  const statusMap: Record<string, BatchStatus['status']> = {
    validating: 'pending',
    in_progress: 'running',
    completed: 'completed',
    failed: 'failed',
    expired: 'failed',
    cancelled: 'failed',
  };

  const status: BatchStatus = {
    id: batch.id,
    status: statusMap[batch.status] || 'pending',
    progress: {
      total: batch.request_counts?.total || 0,
      completed: batch.request_counts?.completed || 0,
      failed: batch.request_counts?.failed || 0,
    },
  };

  // 如果完成，下载结果
  if (batch.status === 'completed' && batch.output_file_id) {
    console.log('[OpenAI] 下载结果...');
    const content = await getOpenAIClient().files.content(batch.output_file_id);
    const text = await content.text();

    status.results = [];
    for (const line of text.trim().split('\n')) {
      try {
        const data = JSON.parse(line);
        const customId = data.custom_id;

        if (data.error) {
          status.results.push({ custom_id: customId, success: false, error: data.error.message });
          continue;
        }

        const outputs = data.response?.body?.output || [];
        let base64: string | undefined;
        for (const output of outputs) {
          if (output.type === 'image_generation_call' && output.result) {
            base64 = output.result;
            break;
          }
        }

        status.results.push(
          base64
            ? { custom_id: customId, success: true, base64 }
            : { custom_id: customId, success: false, error: 'No image' },
        );
      } catch {
        // 忽略解析错误
      }
    }
  }

  return status;
}

// ============ Gemini 实现 ============

/**
 * 创建 Gemini batch 任务
 */
async function createGeminiBatch(
  gameSlug: string,
  tasks: BatchTask[],
  imageStyle?: string,
  apiKey?: string,
): Promise<string> {
  if (!apiKey) {
    throw new Error('GOOGLE_API_KEY 未设置');
  }

  const genAI = new GoogleGenAI({ apiKey });

  // 构建 InlinedRequest 数组
  const requests: InlinedRequest[] = tasks.map((task) => {
    const fullPrompt = imageStyle ? `${imageStyle}, ${task.prompt}` : task.prompt;
    return {
      contents: [{ parts: [{ text: `Generate an image: ${fullPrompt}` }] }],
      config: {
        responseModalities: ['IMAGE'],
      },
    };
  });

  console.log('[Gemini] 提交 Batch 任务...');
  const batch = await genAI.batches.create({
    model: 'gemini-3-pro-image-preview',
    src: requests,
  });

  console.log(`[Gemini] Batch Name: ${batch.name}`);
  return batch.name || '';
}

/**
 * 检查 Gemini batch 状态
 */
async function checkGeminiBatchStatus(batchId: string, apiKey?: string): Promise<BatchStatus> {
  if (!apiKey) {
    throw new Error('GOOGLE_API_KEY 未设置');
  }

  const genAI = new GoogleGenAI({ apiKey });
  const batch = await genAI.batches.get({ name: batchId });

  const statusMap: Record<string, BatchStatus['status']> = {
    JOB_STATE_PENDING: 'pending',
    JOB_STATE_RUNNING: 'running',
    JOB_STATE_SUCCEEDED: 'completed',
    JOB_STATE_FAILED: 'failed',
    JOB_STATE_CANCELLED: 'failed',
  };

  const status: BatchStatus = {
    id: batchId,
    status: statusMap[batch.state || ''] || 'pending',
    progress: { total: 0, completed: 0, failed: 0 },
  };

  // 如果完成，解析结果
  if (batch.state === 'JOB_STATE_SUCCEEDED') {
    const responses = batch.dest?.inlinedResponses || [];
    status.progress.total = responses.length;
    status.results = [];

    for (let i = 0; i < responses.length; i++) {
      const resp = responses[i] as InlinedResponse;
      const customId = `task-${i}`;

      if (resp.error) {
        status.results.push({ custom_id: customId, success: false, error: resp.error.message });
        status.progress.failed++;
        continue;
      }

      const parts = resp.response?.candidates?.[0]?.content?.parts || [];
      let base64: string | undefined;
      for (const part of parts) {
        if (part.inlineData?.data) {
          base64 = part.inlineData.data;
          break;
        }
      }

      if (base64) {
        status.results.push({ custom_id: customId, success: true, base64 });
        status.progress.completed++;
      } else {
        status.results.push({ custom_id: customId, success: false, error: 'No image' });
        status.progress.failed++;
      }
    }
  }

  return status;
}

// ============ 统一接口 ============

export interface CreateBatchOptions {
  gameSlug: string;
  tasks: BatchTask[];
  provider: 'openai' | 'google';
  imageStyle?: string;
  apiKey?: string; // Gemini 需要
}

/**
 * 创建 batch 任务（统一接口）
 */
export async function createBatch(options: CreateBatchOptions): Promise<string> {
  const { gameSlug, tasks, provider, imageStyle, apiKey } = options;

  console.log(`[Batch] 使用 ${provider} 创建 ${tasks.length} 个图片生成任务...`);

  let batchId: string;

  if (provider === 'openai') {
    batchId = await createOpenAIBatch(gameSlug, tasks, imageStyle);
  } else {
    batchId = await createGeminiBatch(gameSlug, tasks, imageStyle, apiKey);
  }

  // 保存记录
  const record: BatchRecord = {
    batch_id: batchId,
    provider,
    created_at: new Date().toISOString(),
    status: 'pending',
    tasks,
  };
  saveBatchRecord(gameSlug, record);

  return batchId;
}

/**
 * 检查 batch 状态（统一接口）
 */
export async function checkBatchStatus(
  batchId: string,
  provider: 'openai' | 'google',
  apiKey?: string,
): Promise<BatchStatus> {
  if (provider === 'openai') {
    return checkOpenAIBatchStatus(batchId);
  } else {
    return checkGeminiBatchStatus(batchId, apiKey);
  }
}
