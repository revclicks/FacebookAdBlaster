import { pgTable, text, serial, integer, boolean, timestamp, jsonb, varchar, decimal } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const facebookAccounts = pgTable("facebook_accounts", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  facebookAccountId: text("facebook_account_id").notNull().unique(),
  name: text("name").notNull(),
  accessToken: text("access_token").notNull(),
  tokenExpiresAt: timestamp("token_expires_at"),
  permissions: jsonb("permissions").$type<string[]>().default([]),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const assetFolders = pgTable("asset_folders", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  name: text("name").notNull(),
  parentId: integer("parent_id").references(() => assetFolders.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const assets = pgTable("assets", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  folderId: integer("folder_id").references(() => assetFolders.id),
  name: text("name").notNull(),
  type: text("type").notNull(), // 'image', 'video', 'text'
  fileName: text("file_name"),
  filePath: text("file_path"),
  fileSize: integer("file_size"),
  mimeType: text("mime_type"),
  textContent: text("text_content"),
  metadata: jsonb("metadata").$type<Record<string, any>>().default({}),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const campaigns = pgTable("campaigns", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  facebookAccountId: integer("facebook_account_id").references(() => facebookAccounts.id).notNull(),
  name: text("name").notNull(),
  objective: text("objective").notNull(),
  budget: decimal("budget", { precision: 10, scale: 2 }).notNull(),
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date"),
  geography: text("geography").notNull(),
  ageRange: text("age_range").notNull(),
  gender: text("gender").notNull(),
  placements: text("placements").notNull(),
  creativeAssetId: integer("creative_asset_id").references(() => assets.id),
  status: text("status").default("draft").notNull(), // 'draft', 'validating', 'valid', 'invalid', 'submitted'
  facebookCampaignId: text("facebook_campaign_id"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const submissionJobs = pgTable("submission_jobs", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  campaignId: integer("campaign_id").references(() => campaigns.id).notNull(),
  jobId: text("job_id").notNull().unique(),
  status: text("status").notNull(), // 'pending', 'processing', 'completed', 'failed', 'cancelled'
  progress: integer("progress").default(0).notNull(),
  progressMessage: text("progress_message"),
  errorMessage: text("error_message"),
  result: jsonb("result").$type<Record<string, any>>(),
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  facebookAccounts: many(facebookAccounts),
  assetFolders: many(assetFolders),
  assets: many(assets),
  campaigns: many(campaigns),
  submissionJobs: many(submissionJobs),
}));

export const facebookAccountsRelations = relations(facebookAccounts, ({ one, many }) => ({
  user: one(users, {
    fields: [facebookAccounts.userId],
    references: [users.id],
  }),
  campaigns: many(campaigns),
}));

export const assetFoldersRelations = relations(assetFolders, ({ one, many }) => ({
  user: one(users, {
    fields: [assetFolders.userId],
    references: [users.id],
  }),
  parent: one(assetFolders, {
    fields: [assetFolders.parentId],
    references: [assetFolders.id],
  }),
  children: many(assetFolders),
  assets: many(assets),
}));

export const assetsRelations = relations(assets, ({ one, many }) => ({
  user: one(users, {
    fields: [assets.userId],
    references: [users.id],
  }),
  folder: one(assetFolders, {
    fields: [assets.folderId],
    references: [assetFolders.id],
  }),
  campaigns: many(campaigns),
}));

export const campaignsRelations = relations(campaigns, ({ one, many }) => ({
  user: one(users, {
    fields: [campaigns.userId],
    references: [users.id],
  }),
  facebookAccount: one(facebookAccounts, {
    fields: [campaigns.facebookAccountId],
    references: [facebookAccounts.id],
  }),
  creativeAsset: one(assets, {
    fields: [campaigns.creativeAssetId],
    references: [assets.id],
  }),
  submissionJobs: many(submissionJobs),
}));

export const submissionJobsRelations = relations(submissionJobs, ({ one }) => ({
  user: one(users, {
    fields: [submissionJobs.userId],
    references: [users.id],
  }),
  campaign: one(campaigns, {
    fields: [submissionJobs.campaignId],
    references: [campaigns.id],
  }),
}));

// Insert schemas
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
});

export const insertFacebookAccountSchema = createInsertSchema(facebookAccounts).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertAssetFolderSchema = createInsertSchema(assetFolders).omit({
  id: true,
  createdAt: true,
});

export const insertAssetSchema = createInsertSchema(assets).omit({
  id: true,
  createdAt: true,
});

export const insertCampaignSchema = createInsertSchema(campaigns).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertSubmissionJobSchema = createInsertSchema(submissionJobs).omit({
  id: true,
  createdAt: true,
});

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type FacebookAccount = typeof facebookAccounts.$inferSelect;
export type InsertFacebookAccount = z.infer<typeof insertFacebookAccountSchema>;

export type AssetFolder = typeof assetFolders.$inferSelect;
export type InsertAssetFolder = z.infer<typeof insertAssetFolderSchema>;

export type Asset = typeof assets.$inferSelect;
export type InsertAsset = z.infer<typeof insertAssetSchema>;

export type Campaign = typeof campaigns.$inferSelect;
export type InsertCampaign = z.infer<typeof insertCampaignSchema>;

export type SubmissionJob = typeof submissionJobs.$inferSelect;
export type InsertSubmissionJob = z.infer<typeof insertSubmissionJobSchema>;
