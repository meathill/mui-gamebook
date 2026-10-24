import { check, foreignKey, integer, primaryKey, sqliteTable, text, uniqueIndex, index } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';
import { games } from './schema';

export const mediaAssistanceWorks = sqliteTable(
  'MediaAssistanceWorks',
  {
    gameId: integer('game_id')
      .primaryKey()
      .references(() => games.id, { onDelete: 'cascade' }),
    status: text('status').notNull().default('pending'),
    checkedRevision: integer('checked_revision').notNull().default(-1),
    updatedAt: integer('updated_at').notNull(),
  },
  (table) => [
    uniqueIndex('media_assistance_one_active').on(table.status).where(sql`${table.status} = 'active'`),
    check('media_assistance_work_status', sql`${table.status} IN ('pending','active','partial','completed')`),
  ],
);

export const mediaAssistanceGenerations = sqliteTable(
  'MediaAssistanceGenerations',
  {
    gameId: integer('game_id')
      .notNull()
      .references(() => games.id, { onDelete: 'cascade' }),
    inputHash: text('input_hash').notNull(),
    inputJson: text('input_json').notNull(),
    status: text('status').notNull().default('pending'),
    requestId: text('request_id'),
    executionToken: text('execution_token'),
    leaseUntil: integer('lease_until'),
    providerTaskId: text('provider_task_id'),
    error: text('error'),
    outputKey: text('output_key'),
    outputUrl: text('output_url'),
    fileHash: text('file_hash'),
    contentType: text('content_type'),
    updatedAt: integer('updated_at').notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.gameId, table.inputHash] }),
    check(
      'media_assistance_generation_status',
      sql`${table.status} IN ('pending','generating','uncertain','paused','ready')`,
    ),
  ],
);

export const mediaAssistanceTargets = sqliteTable(
  'MediaAssistanceTargets',
  {
    id: text('id').primaryKey(),
    gameId: integer('game_id')
      .notNull()
      .references(() => games.id, { onDelete: 'cascade' }),
    targetKey: text('target_key').notNull(),
    targetJson: text('target_json').notNull(),
    sourceHash: text('source_hash').notNull(),
    inputHash: text('input_hash').notNull(),
    status: text('status').notNull().default('pending'),
    appliedUrl: text('applied_url'),
    error: text('error'),
  },
  (table) => [
    uniqueIndex('media_assistance_target_key').on(table.gameId, table.targetKey),
    index('media_assistance_target_hash').on(table.gameId, table.inputHash),
    foreignKey({
      columns: [table.gameId, table.inputHash],
      foreignColumns: [mediaAssistanceGenerations.gameId, mediaAssistanceGenerations.inputHash],
    }),
    check(
      'media_assistance_target_status',
      sql`${table.status} IN ('pending','applied','satisfied','dismissed','paused')`,
    ),
  ],
);
