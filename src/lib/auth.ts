/**
 * Authentication Module
 *
 * Handles OAuth flows for both Google (Gmail access) and BizDash CRM authentication.
 * Uses Chrome Identity API for seamless Google OAuth in extensions.
 *
 * Google Workspace Considerations:
 * - OAuth consent must be approved by Workspace admin for org-wide use
 * - Extension must be configured in Google Cloud Console
 * - Scopes defined in manifest.json
 */

import type { AuthState, GoogleAuthToken, BizDashAuth } from '../types';
import { configureApi } from './api';
import { configureGmailApi } from './gmail-api';

// ============================================
// Storage Keys
// ============================================

const STORAGE_KEYS = {
  GOOGLE_TOKEN: 'gmail_to_crm_google_token',
  BIZDASH_AUTH: 'gmail_to_crm_bizdash_auth',
} as const;

// ============================================
// State Management
// ============================================

let currentAuthState: AuthState = {
  google: null,
  bizdash: null,
  isFullyAuthenticated: false,
};

/**
 * Get current authentication state
 */
export function getAuthState(): AuthState {
  return { ...currentAuthState };
}

/**
 * Update authentication state
 */
function updateAuthState(updates: Partial<AuthState>): void {
  currentAuthState = {
    ...currentAuthState,
    ...updates,
    isFullyAuthenticated:
      (updates.google ?? currentAuthState.google) !== null &&
      (updates.bizdash ?? currentAuthState.bizdash) !== null,
  };
}

// ============================================
// Google OAuth (Gmail Access)
// ============================================

/**
 * Initiate Google OAuth flow
 * Uses Chrome Identity API for seamless auth in extensions
 */
export async function authenticateGoogle(): Promise<GoogleAuthToken> {
  console.log('[Auth] Starting Google OAuth flow...');

  return new Promise((resolve, reject) => {
    // Check if running in Chrome extension context
    if (typeof chrome === 'undefined' || !chrome.identity) {
      reject(new Error('Chrome Identity API not available - must run as extension'));
      return;
    }

    chrome.identity.getAuthToken({ interactive: true }, async (token) => {
      if (chrome.runtime.lastError) {
        console.error('[Auth] Google OAuth failed:', chrome.runtime.lastError.message);
        reject(new Error(chrome.runtime.lastError.message));
        return;
      }

      if (!token) {
        reject(new Error('No token received from Google OAuth'));
        return;
      }

      const authToken: GoogleAuthToken = {
        accessToken: token,
        expiresAt: Date.now() + 3600 * 1000, // Token expires in ~1 hour
        scope: 'https://www.googleapis.com/auth/gmail.readonly https://www.googleapis.com/auth/userinfo.email',
      };

      // Configure Gmail API with token
      configureGmailApi(authToken.accessToken);

      // Store in chrome.storage
      await saveToStorage(STORAGE_KEYS.GOOGLE_TOKEN, authToken);

      updateAuthState({ google: authToken });

      console.log('[Auth] Google OAuth complete');
      resolve(authToken);
    });
  });
}

/**
 * Check if Google token is valid and not expired
 */
export function isGoogleTokenValid(): boolean {
  const token = currentAuthState.google;
  if (!token) return false;
  return token.expiresAt > Date.now();
}

/**
 * Refresh Google OAuth token
 * Uses non-interactive mode to silently refresh if possible
 */
export async function refreshGoogleToken(): Promise<GoogleAuthToken | null> {
  console.log('[Auth] Refreshing Google token...');

  if (typeof chrome === 'undefined' || !chrome.identity) {
    console.warn('[Auth] Chrome Identity API not available');
    return null;
  }

  return new Promise((resolve) => {
    // Try non-interactive first (silent refresh)
    chrome.identity.getAuthToken({ interactive: false }, async (token) => {
      if (chrome.runtime.lastError || !token) {
        console.log('[Auth] Silent refresh failed, may need re-authentication');
        resolve(null);
        return;
      }

      const refreshedToken: GoogleAuthToken = {
        accessToken: token,
        expiresAt: Date.now() + 3600 * 1000,
        scope: currentAuthState.google?.scope || '',
      };

      configureGmailApi(refreshedToken.accessToken);
      await saveToStorage(STORAGE_KEYS.GOOGLE_TOKEN, refreshedToken);
      updateAuthState({ google: refreshedToken });

      console.log('[Auth] Google token refreshed');
      resolve(refreshedToken);
    });
  });
}

/**
 * Revoke Google OAuth token
 */
export async function revokeGoogleToken(): Promise<void> {
  console.log('[Auth] Revoking Google token...');

  const token = currentAuthState.google?.accessToken;

  if (token && typeof chrome !== 'undefined' && chrome.identity) {
    // Remove the cached token from Chrome's identity cache
    await new Promise<void>((resolve) => {
      chrome.identity.removeCachedAuthToken({ token }, () => {
        resolve();
      });
    });

    // Optionally revoke on Google's servers
    try {
      await fetch(`https://accounts.google.com/o/oauth2/revoke?token=${token}`);
    } catch (error) {
      console.warn('[Auth] Failed to revoke token on Google servers:', error);
    }
  }

  await removeFromStorage(STORAGE_KEYS.GOOGLE_TOKEN);
  updateAuthState({ google: null });
  console.log('[Auth] Google token revoked');
}

// ============================================
// BizDash Authentication
// ============================================

/**
 * Authenticate with BizDash CRM
 * Verifies the BizDash server is reachable
 */
export async function authenticateBizDash(
  apiUrl: string,
  apiKey?: string
): Promise<BizDashAuth> {
  console.log('[Auth] Connecting to BizDash...', apiUrl);

  // Verify BizDash is reachable by hitting health endpoint
  try {
    const verifyResponse = await fetch(`${apiUrl}/health`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!verifyResponse.ok) {
      throw new Error(`BizDash not reachable: ${verifyResponse.status}`);
    }
  } catch (error) {
    console.error('[Auth] BizDash connection failed:', error);
    throw new Error(`Cannot connect to BizDash at ${apiUrl}. Is the server running?`);
  }

  const bizdashAuth: BizDashAuth = {
    apiUrl,
    apiKey: apiKey || undefined,
    tenantId: 'default',
    isAuthenticated: true,
    userEmail: 'connected',
  };

  // Configure API client
  configureApi(apiUrl, apiKey || '');

  // Store auth state
  await saveToStorage(STORAGE_KEYS.BIZDASH_AUTH, bizdashAuth);

  updateAuthState({ bizdash: bizdashAuth });

  console.log('[Auth] BizDash connected successfully');
  return bizdashAuth;
}

/**
 * Check if BizDash is authenticated
 */
export function isBizDashAuthenticated(): boolean {
  return currentAuthState.bizdash?.isAuthenticated ?? false;
}

/**
 * Sign out of BizDash
 */
export async function signOutBizDash(): Promise<void> {
  console.log('[Auth] Signing out of BizDash...');

  await removeFromStorage(STORAGE_KEYS.BIZDASH_AUTH);
  updateAuthState({ bizdash: null });
}

// ============================================
// Full Authentication Flow
// ============================================

/**
 * Initialize authentication state from storage
 * Call this when extension loads
 */
export async function initializeAuth(): Promise<AuthState> {
  console.log('[Auth] Initializing from storage...');

  try {
    const [googleToken, bizdashAuth] = await Promise.all([
      getFromStorage<GoogleAuthToken>(STORAGE_KEYS.GOOGLE_TOKEN),
      getFromStorage<BizDashAuth>(STORAGE_KEYS.BIZDASH_AUTH),
    ]);

    if (googleToken) {
      configureGmailApi(googleToken.accessToken);
    }

    if (bizdashAuth) {
      configureApi(bizdashAuth.apiUrl, 'stored-token');
    }

    updateAuthState({
      google: googleToken,
      bizdash: bizdashAuth,
    });

    console.log('[Auth] Initialized:', {
      google: !!googleToken,
      bizdash: !!bizdashAuth,
    });
  } catch (error) {
    console.error('[Auth] Failed to initialize:', error);
  }

  return getAuthState();
}

/**
 * Perform full authentication (both Google and BizDash)
 */
export async function authenticateFull(
  bizdashApiUrl: string
): Promise<AuthState> {
  await authenticateGoogle();
  await authenticateBizDash(bizdashApiUrl);
  return getAuthState();
}

/**
 * Sign out of everything
 */
export async function signOutAll(): Promise<void> {
  await Promise.all([revokeGoogleToken(), signOutBizDash()]);
}

// ============================================
// Chrome Storage Helpers
// ============================================

/**
 * Save data to chrome.storage.local
 */
async function saveToStorage<T>(key: string, value: T): Promise<void> {
  return new Promise((resolve, reject) => {
    if (typeof chrome !== 'undefined' && chrome.storage) {
      chrome.storage.local.set({ [key]: value }, () => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
        } else {
          resolve();
        }
      });
    } else {
      // Fallback for development outside extension context
      localStorage.setItem(key, JSON.stringify(value));
      resolve();
    }
  });
}

/**
 * Get data from chrome.storage.local
 */
async function getFromStorage<T>(key: string): Promise<T | null> {
  return new Promise((resolve, reject) => {
    if (typeof chrome !== 'undefined' && chrome.storage) {
      chrome.storage.local.get([key], (result) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
        } else {
          resolve(result[key] ?? null);
        }
      });
    } else {
      // Fallback for development
      const stored = localStorage.getItem(key);
      resolve(stored ? JSON.parse(stored) : null);
    }
  });
}

/**
 * Remove data from chrome.storage.local
 */
async function removeFromStorage(key: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (typeof chrome !== 'undefined' && chrome.storage) {
      chrome.storage.local.remove([key], () => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
        } else {
          resolve();
        }
      });
    } else {
      localStorage.removeItem(key);
      resolve();
    }
  });
}
