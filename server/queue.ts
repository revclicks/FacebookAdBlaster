import { storage } from './storage';
import { facebookApi } from './facebook-api';
import type { Campaign } from '@shared/schema';

// Simple in-memory job queue for demo purposes
interface Job {
  id: string;
  data: {
    campaign: Campaign;
  };
}

class SimpleJobQueue {
  private jobs: Job[] = [];
  private processing = false;

  async add(data: any): Promise<string> {
    const jobId = Math.random().toString(36).substring(2);
    this.jobs.push({
      id: jobId,
      data,
    });
    
    // Start processing if not already running
    if (!this.processing) {
      this.processJobs();
    }
    
    return jobId;
  }

  private async processJobs() {
    this.processing = true;
    
    while (this.jobs.length > 0) {
      const job = this.jobs.shift()!;
      try {
        await this.processJob(job);
      } catch (error) {
        console.error(`Job ${job.id} failed:`, error);
      }
    }
    
    this.processing = false;
  }

  private async processJob(job: Job) {
    const campaign: Campaign = job.data.campaign;
    const jobRecord = await storage.getSubmissionJobByJobId(job.id);
    
    if (!jobRecord) {
      throw new Error('Submission job record not found');
    }

    try {
      // Update job status to processing
      await storage.updateSubmissionJob(jobRecord.id, {
        status: 'processing',
        startedAt: new Date(),
        progress: 10,
        progressMessage: 'Validating campaign data',
      });

      // Get Facebook account
      const facebookAccount = await storage.getFacebookAccount(campaign.facebookAccountId);
      if (!facebookAccount) {
        throw new Error('Facebook account not found');
      }

      // Process dynamic tokens in campaign name
      const processedName = processTokens(campaign.name, campaign);

      // Update progress
      await storage.updateSubmissionJob(jobRecord.id, {
        progress: 30,
        progressMessage: 'Creating Facebook campaign',
      });

      // Simulate Facebook campaign creation (would use real API in production)
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Update progress
      await storage.updateSubmissionJob(jobRecord.id, {
        progress: 60,
        progressMessage: 'Creating ad set',
      });

      // Simulate ad set creation
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Update progress
      await storage.updateSubmissionJob(jobRecord.id, {
        progress: 80,
        progressMessage: 'Creating ad creative',
      });

      // Simulate creative creation
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Update progress
      await storage.updateSubmissionJob(jobRecord.id, {
        progress: 90,
        progressMessage: 'Creating ad',
      });

      // Simulate ad creation
      await new Promise(resolve => setTimeout(resolve, 500));

      // Update campaign with simulated Facebook campaign ID
      await storage.updateCampaign(campaign.id, {
        facebookCampaignId: `fb_campaign_${Math.random().toString(36).substring(2)}`,
        status: 'submitted',
      });

      // Update job as completed
      await storage.updateSubmissionJob(jobRecord.id, {
        status: 'completed',
        progress: 100,
        progressMessage: 'Campaign created successfully',
        completedAt: new Date(),
        result: {
          facebookCampaignId: `fb_campaign_${Math.random().toString(36).substring(2)}`,
          facebookAdSetId: `fb_adset_${Math.random().toString(36).substring(2)}`,
          facebookCreativeId: `fb_creative_${Math.random().toString(36).substring(2)}`,
        },
      });

      return {
        success: true,
        facebookCampaignId: `fb_campaign_${Math.random().toString(36).substring(2)}`,
      };
    } catch (error: any) {
      console.error('Campaign submission failed:', error);

      // Update job as failed
      await storage.updateSubmissionJob(jobRecord.id, {
        status: 'failed',
        errorMessage: error.message,
        completedAt: new Date(),
      });

      throw error;
    }
  }
}

function processTokens(template: string, campaign: Campaign): string {
  const tokens = {
    '{date}': new Date().toISOString().split('T')[0],
    '{creative_name}': 'DefaultCreative',
    '{objective}': campaign.objective,
    '{geo}': campaign.geography,
    '{age_range}': campaign.ageRange,
  };

  let processed = template;
  Object.entries(tokens).forEach(([token, value]) => {
    processed = processed.replace(new RegExp(token, 'g'), value);
  });

  return processed;
}

const simpleQueue = new SimpleJobQueue();

export class JobQueue {
  async addCampaignSubmissionJob(campaign: Campaign): Promise<string> {
    const jobId = await simpleQueue.add({ campaign });
    return jobId;
  }

  async cancelJob(jobId: string): Promise<void> {
    // In a real implementation, this would cancel the job
    console.log(`Cancelling job ${jobId}`);
  }

  async getQueueStats(): Promise<{
    pending: number;
    processing: number;
    completed: number;
    failed: number;
  }> {
    // Return mock stats for now
    return {
      pending: 0,
      processing: 0,
      completed: 0,
      failed: 0,
    };
  }
}

export const jobQueue = new JobQueue();