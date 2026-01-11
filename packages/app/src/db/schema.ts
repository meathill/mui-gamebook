import { sqliteTable, text, integer, index } from 'drizzle-orm/sqlite-core';

export const user = sqliteTable('user', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  emailVerified: integer('email_verified', { mode: 'boolean' }).notNull(),
  image: text('image'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
});

export const session = sqliteTable(
  'session',
  {
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
  },
  (table) => ({
    userIdIdx: index('session_user_id_idx').on(table.userId),
  }),
);

export const account = sqliteTable(
  'account',
  {
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
  },
  (table) => ({
    userIdIdx: index('account_user_id_idx').on(table.userId),
  }),
);

export const verification = sqliteTable('verification', {
  id: text('id').primaryKey(),
  identifier: text('identifier').notNull(),
  value: text('value').notNull(),
  expiresAt: integer('expires_at', { mode: 'timestamp' }).notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }),
  updatedAt: integer('updated_at', { mode: 'timestamp' }),
});

export const games = sqliteTable(
  'Games',
  {
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
  },
  (table) => ({
    ownerIdIdx: index('games_owner_id_idx').on(table.ownerId),
    slugIdx: index('games_slug_idx').on(table.slug),
  }),
);

export const gameContent = sqliteTable(
  'GameContent',
  {
    id: integer('id').primaryKey(),
    gameId: integer('game_id').references(() => games.id, { onDelete: 'cascade' }),
    content: text('content').notNull(),
  },
  (table) => ({
    gameIdIdx: index('game_content_game_id_idx').on(table.gameId),
  }),
);

// 游戏标签关联表（加速按标签搜索）
export const gameTags = sqliteTable(
  'GameTags',
  {
    id: integer('id').primaryKey(),
    gameId: integer('game_id')
      .notNull()
      .references(() => games.id, { onDelete: 'cascade' }),
    tag: text('tag').notNull(),
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  },
  (table) => ({
    tagIdx: index('idx_game_tags_tag').on(table.tag),
    gameIdIdx: index('idx_game_tags_game_id').on(table.gameId),
  }),
);


// AI 用量记录表
export const aiUsage = sqliteTable(
  'AiUsage',
  {
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
  },
  (table) => ({
    userIdIdx: index('ai_usage_user_id_idx').on(table.userId),
    gameIdIdx: index('ai_usage_game_id_idx').on(table.gameId),
  }),
);

// 小游戏存储表（用户级别资源，可在多个游戏/场景中复用）
export const minigames = sqliteTable(
  'Minigames',
  {
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
    // 来源游戏 ID
    sourceGameId: integer('source_game_id').references(() => games.id, { onDelete: 'set null' }),
    // 创建时间
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
    updatedAt: integer('updated_at', { mode: 'timestamp' }),
  },
  (table) => ({
    ownerIdIdx: index('minigames_owner_id_idx').on(table.ownerId),
    statusIdx: index('idx_minigames_status').on(table.status),
    sourceGameIdIdx: index('idx_minigames_source_game_id').on(table.sourceGameId),
  }),
);

// 异步操作表（视频生成等长时间任务）
export const pendingOperations = sqliteTable(
  'PendingOperations',
  {
    id: integer('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id),
    gameId: integer('game_id').references(() => games.id),
    // 操作类型：video_generation, audio_generation 等
    type: text('type').notNull(),
    // 状态：pending, processing, completed, failed
    status: text('status').notNull().default('pending'),
    // Google API 返回的 operation name
    operationName: text('operation_name'),
    // JSON: 原始请求参数
    inputData: text('input_data'),
    // JSON: 完成后的结果
    outputData: text('output_data'),
    // 失败时的错误信息
    errorMessage: text('error_message'),
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
    updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
    completedAt: integer('completed_at', { mode: 'timestamp' }),
  },
  (table) => ({
    userIdIdx: index('idx_pending_ops_user_id').on(table.userId),
    statusIdx: index('idx_pending_ops_status').on(table.status),
    gameIdIdx: index('idx_pending_ops_game_id').on(table.gameId),
  }),
);

// ========== 统计相关表 ==========


// 游戏统计汇总表（从 KV 同步）
export const gameAnalytics = sqliteTable(
  'GameAnalytics',
  {
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
  },
  (table) => ({
    gameIdIdx: index('game_analytics_game_id_idx').on(table.gameId),
    openCountIdx: index('game_analytics_open_count_idx').on(table.openCount), // For sorting
    ratingCountIdx: index('game_analytics_rating_count_idx').on(table.ratingCount), // Potential sorting
  }),
);

// 热门场景表
export const sceneAnalytics = sqliteTable(
  'SceneAnalytics',
  {
    id: integer('id').primaryKey(),
    gameId: integer('game_id')
      .notNull()
      .references(() => games.id, { onDelete: 'cascade' }),
    sceneId: text('scene_id').notNull(),
    visitCount: integer('visit_count').default(0),
  },
  (table) => ({
    gameIdIdx: index('scene_analytics_game_id_idx').on(table.gameId),
  }),
);

// 选项分布表
export const choiceAnalytics = sqliteTable(
  'ChoiceAnalytics',
  {
    id: integer('id').primaryKey(),
    gameId: integer('game_id')
      .notNull()
      .references(() => games.id, { onDelete: 'cascade' }),
    sceneId: text('scene_id').notNull(),
    choiceIndex: integer('choice_index').notNull(),
    clickCount: integer('click_count').default(0),
  },
  (table) => ({
    gameIdIdx: index('choice_analytics_game_id_idx').on(table.gameId),
  }),
);

// 来源统计表
export const referrerAnalytics = sqliteTable(
  'ReferrerAnalytics',
  {
    id: integer('id').primaryKey(),
    gameId: integer('game_id')
      .notNull()
      .references(() => games.id, { onDelete: 'cascade' }),
    referrer: text('referrer').notNull(),
    count: integer('count').default(0),
  },
  (table) => ({
    gameIdIdx: index('referrer_analytics_game_id_idx').on(table.gameId),
  }),
);

// 设备统计表
export const deviceAnalytics = sqliteTable(
  'DeviceAnalytics',
  {
    id: integer('id').primaryKey(),
    gameId: integer('game_id')
      .notNull()
      .references(() => games.id, { onDelete: 'cascade' }),
    deviceType: text('device_type').notNull(),
    count: integer('count').default(0),
  },
  (table) => ({
    gameIdIdx: index('device_analytics_game_id_idx').on(table.gameId),
  }),
);
