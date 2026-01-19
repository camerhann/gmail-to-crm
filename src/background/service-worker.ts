/**
 * Background Service Worker
 *
 * Handles extension lifecycle, message passing between content scripts
 * and popup, and manages authentication state.
 */

import type {
  ExtensionMessage,
  ExtensionResponse,
  ExtensionSettings,
} from '../types';
import { initializeAuth, authenticateGoogle, authenticateBizDash, getAuthState } from '../lib/auth';
import { logEmail, searchContactByEmail } from '../lib/api';

// ============================================
// Initialization
// ============================================

console.log('[Service Worker] Starting...');

// Initialize auth state when service worker starts
initializeAuth().then((state) => {
  console.log('[Service Worker] Auth initialized:', state.isFullyAuthenticated);
});

// ============================================
// Message Handling
// ============================================

chrome.runtime.onMessage.addListener(
  (
    message: ExtensionMessage,
    _sender: chrome.runtime.MessageSender,
    sendResponse: (response: ExtensionResponse) => void
  ) => {
    console.log('[Service Worker] Received message:', message.type);

    // Handle async operations
    handleMessage(message)
      .then((data) => sendResponse({ success: true, data }))
      .catch((error) =>
        sendResponse({ success: false, error: error.message || 'Unknown error' })
      );

    // Return true to indicate async response
    return true;
  }
);

/**
 * Route messages to appropriate handlers
 */
async function handleMessage(message: ExtensionMessage): Promise<unknown> {
  switch (message.type) {
    case 'LOG_EMAIL':
      return logEmail(message.payload);

    case 'SEARCH_CONTACT':
      return searchContactByEmail(message.payload.email);

    case 'GET_AUTH_STATE':
      return getAuthState();

    case 'AUTHENTICATE_GOOGLE':
      return authenticateGoogle();

    case 'AUTHENTICATE_BIZDASH':
      return authenticateBizDash(message.payload.apiUrl);

    case 'GET_SETTINGS':
      return getSettings();

    case 'UPDATE_SETTINGS':
      return updateSettings(message.payload);

    case 'EMAIL_SELECTED':
      // Store the currently selected email for the popup
      await chrome.storage.session.set({ currentEmail: message.payload });
      return { stored: true };

    default:
      throw new Error(`Unknown message type: ${(message as { type: string }).type}`);
  }
}

// ============================================
// Settings Management
// ============================================

const DEFAULT_SETTINGS_VALUE: ExtensionSettings = {
  bizdashApiUrl: 'http://localhost:8000',
  captureEmailBody: false,
  autoMatchContacts: true,
  showNotifications: true,
};

async function getSettings(): Promise<ExtensionSettings> {
  return new Promise((resolve) => {
    chrome.storage.sync.get(['settings'], (result) => {
      resolve(result.settings || DEFAULT_SETTINGS_VALUE);
    });
  });
}

async function updateSettings(
  updates: Partial<ExtensionSettings>
): Promise<ExtensionSettings> {
  const current = await getSettings();
  const updated = { ...current, ...updates };

  return new Promise((resolve) => {
    chrome.storage.sync.set({ settings: updated }, () => {
      resolve(updated);
    });
  });
}

// ============================================
// Context Menu (Right-click menu)
// ============================================

// Create context menu when extension is installed
chrome.runtime.onInstalled.addListener(() => {
  console.log('[Service Worker] Extension installed');

  // Create right-click menu item
  chrome.contextMenus.create({
    id: 'log-email-to-crm',
    title: 'Log to BizDash CRM',
    contexts: ['page'],
    documentUrlPatterns: ['https://mail.google.com/*'],
  });
});

// Handle context menu clicks
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === 'log-email-to-crm' && tab?.id) {
    // Send message to content script to log current email
    chrome.tabs.sendMessage(tab.id, { type: 'TRIGGER_LOG_EMAIL' });
  }
});

// ============================================
// Notifications
// ============================================

/**
 * Show a notification to the user
 */
export function showNotification(
  title: string,
  message: string,
  type: 'success' | 'error' = 'success'
): void {
  chrome.notifications.create({
    type: 'basic',
    iconUrl: type === 'success' ? '/public/icons/icon48.png' : '/public/icons/icon48.png',
    title,
    message,
  });
}

// ============================================
// Badge Management
// ============================================

/**
 * Update the extension badge (icon overlay)
 */
export function updateBadge(text: string, color: string): void {
  chrome.action.setBadgeText({ text });
  chrome.action.setBadgeBackgroundColor({ color });
}

// Clear badge initially
updateBadge('', '#4CAF50');

console.log('[Service Worker] Ready');
