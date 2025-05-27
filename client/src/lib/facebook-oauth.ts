import { queryClient } from "./queryClient";
import { apiRequest } from "./queryClient";

export async function startFacebookOAuth(): Promise<void> {
  try {
    // Get the Facebook OAuth URL from the backend
    const response = await apiRequest("GET", "/api/facebook/auth-url");
    const { authUrl } = await response.json();
    
    // Open OAuth popup window
    const popup = window.open(
      authUrl,
      'facebook-oauth',
      'width=600,height=600,scrollbars=yes,resizable=yes'
    );
    
    if (!popup) {
      throw new Error('Popup blocked. Please allow popups for this site.');
    }
    
    // Listen for OAuth completion
    return new Promise((resolve, reject) => {
      const checkClosed = setInterval(() => {
        if (popup.closed) {
          clearInterval(checkClosed);
          reject(new Error('OAuth cancelled by user'));
        }
      }, 1000);
      
      // Listen for message from popup
      const messageListener = (event: MessageEvent) => {
        if (event.origin !== window.location.origin) {
          return;
        }
        
        if (event.data.type === 'FACEBOOK_OAUTH_SUCCESS') {
          clearInterval(checkClosed);
          window.removeEventListener('message', messageListener);
          popup.close();
          
          // Exchange code for token
          exchangeCodeForToken(event.data.code)
            .then(() => {
              // Refresh the connected accounts data
              queryClient.invalidateQueries({ queryKey: ["/api/facebook-accounts"] });
              resolve();
            })
            .catch(reject);
        } else if (event.data.type === 'FACEBOOK_OAUTH_ERROR') {
          clearInterval(checkClosed);
          window.removeEventListener('message', messageListener);
          popup.close();
          reject(new Error(event.data.error));
        }
      };
      
      window.addEventListener('message', messageListener);
    });
  } catch (error) {
    throw new Error(`Failed to start Facebook OAuth: ${error.message}`);
  }
}

async function exchangeCodeForToken(code: string): Promise<void> {
  try {
    const response = await apiRequest("POST", "/api/facebook/exchange-token", {
      code: code,
    });
    
    if (!response.ok) {
      const error = await response.text();
      throw new Error(error);
    }
    
    const data = await response.json();
    return data.account;
  } catch (error) {
    throw new Error(`Failed to exchange OAuth code: ${error.message}`);
  }
}

// OAuth callback handler - this would be used in a separate OAuth callback page
export function handleOAuthCallback(): void {
  const urlParams = new URLSearchParams(window.location.search);
  const code = urlParams.get('code');
  const error = urlParams.get('error');
  const state = urlParams.get('state');
  
  // Verify state parameter for security (in production, use a secure random state)
  if (state !== 'fb_auth_state') {
    window.parent.postMessage({
      type: 'FACEBOOK_OAUTH_ERROR',
      error: 'Invalid state parameter'
    }, window.location.origin);
    return;
  }
  
  if (error) {
    window.parent.postMessage({
      type: 'FACEBOOK_OAUTH_ERROR',
      error: error
    }, window.location.origin);
    return;
  }
  
  if (code) {
    window.parent.postMessage({
      type: 'FACEBOOK_OAUTH_SUCCESS',
      code: code
    }, window.location.origin);
  } else {
    window.parent.postMessage({
      type: 'FACEBOOK_OAUTH_ERROR',
      error: 'No authorization code received'
    }, window.location.origin);
  }
}

// Auto-run callback handler if this is the OAuth callback page
if (window.location.pathname === '/auth/facebook/callback' || window.location.search.includes('code=')) {
  handleOAuthCallback();
}
