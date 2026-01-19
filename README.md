# Gmail to BizDash CRM

A Chrome Extension that logs emails from Gmail (Google Workspace) to BizDash CRM, with automatic contact matching by email address.

## Features

- **One-Click Email Logging**: Log emails to CRM directly from Gmail
- **Auto-Match Contacts**: Automatically links emails to CRM contacts by email address (HubSpot-style)
- **Thread Tracking**: Track entire email conversations
- **Google Workspace**: Designed for Google Workspace environments
- **Privacy Controls**: Configure whether to capture full email body

## Prerequisites

- Node.js 18+
- Google Workspace account
- BizDash CRM instance
- Google Cloud Console access (for OAuth setup)

## Quick Start

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build
```

## Google Cloud Console Setup

### 1. Create a Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Click "Select a project" → "New Project"
3. Name it "Gmail to CRM" and create

### 2. Enable the Gmail API

1. Go to APIs & Services → Enable APIs and Services
2. Search for "Gmail API"
3. Click "Enable"

### 3. Configure OAuth Consent Screen

1. Go to APIs & Services → OAuth consent screen
2. Select "Internal" (for Google Workspace) or "External"
3. Fill in the required fields:
   - App name: Gmail to CRM
   - User support email: your-email@domain.com
   - Developer contact: your-email@domain.com
4. Add scopes:
   - `https://www.googleapis.com/auth/gmail.readonly`
   - `https://www.googleapis.com/auth/userinfo.email`
5. Complete the consent screen setup

### 4. Create OAuth 2.0 Client ID

1. Go to APIs & Services → Credentials
2. Click "Create Credentials" → "OAuth 2.0 Client ID"
3. Application type: **Chrome Extension**
4. Name: Gmail to CRM Extension
5. Item ID: (leave blank for now, add after publishing)
6. Click "Create"
7. Copy the Client ID

### 5. Update Extension Configuration

Update `manifest.json` with your Client ID:

```json
{
  "oauth2": {
    "client_id": "YOUR_CLIENT_ID.apps.googleusercontent.com",
    "scopes": [
      "https://www.googleapis.com/auth/gmail.readonly",
      "https://www.googleapis.com/auth/userinfo.email"
    ]
  }
}
```

## Loading the Extension in Chrome

### Development Mode

1. Run `npm run dev` to start the development server
2. Open Chrome and go to `chrome://extensions/`
3. Enable "Developer mode" (top right)
4. Click "Load unpacked"
5. Select the `dist` folder from this project

### Production Build

1. Run `npm run build`
2. The built extension will be in the `dist` folder
3. Load as unpacked or package as `.crx` for distribution

## Configuration

### Extension Settings

Click the extension icon → Settings to configure:

- **API URL**: Your BizDash CRM API endpoint
- **Capture Email Body**: Store full email content (privacy consideration)
- **Auto-Match Contacts**: Automatically link emails to CRM contacts
- **Notifications**: Show success notifications

### BizDash Backend Requirements

The BizDash backend needs these API endpoints:

```
GET  /api/customers/search?email={email}  - Search contacts by email
POST /api/email-activities                 - Log email activity
GET  /api/customers                        - List all customers
GET  /api/customers/{id}                   - Get customer details
```

## Project Structure

```
gmail-to-crm/
├── src/
│   ├── background/
│   │   └── service-worker.ts    # Extension background script
│   ├── content/
│   │   ├── gmail-integration.tsx # Gmail UI injection
│   │   └── styles.css           # Injected styles
│   ├── lib/
│   │   ├── api.ts               # BizDash API client
│   │   ├── gmail-api.ts         # Gmail API client
│   │   └── auth.ts              # OAuth authentication
│   ├── options/
│   │   ├── options.html         # Settings page HTML
│   │   └── options.tsx          # Settings page React
│   ├── popup/
│   │   ├── popup.html           # Popup HTML
│   │   └── popup.tsx            # Popup React component
│   └── types/
│       └── index.ts             # TypeScript type definitions
├── public/
│   └── icons/                   # Extension icons (SVG)
├── manifest.json                # Chrome Extension manifest
├── vite.config.ts               # Vite build configuration
└── package.json
```

## Development

### Available Scripts

- `npm run dev` - Start development server with hot reload
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint
- `npm run typecheck` - Run TypeScript type checking

### Icon Generation

The SVG icons in `public/icons/` need to be converted to PNG for production:

```bash
# Using ImageMagick (if installed)
convert public/icons/icon16.svg public/icons/icon16.png
convert public/icons/icon48.svg public/icons/icon48.png
convert public/icons/icon128.svg public/icons/icon128.png
```

Or use an online SVG to PNG converter.

## Security Notes

- This extension uses Google Workspace OAuth for authentication
- Email data is only sent to your configured BizDash API endpoint
- No email data is stored locally except in chrome.storage
- Full email body capture is optional and off by default

## API Placeholders

The current implementation includes placeholder API responses. To connect to your actual BizDash instance:

1. Update `src/lib/api.ts` with real API calls
2. Update `src/lib/auth.ts` with BizDash authentication flow
3. Ensure your BizDash backend has the required endpoints

## Troubleshooting

### Extension not loading?

1. Check `chrome://extensions/` for error messages
2. Ensure `npm run build` completed successfully
3. Reload the extension after changes

### Gmail button not appearing?

1. Refresh Gmail after installing the extension
2. Check browser console for errors (F12 → Console)
3. Ensure you're viewing an email (not the inbox list)

### OAuth errors?

1. Verify your Client ID in `manifest.json`
2. Ensure Gmail API is enabled in Google Cloud Console
3. Check OAuth consent screen configuration

## AI-Powered Development

This repo uses [Claude Agent Workflows](https://github.com/camerhann/workflows) for automated issue resolution.

**To request a feature or fix:**
1. Create an issue describing what you need
2. Add the `agent` label
3. Claude will analyze, code, review, and create a PR automatically!

## License

MIT

## Version

v0.1.0 - Initial Development Release
