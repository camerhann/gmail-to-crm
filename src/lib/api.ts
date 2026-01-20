/**
 * BizDash CRM API Client
 *
 * This module handles all communication with the BizDash CRM backend API.
 * Includes contact search, email logging, and health checking.
 */

import type {
  EmailLogRequest,
  EmailLogResponse,
  ContactSearchResponse,
  EmailActivity,
  Customer,
} from '../types';

// ============================================
// Configuration
// ============================================

let apiBaseUrl = 'http://localhost:8000';
let authToken: string | null = null;

/**
 * Configure the API client
 */
export function configureApi(baseUrl: string, token?: string): void {
  apiBaseUrl = baseUrl;
  authToken = token || null;
}

/**
 * Get configured API base URL
 */
export function getApiBaseUrl(): string {
  return apiBaseUrl;
}

// ============================================
// API Helper
// ============================================

/**
 * Make an authenticated API request to BizDash
 */
async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${apiBaseUrl}${endpoint}`;

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
    ...options.headers,
  };

  console.log(`[BizDash API] ${options.method || 'GET'} ${url}`);

  const response = await fetch(url, { ...options, headers });

  if (!response.ok) {
    const errorText = await response.text().catch(() => 'Unknown error');
    console.error(`[BizDash API] Error ${response.status}: ${errorText}`);
    throw new Error(`BizDash API error ${response.status}: ${errorText}`);
  }

  return response.json();
}

// ============================================
// Customer/Contact APIs
// ============================================

/**
 * Search for a contact by email address
 * Used for matching Gmail emails to CRM contacts
 */
export async function searchContactByEmail(
  email: string
): Promise<ContactSearchResponse> {
  return apiRequest<ContactSearchResponse>(
    `/api/v1/crm/contacts/by-email?email=${encodeURIComponent(email)}`
  );
}

/**
 * Get a list of customers (for manual matching)
 */
export async function listCustomers(params?: {
  search?: string;
  page?: number;
  pageSize?: number;
}): Promise<{ customers: Customer[]; total: number }> {
  const searchParams = new URLSearchParams();
  if (params?.search) searchParams.set('search', params.search);
  if (params?.page) searchParams.set('page', String(params.page));
  if (params?.pageSize) searchParams.set('page_size', String(params.pageSize));

  return apiRequest<{ customers: Customer[]; total: number }>(
    `/api/v1/crm?${searchParams.toString()}`
  );
}

/**
 * Get customer details by ID
 */
export async function getCustomer(customerId: string): Promise<Customer> {
  return apiRequest<Customer>(`/api/v1/crm/${customerId}`);
}

// ============================================
// Email Activity APIs
// ============================================

/**
 * Log an email to the CRM
 * This creates a new email_activity record
 */
export async function logEmail(
  emailData: EmailLogRequest
): Promise<EmailLogResponse> {
  return apiRequest<EmailLogResponse>('/api/v1/crm/emails', {
    method: 'POST',
    body: JSON.stringify(emailData),
  });
}

/**
 * Get logged emails for a specific contact
 */
export async function getContactEmails(
  contactId: string
): Promise<{ emails: EmailActivity[] }> {
  return apiRequest<{ emails: EmailActivity[] }>(
    `/api/v1/crm/${contactId}/emails`
  );
}

/**
 * Check if an email has already been logged
 */
export async function isEmailLogged(gmailMessageId: string): Promise<boolean> {
  try {
    const result = await apiRequest<{ exists: boolean }>(
      `/api/v1/crm/emails/check?gmail_message_id=${encodeURIComponent(gmailMessageId)}`
    );
    return result.exists;
  } catch {
    return false;
  }
}

// ============================================
// Health Check
// ============================================

/**
 * Check if the BizDash API is reachable
 */
export async function healthCheck(): Promise<boolean> {
  try {
    const response = await fetch(`${apiBaseUrl}/health`, {
      method: 'GET',
      headers: authToken ? { Authorization: `Bearer ${authToken}` } : {},
    });
    console.log(`[BizDash API] Health check: ${response.ok ? 'OK' : 'FAILED'}`);
    return response.ok;
  } catch (error) {
    console.error('[BizDash API] Health check failed:', error);
    return false;
  }
}
