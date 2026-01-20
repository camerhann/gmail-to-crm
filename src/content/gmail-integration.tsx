/**
 * Gmail Content Script
 *
 * Injects "Log to CRM" option into Gmail's right-click context menu.
 * Extracts email data from the clicked row and sends to BizDash CRM.
 */

import type { GmailEmail, EmailAddress } from '../types';

// ============================================
// State
// ============================================

// Store the email row that was right-clicked
let clickedEmailRow: Element | null = null;

// ============================================
// Email Data Extraction
// ============================================

/**
 * Extract email data from a Gmail inbox row
 */
function extractEmailFromRow(row: Element): GmailEmail | null {
  try {
    // Get the thread/message ID from the row's links
    const threadLink = row.querySelector('a[href*="#inbox/"], a[href*="#sent/"], a[href*="#all/"], a[href*="#search/"]');
    const href = threadLink?.getAttribute('href') || '';
    const threadIdMatch = href.match(/#[^/]+\/([A-Za-z0-9_-]+)/);
    const threadId = threadIdMatch?.[1] || `row-${Date.now()}-${Math.random()}`;

    // Extract sender info - Gmail uses various selectors
    // [email] attribute contains the actual email address
    const senderEl = row.querySelector('[email]');
    const fromEmail = senderEl?.getAttribute('email') || '';
    const fromName = senderEl?.getAttribute('name') || senderEl?.textContent?.trim() || '';

    // Extract subject - look for subject span elements
    const subjectEl = row.querySelector('.bog, .bqe, [data-thread-subject], .y6 span:first-child');
    const subject = subjectEl?.textContent?.trim() || '(No Subject)';

    // Extract snippet (preview text)
    const snippetEl = row.querySelector('.y2, .Zt');
    let snippet = snippetEl?.textContent?.trim() || '';
    // Remove leading dash/dash that Gmail adds
    snippet = snippet.replace(/^\s*[-–—]\s*/, '');

    // Extract date from the date column
    const dateEl = row.querySelector('.xW span[title], .xW span, td.xW');
    const dateText = dateEl?.getAttribute('title') || dateEl?.textContent || '';
    const date = parseGmailDate(dateText);

    console.log('[Gmail CRM] Extracted email:', { threadId, subject, fromEmail, fromName });

    return {
      messageId: threadId,
      threadId,
      subject,
      from: { email: fromEmail, name: fromName || undefined },
      to: [],
      cc: [],
      bcc: [],
      date,
      snippet,
      labels: [],
    };
  } catch (error) {
    console.error('[Gmail CRM] Failed to extract email from row:', error);
    return null;
  }
}

/**
 * Parse Gmail's date formats into a Date object
 */
function parseGmailDate(dateText: string): Date {
  if (!dateText) return new Date();
  try {
    const parsed = new Date(dateText);
    if (!isNaN(parsed.getTime())) return parsed;
  } catch { /* ignore */ }
  return new Date();
}

// ============================================
// Gmail Context Menu Injection
// ============================================

const CRM_MENU_ITEM_ID = 'gmail-crm-log-item';

/**
 * Find and inject our option into Gmail's context menu
 */
function injectIntoGmailMenu(): boolean {
  // Gmail's context menu is a div with role="menu"
  // Look for visible menus that contain email actions
  const menus = document.querySelectorAll('div[role="menu"]');

  for (const menu of menus) {
    // Skip hidden menus
    const style = window.getComputedStyle(menu);
    if (style.display === 'none' || style.visibility === 'hidden') continue;

    // Skip if we already injected into THIS specific menu
    if (menu.querySelector(`#${CRM_MENU_ITEM_ID}`)) continue;

    // Check if this looks like an email context menu (has typical items)
    const menuText = menu.textContent?.toLowerCase() || '';
    const isEmailContextMenu = (menuText.includes('archive') || menuText.includes('delete')) &&
                               (menuText.includes('reply') || menuText.includes('mark as') || menuText.includes('forward'));

    if (!isEmailContextMenu) continue;

    // Found Gmail's context menu - inject our item at the end
    const menuItem = createCrmMenuItem();

    // Add a separator before our item
    const separator = document.createElement('div');
    separator.className = 'J-Kh';
    separator.style.cssText = 'border-top: 1px solid #dadce0; margin: 4px 0;';

    menu.appendChild(separator);
    menu.appendChild(menuItem);

    console.log('[Gmail CRM] Injected menu item into Gmail context menu');
    return true;
  }
  return false;
}

/**
 * Create our "Log to CRM" menu item styled like Gmail's menu items
 */
function createCrmMenuItem(): HTMLElement {
  const item = document.createElement('div');
  item.id = CRM_MENU_ITEM_ID;
  item.className = 'J-N';  // Gmail menu item class
  item.setAttribute('role', 'menuitem');
  item.setAttribute('tabindex', '-1');

  // Style to match Gmail's menu items
  item.style.cssText = `
    padding: 6px 16px;
    cursor: pointer;
    font-family: 'Google Sans', Roboto, sans-serif;
    font-size: 14px;
    color: #202124;
    display: flex;
    align-items: center;
    gap: 12px;
    user-select: none;
  `;

  // Add icon and label - using a person-add icon for CRM
  item.innerHTML = `
    <div style="width: 20px; height: 20px; display: flex; align-items: center; justify-content: center;">
      <svg style="width: 20px; height: 20px; fill: #5f6368;" viewBox="0 0 24 24">
        <path d="M15 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm-9-2V7H4v3H1v2h3v3h2v-3h3v-2H6zm9 4c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
      </svg>
    </div>
    <span>Log to CRM</span>
  `;

  // Hover effect
  item.addEventListener('mouseenter', () => {
    item.style.background = '#f1f3f4';
  });
  item.addEventListener('mouseleave', () => {
    item.style.background = 'transparent';
  });

  // Click handler - use mousedown as Gmail may intercept click
  const handleClick = (e: Event) => {
    console.log('[Gmail CRM] Menu item clicked/mousedown');
    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();
    handleLogToCrm();
    // Close the menu after a tiny delay to let our action run
    setTimeout(closeGmailMenu, 10);
  };

  item.addEventListener('click', handleClick, true);
  item.addEventListener('mousedown', handleClick, true);

  return item;
}

/**
 * Close Gmail's context menu
 */
function closeGmailMenu(): void {
  // Click elsewhere to close menu, or directly remove it
  const menus = document.querySelectorAll('div[role="menu"], .J-M');
  menus.forEach(menu => {
    (menu as HTMLElement).style.display = 'none';
  });
  // Also trigger escape to close any remaining menus
  document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
}

/**
 * Handle the "Log to CRM" action
 */
async function handleLogToCrm(): Promise<void> {
  console.log('[Gmail CRM] Log to CRM clicked, clickedEmailRow:', clickedEmailRow);

  if (!clickedEmailRow) {
    showToast('Could not identify the email. Please try again.', 'error');
    return;
  }

  // Check if the row is still in the DOM
  if (!document.body.contains(clickedEmailRow)) {
    console.error('[Gmail CRM] Email row is no longer in DOM');
    showToast('Email row changed. Please right-click again.', 'error');
    return;
  }

  const email = extractEmailFromRow(clickedEmailRow);
  console.log('[Gmail CRM] Extracted email:', email);

  if (!email) {
    showToast('Could not extract email data. Please try again.', 'error');
    return;
  }

  if (!email.from.email) {
    console.error('[Gmail CRM] No sender email found in row');
    showToast('Could not find sender email. Please try again.', 'error');
    return;
  }

  showToast('Logging to CRM...', 'info');

  try {
    // Convert to log request
    const emailRequest = {
      gmailMessageId: email.messageId,
      gmailThreadId: email.threadId,
      subject: email.subject,
      fromEmail: email.from.email,
      fromName: email.from.name,
      toEmails: email.to.map(e => e.email),
      ccEmails: email.cc.map(e => e.email),
      emailDate: email.date instanceof Date ? email.date.toISOString() : new Date(email.date).toISOString(),
      snippet: email.snippet || '',
    };

    console.log('[Gmail CRM] Sending to background:', emailRequest);

    // Send to background for logging
    const response = await chrome.runtime.sendMessage({
      type: 'LOG_EMAIL',
      payload: emailRequest
    });

    console.log('[Gmail CRM] Background response:', response);

    if (response.success) {
      showToast(`Logged "${email.subject}" to CRM!`, 'success');
    } else {
      showToast(response.error || 'Failed to log email', 'error');
    }
  } catch (error) {
    console.error('[Gmail CRM] Error logging email:', error);
    showToast('Error logging email. Is BizDash running?', 'error');
  }
}

// ============================================
// Context Menu Event Listeners
// ============================================

/**
 * Set up listeners for right-click on email rows
 */
function setupContextMenuListeners(): void {
  // Listen for right-clicks on email rows
  document.addEventListener('contextmenu', (e) => {
    const target = e.target as Element;

    // Find the email row (tr element) that was clicked
    const row = target.closest('tr');

    // Verify it's an email row (has sender info or subject)
    if (row && (row.querySelector('[email]') || row.querySelector('.bog, .bqe'))) {
      clickedEmailRow = row;
      console.log('[Gmail CRM] Right-clicked on email row');

      // Watch for Gmail's menu to appear and inject our item
      watchForGmailMenu();
    }
  }, true);
}

/**
 * Watch for Gmail's context menu to appear in the DOM
 */
function watchForGmailMenu(): void {
  // Try immediately (menu might already be there)
  if (injectIntoGmailMenu()) return;

  // Use MutationObserver to watch for menu appearance
  const observer = new MutationObserver((mutations) => {
    if (injectIntoGmailMenu()) {
      observer.disconnect();
    }
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true
  });

  // Stop watching after 500ms if menu doesn't appear
  setTimeout(() => observer.disconnect(), 500);

  // Also try a few times with delays (Gmail menu has animation)
  setTimeout(() => injectIntoGmailMenu(), 50);
  setTimeout(() => injectIntoGmailMenu(), 100);
  setTimeout(() => injectIntoGmailMenu(), 200);
}

// ============================================
// Toast Notifications
// ============================================

/**
 * Show a toast notification in Gmail
 */
function showToast(message: string, type: 'success' | 'error' | 'info' = 'success'): void {
  // Remove existing toast
  const existing = document.getElementById('gmail-crm-toast');
  if (existing) existing.remove();

  const toast = document.createElement('div');
  toast.id = 'gmail-crm-toast';

  const colors = {
    success: { bg: '#1e8e3e', icon: '✓' },
    error: { bg: '#d93025', icon: '✕' },
    info: { bg: '#1a73e8', icon: 'ℹ' }
  };

  toast.style.cssText = `
    position: fixed;
    bottom: 24px;
    left: 50%;
    transform: translateX(-50%);
    background: ${colors[type].bg};
    color: white;
    padding: 12px 24px;
    border-radius: 8px;
    font-family: 'Google Sans', Roboto, sans-serif;
    font-size: 14px;
    z-index: 99999;
    display: flex;
    align-items: center;
    gap: 8px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    animation: gmailCrmSlideUp 0.3s ease;
  `;

  toast.innerHTML = `<span style="font-weight: bold;">${colors[type].icon}</span> ${message}`;
  document.body.appendChild(toast);

  // Auto-remove after 3 seconds (shorter for better UX)
  setTimeout(() => {
    toast.style.animation = 'gmailCrmFadeOut 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

// Add CSS animations
const style = document.createElement('style');
style.textContent = `
  @keyframes gmailCrmSlideUp {
    from { transform: translateX(-50%) translateY(20px); opacity: 0; }
    to { transform: translateX(-50%) translateY(0); opacity: 1; }
  }
  @keyframes gmailCrmFadeOut {
    from { opacity: 1; }
    to { opacity: 0; }
  }
`;
document.head.appendChild(style);

// ============================================
// Message Handling (for popup/background)
// ============================================

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  console.log('[Gmail CRM] Received message:', message.type);

  switch (message.type) {
    case 'GET_SELECTED_EMAILS':
      // Return empty for now - we use right-click single email instead
      sendResponse({ success: true, data: { emails: [], count: 0 } });
      break;

    case 'GET_SELECTED_COUNT':
      sendResponse({ success: true, data: { count: 0 } });
      break;

    case 'PING':
      sendResponse({ success: true, data: { ready: true, isGmail: true } });
      break;

    default:
      sendResponse({ success: false, error: `Unknown message type: ${message.type}` });
  }

  return true;
});

// ============================================
// Initialization
// ============================================

console.log('[Gmail CRM] Content script loaded - initializing context menu injection');

// Set up listeners
setupContextMenuListeners();

// Notify background that we're ready
chrome.runtime.sendMessage({ type: 'CONTENT_SCRIPT_READY' }).catch(() => {
  // Ignore if background not ready
});
