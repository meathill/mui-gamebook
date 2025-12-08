/**
 * 异步操作管理服务
 * 用于管理需要长时间处理的任务（如视频生成）
 */

import { getCloudflareContext } from '@opennextjs/cloudflare';

export type OperationType = 'video_generation' | 'audio_generation' | 'minigame_generation';
export type OperationStatus = 'pending' | 'processing' | 'completed' | 'failed';

export interface PendingOperation {
  id: number;
  user_id: string;
  game_id: number | null;
  type: OperationType;
  status: OperationStatus;
  operation_name: string | null;
  input_data: string | null;
  output_data: string | null;
  error_message: string | null;
  created_at: number;
  updated_at: number;
  completed_at: number | null;
}

export interface CreateOperationInput {
  userId: string;
  gameId?: number;
  type: OperationType;
  operationName: string;
  inputData: Record<string, unknown>;
}

export interface OperationResult {
  url: string;
  [key: string]: unknown;
}

/**
 * 创建新的异步操作记录
 */
export async function createPendingOperation(input: CreateOperationInput): Promise<number> {
  const { env } = getCloudflareContext();
  const DB = env.DB;
  if (!DB) throw new Error('数据库未配置');

  const now = Date.now();
  const result = await DB.prepare(`
    INSERT INTO PendingOperations (user_id, game_id, type, status, operation_name, input_data, created_at, updated_at)
    VALUES (?, ?, ?, 'pending', ?, ?, ?, ?)
  `).bind(
    input.userId,
    input.gameId ?? null,
    input.type,
    input.operationName,
    JSON.stringify(input.inputData),
    now,
    now
  ).run();

  return result.meta.last_row_id as number;
}

/**
 * 更新操作状态
 */
export async function updateOperationStatus(
  operationId: number,
  status: OperationStatus,
  outputData?: OperationResult,
  errorMessage?: string
): Promise<void> {
  const { env } = getCloudflareContext();
  const DB = env.DB;
  if (!DB) throw new Error('数据库未配置');

  const now = Date.now();
  const completedAt = status === 'completed' || status === 'failed' ? now : null;

  await DB.prepare(`
    UPDATE PendingOperations 
    SET status = ?, output_data = ?, error_message = ?, updated_at = ?, completed_at = ?
    WHERE id = ?
  `).bind(
    status,
    outputData ? JSON.stringify(outputData) : null,
    errorMessage ?? null,
    now,
    completedAt,
    operationId
  ).run();
}

/**
 * 获取操作详情
 */
export async function getOperationById(operationId: number): Promise<PendingOperation | null> {
  const { env } = getCloudflareContext();
  const DB = env.DB;
  if (!DB) throw new Error('数据库未配置');

  return await DB.prepare(`
    SELECT * FROM PendingOperations WHERE id = ?
  `).bind(operationId).first<PendingOperation>();
}

/**
 * 获取用户的待处理操作
 */
export async function getUserPendingOperations(userId: string): Promise<PendingOperation[]> {
  const { env } = getCloudflareContext();
  const DB = env.DB;
  if (!DB) throw new Error('数据库未配置');

  const result = await DB.prepare(`
    SELECT * FROM PendingOperations 
    WHERE user_id = ? AND status IN ('pending', 'processing')
    ORDER BY created_at DESC
  `).bind(userId).all<PendingOperation>();

  return result.results;
}

/**
 * 获取所有待处理的操作（用于后台轮询）
 */
export async function getAllPendingOperations(): Promise<PendingOperation[]> {
  const { env } = getCloudflareContext();
  const DB = env.DB;
  if (!DB) throw new Error('数据库未配置');

  const result = await DB.prepare(`
    SELECT * FROM PendingOperations 
    WHERE status IN ('pending', 'processing')
    ORDER BY created_at ASC
  `).all<PendingOperation>();

  return result.results;
}

/**
 * 生成操作占位符 URL
 * 格式: pending://{operationId}
 */
export function generatePlaceholderUrl(operationId: number): string {
  return `pending://${operationId}`;
}

/**
 * 检查 URL 是否是占位符
 */
export function isPlaceholderUrl(url: string): boolean {
  return url.startsWith('pending://');
}

/**
 * 从占位符 URL 提取操作 ID
 */
export function extractOperationId(url: string): number | null {
  if (!isPlaceholderUrl(url)) return null;
  const id = parseInt(url.replace('pending://', ''), 10);
  return isNaN(id) ? null : id;
}
