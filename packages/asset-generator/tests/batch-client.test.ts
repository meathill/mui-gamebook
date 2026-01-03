/**
 * batch-client 模块测试
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { existsSync, readFileSync, writeFileSync, mkdirSync, rmSync } from 'fs';
import { join } from 'path';

// Mock OpenAI
const mockOpenAIFiles = {
  create: vi.fn().mockResolvedValue({ id: 'file-test-123' }),
  content: vi.fn().mockResolvedValue({
    text: () => Promise.resolve('{"custom_id":"test","response":{"body":{"output":[]}}}'),
  }),
};

const mockOpenAIBatches = {
  create: vi.fn().mockResolvedValue({ id: 'batch-openai-123', status: 'validating' }),
  retrieve: vi.fn().mockResolvedValue({
    id: 'batch-openai-123',
    status: 'completed',
    request_counts: { total: 1, completed: 1, failed: 0 },
    output_file_id: 'file-output-123',
  }),
};

vi.mock('openai', () => {
  return {
    default: class MockOpenAI {
      files = mockOpenAIFiles;
      batches = mockOpenAIBatches;
    },
  };
});

// Mock GoogleGenAI
const mockGeminiBatches = {
  create: vi.fn().mockResolvedValue({ name: 'batches/gemini-test-123', state: 'JOB_STATE_PENDING' }),
  get: vi.fn().mockResolvedValue({
    name: 'batches/gemini-test-123',
    state: 'JOB_STATE_SUCCEEDED',
    dest: { inlinedResponses: [] },
  }),
};

vi.mock('@google/genai', () => {
  return {
    GoogleGenAI: class MockGoogleGenAI {
      batches = mockGeminiBatches;
    },
  };
});

// 导入被测模块（在 mock 之后）
import {
  hasPendingBatch,
  clearBatchRecord,
  createBatch,
  checkBatchStatus,
  type BatchTask,
  type BatchRecord,
} from '../src/lib/batch-client';

const TEST_GAME_SLUG = 'test-game-batch';
const CACHE_DIR = join('cache', TEST_GAME_SLUG);
const BATCH_RECORD_PATH = join(CACHE_DIR, '.batch.json');

describe('batch-client', () => {
  beforeEach(() => {
    // 清理测试目录
    if (existsSync(CACHE_DIR)) {
      rmSync(CACHE_DIR, { recursive: true });
    }
  });

  afterEach(() => {
    // 清理
    if (existsSync(CACHE_DIR)) {
      rmSync(CACHE_DIR, { recursive: true });
    }
  });

  describe('hasPendingBatch', () => {
    it('should return null when no batch record exists', () => {
      const result = hasPendingBatch(TEST_GAME_SLUG);
      expect(result).toBeNull();
    });

    it('should return batch record when it exists', () => {
      mkdirSync(CACHE_DIR, { recursive: true });
      const record: BatchRecord = {
        batch_id: 'batch-123',
        provider: 'openai',
        created_at: '2024-01-01T00:00:00Z',
        status: 'pending',
        tasks: [],
      };
      writeFileSync(BATCH_RECORD_PATH, JSON.stringify(record));

      const result = hasPendingBatch(TEST_GAME_SLUG);

      expect(result).not.toBeNull();
      expect(result?.batch_id).toBe('batch-123');
      expect(result?.provider).toBe('openai');
    });
  });

  describe('clearBatchRecord', () => {
    it('should remove batch record file', () => {
      mkdirSync(CACHE_DIR, { recursive: true });
      writeFileSync(BATCH_RECORD_PATH, '{}');
      expect(existsSync(BATCH_RECORD_PATH)).toBe(true);

      clearBatchRecord(TEST_GAME_SLUG);

      expect(existsSync(BATCH_RECORD_PATH)).toBe(false);
    });

    it('should not throw when file does not exist', () => {
      expect(() => clearBatchRecord(TEST_GAME_SLUG)).not.toThrow();
    });
  });

  describe('createBatch', () => {
    const tasks: BatchTask[] = [
      { custom_id: 'task-1', sceneId: 'scene1', prompt: 'test prompt 1' },
      { custom_id: 'task-2', sceneId: 'scene2', prompt: 'test prompt 2' },
    ];

    it('should create OpenAI batch and save record', async () => {
      const batchId = await createBatch({
        gameSlug: TEST_GAME_SLUG,
        tasks,
        provider: 'openai',
      });

      expect(batchId).toBe('batch-openai-123');
      expect(existsSync(BATCH_RECORD_PATH)).toBe(true);

      const record = JSON.parse(readFileSync(BATCH_RECORD_PATH, 'utf-8')) as BatchRecord;
      expect(record.batch_id).toBe('batch-openai-123');
      expect(record.provider).toBe('openai');
      expect(record.tasks).toHaveLength(2);
    });

    it('should create Gemini batch and save record', async () => {
      const batchId = await createBatch({
        gameSlug: TEST_GAME_SLUG,
        tasks,
        provider: 'google',
        apiKey: 'test-api-key',
      });

      expect(batchId).toBe('batches/gemini-test-123');
      expect(existsSync(BATCH_RECORD_PATH)).toBe(true);

      const record = JSON.parse(readFileSync(BATCH_RECORD_PATH, 'utf-8')) as BatchRecord;
      expect(record.batch_id).toBe('batches/gemini-test-123');
      expect(record.provider).toBe('google');
    });

    it('should apply image style to prompts', async () => {
      await createBatch({
        gameSlug: TEST_GAME_SLUG,
        tasks,
        provider: 'openai',
        imageStyle: 'anime style',
      });

      // 验证记录已创建
      expect(existsSync(BATCH_RECORD_PATH)).toBe(true);
    });
  });

  describe('checkBatchStatus', () => {
    it('should check OpenAI batch status', async () => {
      const status = await checkBatchStatus('batch-openai-123', 'openai');

      expect(status.id).toBe('batch-openai-123');
      expect(status.status).toBe('completed');
      expect(status.progress.total).toBe(1);
      expect(status.progress.completed).toBe(1);
    });

    it('should check Gemini batch status', async () => {
      const status = await checkBatchStatus('batches/gemini-test-123', 'google', 'test-api-key');

      expect(status.id).toBe('batches/gemini-test-123');
      expect(status.status).toBe('completed');
    });
  });
});
