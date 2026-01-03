import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

export const user = sqliteTable('user', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  emailVerified: integer('email_verified', { mode: 'boolean' }).notNull(),
  image: text('image'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
});

export const session = sqliteTable('session', {
  id: text('id').primaryKey(),
  expiresAt: integer('expires_at', { mode: 'timestamp' }).notNull(),
  token: text('token').notNull().unique(),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  userId: text('user_id')
    .notNull()
    .references(() => user.id),
});

export const account = sqliteTable('account', {
  id: text('id').primaryKey(),
  accountId: text('account_id').notNull(),
  providerId: text('provider_id').notNull(),
  userId: text('user_id')
    .notNull()
    .references(() => user.id),
  accessToken: text('access_token'),
  refreshToken: text('refresh_token'),
  idToken: text('id_token'),
  accessTokenExpiresAt: integer('access_token_expires_at', { mode: 'timestamp' }),
  refreshTokenExpiresAt: integer('refresh_token_expires_at', { mode: 'timestamp' }),
  scope: text('scope'),
  password: text('password'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
});

export const verification = sqliteTable('verification', {
  id: text('id').primaryKey(),
  identifier: text('identifier').notNull(),
  value: text('value').notNull(),
  expiresAt: integer('expires_at', { mode: 'timestamp' }).notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }),
  updatedAt: integer('updated_at', { mode: 'timestamp' }),
});

export const games = sqliteTable('Games', {
  id: integer('id').primaryKey(),
  slug: text('slug').notNull().unique(),
  title: text('title').notNull(),
  description: text('description'),
  backgroundStory: text('background_story'),
  coverImage: text('cover_image'),
  tags: text('tags'), // JSON string
  published: integer('published', { mode: 'boolean' }).default(false),
  ownerId: text('owner_id').references(() => user.id),
  // Story Protocol IP 注册信息
  ipId: text('ip_id'), // IP Asset ID
  ipTxHash: text('ip_tx_hash'), // 注册交易哈希
  ipTokenId: text('ip_token_id'), // NFT Token ID
  ipRegisteredAt: integer('ip_registered_at', { mode: 'timestamp' }), // 注册时间
  storyPrompt: text('story_prompt'), // AI 故事导入器的故事 prompt
  createdAt: integer('created_at', { mode: 'timestamp' }),
  updatedAt: integer('updated_at', { mode: 'timestamp' }),
});

export const gameContent = sqliteTable('GameContent', {
  id: integer('id').primaryKey(),
  gameId: integer('game_id').references(() => games.id, { onDelete: 'cascade' }),
  content: text('content').notNull(),
});

// AI 用量记录表
export const aiUsage = sqliteTable('AiUsage', {
  id: integer('id').primaryKey(),
  userId: text('user_id')
    .notNull()
    .references(() => user.id),
  // 用量类型：text_generation, image_generation, audio_generation 等
  type: text('type').notNull(),
  // 使用的模型
  model: text('model').notNull(),
  // 输入 token 数
  promptTokens: integer('prompt_tokens').default(0),
  // 输出 token 数
  completionTokens: integer('completion_tokens').default(0),
  // 总 token 数
  totalTokens: integer('total_tokens').default(0),
  // 关联的游戏 ID（可选）
  gameId: integer('game_id').references(() => games.id),
  // 创建时间
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
});

// 小游戏存储表（用户级别资源，可在多个游戏/场景中复用）
export const minigames = sqliteTable('Minigames', {
  id: integer('id').primaryKey(),
  // 所有者 ID
  ownerId: text('owner_id').references(() => user.id, { onDelete: 'cascade' }),
  // 小游戏名称
  name: text('name').notNull(),
  // 小游戏描述
  description: text('description'),
  // 原始 prompt
  prompt: text('prompt').notNull(),
  // 生成的 JS 代码
  code: text('code'),
  // 涉及的变量（JSON 数组）
  variables: text('variables'),
  // 状态：pending, completed, failed
  status: text('status').default('pending'),
  // 失败时的错误信息
  errorMessage: text('error_message'),
  // 创建时间
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }),
});

// ========== 统计相关表 ==========

// 游戏统计汇总表（从 KV 同步）
export const gameAnalytics = sqliteTable('GameAnalytics', {
  id: integer('id').primaryKey(),
  gameId: integer('game_id')
    .notNull()
    .unique()
    .references(() => games.id, { onDelete: 'cascade' }),
  openCount: integer('open_count').default(0),
  completionCount: integer('completion_count').default(0),
  totalDuration: integer('total_duration').default(0),
  sessionCount: integer('session_count').default(0),
  ratingCount: integer('rating_count').default(0),
  ratingSum: integer('rating_sum').default(0),
  syncedAt: integer('synced_at', { mode: 'timestamp' }),
});

// 热门场景表
export const sceneAnalytics = sqliteTable('SceneAnalytics', {
  id: integer('id').primaryKey(),
  gameId: integer('game_id')
    .notNull()
    .references(() => games.id, { onDelete: 'cascade' }),
  sceneId: text('scene_id').notNull(),
  visitCount: integer('visit_count').default(0),
});

// 选项分布表
export const choiceAnalytics = sqliteTable('ChoiceAnalytics', {
  id: integer('id').primaryKey(),
  gameId: integer('game_id')
    .notNull()
    .references(() => games.id, { onDelete: 'cascade' }),
  sceneId: text('scene_id').notNull(),
  choiceIndex: integer('choice_index').notNull(),
  clickCount: integer('click_count').default(0),
});

// 来源统计表
export const referrerAnalytics = sqliteTable('ReferrerAnalytics', {
  id: integer('id').primaryKey(),
  gameId: integer('game_id')
    .notNull()
    .references(() => games.id, { onDelete: 'cascade' }),
  referrer: text('referrer').notNull(),
  count: integer('count').default(0),
});

// 设备统计表
export const deviceAnalytics = sqliteTable('DeviceAnalytics', {
  id: integer('id').primaryKey(),
  gameId: integer('game_id')
    .notNull()
    .references(() => games.id, { onDelete: 'cascade' }),
  deviceType: text('device_type').notNull(),
  count: integer('count').default(0),
});
