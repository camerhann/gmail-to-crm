/**
 * Gmail API Client
 *
 * This module handles reading email data from Gmail using the Gmail API.
 * Uses Chrome extension OAuth via chrome.identity for authentication.
 *
 * Requirements:
 * - Gmail API enabled in Google Cloud Console
 * - OAuth consent screen configured
 * - Appropriate scopes in manifest.json
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
 */
async function gmailRequest<T>(endpoint: string): Promise<T> {
  if (!accessToken) {
    throw new Error('Gmail API not configured - missing access token');
  }

  const url = `${GMAIL_API_BASE}${endpoint}`;
  console.log(`[Gmail API] GET ${url}`);

  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => 'Unknown error');
    console.error(`[Gmail API] Error ${response.status}: ${errorText}`);
    throw new Error(`Gmail API error ${response.status}: ${errorText}`);
  }

  return response.json();
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
  interface GmailApiThread {
    id: string;
    messages: Array<{
      id: string;
      threadId: string;
      labelIds: string[];
      snippet: string;
      payload: {
        headers: Array<{ name: string; value: string }>;
        body?: { data?: string };
        parts?: Array<{ body?: { data?: string }; mimeType?: string }>;
      };
    }>;
  }

  const thread = await gmailRequest<GmailApiThread>(
    `/users/me/threads/${threadId}?format=full`
  );

  const messages: GmailEmail[] = thread.messages.map((msg) => {
    const headers = new Map(
      msg.payload.headers.map((h) => [h.name.toLowerCase(), h.value])
    );

    const from = parseEmailAddress(headers.get('from') || '');
    const to = parseEmailAddresses(headers.get('to') || '');
    const cc = parseEmailAddresses(headers.get('cc') || '');
    const bcc = parseEmailAddresses(headers.get('bcc') || '');

    return {
      messageId: msg.id,
      threadId: msg.threadId,
      subject: headers.get('subject') || '(No Subject)',
      from,
      to,
      cc,
      bcc,
      date: new Date(headers.get('date') || Date.now()),
      snippet: msg.snippet,
      labels: msg.labelIds || [],
    };
  });

  return { messages };
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

    // Extract sender - Gmail uses .gD class for sender with email attribute
    // Look globally first (more reliable), then fall back to container
    const fromEl = document.querySelector('.gD[email]') ||
                   emailContainer.querySelector('[email]') ||
                   emailContainer.closest('.gs')?.querySelector('[email]');
    const fromEmail = fromEl?.getAttribute('email') || '';
    const fromName = fromEl?.getAttribute('name') || fromEl?.textContent?.trim() || '';

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
