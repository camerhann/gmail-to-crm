/**
 * Gmail to BizDash CRM - Type Definitions
 *
 * These types define the data structures used throughout the extension
 * for email logging, customer matching, and CRM integration.
 */

// ============================================
// Gmail Types
// ============================================

/**
 * Represents an email address with optional display name
 */
export interface EmailAddress {
  email: string;
  name?: string;
}

/**
 * Email metadata captured from Gmail
 */
export interface GmailEmail {
  /** Gmail's unique message ID */
  messageId: string;
  /** Gmail's thread ID for conversation grouping */
  threadId: string;
  /** Email subject line */
  subject: string;
  /** Sender information */
  from: EmailAddress;
  /** Primary recipients */
  to: EmailAddress[];
  /** CC recipients */
  cc: EmailAddress[];
  /** BCC recipients (if available) */
  bcc: EmailAddress[];
  /** Email timestamp */
  date: Date;
  /** First ~200 characters of the email */
  snippet: string;
  /** Gmail labels applied to this email */
  labels: string[];
  /** Full body content (optional, privacy-configurable) */
  body?: string;
}

/**
 * Simplified email data for logging to CRM
 */
export interface EmailLogRequest {
  gmailMessageId: string;
  gmailThreadId: string;
  subject: string;
  fromEmail: string;
  fromName?: string;
  toEmails: string[];
  ccEmails: string[];
  emailDate: string; // ISO 8601 format
  snippet: string;
  /** Pre-matched contact ID (if user selected one) */
  contactId?: string;
}

// ============================================
// BizDash CRM Types (matching backend schema)
// ============================================

/**
 * Customer summary from BizDash CRM
 * Matches the XeroContact model structure
 */
export interface Customer {
  id: string;
  xeroContactId?: string;
  name: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  isCustomer: boolean;
  isSupplier: boolean;
  contactStatus: 'ACTIVE' | 'ARCHIVED';
}

/**
 * Email activity record stored in BizDash
 * This is the new table we'll need in the backend
 */
export interface EmailActivity {
  id: string;
  tenantId: string;
  contactId?: string;
  gmailMessageId: string;
  gmailThreadId?: string;
  subject?: string;
  fromEmail: string;
  fromName?: string;
  toEmails: string[];
  ccEmails: string[];
  emailDate: Date;
  snippet?: string;
  loggedBy: string;
  loggedAt: Date;
}

/**
 * Response when logging an email
 */
export interface EmailLogResponse {
  id: string;
  contactId?: string;
  matched: boolean;
  customer?: Customer;
}

/**
 * Response when searching for a contact by email
 */
export interface ContactSearchResponse {
  contact: Customer | null;
  suggestions?: Customer[];
}

// ============================================
// Authentication Types
// ============================================

/**
 * Google OAuth token information
 */
export interface GoogleAuthToken {
  accessToken: string;
  expiresAt: number;
  refreshToken?: string;
  scope: string;
}

/**
 * BizDash authentication state
 */
export interface BizDashAuth {
  apiUrl: string;
  tenantId: string;
  isAuthenticated: boolean;
  userEmail?: string;
}

/**
 * Combined auth state for the extension
 */
export interface AuthState {
  google: GoogleAuthToken | null;
  bizdash: BizDashAuth | null;
  isFullyAuthenticated: boolean;
}

// ============================================
// Extension State Types
// ============================================

/**
 * Settings stored in chrome.storage
 */
export interface ExtensionSettings {
  /** BizDash API endpoint */
  bizdashApiUrl: string;
  /** Whether to capture full email body */
  captureEmailBody: boolean;
  /** Auto-match emails to contacts */
  autoMatchContacts: boolean;
  /** Show notification after logging */
  showNotifications: boolean;
}

/**
 * Current state of the extension
 */
export interface ExtensionState {
  settings: ExtensionSettings;
  auth: AuthState;
  /** Currently selected email in Gmail (if any) */
  currentEmail: GmailEmail | null;
  /** Last logged email */
  lastLoggedEmail: EmailLogResponse | null;
}

// ============================================
// Message Types (for Chrome messaging)
// ============================================

/**
 * Messages sent between content script and background
 */
export type ExtensionMessage =
  | { type: 'LOG_EMAIL'; payload: EmailLogRequest }
  | { type: 'SEARCH_CONTACT'; payload: { email: string } }
  | { type: 'GET_AUTH_STATE' }
  | { type: 'AUTHENTICATE_GOOGLE' }
  | { type: 'AUTHENTICATE_BIZDASH'; payload: { apiUrl: string } }
  | { type: 'GET_SETTINGS' }
  | { type: 'UPDATE_SETTINGS'; payload: Partial<ExtensionSettings> }
  | { type: 'EMAIL_SELECTED'; payload: GmailEmail };

/**
 * Response messages from background script
 */
export type ExtensionResponse =
  | { success: true; data: unknown }
  | { success: false; error: string };

// ============================================
// Default Values
// ============================================

export const DEFAULT_SETTINGS: ExtensionSettings = {
  bizdashApiUrl: 'http://localhost:8000',
  captureEmailBody: false,
  autoMatchContacts: true,
  showNotifications: true,
};

export const DEFAULT_AUTH_STATE: AuthState = {
  google: null,
  bizdash: null,
  isFullyAuthenticated: false,
};
