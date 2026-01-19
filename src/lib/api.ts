/**
 * BizDash CRM API Client
 *
 * PLACEHOLDER: This module provides the interface for communicating with
 * the BizDash backend. Actual API calls are mocked for initial development.
 *
 * Production TODO:
 * - Implement actual HTTP calls to BizDash API
 * - Add proper error handling and retry logic
 * - Implement authentication token refresh
 */

import type {
  Customer,
  EmailLogRequest,
  EmailLogResponse,
  ContactSearchResponse,
  EmailActivity,
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
 * Make an authenticated API request
 * PLACEHOLDER: Returns mock data for now
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

  // PLACEHOLDER: In production, make actual fetch call
  // const response = await fetch(url, { ...options, headers });
  // if (!response.ok) throw new Error(`API error: ${response.status}`);
  // return response.json();

  console.log(`[BizDash API] ${options.method || 'GET'} ${url}`, options.body);

  // Return mock data based on endpoint
  return getMockResponse<T>(endpoint, options);
}

// ============================================
// Mock Responses (PLACEHOLDER)
// ============================================

/**
 * Generate mock responses for development
 * TODO: Remove when connecting to real API
 */
function getMockResponse<T>(endpoint: string, options: RequestInit): T {
  // Mock: Search contact by email
  if (endpoint.includes('/contacts/by-email')) {
    const mockContact: Customer = {
      id: 'mock-contact-123',
      xeroContactId: 'xero-456',
      name: 'John Smith',
      firstName: 'John',
      lastName: 'Smith',
      email: 'john@example.com',
      phone: '+1234567890',
      isCustomer: true,
      isSupplier: false,
      contactStatus: 'ACTIVE',
    };

    return {
      contact: mockContact,
      suggestions: [],
    } as T;
  }

  // Mock: Log email
  if (endpoint === '/api/v1/crm/emails' && options.method === 'POST') {
    const body = JSON.parse(options.body as string) as EmailLogRequest;

    return {
      id: `email-${Date.now()}`,
      contactId: body.contactId || 'mock-contact-123',
      matched: true,
      customer: {
        id: 'mock-contact-123',
        name: 'John Smith',
        email: body.fromEmail,
        isCustomer: true,
        isSupplier: false,
        contactStatus: 'ACTIVE',
      },
    } as T;
  }

  // Mock: Get emails for contact
  if (endpoint.includes('/emails')) {
    return {
      emails: [],
    } as T;
  }

  // Default mock
  return {} as T;
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
    // PLACEHOLDER: In production, make actual health check
    // await apiRequest('/health');
    console.log('[BizDash API] Health check (mock: OK)');
    return true;
  } catch {
    return false;
  }
}
