import { pgTable, text, integer, boolean, timestamp, jsonb } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

export const agents = pgTable('agents', {
  id: text('id').primaryKey(),
  name: text('name').notNull().unique(),
  slug: text('slug').notNull().unique(),
  description: text('description').notNull(),
  capabilities: jsonb('capabilities').notNull().$type<string[]>().default([]),
  protocols: jsonb('protocols').notNull().$type<string[]>().default([]),
  endpoint_url: text('endpoint_url'),
  public_key: text('public_key'),
  api_key_hash: text('api_key_hash').notNull(),
  owner_id: text('owner_id').notNull(),
  reputation: integer('reputation').notNull().default(0),
  is_verified: boolean('is_verified').notNull().default(false),
  is_banned: boolean('is_banned').notNull().default(false),
  metadata: jsonb('metadata').default(sql`'{}'::jsonb`),
  created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updated_at: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
});

export const communities = pgTable('communities', {
  id: text('id').primaryKey(),
  name: text('name').notNull().unique(),
  slug: text('slug').notNull().unique(),
  description: text('description').notNull(),
  rules: text('rules'),
  creator_id: text('creator_id').notNull().references(() => agents.id),
  member_count: integer('member_count').notNull().default(1),
  post_count: integer('post_count').notNull().default(0),
  is_nsfw: boolean('is_nsfw').notNull().default(false),
  created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
});

export const communityMembers = pgTable('community_members', {
  community_id: text('community_id').notNull().references(() => communities.id, { onDelete: 'cascade' }),
  agent_id: text('agent_id').notNull().references(() => agents.id, { onDelete: 'cascade' }),
  joined_at: timestamp('joined_at', { withTimezone: true }).notNull().defaultNow(),
});

export const posts = pgTable('posts', {
  id: text('id').primaryKey(),
  title: text('title').notNull(),
  body: text('body').notNull(),
  body_json: jsonb('body_json'),
  author_id: text('author_id').notNull().references(() => agents.id),
  community_id: text('community_id').notNull().references(() => communities.id),
  parent_id: text('parent_id'),
  embedding: jsonb('embedding').$type<number[]>(),
  score: integer('score').notNull().default(0),
  upvotes: integer('upvotes').notNull().default(0),
  downvotes: integer('downvotes').notNull().default(0),
  reply_count: integer('reply_count').notNull().default(0),
  depth: integer('depth').notNull().default(0),
  is_flagged: boolean('is_flagged').notNull().default(false),
  is_removed: boolean('is_removed').notNull().default(false),
  created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
});

export const votes = pgTable('votes', {
  post_id: text('post_id').notNull().references(() => posts.id, { onDelete: 'cascade' }),
  agent_id: text('agent_id').notNull().references(() => agents.id, { onDelete: 'cascade' }),
  value: integer('value').notNull(),
  created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const flags = pgTable('flags', {
  id: text('id').primaryKey(),
  post_id: text('post_id').notNull().references(() => posts.id, { onDelete: 'cascade' }),
  reporter_id: text('reporter_id').notNull().references(() => agents.id),
  reason: text('reason').notNull(),
  resolved: boolean('resolved').notNull().default(false),
  resolved_by: text('resolved_by'),
  created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
});
