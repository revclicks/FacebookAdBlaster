export class FacebookAPI {
  private appId: string;
  private appSecret: string;
  private redirectUri: string;

  constructor() {
    this.appId = process.env.FACEBOOK_APP_ID || process.env.FACEBOOK_APP_ID_KEY || "facebook_app_id";
    this.appSecret = process.env.FACEBOOK_APP_SECRET || process.env.FACEBOOK_APP_SECRET_KEY || "facebook_app_secret";
    this.redirectUri = process.env.FACEBOOK_REDIRECT_URI || "http://localhost:5000/auth/facebook/callback";
  }

  getAuthUrl(): string {
    const scope = 'ads_management,ads_read,business_management,pages_read_engagement';
    const params = new URLSearchParams({
      client_id: this.appId,
      redirect_uri: this.redirectUri,
      scope: scope,
      response_type: 'code',
      state: 'fb_auth_state', // In production, use a secure random state
    });

    return `https://www.facebook.com/v18.0/dialog/oauth?${params.toString()}`;
  }

  async exchangeCodeForToken(code: string): Promise<{
    access_token: string;
    expires_at?: number;
    scope?: string;
  }> {
    const params = new URLSearchParams({
      client_id: this.appId,
      client_secret: this.appSecret,
      code: code,
      redirect_uri: this.redirectUri,
    });

    const response = await fetch(`https://graph.facebook.com/v18.0/oauth/access_token?${params.toString()}`, {
      method: 'GET',
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Facebook token exchange failed: ${error}`);
    }

    const data = await response.json();
    
    if (data.error) {
      throw new Error(`Facebook API error: ${data.error.message}`);
    }

    return {
      access_token: data.access_token,
      expires_at: data.expires_in ? Date.now() / 1000 + data.expires_in : undefined,
      scope: data.scope,
    };
  }

  async refreshAccessToken(accessToken: string): Promise<{
    access_token: string;
    expires_at?: number;
  }> {
    const params = new URLSearchParams({
      grant_type: 'fb_exchange_token',
      client_id: this.appId,
      client_secret: this.appSecret,
      fb_exchange_token: accessToken,
    });

    const response = await fetch(`https://graph.facebook.com/v18.0/oauth/access_token?${params.toString()}`, {
      method: 'GET',
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Facebook token refresh failed: ${error}`);
    }

    const data = await response.json();
    
    if (data.error) {
      throw new Error(`Facebook API error: ${data.error.message}`);
    }

    return {
      access_token: data.access_token,
      expires_at: data.expires_in ? Date.now() / 1000 + data.expires_in : undefined,
    };
  }

  async getUserInfo(accessToken: string): Promise<{
    id: string;
    name: string;
    email?: string;
  }> {
    const response = await fetch(`https://graph.facebook.com/v18.0/me?fields=id,name,email&access_token=${accessToken}`);
    
    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Facebook user info failed: ${error}`);
    }

    const data = await response.json();
    
    if (data.error) {
      throw new Error(`Facebook API error: ${data.error.message}`);
    }

    return data;
  }

  async getAdAccountInfo(accessToken: string): Promise<{
    id: string;
    name: string;
    account_id: string;
  }> {
    const response = await fetch(`https://graph.facebook.com/v18.0/me/adaccounts?fields=id,name,account_id&access_token=${accessToken}`);
    
    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Facebook ad accounts failed: ${error}`);
    }

    const data = await response.json();
    
    if (data.error) {
      throw new Error(`Facebook API error: ${data.error.message}`);
    }

    // Return the first ad account for simplicity
    if (data.data && data.data.length > 0) {
      return data.data[0];
    }

    throw new Error('No ad accounts found');
  }

  async createCampaign(accessToken: string, adAccountId: string, campaignData: {
    name: string;
    objective: string;
    status: string;
    budget?: number;
    daily_budget?: number;
  }): Promise<{ id: string }> {
    const params = new URLSearchParams({
      name: campaignData.name,
      objective: campaignData.objective,
      status: campaignData.status,
      access_token: accessToken,
    });

    if (campaignData.budget) {
      params.append('lifetime_budget', (campaignData.budget * 100).toString()); // Convert to cents
    }

    if (campaignData.daily_budget) {
      params.append('daily_budget', (campaignData.daily_budget * 100).toString()); // Convert to cents
    }

    const response = await fetch(`https://graph.facebook.com/v18.0/act_${adAccountId}/campaigns`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Facebook campaign creation failed: ${error}`);
    }

    const data = await response.json();
    
    if (data.error) {
      throw new Error(`Facebook API error: ${data.error.message}`);
    }

    return { id: data.id };
  }

  async createAdSet(accessToken: string, adAccountId: string, campaignId: string, adSetData: {
    name: string;
    campaign_id: string;
    daily_budget: number;
    billing_event: string;
    optimization_goal: string;
    targeting: any;
    status: string;
  }): Promise<{ id: string }> {
    const params = new URLSearchParams({
      name: adSetData.name,
      campaign_id: campaignId,
      daily_budget: (adSetData.daily_budget * 100).toString(), // Convert to cents
      billing_event: adSetData.billing_event,
      optimization_goal: adSetData.optimization_goal,
      targeting: JSON.stringify(adSetData.targeting),
      status: adSetData.status,
      access_token: accessToken,
    });

    const response = await fetch(`https://graph.facebook.com/v18.0/act_${adAccountId}/adsets`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Facebook ad set creation failed: ${error}`);
    }

    const data = await response.json();
    
    if (data.error) {
      throw new Error(`Facebook API error: ${data.error.message}`);
    }

    return { id: data.id };
  }

  async uploadImage(accessToken: string, adAccountId: string, imagePath: string): Promise<{ hash: string }> {
    // This is a simplified version - in production, you'd handle file uploads properly
    throw new Error('Image upload not implemented in demo version');
  }

  async createAdCreative(accessToken: string, adAccountId: string, creativeData: {
    name: string;
    object_story_spec: any;
  }): Promise<{ id: string }> {
    const params = new URLSearchParams({
      name: creativeData.name,
      object_story_spec: JSON.stringify(creativeData.object_story_spec),
      access_token: accessToken,
    });

    const response = await fetch(`https://graph.facebook.com/v18.0/act_${adAccountId}/adcreatives`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Facebook ad creative creation failed: ${error}`);
    }

    const data = await response.json();
    
    if (data.error) {
      throw new Error(`Facebook API error: ${data.error.message}`);
    }

    return { id: data.id };
  }

  async createAd(accessToken: string, adAccountId: string, adData: {
    name: string;
    adset_id: string;
    creative: { creative_id: string };
    status: string;
  }): Promise<{ id: string }> {
    const params = new URLSearchParams({
      name: adData.name,
      adset_id: adData.adset_id,
      creative: JSON.stringify(adData.creative),
      status: adData.status,
      access_token: accessToken,
    });

    const response = await fetch(`https://graph.facebook.com/v18.0/act_${adAccountId}/ads`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Facebook ad creation failed: ${error}`);
    }

    const data = await response.json();
    
    if (data.error) {
      throw new Error(`Facebook API error: ${data.error.message}`);
    }

    return { id: data.id };
  }
}

export const facebookApi = new FacebookAPI();
