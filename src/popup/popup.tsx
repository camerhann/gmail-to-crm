/**
 * Extension Popup
 *
 * Shows connection status, recent logged emails, and quick actions
 */

import { useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import type { AuthState, GmailEmail } from '../types';

// ============================================
// Styles
// ============================================

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '16px',
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
    padding: '10px 16px',
    border: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'background-color 0.2s',
  },
  primaryButton: {
    background: '#1a73e8',
    color: 'white',
  },
  secondaryButton: {
    background: '#f1f3f4',
    color: '#202124',
  },
  currentEmail: {
    padding: '12px',
    background: '#f8f9fa',
    borderRadius: '8px',
    fontSize: '13px',
  },
  emailSubject: {
    fontWeight: 500,
    color: '#202124',
    marginBottom: '4px',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap' as const,
  },
  emailMeta: {
    color: '#5f6368',
    fontSize: '12px',
  },
  footer: {
    paddingTop: '12px',
    borderTop: '1px solid #e0e0e0',
    textAlign: 'center' as const,
  },
  footerLink: {
    color: '#1a73e8',
    textDecoration: 'none',
    fontSize: '12px',
  },
};

// ============================================
// Main Popup Component
// ============================================

function Popup() {
  const [authState, setAuthState] = useState<AuthState | null>(null);
  const [currentEmail, setCurrentEmail] = useState<GmailEmail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadState();
  }, []);

  const loadState = async () => {
    try {
      // Get auth state from background
      const authResponse = await chrome.runtime.sendMessage({ type: 'GET_AUTH_STATE' });
      if (authResponse.success) {
        setAuthState(authResponse.data);
      }

      // Get current email from session storage
      const { currentEmail: email } = await chrome.storage.session.get(['currentEmail']);
      if (email) {
        setCurrentEmail(email);
      }
    } catch (error) {
      console.error('[Popup] Failed to load state:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleConnectGoogle = async () => {
    setLoading(true);
    try {
      await chrome.runtime.sendMessage({ type: 'AUTHENTICATE_GOOGLE' });
      await loadState();
    } catch (error) {
      console.error('[Popup] Google auth failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleConnectBizDash = async () => {
    setLoading(true);
    try {
      // Get settings to get API URL
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
    } finally {
      setLoading(false);
    }
  };

  const openOptions = () => {
    chrome.runtime.openOptionsPage();
  };

  if (loading) {
    return (
      <div style={{ ...styles.container, alignItems: 'center', justifyContent: 'center', minHeight: '150px' }}>
        <div>Loading...</div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <div style={styles.logo}>📧</div>
        <div>
          <div style={styles.title}>Gmail to CRM</div>
          <div style={styles.subtitle}>BizDash Integration</div>
        </div>
      </div>

      {/* Connection Status */}
      <div style={styles.section}>
        <div style={styles.sectionTitle}>Connection Status</div>

        <div style={styles.statusRow}>
          <span style={styles.statusLabel}>Google Account</span>
          <span
            style={{
              ...styles.statusBadge,
              ...(authState?.google ? styles.statusConnected : styles.statusDisconnected),
            }}
          >
            {authState?.google ? 'Connected' : 'Not Connected'}
          </span>
        </div>

        <div style={styles.statusRow}>
          <span style={styles.statusLabel}>BizDash CRM</span>
          <span
            style={{
              ...styles.statusBadge,
              ...(authState?.bizdash?.isAuthenticated ? styles.statusConnected : styles.statusDisconnected),
            }}
          >
            {authState?.bizdash?.isAuthenticated ? 'Connected' : 'Not Connected'}
          </span>
        </div>
      </div>

      {/* Connect Buttons (if not fully authenticated) */}
      {!authState?.isFullyAuthenticated && (
        <div style={styles.section}>
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

      {/* Current Email */}
      {currentEmail && (
        <div style={styles.section}>
          <div style={styles.sectionTitle}>Current Email</div>
          <div style={styles.currentEmail}>
            <div style={styles.emailSubject}>{currentEmail.subject}</div>
            <div style={styles.emailMeta}>
              From: {currentEmail.from.name || currentEmail.from.email}
            </div>
          </div>
        </div>
      )}

      {/* Quick Actions */}
      {authState?.isFullyAuthenticated && (
        <div style={styles.section}>
          <button
            style={{ ...styles.button, ...styles.secondaryButton }}
            onClick={openOptions}
          >
            Settings
          </button>
        </div>
      )}

      {/* Footer */}
      <div style={styles.footer}>
        <a href="#" style={styles.footerLink} onClick={openOptions}>
          Configure Extension
        </a>
      </div>
    </div>
  );
}

// ============================================
// Mount
// ============================================

const root = createRoot(document.getElementById('root')!);
root.render(<Popup />);
