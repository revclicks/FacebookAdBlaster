import { 
  users, facebookAccounts, assetFolders, assets, campaigns, submissionJobs,
  type User, type InsertUser,
  type FacebookAccount, type InsertFacebookAccount,
  type AssetFolder, type InsertAssetFolder,
  type Asset, type InsertAsset,
  type Campaign, type InsertCampaign,
  type SubmissionJob, type InsertSubmissionJob
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc, asc, isNull } from "drizzle-orm";

export interface IStorage {
  // Users
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Facebook Accounts
  getFacebookAccounts(userId: number): Promise<FacebookAccount[]>;
  getFacebookAccount(id: number): Promise<FacebookAccount | undefined>;
  createFacebookAccount(account: InsertFacebookAccount): Promise<FacebookAccount>;
  updateFacebookAccount(id: number, updates: Partial<FacebookAccount>): Promise<FacebookAccount>;
  deleteFacebookAccount(id: number): Promise<void>;
  
  // Asset Folders
  getAssetFolders(userId: number, parentId?: number): Promise<AssetFolder[]>;
  createAssetFolder(folder: InsertAssetFolder): Promise<AssetFolder>;
  deleteAssetFolder(id: number): Promise<void>;
  
  // Assets
  getAssets(userId: number, folderId?: number): Promise<Asset[]>;
  getAsset(id: number): Promise<Asset | undefined>;
  createAsset(asset: InsertAsset): Promise<Asset>;
  updateAsset(id: number, updates: Partial<Asset>): Promise<Asset>;
  deleteAsset(id: number): Promise<void>;
  
  // Campaigns
  getCampaigns(userId: number): Promise<Campaign[]>;
  getCampaign(id: number): Promise<Campaign | undefined>;
  createCampaign(campaign: InsertCampaign): Promise<Campaign>;
  updateCampaign(id: number, updates: Partial<Campaign>): Promise<Campaign>;
  deleteCampaign(id: number): Promise<void>;
  
  // Submission Jobs
  getSubmissionJobs(userId: number): Promise<SubmissionJob[]>;
  getSubmissionJob(id: number): Promise<SubmissionJob | undefined>;
  getSubmissionJobByJobId(jobId: string): Promise<SubmissionJob | undefined>;
  createSubmissionJob(job: InsertSubmissionJob): Promise<SubmissionJob>;
  updateSubmissionJob(id: number, updates: Partial<SubmissionJob>): Promise<SubmissionJob>;
  getJobStats(userId: number): Promise<{pending: number, processing: number, completed: number, failed: number}>;
}

export class DatabaseStorage implements IStorage {
  // Users
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(insertUser)
      .returning();
    return user;
  }

  // Facebook Accounts
  async getFacebookAccounts(userId: number): Promise<FacebookAccount[]> {
    return await db.select().from(facebookAccounts)
      .where(eq(facebookAccounts.userId, userId))
      .orderBy(desc(facebookAccounts.createdAt));
  }

  async getFacebookAccount(id: number): Promise<FacebookAccount | undefined> {
    const [account] = await db.select().from(facebookAccounts).where(eq(facebookAccounts.id, id));
    return account || undefined;
  }

  async createFacebookAccount(account: InsertFacebookAccount): Promise<FacebookAccount> {
    const [newAccount] = await db
      .insert(facebookAccounts)
      .values(account)
      .returning();
    return newAccount;
  }

  async updateFacebookAccount(id: number, updates: Partial<FacebookAccount>): Promise<FacebookAccount> {
    const [updated] = await db
      .update(facebookAccounts)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(facebookAccounts.id, id))
      .returning();
    return updated;
  }

  async deleteFacebookAccount(id: number): Promise<void> {
    await db.delete(facebookAccounts).where(eq(facebookAccounts.id, id));
  }

  // Asset Folders
  async getAssetFolders(userId: number, parentId?: number): Promise<AssetFolder[]> {
    if (parentId !== undefined) {
      return await db.select().from(assetFolders)
        .where(and(eq(assetFolders.userId, userId), eq(assetFolders.parentId, parentId)))
        .orderBy(asc(assetFolders.name));
    } else {
      return await db.select().from(assetFolders)
        .where(and(eq(assetFolders.userId, userId), isNull(assetFolders.parentId)))
        .orderBy(asc(assetFolders.name));
    }
  }

  async createAssetFolder(folder: InsertAssetFolder): Promise<AssetFolder> {
    const [newFolder] = await db
      .insert(assetFolders)
      .values(folder)
      .returning();
    return newFolder;
  }

  async deleteAssetFolder(id: number): Promise<void> {
    await db.delete(assetFolders).where(eq(assetFolders.id, id));
  }

  // Assets
  async getAssets(userId: number, folderId?: number): Promise<Asset[]> {
    return await db.select().from(assets)
      .where(and(
        eq(assets.userId, userId),
        folderId ? eq(assets.folderId, folderId) : undefined
      ))
      .orderBy(desc(assets.createdAt));
  }

  async getAsset(id: number): Promise<Asset | undefined> {
    const [asset] = await db.select().from(assets).where(eq(assets.id, id));
    return asset || undefined;
  }

  async createAsset(asset: InsertAsset): Promise<Asset> {
    const [newAsset] = await db
      .insert(assets)
      .values(asset)
      .returning();
    return newAsset;
  }

  async updateAsset(id: number, updates: Partial<Asset>): Promise<Asset> {
    const [updated] = await db
      .update(assets)
      .set(updates)
      .where(eq(assets.id, id))
      .returning();
    return updated;
  }

  async deleteAsset(id: number): Promise<void> {
    await db.delete(assets).where(eq(assets.id, id));
  }

  // Campaigns
  async getCampaigns(userId: number): Promise<Campaign[]> {
    return await db.select().from(campaigns)
      .where(eq(campaigns.userId, userId))
      .orderBy(desc(campaigns.createdAt));
  }

  async getCampaign(id: number): Promise<Campaign | undefined> {
    const [campaign] = await db.select().from(campaigns).where(eq(campaigns.id, id));
    return campaign || undefined;
  }

  async createCampaign(campaign: InsertCampaign): Promise<Campaign> {
    const [newCampaign] = await db
      .insert(campaigns)
      .values(campaign)
      .returning();
    return newCampaign;
  }

  async updateCampaign(id: number, updates: Partial<Campaign>): Promise<Campaign> {
    const [updated] = await db
      .update(campaigns)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(campaigns.id, id))
      .returning();
    return updated;
  }

  async deleteCampaign(id: number): Promise<void> {
    await db.delete(campaigns).where(eq(campaigns.id, id));
  }

  // Submission Jobs
  async getSubmissionJobs(userId: number): Promise<SubmissionJob[]> {
    return await db.select().from(submissionJobs)
      .where(eq(submissionJobs.userId, userId))
      .orderBy(desc(submissionJobs.createdAt));
  }

  async getSubmissionJob(id: number): Promise<SubmissionJob | undefined> {
    const [job] = await db.select().from(submissionJobs).where(eq(submissionJobs.id, id));
    return job || undefined;
  }

  async getSubmissionJobByJobId(jobId: string): Promise<SubmissionJob | undefined> {
    const [job] = await db.select().from(submissionJobs).where(eq(submissionJobs.jobId, jobId));
    return job || undefined;
  }

  async createSubmissionJob(job: InsertSubmissionJob): Promise<SubmissionJob> {
    const [newJob] = await db
      .insert(submissionJobs)
      .values(job)
      .returning();
    return newJob;
  }

  async updateSubmissionJob(id: number, updates: Partial<SubmissionJob>): Promise<SubmissionJob> {
    const [updated] = await db
      .update(submissionJobs)
      .set(updates)
      .where(eq(submissionJobs.id, id))
      .returning();
    return updated;
  }

  async getJobStats(userId: number): Promise<{pending: number, processing: number, completed: number, failed: number}> {
    const jobs = await this.getSubmissionJobs(userId);
    
    return {
      pending: jobs.filter(j => j.status === 'pending').length,
      processing: jobs.filter(j => j.status === 'processing').length,
      completed: jobs.filter(j => j.status === 'completed').length,
      failed: jobs.filter(j => j.status === 'failed').length,
    };
  }
}

export const storage = new DatabaseStorage();
