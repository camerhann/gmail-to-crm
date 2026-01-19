/**
 * Gmail API Client
 *
 * PLACEHOLDER: This module provides the interface for reading email data
 * from Gmail using the Gmail API. Actual API calls are mocked for initial
 * development.
 *
 * Production TODO:
 * - Implement actual Gmail API calls
 * - Handle OAuth token refresh
 * - Add pagination for large mailboxes
 * - Implement proper error handling
 *
 * Google Workspace Considerations:
 * - Requires Gmail API enabled in Google Cloud Console
 * - OAuth consent screen must be configured for Workspace
 * - May need Workspace admin approval for org-wide deployment
 */

import type { GmailEmail, EmailAddress } from '../types';

// ============================================
// Configuration
// ============================================

let accessToken: string | null = null;

/**
 * Configure the Gmail API client with an OAuth access token
 */
export function configureGmailApi(token: string): void {
  accessToken = token;
}

/**
 * Check if Gmail API is configured
 */
export function isGmailConfigured(): boolean {
  return accessToken !== null;
}

// ============================================
// API Helper
// ============================================

const GMAIL_API_BASE = 'https://gmail.googleapis.com/gmail/v1';

/**
 * Make an authenticated Gmail API request
 * PLACEHOLDER: Returns mock data for now
 */
async function gmailRequest<T>(endpoint: string): Promise<T> {
  if (!accessToken) {
    throw new Error('Gmail API not configured - missing access token');
  }

  const url = `${GMAIL_API_BASE}${endpoint}`;

  // PLACEHOLDER: In production, make actual fetch call
  // const response = await fetch(url, {
  //   headers: { Authorization: `Bearer ${accessToken}` },
  // });
  // if (!response.ok) throw new Error(`Gmail API error: ${response.status}`);
  // return response.json();

  console.log(`[Gmail API] GET ${url}`);

  // Return mock data
  return getMockGmailResponse<T>(endpoint);
}

// ============================================
// Mock Responses (PLACEHOLDER)
// ============================================

/**
 * Generate mock Gmail API responses
 * TODO: Remove when connecting to real API
 */
function getMockGmailResponse<T>(endpoint: string): T {
  // Mock: Get message
  if (endpoint.includes('/messages/')) {
    const mockMessage = {
      id: 'mock-message-123',
      threadId: 'mock-thread-456',
      labelIds: ['INBOX', 'IMPORTANT'],
      snippet: 'This is a preview of the email content...',
      payload: {
        headers: [
          { name: 'From', value: 'John Smith <john@example.com>' },
          { name: 'To', value: 'me@company.com' },
          { name: 'Subject', value: 'Re: Project Update' },
          { name: 'Date', value: new Date().toISOString() },
        ],
      },
    };
    return mockMessage as T;
  }

  // Mock: Get user profile
  if (endpoint.includes('/profile')) {
    return {
      emailAddress: 'me@company.com',
      messagesTotal: 1000,
      threadsTotal: 500,
    } as T;
  }

  return {} as T;
}

// ============================================
// Email Parsing Utilities
// ============================================

/**
 * Parse an email address string into EmailAddress object
 * Handles formats like: "John Smith <john@example.com>" or "john@example.com"
 */
export function parseEmailAddress(raw: string): EmailAddress {
  const match = raw.match(/^(?:"?([^"]*)"?\s)?<?([^>]+@[^>]+)>?$/);

  if (match) {
    return {
      name: match[1]?.trim() || undefined,
      email: match[2].trim().toLowerCase(),
    };
  }

  return { email: raw.trim().toLowerCase() };
}

/**
 * Parse multiple email addresses from a header value
 */
export function parseEmailAddresses(raw: string): EmailAddress[] {
  if (!raw) return [];

  // Split on commas, handling quoted names
  const addresses: string[] = [];
  let current = '';
  let inQuotes = false;

  for (const char of raw) {
    if (char === '"') inQuotes = !inQuotes;
    if (char === ',' && !inQuotes) {
      if (current.trim()) addresses.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  if (current.trim()) addresses.push(current.trim());

  return addresses.map(parseEmailAddress);
}

// ============================================
// Gmail API Functions
// ============================================

/**
 * Get the current user's email address
 */
export async function getCurrentUserEmail(): Promise<string> {
  const profile = await gmailRequest<{ emailAddress: string }>(
    '/users/me/profile'
  );
  return profile.emailAddress;
}

/**
 * Get a specific email message by ID
 */
export async function getMessage(messageId: string): Promise<GmailEmail> {
  interface GmailApiMessage {
    id: string;
    threadId: string;
    labelIds: string[];
    snippet: string;
    payload: {
      headers: Array<{ name: string; value: string }>;
      body?: { data?: string };
      parts?: Array<{ body?: { data?: string }; mimeType?: string }>;
    };
  }

  const message = await gmailRequest<GmailApiMessage>(
    `/users/me/messages/${messageId}?format=full`
  );

  // Extract headers
  const headers = new Map(
    message.payload.headers.map((h) => [h.name.toLowerCase(), h.value])
  );

  // Parse email data
  const from = parseEmailAddress(headers.get('from') || '');
  const to = parseEmailAddresses(headers.get('to') || '');
  const cc = parseEmailAddresses(headers.get('cc') || '');
  const bcc = parseEmailAddresses(headers.get('bcc') || '');

  return {
    messageId: message.id,
    threadId: message.threadId,
    subject: headers.get('subject') || '(No Subject)',
    from,
    to,
    cc,
    bcc,
    date: new Date(headers.get('date') || Date.now()),
    snippet: message.snippet,
    labels: message.labelIds || [],
  };
}

/**
 * Get the thread containing a message
 */
export async function getThread(
  threadId: string
): Promise<{ messages: GmailEmail[] }> {
  // PLACEHOLDER: Would fetch all messages in thread
  console.log(`[Gmail API] Getting thread: ${threadId}`);

  return {
    messages: [],
  };
}

// ============================================
// DOM-based Email Extraction (Fallback)
// ============================================

/**
 * Extract email data from Gmail's DOM
 * Used when we can't use the API (e.g., permissions not granted)
 *
 * This is a fallback method that scrapes visible email data from the page.
 * Less reliable than API but works without special permissions.
 */
export function extractEmailFromDOM(): GmailEmail | null {
  try {
    // Gmail uses data attributes and specific class patterns
    // These selectors may need updating as Gmail changes

    // Try to find the currently open email
    const emailContainer = document.querySelector('[data-message-id]');
    if (!emailContainer) {
      console.log('[Gmail DOM] No open email found');
      return null;
    }

    const messageId =
      emailContainer.getAttribute('data-message-id') || `dom-${Date.now()}`;

    // Extract subject from page title or header
    const subjectEl =
      document.querySelector('h2[data-thread-perm-id]') ||
      document.querySelector('[data-legacy-thread-id]');
    const subject = subjectEl?.textContent || document.title.split(' - ')[0];

    // Extract sender (look for email hover cards or from field)
    const fromEl = emailContainer.querySelector('[email]');
    const fromEmail = fromEl?.getAttribute('email') || '';
    const fromName = fromEl?.getAttribute('name') || fromEl?.textContent || '';

    // Extract snippet from visible content
    const bodyEl = emailContainer.querySelector('[data-message-id] > div');
    const snippet = bodyEl?.textContent?.substring(0, 200) || '';

    console.log('[Gmail DOM] Extracted email:', { messageId, subject });

    return {
      messageId,
      threadId: messageId, // Use message ID as thread ID for DOM extraction
      subject,
      from: { email: fromEmail, name: fromName },
      to: [], // Hard to extract reliably from DOM
      cc: [],
      bcc: [],
      date: new Date(),
      snippet,
      labels: [],
    };
  } catch (error) {
    console.error('[Gmail DOM] Failed to extract email:', error);
    return null;
  }
}
