import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertUserSchema, insertFacebookAccountSchema, insertAssetFolderSchema, insertAssetSchema, insertCampaignSchema } from "@shared/schema";
import { facebookApi } from "./facebook-api";
import { jobQueue } from "./queue";
import multer from "multer";
import path from "path";
import fs from "fs";
import { db } from "./db";
import { sql } from "drizzle-orm";

// Configure multer for file uploads
const uploadDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const upload = multer({
  dest: uploadDir,
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp|mp4|mov|avi|txt|json/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Invalid file type'));
    }
  }
});

// Mock user authentication middleware
async function authenticateUser(req: any, res: any, next: any) {
  // In a real app, this would verify JWT tokens or session cookies
  const userId = req.headers['x-user-id'] || '1';
  
  // For demo purposes, get existing user or create one
  let user = await storage.getUser(parseInt(userId));
  if (!user) {
    // Try to get user by username first
    user = await storage.getUserByUsername('demo_user');
    if (!user) {
      // Create a demo user only if it doesn't exist
      user = await storage.createUser({
        username: 'demo_user',
        password: 'demo_password',
        email: 'demo@example.com',
        name: 'Demo User'
      });
    }
  }
  
  req.user = user;
  next();
}

export async function registerRoutes(app: Express): Promise<Server> {

  // Health check
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // Direct SQL update workaround for folder renaming
  app.post('/api/sql-update', authenticateUser, async (req: any, res: any) => {
    console.log('🔧 SQL UPDATE WORKAROUND:', req.body.query);
    
    try {
      const { query } = req.body;
      
      // Basic security check - only allow UPDATE queries on asset_folders
      if (!query.toLowerCase().includes('update asset_folders') || 
          query.toLowerCase().includes('drop') || 
          query.toLowerCase().includes('delete')) {
        return res.status(400).json({ error: 'Invalid query' });
      }
      
      // Execute the query using the existing pool
      const { pool } = require('./db');
      const result = await pool.query(query);
      
      console.log('✅ SQL UPDATE SUCCESS:', result);
      res.setHeader('Content-Type', 'application/json');
      res.json({ success: true, result });
    } catch (error: any) {
      console.error('❌ SQL UPDATE ERROR:', error);
      res.setHeader('Content-Type', 'application/json');
      res.status(500).json({ error: error?.message || 'Unknown error' });
    }
  });



  // Asset folder update route
  app.patch('/api/asset-folders/:id', authenticateUser, async (req: any, res: any) => {
    console.log('📁 FOLDER UPDATE - ID:', req.params.id, 'Body:', JSON.stringify(req.body));
    
    try {
      const folderId = parseInt(req.params.id);
      const updates = req.body;
      
      // Note: User ownership will be verified by the storage layer
      
      console.log('🔄 Updating folder with storage...');
      const updatedFolder = await storage.updateAssetFolder(folderId, updates);
      
      console.log('✅ FOLDER UPDATE SUCCESS:', JSON.stringify(updatedFolder));
      res.json(updatedFolder);
    } catch (error) {
      console.error('❌ FOLDER UPDATE ERROR:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Apply authentication to all API routes
  app.use('/api', authenticateUser);

  // Facebook OAuth routes
  app.get('/api/facebook/auth-url', (req, res) => {
    const authUrl = facebookApi.getAuthUrl();
    res.json({ authUrl });
  });

  app.post('/api/facebook/exchange-token', async (req, res) => {
    try {
      const { code } = req.body;
      const tokenData = await facebookApi.exchangeCodeForToken(code);
      const userInfo = await facebookApi.getUserInfo(tokenData.access_token);
      const accountInfo = await facebookApi.getAdAccountInfo(tokenData.access_token);
      
      // Store the Facebook account
      const facebookAccount = await storage.createFacebookAccount({
        userId: req.user.id,
        facebookAccountId: accountInfo.id,
        name: accountInfo.name,
        accessToken: tokenData.access_token,
        tokenExpiresAt: tokenData.expires_at ? new Date(tokenData.expires_at * 1000) : null,
        permissions: tokenData.scope?.split(',') || [],
        isActive: true,
      });

      res.json({ account: facebookAccount });
    } catch (error) {
      console.error('Facebook token exchange error:', error);
      res.status(400).json({ error: error.message });
    }
  });

  // Facebook Accounts
  app.get('/api/facebook-accounts', async (req, res) => {
    try {
      const accounts = await storage.getFacebookAccounts(req.user.id);
      res.json(accounts);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post('/api/facebook-accounts/:id/refresh', async (req, res) => {
    try {
      const account = await storage.getFacebookAccount(parseInt(req.params.id));
      if (!account || account.userId !== req.user.id) {
        return res.status(404).json({ error: 'Account not found' });
      }

      const newTokenData = await facebookApi.refreshAccessToken(account.accessToken);
      const updatedAccount = await storage.updateFacebookAccount(account.id, {
        accessToken: newTokenData.access_token,
        tokenExpiresAt: newTokenData.expires_at ? new Date(newTokenData.expires_at * 1000) : null,
      });

      res.json(updatedAccount);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  });

  app.delete('/api/facebook-accounts/:id', async (req, res) => {
    try {
      const account = await storage.getFacebookAccount(parseInt(req.params.id));
      if (!account || account.userId !== req.user.id) {
        return res.status(404).json({ error: 'Account not found' });
      }

      await storage.deleteFacebookAccount(account.id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // Asset Folders
  app.get('/api/asset-folders', async (req, res) => {
    try {
      const parentId = req.query.parentId ? parseInt(req.query.parentId as string) : undefined;
      const userId = req.user?.id || 1; // Default to user 1 if no auth
      console.log('Fetching folders for user:', userId);
      const folders = await storage.getAssetFolders(userId, parentId);
      console.log('Found folders:', folders.length);
      res.json(folders);
    } catch (error) {
      console.error('Error fetching folders:', error);
      res.status(500).json({ error: error.message });
    }
  });

  app.post('/api/asset-folders', authenticateUser, async (req, res) => {
    try {
      const folderData = insertAssetFolderSchema.parse({
        ...req.body,
        userId: req.user.id,
      });
      const folder = await storage.createAssetFolder(folderData);
      res.json(folder);
    } catch (error) {
      console.error('Error creating folder:', error);
      res.status(400).json({ error: error instanceof Error ? error.message : 'Unknown error' });
    }
  });



  app.delete('/api/asset-folders/:id', async (req, res) => {
    try {
      await storage.deleteAssetFolder(parseInt(req.params.id));
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // Assets
  app.get('/api/assets', async (req, res) => {
    try {
      const folderId = req.query.folderId ? parseInt(req.query.folderId as string) : undefined;
      const assets = await storage.getAssets(req.user.id, folderId);
      res.json(assets);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post('/api/assets/upload', upload.single('file'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
      }

      const { folderId, name } = req.body;
      const assetType = req.file.mimetype.startsWith('image/') ? 'image' : 
                       req.file.mimetype.startsWith('video/') ? 'video' : 'text';

      const assetData = insertAssetSchema.parse({
        userId: req.user.id,
        folderId: folderId ? parseInt(folderId) : null,
        name: name || req.file.originalname,
        type: assetType,
        fileName: req.file.originalname,
        filePath: req.file.path,
        fileSize: req.file.size,
        mimeType: req.file.mimetype,
        metadata: {},
      });

      const asset = await storage.createAsset(assetData);
      res.json(asset);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  });

  app.post('/api/assets/text', async (req, res) => {
    try {
      const { name, textContent, folderId } = req.body;
      
      const assetData = insertAssetSchema.parse({
        userId: req.user.id,
        folderId: folderId ? parseInt(folderId) : null,
        name,
        type: 'text',
        textContent,
        metadata: {},
      });

      const asset = await storage.createAsset(assetData);
      res.json(asset);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  });

  app.delete('/api/assets/:id', async (req, res) => {
    try {
      const asset = await storage.getAsset(parseInt(req.params.id));
      if (asset && asset.filePath) {
        // Delete the file from disk
        try {
          fs.unlinkSync(asset.filePath);
        } catch (err) {
          console.error('Error deleting file:', err);
        }
      }
      
      await storage.deleteAsset(parseInt(req.params.id));
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  app.patch('/api/assets/:id', async (req, res) => {
    try {
      const asset = await storage.getAsset(parseInt(req.params.id));
      if (!asset || asset.userId !== req.user.id) {
        return res.status(404).json({ error: 'Asset not found' });
      }
      
      console.log('Updating asset with:', req.body);
      const updatedAsset = await storage.updateAsset(parseInt(req.params.id), req.body);
      console.log('Updated asset result:', updatedAsset);
      res.json(updatedAsset);
    } catch (error) {
      console.error('Asset update error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Serve uploaded files
  app.get('/api/assets/:id/file', async (req, res) => {
    try {
      const asset = await storage.getAsset(parseInt(req.params.id));
      if (!asset || !asset.filePath || asset.userId !== req.user.id) {
        return res.status(404).json({ error: 'Asset not found' });
      }

      if (!fs.existsSync(asset.filePath)) {
        return res.status(404).json({ error: 'File not found' });
      }

      res.setHeader('Content-Type', asset.mimeType || 'application/octet-stream');
      res.sendFile(path.resolve(asset.filePath));
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // Campaigns
  app.get('/api/campaigns', async (req, res) => {
    try {
      const campaigns = await storage.getCampaigns(req.user.id);
      res.json(campaigns);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post('/api/campaigns', async (req, res) => {
    try {
      const campaignData = insertCampaignSchema.parse({
        ...req.body,
        userId: req.user.id,
      });
      const campaign = await storage.createCampaign(campaignData);
      res.json(campaign);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  });

  app.put('/api/campaigns/:id', async (req, res) => {
    try {
      const campaign = await storage.getCampaign(parseInt(req.params.id));
      if (!campaign || campaign.userId !== req.user.id) {
        return res.status(404).json({ error: 'Campaign not found' });
      }

      const updated = await storage.updateCampaign(campaign.id, req.body);
      res.json(updated);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  });

  app.delete('/api/campaigns/:id', async (req, res) => {
    try {
      const campaign = await storage.getCampaign(parseInt(req.params.id));
      if (!campaign || campaign.userId !== req.user.id) {
        return res.status(404).json({ error: 'Campaign not found' });
      }

      await storage.deleteCampaign(campaign.id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // Campaign Submission
  app.post('/api/campaigns/bulk-submit', async (req, res) => {
    try {
      const { campaignIds } = req.body;
      
      if (!Array.isArray(campaignIds) || campaignIds.length === 0) {
        return res.status(400).json({ error: 'Campaign IDs are required' });
      }

      const submittedJobs = [];
      
      for (const campaignId of campaignIds) {
        const campaign = await storage.getCampaign(campaignId);
        if (!campaign || campaign.userId !== req.user.id) {
          continue;
        }

        // Add job to queue
        const jobId = await jobQueue.addCampaignSubmissionJob(campaign);
        
        // Create submission job record
        const submissionJob = await storage.createSubmissionJob({
          userId: req.user.id,
          campaignId: campaign.id,
          jobId,
          status: 'pending',
          progress: 0,
        });

        submittedJobs.push(submissionJob);
      }

      res.json({ jobs: submittedJobs });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // Submission Jobs
  app.get('/api/submission-jobs', async (req, res) => {
    try {
      const jobs = await storage.getSubmissionJobs(req.user.id);
      res.json(jobs);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get('/api/submission-jobs/stats', async (req, res) => {
    try {
      const stats = await storage.getJobStats(req.user.id);
      res.json(stats);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post('/api/submission-jobs/:id/cancel', async (req, res) => {
    try {
      const job = await storage.getSubmissionJob(parseInt(req.params.id));
      if (!job || job.userId !== req.user.id) {
        return res.status(404).json({ error: 'Job not found' });
      }

      await jobQueue.cancelJob(job.jobId);
      await storage.updateSubmissionJob(job.id, { status: 'cancelled' });
      
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post('/api/submission-jobs/:id/retry', async (req, res) => {
    try {
      const job = await storage.getSubmissionJob(parseInt(req.params.id));
      if (!job || job.userId !== req.user.id) {
        return res.status(404).json({ error: 'Job not found' });
      }

      const campaign = await storage.getCampaign(job.campaignId);
      if (!campaign) {
        return res.status(404).json({ error: 'Campaign not found' });
      }

      // Add new job to queue
      const newJobId = await jobQueue.addCampaignSubmissionJob(campaign);
      await storage.updateSubmissionJob(job.id, {
        jobId: newJobId,
        status: 'pending',
        progress: 0,
        errorMessage: null,
      });

      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // Analytics endpoints
  app.get("/api/analytics/overview", authenticateUser, async (req: any, res: any) => {
    try {
      const dateRange = req.query.dateRange || '7d';
      
      // Check if user has connected Facebook accounts
      const facebookAccounts = await storage.getFacebookAccounts(req.user.id);
      
      if (facebookAccounts.length === 0) {
        return res.json({
          totalSpend: 0,
          totalImpressions: 0,
          totalClicks: 0,
          totalConversions: 0,
          averageCTR: 0,
          averageCPC: 0,
          averageROAS: 0,
          activeCampaigns: 0,
          spendChange: 0,
          impressionsChange: 0,
          clicksChange: 0,
          conversionsChange: 0
        });
      }

      // Here we would fetch real data from Facebook Ads API using the connected accounts
      // For now, return zero values until Facebook API credentials are properly configured
      const overview = {
        totalSpend: 0,
        totalImpressions: 0,
        totalClicks: 0,
        totalConversions: 0,
        averageCTR: 0,
        averageCPC: 0,
        averageROAS: 0,
        activeCampaigns: 0,
        spendChange: 0,
        impressionsChange: 0,
        clicksChange: 0,
        conversionsChange: 0
      };
      
      res.json(overview);
    } catch (error) {
      console.error("Error fetching analytics overview:", error);
      res.status(500).json({ error: "Failed to fetch analytics overview" });
    }
  });

  app.get("/api/analytics/campaigns", authenticateUser, async (req: any, res: any) => {
    try {
      const dateRange = req.query.dateRange || '7d';
      
      // Check if user has connected Facebook accounts
      const facebookAccounts = await storage.getFacebookAccounts(req.user.id);
      
      if (facebookAccounts.length === 0) {
        return res.json([]);
      }

      // Here we would fetch real campaign performance data from Facebook Ads API
      // For now, return empty array until Facebook API credentials are properly configured
      const campaigns = [];
      
      res.json(campaigns);
    } catch (error) {
      console.error("Error fetching campaign analytics:", error);
      res.status(500).json({ error: "Failed to fetch campaign analytics" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
