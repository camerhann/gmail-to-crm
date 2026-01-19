# Gmail to BizDash CRM - Development Guide

This guide walks you through setting up the development environment, configuring Google Cloud OAuth, connecting to BizDash, and deploying the Chrome extension.

---

## Table of Contents

1. [Prerequisites](#1-prerequisites)
2. [Local Development Setup](#2-local-development-setup)
3. [Google Cloud Console Setup](#3-google-cloud-console-setup)
4. [BizDash Backend Configuration](#4-bizdash-backend-configuration)
5. [Loading the Extension in Chrome](#5-loading-the-extension-in-chrome)
6. [Testing the Extension](#6-testing-the-extension)
7. [Connecting to Real APIs](#7-connecting-to-real-apis)
8. [Deployment & Packaging](#8-deployment--packaging)
9. [Troubleshooting](#9-troubleshooting)

---

## 1. Prerequisites

### Required Software

| Tool | Version | Purpose |
|------|---------|---------|
| Node.js | 18+ | JavaScript runtime |
| npm | 9+ | Package manager |
| Chrome | Latest | Extension testing |
| Git | 2.x | Version control |

### Required Accounts

- **Google Workspace account** - For Gmail API access (NOT personal Gmail)
- **Google Cloud Console access** - For OAuth credentials
- **BizDash CRM instance** - Your CRM backend

### Verify Installation

```bash
# Check Node.js
node --version  # Should be v18+

# Check npm
npm --version   # Should be v9+

# Check Git
git --version
```

---

## 2. Local Development Setup

### Step 2.1: Clone the Repository

```bash
git clone https://github.com/camerhann/gmail-to-crm.git
cd gmail-to-crm
```

### Step 2.2: Install Dependencies

```bash
npm install
```

This installs:
- React 18 - UI framework
- Vite - Build tool
- @crxjs/vite-plugin - Chrome extension bundler
- TypeScript - Type safety

### Step 2.3: Understand Project Structure

```
gmail-to-crm/
├── src/
│   ├── background/
│   │   └── service-worker.ts    # Extension background script
│   ├── content/
│   │   ├── gmail-integration.tsx # Gmail UI injection (the "Log to CRM" button)
│   │   └── styles.css           # Styles for injected UI
│   ├── lib/
│   │   ├── api.ts               # BizDash API client (PLACEHOLDER - needs real implementation)
│   │   ├── gmail-api.ts         # Gmail API client (PLACEHOLDER - needs real implementation)
│   │   └── auth.ts              # OAuth authentication
│   ├── options/
│   │   ├── options.html         # Settings page
│   │   └── options.tsx          # Settings React component
│   ├── popup/
│   │   ├── popup.html           # Popup page
│   │   └── popup.tsx            # Popup React component
│   └── types/
│       └── index.ts             # TypeScript interfaces
├── public/
│   └── icons/                   # Extension icons (16, 32, 48, 128px)
├── manifest.json                # Chrome Extension manifest v3
├── vite.config.ts               # Vite build config
├── tsconfig.json                # TypeScript config
└── package.json                 # Project dependencies
```

### Step 2.4: Build the Extension

```bash
# Development build (with hot reload)
npm run dev

# Production build
npm run build
```

The built extension will be in the `dist/` folder.

---

## 3. Google Cloud Console Setup

This is the most important step - you need OAuth credentials for the extension to access Gmail.

### Step 3.1: Create a Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Click the project dropdown at the top
3. Click "NEW PROJECT"
4. Enter project details:
   - **Project name**: `Gmail to CRM`
   - **Organization**: Select your Google Workspace organization
   - **Location**: Your organization folder
5. Click "CREATE"
6. Wait for project creation, then select it

### Step 3.2: Enable the Gmail API

1. In the left sidebar, go to **APIs & Services** → **Library**
2. Search for "Gmail API"
3. Click on "Gmail API" in the results
4. Click the blue **"ENABLE"** button
5. Wait for the API to be enabled

### Step 3.3: Configure OAuth Consent Screen

1. Go to **APIs & Services** → **OAuth consent screen**
2. Select user type:
   - **Internal** (recommended for Google Workspace) - Only users in your organization
   - **External** - Any Google user (requires verification for sensitive scopes)
3. Click "CREATE"

4. Fill in the **App information**:
   ```
   App name: Gmail to BizDash CRM
   User support email: your-email@yourcompany.com
   App logo: (optional - upload your logo)
   ```

5. Fill in **App domain** (can be left blank for internal apps)

6. Fill in **Developer contact information**:
   ```
   Email addresses: your-email@yourcompany.com
   ```

7. Click "SAVE AND CONTINUE"

8. On the **Scopes** page, click "ADD OR REMOVE SCOPES"

9. Find and select these scopes:
   ```
   ✓ https://www.googleapis.com/auth/gmail.readonly
   ✓ https://www.googleapis.com/auth/userinfo.email
   ✓ https://www.googleapis.com/auth/userinfo.profile
   ```

10. Click "UPDATE" then "SAVE AND CONTINUE"

11. On the **Test users** page (External only):
    - Add email addresses of users who can test before verification
    - Click "ADD USERS"

12. Click "SAVE AND CONTINUE" then "BACK TO DASHBOARD"

### Step 3.4: Create OAuth 2.0 Client ID

1. Go to **APIs & Services** → **Credentials**
2. Click **"+ CREATE CREDENTIALS"** → **"OAuth client ID"**
3. Select Application type: **"Chrome Extension"**

4. Fill in the form:
   ```
   Name: Gmail to CRM Extension
   Item ID: (leave blank for now - we'll add this after loading unpacked)
   ```

5. Click "CREATE"

6. **IMPORTANT**: Copy the **Client ID** - you'll need this!
   ```
   Example: 123456789-abcdefghijklmnop.apps.googleusercontent.com
   ```

### Step 3.5: Update manifest.json

Open `manifest.json` and replace the placeholder:

```json
{
  "oauth2": {
    "client_id": "YOUR_ACTUAL_CLIENT_ID.apps.googleusercontent.com",
    "scopes": [
      "https://www.googleapis.com/auth/gmail.readonly",
      "https://www.googleapis.com/auth/userinfo.email",
      "https://www.googleapis.com/auth/userinfo.profile"
    ]
  }
}
```

Also remove or update the `"key"` field at the bottom of manifest.json:
```json
// Remove this line or leave it for development:
"key": "YOUR_EXTENSION_KEY"
```

### Step 3.6: Get Extension ID (After Loading)

After loading the extension in Chrome (Step 5), you'll get an Extension ID.

1. Go to `chrome://extensions/`
2. Find "Gmail to BizDash CRM"
3. Copy the **ID** (e.g., `abcdefghijklmnopqrstuvwxyz123456`)
4. Go back to Google Cloud Console → Credentials
5. Edit your OAuth client
6. Add the Extension ID to the "Item ID" field
7. Save

---

## 4. BizDash Backend Configuration

The extension connects to the BizDash CRM backend. The endpoints are already implemented in BizDash.

### API Endpoints (Already in BizDash)

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/api/v1/crm/contacts/by-email?email={email}` | Find contact by email address |
| POST | `/api/v1/crm/emails` | Log email activity |
| GET | `/api/v1/crm/emails/check?gmail_message_id={id}` | Check if email already logged |
| GET | `/api/v1/crm` | List all customers |
| GET | `/api/v1/crm/{id}` | Get customer details |
| GET | `/api/v1/crm/{id}/emails` | Get emails for a contact |

### Request/Response Formats

**Search Contact by Email:**
```http
GET /api/v1/crm/contacts/by-email?email=john@example.com

Response:
{
  "contact": {
    "id": "uuid",
    "xero_contact_id": "xero-uuid",
    "name": "John Smith",
    "email": "john@example.com",
    "phone": "+1234567890",
    "job_count": 5,
    "invoice_count": 12,
    "total_invoiced": 15000.00,
    "total_paid": 12000.00,
    "outstanding_balance": 3000.00
  },
  "suggestions": []  // Domain-based suggestions if no exact match
}
```

**Log Email (Extension → BizDash):**
```http
POST /api/v1/crm/emails
Content-Type: application/json

{
  "gmailMessageId": "18abc123def456",
  "gmailThreadId": "18abc100",
  "subject": "Re: Project Update",
  "fromEmail": "john@example.com",
  "fromName": "John Smith",
  "toEmails": ["you@yourcompany.com"],
  "ccEmails": ["cc@example.com"],
  "emailDate": "2024-01-15T10:30:00Z",
  "snippet": "Thanks for the update...",
  "contactId": null  // Optional: pre-matched contact ID
}

Response:
{
  "id": "email-uuid",
  "contactId": "matched-contact-uuid",
  "matched": true,
  "customer": {
    "id": "uuid",
    "xero_contact_id": "xero-uuid",
    "name": "John Smith",
    "email": "john@example.com",
    ...
  }
}
```

### Auto-Derived Fields

The BizDash backend automatically handles these fields - **the extension doesn't need to send them**:

| Field | How It's Derived |
|-------|------------------|
| `customer_email` | From matched contact or defaults to `fromEmail` |
| `direction` | `"inbound"` if fromEmail matches customer, `"outbound"` if toEmail matches |
| `gmail_link` | Auto-generated: `https://mail.google.com/mail/u/0/#inbox/{messageId}` |
| `synced_at` | Set to current timestamp automatically |

### Database Schema (Already in BizDash)

The `customer_emails` table in BizDash:

```sql
CREATE TABLE customer_emails (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Gmail identifiers
  gmail_message_id VARCHAR(255) UNIQUE NOT NULL,
  gmail_thread_id VARCHAR(255),

  -- Customer link (matches xero_contacts.email)
  customer_email VARCHAR(255) NOT NULL,

  -- Email metadata
  subject TEXT,
  from_email VARCHAR(255) NOT NULL,
  from_name VARCHAR(255),
  to_email VARCHAR(255) NOT NULL,
  cc_emails VARCHAR(255)[],  -- PostgreSQL array

  -- Direction: 'inbound' (from customer) or 'outbound' (to customer)
  direction VARCHAR(20) NOT NULL DEFAULT 'inbound',

  -- Timestamps
  sent_at TIMESTAMP WITH TIME ZONE NOT NULL,

  -- Gmail link for opening in browser
  gmail_link TEXT,

  -- Sync metadata
  synced_by_user_id VARCHAR(255),
  synced_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_customer_emails_gmail_id ON customer_emails(gmail_message_id);
CREATE INDEX idx_customer_emails_customer ON customer_emails(customer_email);
CREATE INDEX idx_customer_emails_customer_sent ON customer_emails(customer_email, sent_at);
CREATE INDEX idx_customer_emails_direction ON customer_emails(customer_email, direction);
```

### Matching Logic

BizDash auto-matches emails to customers:

1. **First**: Try to match `fromEmail` to a customer's email
2. **If no match**: Try each `toEmail` against customer emails
3. **Direction**: If matched customer's email equals `fromEmail` → `inbound`, else → `outbound`
4. **Suggestions**: If no exact match, returns contacts from the same email domain

---

## 5. Loading the Extension in Chrome

### Step 5.1: Build the Extension

```bash
npm run build
```

Verify the `dist/` folder contains:
- `manifest.json`
- `assets/` folder with JS bundles
- `icons/` folder with PNG icons
- HTML files for popup and options

### Step 5.2: Load in Chrome

1. Open Chrome
2. Navigate to `chrome://extensions/`
3. Enable **"Developer mode"** (toggle in top-right)
4. Click **"Load unpacked"**
5. Select the `dist/` folder from your project
6. The extension should appear with the Gmail icon

### Step 5.3: Pin the Extension

1. Click the puzzle piece icon in Chrome toolbar
2. Find "Gmail to BizDash CRM"
3. Click the pin icon to keep it visible

### Step 5.4: Verify Installation

1. Click the extension icon
2. You should see the popup with:
   - "Gmail to CRM" header
   - Connection status (Google: Not Connected, BizDash: Not Connected)
   - "Connect Google Account" button

---

## 6. Testing the Extension

### Step 6.1: Test Google OAuth

1. Click the extension icon
2. Click "Connect Google Account"
3. Complete the Google OAuth flow
4. Verify status shows "Connected"

**Common OAuth Issues:**
- "Access blocked" → Check OAuth consent screen is configured
- "Error 400" → Verify Client ID in manifest.json
- "Not authorized" → Add your email as test user

### Step 6.2: Test in Gmail

1. Open [Gmail](https://mail.google.com/)
2. Open any email
3. Look for the **"Log to CRM"** button in the email toolbar
4. Click the button
5. With mock API, it should show "Logged to CRM ✓"

### Step 6.3: Test Settings

1. Click extension icon → "Settings" (or right-click → "Options")
2. Verify you can:
   - Change API URL
   - Toggle email body capture
   - Toggle auto-match contacts
   - Toggle notifications
3. Click "Save Settings"
4. Refresh and verify settings persisted

### Step 6.4: Check Console for Errors

1. Go to `chrome://extensions/`
2. Find the extension
3. Click "service worker" link
4. Check console for errors
5. Also check Gmail tab console (F12) for content script errors

---

## 7. Connecting to Real APIs

The extension ships with **placeholder API responses**. The BizDash backend already has all required endpoints - you just need to enable real API calls.

### Prerequisites

1. **BizDash backend running** at your configured URL (default: `http://localhost:8000`)
2. **CORS configured** in BizDash to allow requests from Chrome extensions
3. **Database migrated** - Run `alembic upgrade head` to create the `customer_emails` table

### CORS Configuration (BizDash Backend)

Ensure BizDash allows requests from Chrome extensions. In FastAPI:

```python
# backend/app/main.py
from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=["chrome-extension://*"],  # Allow Chrome extensions
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

Here's how to connect to real backends:

### Step 7.1: Update BizDash API Client

Edit `src/lib/api.ts`:

```typescript
// Replace getMockResponse call with actual fetch:

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

  // REAL API CALL:
  const response = await fetch(url, { ...options, headers });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`API error ${response.status}: ${error}`);
  }

  return response.json();
}
```

### Step 7.2: Update Gmail API Client

Edit `src/lib/gmail-api.ts`:

```typescript
// For real Gmail API calls, you need the OAuth token:

export async function getMessage(messageId: string): Promise<GmailEmail> {
  const token = await chrome.identity.getAuthToken({ interactive: false });

  const response = await fetch(
    `https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}?format=full`,
    {
      headers: {
        Authorization: `Bearer ${token.token}`,
      },
    }
  );

  if (!response.ok) {
    throw new Error(`Gmail API error: ${response.status}`);
  }

  const data = await response.json();
  return parseGmailMessage(data);
}
```

### Step 7.3: Update BizDash Authentication

Edit `src/lib/auth.ts`:

```typescript
// Implement your BizDash auth flow:

export async function authenticateBizDash(apiUrl: string): Promise<BizdashAuthState> {
  // Option 1: API key
  // Option 2: OAuth flow with BizDash
  // Option 3: Session-based auth

  // Example with API key:
  const apiKey = await promptForApiKey(); // Implement UI for this

  const response = await fetch(`${apiUrl}/api/v1/auth/verify`, {
    headers: { 'X-API-Key': apiKey }
  });

  if (response.ok) {
    const user = await response.json();
    return {
      isAuthenticated: true,
      user: user,
      token: apiKey,
    };
  }

  throw new Error('BizDash authentication failed');
}
```

### Step 7.4: Rebuild and Test

```bash
npm run build
```

Then reload the extension in Chrome:
1. Go to `chrome://extensions/`
2. Click the refresh icon on the extension card

---

## 8. Deployment & Packaging

### Option A: Internal Distribution (Google Workspace)

For internal company use:

1. **Build production version:**
   ```bash
   npm run build
   ```

2. **Create ZIP file:**
   ```bash
   cd dist
   zip -r ../gmail-to-crm-v0.1.0.zip .
   ```

3. **Distribute via:**
   - Google Workspace Admin Console (managed Chrome)
   - Direct file sharing (users load unpacked)
   - Private hosting

### Option B: Chrome Web Store (Public)

For public distribution:

1. **Prepare assets:**
   - 128x128 icon (PNG)
   - At least 1 screenshot (1280x800 or 640x400)
   - Promotional images (optional)

2. **Create ZIP:**
   ```bash
   npm run build
   cd dist
   zip -r ../gmail-to-crm.zip .
   ```

3. **Submit to Chrome Web Store:**
   - Go to [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole/)
   - Pay one-time $5 registration fee
   - Click "New Item"
   - Upload ZIP file
   - Fill in store listing details
   - Submit for review (can take days/weeks)

### Option C: Enterprise Deployment

For managed Chrome browsers:

1. Get your extension ID (from chrome://extensions)
2. In Google Admin Console:
   - Devices → Chrome → Apps & extensions
   - Add extension by ID
   - Configure as force-installed or allowed

---

## 9. Troubleshooting

### Extension Not Loading

| Symptom | Solution |
|---------|----------|
| "Manifest file is missing" | Run `npm run build` first |
| "Invalid manifest" | Check JSON syntax in manifest.json |
| "Permission denied" | Check host_permissions in manifest.json |

### OAuth Issues

| Symptom | Solution |
|---------|----------|
| "Access blocked: App not verified" | Add test users in OAuth consent screen |
| "Error 400: redirect_uri_mismatch" | Extension ID doesn't match OAuth client |
| "Error 403: Access denied" | Check scopes in manifest match OAuth consent |

### Gmail Button Not Appearing

| Symptom | Solution |
|---------|----------|
| Button never appears | Check content script is loaded (console) |
| Button appears then disappears | Gmail UI changed, update SELECTORS |
| Styling looks wrong | Check styles.css is loaded |

### API Connection Issues

| Symptom | Solution |
|---------|----------|
| "Network error" | Check CORS headers on BizDash API |
| "401 Unauthorized" | Check auth token is being sent |
| "404 Not Found" | Verify endpoint URLs match backend |

### Debugging Tips

1. **Service Worker Logs:**
   ```
   chrome://extensions/ → Click "service worker" → Console tab
   ```

2. **Content Script Logs:**
   ```
   Gmail tab → F12 → Console tab
   Filter by "[Gmail Integration]"
   ```

3. **Network Requests:**
   ```
   Gmail tab → F12 → Network tab
   Filter by your API domain
   ```

4. **Storage Inspection:**
   ```javascript
   // In service worker console:
   chrome.storage.local.get(null, console.log);
   chrome.storage.sync.get(null, console.log);
   ```

---

## Quick Reference

### Common Commands

```bash
# Install dependencies
npm install

# Development build (with hot reload)
npm run dev

# Production build
npm run build

# Type check
npm run typecheck

# Lint
npm run lint
```

### Key Files to Edit

| Task | File |
|------|------|
| Add Google Client ID | `manifest.json` |
| Change BizDash API URL | Extension settings (UI) or `src/lib/api.ts` |
| Modify Gmail button | `src/content/gmail-integration.tsx` |
| Update button styles | `src/content/styles.css` |
| Change popup UI | `src/popup/popup.tsx` |
| Add new API endpoints | `src/lib/api.ts` |
| Modify auth flow | `src/lib/auth.ts` |

### Support

- **Issues**: https://github.com/camerhann/gmail-to-crm/issues
- **BizDash Docs**: (your internal docs)
- **Chrome Extension Docs**: https://developer.chrome.com/docs/extensions/
