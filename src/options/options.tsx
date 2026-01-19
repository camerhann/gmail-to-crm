/**
 * Extension Options Page
 *
 * Allows users to configure the extension settings
 */

import React, { useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import type { ExtensionSettings } from '../types';

// ============================================
// Styles
// ============================================

const styles = {
  container: {
    background: 'white',
    borderRadius: '12px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.12)',
    overflow: 'hidden',
  },
  header: {
    padding: '24px',
    borderBottom: '1px solid #e0e0e0',
    background: 'linear-gradient(135deg, #1a73e8 0%, #34a853 100%)',
    color: 'white',
  },
  title: {
    fontSize: '24px',
    fontWeight: 600,
    marginBottom: '4px',
  },
  subtitle: {
    fontSize: '14px',
    opacity: 0.9,
  },
  section: {
    padding: '24px',
    borderBottom: '1px solid #e0e0e0',
  },
  sectionTitle: {
    fontSize: '16px',
    fontWeight: 600,
    color: '#202124',
    marginBottom: '16px',
  },
  formGroup: {
    marginBottom: '16px',
  },
  label: {
    display: 'block',
    fontSize: '14px',
    fontWeight: 500,
    color: '#202124',
    marginBottom: '8px',
  },
  input: {
    width: '100%',
    padding: '10px 12px',
    border: '1px solid #dadce0',
    borderRadius: '8px',
    fontSize: '14px',
    outline: 'none',
    transition: 'border-color 0.2s',
  },
  inputFocus: {
    borderColor: '#1a73e8',
  },
  checkbox: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '12px',
    background: '#f8f9fa',
    borderRadius: '8px',
    cursor: 'pointer',
  },
  checkboxInput: {
    width: '18px',
    height: '18px',
    cursor: 'pointer',
  },
  checkboxLabel: {
    flex: 1,
  },
  checkboxTitle: {
    fontSize: '14px',
    fontWeight: 500,
    color: '#202124',
  },
  checkboxDescription: {
    fontSize: '12px',
    color: '#5f6368',
    marginTop: '2px',
  },
  button: {
    padding: '12px 24px',
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
  successMessage: {
    padding: '12px 16px',
    background: '#e6f4ea',
    color: '#137333',
    borderRadius: '8px',
    fontSize: '14px',
    marginTop: '16px',
  },
  footer: {
    padding: '16px 24px',
    background: '#f8f9fa',
    fontSize: '12px',
    color: '#5f6368',
    textAlign: 'center' as const,
  },
};

// ============================================
// Options Component
// ============================================

function Options() {
  const [settings, setSettings] = useState<ExtensionSettings>({
    bizdashApiUrl: 'http://localhost:8000',
    captureEmailBody: false,
    autoMatchContacts: true,
    showNotifications: true,
  });
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const response = await chrome.runtime.sendMessage({ type: 'GET_SETTINGS' });
      if (response.success) {
        setSettings(response.data);
      }
    } catch (error) {
      console.error('[Options] Failed to load settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async () => {
    try {
      await chrome.runtime.sendMessage({
        type: 'UPDATE_SETTINGS',
        payload: settings,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (error) {
      console.error('[Options] Failed to save settings:', error);
    }
  };

  const handleInputChange = (key: keyof ExtensionSettings, value: string | boolean) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '48px' }}>
        Loading settings...
      </div>
    );
  }

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <div style={styles.title}>Gmail to BizDash CRM</div>
        <div style={styles.subtitle}>Extension Settings</div>
      </div>

      {/* BizDash Connection */}
      <div style={styles.section}>
        <div style={styles.sectionTitle}>BizDash Connection</div>

        <div style={styles.formGroup}>
          <label style={styles.label}>API URL</label>
          <input
            type="url"
            style={styles.input}
            value={settings.bizdashApiUrl}
            onChange={(e) => handleInputChange('bizdashApiUrl', e.target.value)}
            placeholder="https://your-bizdash-instance.com"
          />
          <div style={{ fontSize: '12px', color: '#5f6368', marginTop: '4px' }}>
            The URL of your BizDash CRM backend API
          </div>
        </div>
      </div>

      {/* Privacy & Data */}
      <div style={styles.section}>
        <div style={styles.sectionTitle}>Privacy & Data</div>

        <div style={styles.formGroup}>
          <label style={styles.checkbox}>
            <input
              type="checkbox"
              style={styles.checkboxInput}
              checked={settings.captureEmailBody}
              onChange={(e) => handleInputChange('captureEmailBody', e.target.checked)}
            />
            <div style={styles.checkboxLabel}>
              <div style={styles.checkboxTitle}>Capture full email body</div>
              <div style={styles.checkboxDescription}>
                Store the complete email content in CRM (may contain sensitive data)
              </div>
            </div>
          </label>
        </div>

        <div style={styles.formGroup}>
          <label style={styles.checkbox}>
            <input
              type="checkbox"
              style={styles.checkboxInput}
              checked={settings.autoMatchContacts}
              onChange={(e) => handleInputChange('autoMatchContacts', e.target.checked)}
            />
            <div style={styles.checkboxLabel}>
              <div style={styles.checkboxTitle}>Auto-match contacts</div>
              <div style={styles.checkboxDescription}>
                Automatically link emails to CRM contacts by email address
              </div>
            </div>
          </label>
        </div>
      </div>

      {/* Notifications */}
      <div style={styles.section}>
        <div style={styles.sectionTitle}>Notifications</div>

        <div style={styles.formGroup}>
          <label style={styles.checkbox}>
            <input
              type="checkbox"
              style={styles.checkboxInput}
              checked={settings.showNotifications}
              onChange={(e) => handleInputChange('showNotifications', e.target.checked)}
            />
            <div style={styles.checkboxLabel}>
              <div style={styles.checkboxTitle}>Show notifications</div>
              <div style={styles.checkboxDescription}>
                Display a notification when an email is logged successfully
              </div>
            </div>
          </label>
        </div>
      </div>

      {/* Save Button */}
      <div style={styles.section}>
        <button
          style={{ ...styles.button, ...styles.primaryButton }}
          onClick={saveSettings}
        >
          Save Settings
        </button>

        {saved && (
          <div style={styles.successMessage}>
            ✓ Settings saved successfully
          </div>
        )}
      </div>

      {/* Footer */}
      <div style={styles.footer}>
        Gmail to BizDash CRM v0.1.0 • For Google Workspace
      </div>
    </div>
  );
}

// ============================================
// Mount
// ============================================

const root = createRoot(document.getElementById('root')!);
root.render(<Options />);
