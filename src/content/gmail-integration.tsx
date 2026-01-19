/**
 * Gmail Content Script
 *
 * Injects the "Log to CRM" button into Gmail's UI and handles
 * email data extraction when the button is clicked.
 */

import { useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import type { EmailLogRequest, Customer } from '../types';
import { extractEmailFromDOM } from '../lib/gmail-api';

// ============================================
// Constants
// ============================================

const BUTTON_CONTAINER_ID = 'gmail-to-crm-button-container';
const BUTTON_CHECK_INTERVAL = 1000; // Check for Gmail UI changes every second

// Gmail selectors (may need updating as Gmail changes)
const SELECTORS = {
  // Email view toolbar (where actions like Reply, Forward are)
  toolbar: '[gh="mtb"]',
  // Alternative toolbar location
  toolbarAlt: '.ade',
  // Email header area
  emailHeader: '.ha',
  // Currently open email
  openEmail: '[data-message-id]',
  // Email subject
  subject: 'h2[data-thread-perm-id]',
};

// ============================================
// Log to CRM Button Component
// ============================================

interface LogButtonProps {
  onLog: () => void;
  isLogging: boolean;
  isLogged: boolean;
  matchedCustomer?: Customer | null;
}

function LogToCRMButton({ onLog, isLogging, isLogged, matchedCustomer }: LogButtonProps) {
  if (isLogged) {
    return (
      <div className="gmail-to-crm-button gmail-to-crm-logged">
        <span className="gmail-to-crm-icon">✓</span>
        <span>Logged to CRM</span>
        {matchedCustomer && (
          <span className="gmail-to-crm-customer">({matchedCustomer.name})</span>
        )}
      </div>
    );
  }

  return (
    <button
      className="gmail-to-crm-button"
      onClick={onLog}
      disabled={isLogging}
      title="Log this email to BizDash CRM"
    >
      {isLogging ? (
        <>
          <span className="gmail-to-crm-spinner"></span>
          <span>Logging...</span>
        </>
      ) : (
        <>
          <span className="gmail-to-crm-icon">📧</span>
          <span>Log to CRM</span>
        </>
      )}
    </button>
  );
}

// ============================================
// Main Content Script Component
// ============================================

function GmailToCRMIntegration() {
  const [isLogging, setIsLogging] = useState(false);
  const [isLogged, setIsLogged] = useState(false);
  const [matchedCustomer, setMatchedCustomer] = useState<Customer | null>(null);
  const [currentEmailId, setCurrentEmailId] = useState<string | null>(null);

  // Reset state when email changes
  useEffect(() => {
    const checkEmailChange = () => {
      const emailEl = document.querySelector(SELECTORS.openEmail);
      const emailId = emailEl?.getAttribute('data-message-id');

      if (emailId !== currentEmailId) {
        setCurrentEmailId(emailId || null);
        setIsLogged(false);
        setMatchedCustomer(null);
      }
    };

    const interval = setInterval(checkEmailChange, BUTTON_CHECK_INTERVAL);
    return () => clearInterval(interval);
  }, [currentEmailId]);

  /**
   * Extract email data and send to background script for logging
   */
  const handleLogEmail = async () => {
    setIsLogging(true);

    try {
      // Extract email data from DOM
      const email = extractEmailFromDOM();

      if (!email) {
        throw new Error('Could not extract email data. Please make sure an email is open.');
      }

      // Prepare log request
      const logRequest: EmailLogRequest = {
        gmailMessageId: email.messageId,
        gmailThreadId: email.threadId,
        subject: email.subject,
        fromEmail: email.from.email,
        fromName: email.from.name,
        toEmails: email.to.map((e) => e.email),
        ccEmails: email.cc.map((e) => e.email),
        emailDate: email.date.toISOString(),
        snippet: email.snippet,
      };

      // Send to background script
      const response = await chrome.runtime.sendMessage({
        type: 'LOG_EMAIL',
        payload: logRequest,
      });

      if (!response.success) {
        throw new Error(response.error);
      }

      // Update UI
      setIsLogged(true);
      if (response.data.customer) {
        setMatchedCustomer(response.data.customer);
      }

      // Notify background script about the selected email
      chrome.runtime.sendMessage({
        type: 'EMAIL_SELECTED',
        payload: email,
      });

      console.log('[Gmail Integration] Email logged successfully:', response.data);
    } catch (error) {
      console.error('[Gmail Integration] Failed to log email:', error);
      alert(`Failed to log email: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsLogging(false);
    }
  };

  return (
    <LogToCRMButton
      onLog={handleLogEmail}
      isLogging={isLogging}
      isLogged={isLogged}
      matchedCustomer={matchedCustomer}
    />
  );
}

// ============================================
// DOM Injection
// ============================================

let injectedRoot: ReturnType<typeof createRoot> | null = null;

/**
 * Inject the button into Gmail's toolbar
 */
function injectButton(): void {
  // Check if already injected
  if (document.getElementById(BUTTON_CONTAINER_ID)) {
    return;
  }

  // Find toolbar
  const toolbar =
    document.querySelector(SELECTORS.toolbar) ||
    document.querySelector(SELECTORS.toolbarAlt);

  if (!toolbar) {
    return; // Gmail UI not ready yet
  }

  // Create container
  const container = document.createElement('div');
  container.id = BUTTON_CONTAINER_ID;
  container.style.display = 'inline-flex';
  container.style.alignItems = 'center';
  container.style.marginLeft = '8px';

  // Insert into toolbar
  toolbar.appendChild(container);

  // Mount React component
  injectedRoot = createRoot(container);
  injectedRoot.render(<GmailToCRMIntegration />);

  console.log('[Gmail Integration] Button injected');
}

/**
 * Remove the injected button
 */
function removeButton(): void {
  const container = document.getElementById(BUTTON_CONTAINER_ID);
  if (container) {
    if (injectedRoot) {
      injectedRoot.unmount();
      injectedRoot = null;
    }
    container.remove();
  }
}

// ============================================
// Initialization
// ============================================

/**
 * Monitor Gmail for UI changes and inject button when appropriate
 */
function startMonitoring(): void {
  console.log('[Gmail Integration] Starting monitoring...');

  // Initial injection attempt
  injectButton();

  // Monitor for Gmail navigation (single-page app)
  const observer = new MutationObserver(() => {
    // Check if we're viewing an email
    const isViewingEmail = !!document.querySelector(SELECTORS.openEmail);

    if (isViewingEmail) {
      injectButton();
    } else {
      removeButton();
    }
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
  });

  // Also check periodically (backup for missed mutations)
  setInterval(() => {
    const isViewingEmail = !!document.querySelector(SELECTORS.openEmail);
    if (isViewingEmail && !document.getElementById(BUTTON_CONTAINER_ID)) {
      injectButton();
    }
  }, BUTTON_CHECK_INTERVAL);
}

// ============================================
// Message Handling
// ============================================

// Listen for messages from background script
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === 'TRIGGER_LOG_EMAIL') {
    // Find and click our log button
    const button = document.querySelector('.gmail-to-crm-button:not(.gmail-to-crm-logged)');
    if (button instanceof HTMLButtonElement) {
      button.click();
    }
    sendResponse({ success: true });
  }
  return true;
});

// ============================================
// Start
// ============================================

// Wait for DOM to be ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', startMonitoring);
} else {
  startMonitoring();
}

console.log('[Gmail Integration] Content script loaded');
