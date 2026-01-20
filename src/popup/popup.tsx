/**
 * Extension Popup
 *
 * Shows selected emails from Gmail inbox and allows bulk logging to CRM
 */

import { useState, useEffect, useCallback } from 'react';
import { createRoot } from 'react-dom/client';
import type { AuthState, GmailEmail, EmailLogRequest } from '../types';

// ============================================
// Styles
// ============================================

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '12px',
    width: '320px',
    minHeight: '200px',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    paddingBottom: '12px',
    borderBottom: '1px solid #e0e0e0',
  },
  logo: {
    width: '32px',
    height: '32px',
    borderRadius: '8px',
    background: 'linear-gradient(135deg, #1a73e8 0%, #34a853 100%)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: 'white',
    fontSize: '18px',
  },
  headerText: {
    flex: 1,
  },
  title: {
    fontSize: '16px',
    fontWeight: 600,
    color: '#202124',
  },
  subtitle: {
    fontSize: '12px',
    color: '#5f6368',
  },
  section: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '8px',
  },
  sectionTitle: {
    fontSize: '12px',
    fontWeight: 600,
    color: '#5f6368',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.5px',
  },
  statusRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '8px 12px',
    background: '#f8f9fa',
    borderRadius: '8px',
  },
  statusLabel: {
    fontSize: '14px',
    color: '#202124',
  },
  statusBadge: {
    padding: '4px 8px',
    borderRadius: '12px',
    fontSize: '12px',
    fontWeight: 500,
  },
  statusConnected: {
    background: '#e6f4ea',
    color: '#137333',
  },
  statusDisconnected: {
    background: '#fce8e6',
    color: '#c5221f',
  },
  button: {
    width: '100%',
    padding: '12px 16px',
    border: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  primaryButton: {
    background: '#1a73e8',
    color: 'white',
  },
  primaryButtonDisabled: {
    background: '#c4d7f2',
    color: '#fff',
    cursor: 'not-allowed',
  },
  successButton: {
    background: '#34a853',
    color: 'white',
  },
  secondaryButton: {
    background: '#f1f3f4',
    color: '#202124',
  },
  emailList: {
    maxHeight: '200px',
    overflowY: 'auto' as const,
    border: '1px solid #e0e0e0',
    borderRadius: '8px',
  },
  emailItem: {
    padding: '10px 12px',
    borderBottom: '1px solid #f0f0f0',
    fontSize: '13px',
  },
  emailItemLast: {
    borderBottom: 'none',
  },
  emailSubject: {
    fontWeight: 500,
    color: '#202124',
    marginBottom: '2px',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap' as const,
  },
  emailMeta: {
    color: '#5f6368',
    fontSize: '11px',
    display: 'flex',
    gap: '8px',
  },
  emptyState: {
    padding: '24px 16px',
    textAlign: 'center' as const,
    color: '#5f6368',
  },
  emptyStateIcon: {
    fontSize: '32px',
    marginBottom: '8px',
  },
  emptyStateText: {
    fontSize: '14px',
    marginBottom: '4px',
  },
  emptyStateHint: {
    fontSize: '12px',
    color: '#80868b',
  },
  progressContainer: {
    padding: '16px',
    textAlign: 'center' as const,
  },
  progressText: {
    fontSize: '14px',
    color: '#202124',
    marginBottom: '8px',
  },
  progressBar: {
    height: '4px',
    background: '#e0e0e0',
    borderRadius: '2px',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    background: '#1a73e8',
    transition: 'width 0.3s',
  },
  resultsSummary: {
    padding: '12px',
    background: '#e6f4ea',
    borderRadius: '8px',
    fontSize: '14px',
    color: '#137333',
    textAlign: 'center' as const,
  },
  errorSummary: {
    padding: '12px',
    background: '#fce8e6',
    borderRadius: '8px',
    fontSize: '14px',
    color: '#c5221f',
    textAlign: 'center' as const,
  },
  notGmailMessage: {
    padding: '24px 16px',
    textAlign: 'center' as const,
    color: '#5f6368',
  },
  footer: {
    paddingTop: '8px',
    borderTop: '1px solid #e0e0e0',
    display: 'flex',
    justifyContent: 'center',
  },
  footerLink: {
    color: '#1a73e8',
    textDecoration: 'none',
    fontSize: '12px',
    cursor: 'pointer',
  },
};

// ============================================
// Types
// ============================================

type ViewState = 'loading' | 'not_gmail' | 'no_selection' | 'ready' | 'logging' | 'success' | 'error';

interface LogResult {
  total: number;
  successful: number;
  failed: number;
}

// ============================================
// Main Popup Component
// ============================================

function Popup() {
  const [authState, setAuthState] = useState<AuthState | null>(null);
  const [selectedEmails, setSelectedEmails] = useState<GmailEmail[]>([]);
  const [viewState, setViewState] = useState<ViewState>('loading');
  const [logProgress, setLogProgress] = useState(0);
  const [logResult, setLogResult] = useState<LogResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>('');

  // Load auth state and selected emails
  const loadState = useCallback(async () => {
    try {
      // Get auth state from background
      const authResponse = await chrome.runtime.sendMessage({ type: 'GET_AUTH_STATE' });
      if (authResponse.success) {
        setAuthState(authResponse.data);
      }

      // Get active tab
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

      // Check if we're on Gmail
      if (!tab?.url?.includes('mail.google.com')) {
        setViewState('not_gmail');
        return;
      }

      // Query content script for selected emails
      if (tab.id) {
        try {
          const response = await chrome.tabs.sendMessage(tab.id, { type: 'GET_SELECTED_EMAILS' });
          if (response?.success && response.data?.emails) {
            setSelectedEmails(response.data.emails);
            setViewState(response.data.emails.length > 0 ? 'ready' : 'no_selection');
          } else {
            setViewState('no_selection');
          }
        } catch (err) {
          // Content script might not be loaded yet
          console.log('[Popup] Content script not ready:', err);
          setViewState('no_selection');
        }
      }
    } catch (error) {
      console.error('[Popup] Failed to load state:', error);
      setViewState('error');
      setErrorMessage('Failed to connect to Gmail');
    }
  }, []);

  useEffect(() => {
    loadState();
  }, [loadState]);

  // Handle connect buttons
  const handleConnectGoogle = async () => {
    setViewState('loading');
    try {
      await chrome.runtime.sendMessage({ type: 'AUTHENTICATE_GOOGLE' });
      await loadState();
    } catch (error) {
      console.error('[Popup] Google auth failed:', error);
    }
  };

  const handleConnectBizDash = async () => {
    setViewState('loading');
    try {
      const settingsResponse = await chrome.runtime.sendMessage({ type: 'GET_SETTINGS' });
      const apiUrl = settingsResponse.success
        ? settingsResponse.data.bizdashApiUrl
        : 'http://localhost:8000';

      await chrome.runtime.sendMessage({
        type: 'AUTHENTICATE_BIZDASH',
        payload: { apiUrl },
      });
      await loadState();
    } catch (error) {
      console.error('[Popup] BizDash auth failed:', error);
    }
  };

  // Handle log selected emails
  const handleLogEmails = async () => {
    if (selectedEmails.length === 0) return;

    setViewState('logging');
    setLogProgress(0);

    try {
      // Convert GmailEmail to EmailLogRequest
      const emailRequests: EmailLogRequest[] = selectedEmails.map((email) => ({
        gmailMessageId: email.messageId,
        gmailThreadId: email.threadId,
        subject: email.subject,
        fromEmail: email.from.email,
        fromName: email.from.name,
        toEmails: email.to.map((e) => e.email),
        ccEmails: email.cc.map((e) => e.email),
        emailDate: email.date instanceof Date ? email.date.toISOString() : new Date(email.date).toISOString(),
        snippet: email.snippet || '',
      }));

      // Send bulk log request
      const response = await chrome.runtime.sendMessage({
        type: 'LOG_EMAILS_BULK',
        payload: { emails: emailRequests },
      });

      if (response.success) {
        setLogResult({
          total: response.data.total,
          successful: response.data.successful,
          failed: response.data.failed,
        });
        setLogProgress(100);
        setViewState('success');
      } else {
        throw new Error(response.error || 'Failed to log emails');
      }
    } catch (error) {
      console.error('[Popup] Failed to log emails:', error);
      setErrorMessage(error instanceof Error ? error.message : 'Unknown error');
      setViewState('error');
    }
  };

  const openOptions = () => {
    chrome.runtime.openOptionsPage();
  };

  const handleRefresh = () => {
    setLogResult(null);
    setErrorMessage('');
    loadState();
  };

  // Render loading state
  if (viewState === 'loading') {
    return (
      <div style={{ ...styles.container, padding: '16px' }}>
        <div style={styles.progressContainer}>
          <div style={styles.progressText}>Loading...</div>
        </div>
      </div>
    );
  }

  // Render not on Gmail
  if (viewState === 'not_gmail') {
    return (
      <div style={{ ...styles.container, padding: '16px' }}>
        <div style={styles.header}>
          <div style={styles.logo}>📧</div>
          <div style={styles.headerText}>
            <div style={styles.title}>Gmail to CRM</div>
            <div style={styles.subtitle}>BizDash Integration</div>
          </div>
        </div>
        <div style={styles.notGmailMessage}>
          <div style={styles.emptyStateIcon}>📬</div>
          <div style={styles.emptyStateText}>Open Gmail to use this extension</div>
          <div style={styles.emptyStateHint}>
            Navigate to mail.google.com and select emails to log
          </div>
        </div>
      </div>
    );
  }

  // Check authentication
  const needsAuth = !authState?.isFullyAuthenticated;

  return (
    <div style={{ ...styles.container, padding: '16px' }}>
      {/* Header */}
      <div style={styles.header}>
        <div style={styles.logo}>📧</div>
        <div style={styles.headerText}>
          <div style={styles.title}>Gmail to CRM</div>
          <div style={styles.subtitle}>BizDash Integration</div>
        </div>
      </div>

      {/* Auth required */}
      {needsAuth && (
        <div style={styles.section}>
          <div style={styles.sectionTitle}>Connection Required</div>
          {!authState?.google && (
            <button
              style={{ ...styles.button, ...styles.primaryButton }}
              onClick={handleConnectGoogle}
            >
              Connect Google Account
            </button>
          )}
          {authState?.google && !authState?.bizdash?.isAuthenticated && (
            <button
              style={{ ...styles.button, ...styles.primaryButton }}
              onClick={handleConnectBizDash}
            >
              Connect BizDash CRM
            </button>
          )}
        </div>
      )}

      {/* Main content when authenticated */}
      {!needsAuth && (
        <>
          {/* No selection */}
          {viewState === 'no_selection' && (
            <div style={styles.emptyState}>
              <div style={styles.emptyStateIcon}>☑️</div>
              <div style={styles.emptyStateText}>No emails selected</div>
              <div style={styles.emptyStateHint}>
                Select emails in Gmail using the checkboxes, then click here to log them
              </div>
              <button
                style={{ ...styles.button, ...styles.secondaryButton, marginTop: '12px', width: 'auto', padding: '8px 16px' }}
                onClick={handleRefresh}
              >
                Refresh
              </button>
            </div>
          )}

          {/* Ready to log */}
          {viewState === 'ready' && (
            <>
              <div style={styles.section}>
                <div style={styles.sectionTitle}>
                  {selectedEmails.length} Email{selectedEmails.length !== 1 ? 's' : ''} Selected
                </div>
                <div style={styles.emailList}>
                  {selectedEmails.map((email, index) => (
                    <div
                      key={email.messageId}
                      style={{
                        ...styles.emailItem,
                        ...(index === selectedEmails.length - 1 ? styles.emailItemLast : {}),
                      }}
                    >
                      <div style={styles.emailSubject}>{email.subject}</div>
                      <div style={styles.emailMeta}>
                        <span>{email.from.name || email.from.email}</span>
                        <span>•</span>
                        <span>
                          {email.date instanceof Date
                            ? email.date.toLocaleDateString()
                            : new Date(email.date).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <button
                style={{ ...styles.button, ...styles.primaryButton }}
                onClick={handleLogEmails}
              >
                Log {selectedEmails.length} Email{selectedEmails.length !== 1 ? 's' : ''} to CRM
              </button>
            </>
          )}

          {/* Logging in progress */}
          {viewState === 'logging' && (
            <div style={styles.progressContainer}>
              <div style={styles.progressText}>
                Logging {selectedEmails.length} email{selectedEmails.length !== 1 ? 's' : ''}...
              </div>
              <div style={styles.progressBar}>
                <div style={{ ...styles.progressFill, width: `${logProgress}%` }} />
              </div>
            </div>
          )}

          {/* Success */}
          {viewState === 'success' && logResult && (
            <div style={styles.section}>
              <div style={styles.resultsSummary}>
                ✓ Logged {logResult.successful} of {logResult.total} emails to CRM
                {logResult.failed > 0 && ` (${logResult.failed} failed)`}
              </div>
              <button
                style={{ ...styles.button, ...styles.secondaryButton }}
                onClick={handleRefresh}
              >
                Log More Emails
              </button>
            </div>
          )}

          {/* Error */}
          {viewState === 'error' && (
            <div style={styles.section}>
              <div style={styles.errorSummary}>
                ✕ {errorMessage || 'An error occurred'}
              </div>
              <button
                style={{ ...styles.button, ...styles.secondaryButton }}
                onClick={handleRefresh}
              >
                Try Again
              </button>
            </div>
          )}
        </>
      )}

      {/* Footer */}
      <div style={styles.footer}>
        <span style={styles.footerLink} onClick={openOptions}>
          Settings
        </span>
      </div>
    </div>
  );
}

// ============================================
// Mount
// ============================================

const root = createRoot(document.getElementById('root')!);
root.render(<Popup />);
