/**
 * Authentication Module
 *
 * PLACEHOLDER: Handles OAuth flows for both Google (Gmail access) and
 * BizDash CRM authentication.
 *
 * Production TODO:
 * - Implement actual OAuth flows
 * - Handle token refresh
 * - Secure token storage
 * - Handle Workspace admin consent
 *
 * Google Workspace Considerations:
 * - OAuth consent must be approved by Workspace admin for org-wide use
 * - Consider domain-wide delegation for admin features
 * - Handle multiple Google accounts gracefully
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
 *
 * PLACEHOLDER: Returns mock token for development
 */
export async function authenticateGoogle(): Promise<GoogleAuthToken> {
  console.log('[Auth] Starting Google OAuth flow...');

  // PLACEHOLDER: In production, use chrome.identity.getAuthToken
  // return new Promise((resolve, reject) => {
  //   chrome.identity.getAuthToken({ interactive: true }, (token) => {
  //     if (chrome.runtime.lastError) {
  //       reject(new Error(chrome.runtime.lastError.message));
  //       return;
  //     }
  //     // Store and return token...
  //   });
  // });

  // Mock token for development
  const mockToken: GoogleAuthToken = {
    accessToken: 'mock-google-access-token',
    expiresAt: Date.now() + 3600 * 1000, // 1 hour
    scope:
      'https://www.googleapis.com/auth/gmail.readonly https://www.googleapis.com/auth/userinfo.email',
  };

  // Configure Gmail API with token
  configureGmailApi(mockToken.accessToken);

  // Store in chrome.storage
  await saveToStorage(STORAGE_KEYS.GOOGLE_TOKEN, mockToken);

  updateAuthState({ google: mockToken });

  console.log('[Auth] Google OAuth complete (mock)');
  return mockToken;
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
 */
export async function refreshGoogleToken(): Promise<GoogleAuthToken | null> {
  console.log('[Auth] Refreshing Google token...');

  // PLACEHOLDER: In production, use chrome.identity.getAuthToken with interactive: false
  // or implement refresh token flow

  if (!currentAuthState.google) {
    return null;
  }

  // Mock refresh - just extend expiry
  const refreshedToken: GoogleAuthToken = {
    ...currentAuthState.google,
    expiresAt: Date.now() + 3600 * 1000,
  };

  await saveToStorage(STORAGE_KEYS.GOOGLE_TOKEN, refreshedToken);
  updateAuthState({ google: refreshedToken });

  return refreshedToken;
}

/**
 * Revoke Google OAuth token
 */
export async function revokeGoogleToken(): Promise<void> {
  console.log('[Auth] Revoking Google token...');

  // PLACEHOLDER: In production, use chrome.identity.removeCachedAuthToken
  // and optionally revoke on Google's servers

  await removeFromStorage(STORAGE_KEYS.GOOGLE_TOKEN);
  updateAuthState({ google: null });
}

// ============================================
// BizDash Authentication
// ============================================

/**
 * Authenticate with BizDash CRM
 *
 * PLACEHOLDER: In production, this would handle:
 * - Redirect to BizDash login if needed
 * - Exchange auth code for tokens
 * - Store tenant information
 */
export async function authenticateBizDash(
  apiUrl: string
): Promise<BizDashAuth> {
  console.log('[Auth] Authenticating with BizDash...', apiUrl);

  // PLACEHOLDER: In production, implement actual auth flow
  // This might involve:
  // - Opening BizDash login in a new tab
  // - Receiving callback with auth token
  // - Verifying token with BizDash API

  // Mock auth for development
  const mockAuth: BizDashAuth = {
    apiUrl,
    tenantId: 'mock-tenant-123',
    isAuthenticated: true,
    userEmail: 'user@company.com',
  };

  // Configure API client
  configureApi(apiUrl, 'mock-bizdash-token');

  // Store auth state
  await saveToStorage(STORAGE_KEYS.BIZDASH_AUTH, mockAuth);

  updateAuthState({ bizdash: mockAuth });

  console.log('[Auth] BizDash auth complete (mock)');
  return mockAuth;
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
