import { sqliteTable, text, integer, index, uniqueIndex } from 'drizzle-orm/sqlite-core';

export const user = sqliteTable('user', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  emailVerified: integer('email_verified', { mode: 'boolean' }).notNull(),
  image: text('image'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
  // 用户 AI 权限（JSON: { providers: string[], canGenerateImage: boolean, canGenerateTts, canGenerateMusic, canGenerateVideo }），
  // null = 跟随订阅套餐的默认权限；root 用户（NEXT_PUBLIC_ROOT_USER_EMAIL）不受此字段约束
  aiPermissions: text('ai_permissions'),
  // 管理员标记（内容管理员）：可进后台查看统计、管理游戏，且不受 Token 限制；只有 root 能授予
  isAdmin: integer('is_admin', { mode: 'boolean' }).notNull().default(false),
  // 用户自选文本模型：preferred_text_provider 为 5 种文本供应商之一，preferred_text_model 为具体模型 ID；
  // 均为空 = 跟随系统默认；仅付费用户（有效订阅/管理员/root）允许设置，免费用户锁定默认
  preferredTextProvider: text('preferred_text_provider'),
  preferredTextModel: text('preferred_text_model'),
  // 图片/语音/视频自选模型（供应商 + 模型 ID，均为空 = 跟随系统默认；
  // 仅付费用户可设置，且受 ai_permissions 里对应服务位约束）
  preferredImageProvider: text('preferred_image_provider'),
  preferredImageModel: text('preferred_image_model'),
  preferredTtsProvider: text('preferred_tts_provider'),
  preferredTtsModel: text('preferred_tts_model'),
  preferredVideoProvider: text('preferred_video_provider'),
  preferredVideoModel: text('preferred_video_model'),
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

/** better-auth apiKey 插件（用户级 API Key，供 MCP / Agent 使用）。
 * 导出名必须是 `apikey`：drizzle adapter 按 model 名 `apikey` 在 schema 对象上取表。
 */
export const apikey = sqliteTable(
  'apikey',
  {
    id: text('id').primaryKey(),
    name: text('name'),
    start: text('start'),
    prefix: text('prefix'),
    key: text('key').notNull(),
    referenceId: text('reference_id').notNull(),
    configId: text('config_id').notNull().default('default'),
    refillInterval: integer('refill_interval'),
    refillAmount: integer('refill_amount'),
    lastRefillAt: integer('last_refill_at', { mode: 'timestamp' }),
    enabled: integer('enabled', { mode: 'boolean' }).default(true),
    rateLimitEnabled: integer('rate_limit_enabled', { mode: 'boolean' }).default(true),
    rateLimitTimeWindow: integer('rate_limit_time_window'),
    rateLimitMax: integer('rate_limit_max'),
    requestCount: integer('request_count'),
    lastRequest: integer('last_request', { mode: 'timestamp' }),
    expiresAt: integer('expires_at', { mode: 'timestamp' }),
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
    updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
    remaining: integer('remaining'),
    metadata: text('metadata'),
    permissions: text('permissions'),
  },
  (table) => ({
    referenceIdIdx: index('apikey_reference_id_idx').on(table.referenceId),
    keyIdx: index('apikey_key_idx').on(table.key),
  }),
);

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
    // shadowban：为真时从目录/首页/标签/sitemap 等公开入口消失，仅作者与管理员可见（预览）
    shadowBanned: integer('shadow_banned', { mode: 'boolean' }).notNull().default(false),
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
    userIdCreatedAtIdx: index('ai_usage_user_id_created_at_idx').on(table.userId, table.createdAt),
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

// ========== 订阅计费 ==========

/** 本地用户 ↔ Stripe Customer 映射 */
export const stripeCustomers = sqliteTable(
  'stripe_customers',
  {
    id: integer('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .unique()
      .references(() => user.id),
    stripeCustomerId: text('stripe_customer_id').notNull().unique(),
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
    updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
  },
  (table) => ({
    userIdIdx: index('stripe_customers_user_id_idx').on(table.userId),
  }),
);

/** 订阅记录；历史 canceled 保留，有效订阅取最新一条 */
export const subscriptions = sqliteTable(
  'subscriptions',
  {
    id: integer('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id),
    stripeSubscriptionId: text('stripe_subscription_id').notNull().unique(),
    stripeCustomerId: text('stripe_customer_id').notNull(),
    stripePriceId: text('stripe_price_id').notNull(),
    /** basic | pro */
    planCode: text('plan_code').notNull(),
    /** month | year */
    interval: text('interval').notNull(),
    status: text('status').notNull(),
    /** 下发时快照，改价不影响已购用户 */
    monthlyTokenLimit: integer('monthly_token_limit').notNull(),
    currentPeriodStart: integer('current_period_start', { mode: 'timestamp' }).notNull(),
    currentPeriodEnd: integer('current_period_end', { mode: 'timestamp' }).notNull(),
    cancelAtPeriodEnd: integer('cancel_at_period_end', { mode: 'boolean' }).notNull().default(false),
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
    updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
  },
  (table) => ({
    userIdIdx: index('subscriptions_user_id_idx').on(table.userId),
    statusIdx: index('subscriptions_status_idx').on(table.status),
    userIdStatusIdx: index('subscriptions_user_id_status_idx').on(table.userId, table.status),
  }),
);

// ========== 评分与评价 ==========

// 玩家评分表：匿名可打星（user_id 为空），登录才可留言（content 非空要求登录，由 API 层校验）。
// SQLite UNIQUE 允许多个 NULL：匿名行不受唯一约束（去重靠客户端 localStorage），
// 登录用户同一游戏只有一行（upsert 改分不重复计数）。
export const gameRatings = sqliteTable(
  'GameRatings',
  {
    id: integer('id').primaryKey(),
    gameId: integer('game_id')
      .notNull()
      .references(() => games.id, { onDelete: 'cascade' }),
    userId: text('user_id').references(() => user.id, { onDelete: 'set null' }),
    rating: integer('rating').notNull(),
    content: text('content'),
    // 创作者管理：隐藏后不计入均分、不在公开列表出现；置顶排最前
    hidden: integer('hidden', { mode: 'boolean' }).notNull().default(false),
    pinned: integer('pinned', { mode: 'boolean' }).notNull().default(false),
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
    updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
  },
  (table) => ({
    gameIdIdx: index('game_ratings_game_id_idx').on(table.gameId),
    gameIdUserIdUnique: uniqueIndex('game_ratings_game_id_user_id_unique').on(table.gameId, table.userId),
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
