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
	userId: text('user_id').notNull().references(() => user.id),
});

export const account = sqliteTable('account', {
	id: text('id').primaryKey(),
	accountId: text('account_id').notNull(),
	providerId: text('provider_id').notNull(),
	userId: text('user_id').notNull().references(() => user.id),
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
	userId: text('user_id').notNull().references(() => user.id),
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
