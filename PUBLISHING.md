# Publishing Gmail to BizDash CRM to Chrome Web Store

## Overview

This guide walks you through publishing the extension to the Chrome Web Store so your team can install it easily.

---

## Prerequisites

### 1. Google Developer Account ($5 one-time fee)
- Go to [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole)
- Sign in with your Google account
- Pay the $5 registration fee

### 2. Store Listing Assets (You'll Need to Create)

| Asset | Size | Required | Notes |
|-------|------|----------|-------|
| Store Icon | 128x128 PNG | Yes | High-quality version of your extension icon |
| Screenshot 1 | 1280x800 or 640x400 | Yes | Show the extension in action in Gmail |
| Screenshot 2-5 | 1280x800 or 640x400 | Optional | Additional screenshots |
| Small Promo Tile | 440x280 PNG | Optional | For store promotions |
| Large Promo Tile | 920x680 PNG | Optional | For featured spots |
| Marquee Promo | 1400x560 PNG | Optional | For top banner |

**Screenshot suggestions:**
1. Gmail inbox with right-click menu showing "Log to CRM"
2. Success toast after logging an email
3. Extension popup showing connection status
4. Options/settings page

---

## Publishing Steps

### Step 1: Prepare the Package

The ZIP file is ready at:
```
/Users/camerhann/gmail-to-crm/gmail-to-bizdash-crm.zip
```

To rebuild it after any changes:
```bash
npm run build
cd dist && zip -r ../gmail-to-bizdash-crm.zip . -x "*.map" -x ".vite/*"
```

### Step 2: Upload to Chrome Web Store

1. Go to [Developer Dashboard](https://chrome.google.com/webstore/devconsole)
2. Click **"New Item"**
3. Upload `gmail-to-bizdash-crm.zip`
4. Click **"Upload"**

### Step 3: Fill in Store Listing

**Product Details:**
- **Name:** Gmail to BizDash CRM
- **Summary (132 chars max):** Log Gmail emails to your BizDash CRM with one click. Track customer communications effortlessly.
- **Description:**

```
Gmail to BizDash CRM Extension

Seamlessly log your Gmail emails to BizDash CRM with a single right-click. Perfect for sales teams, customer success, and anyone who needs to track email communications with customers.

Features:
• Right-click any email in Gmail to log it to your CRM
• Automatic contact matching by email address
• Clean integration with Gmail's interface
• Toast notifications for instant feedback
• Works with your existing BizDash CRM setup

How to Use:
1. Install the extension
2. Configure your BizDash API URL in settings
3. Open Gmail
4. Right-click any email → "Log to CRM"
5. Done! The email is now in your CRM

Requirements:
• BizDash CRM instance (self-hosted or cloud)
• Gmail account

Privacy:
This extension only accesses Gmail when you explicitly right-click to log an email. No emails are read or stored without your action.
```

- **Category:** Productivity
- **Language:** English

### Step 4: Privacy & Compliance

**Privacy Policy:**
You'll need a privacy policy URL. Create a simple one that states:
- What data you collect (email metadata when user clicks "Log to CRM")
- Where it's sent (your BizDash CRM server)
- That you don't sell or share data with third parties

Host it on your company website or use a service like:
- Termly.io (free tier)
- Your company's existing privacy policy page

**Permissions Justification:**
The store will ask why you need each permission:

| Permission | Justification |
|------------|---------------|
| `identity` | Required to authenticate with Google for Gmail access |
| `storage` | Store user preferences and API configuration |
| `activeTab` | Access Gmail tab to inject context menu |
| `notifications` | Show success/error notifications after logging emails |
| `https://mail.google.com/*` | Access Gmail to extract email data for CRM logging |

### Step 5: Distribution Settings

**Visibility Options:**

1. **Public** - Anyone can find and install it
2. **Unlisted** - Only people with the direct link can install (recommended for internal tools)

For internal team use, choose **Unlisted**. You'll get a direct link to share with your team.

### Step 6: Submit for Review

1. Click **"Submit for Review"**
2. Review typically takes 1-3 business days
3. You'll get an email when approved (or if changes are needed)

---

## After Publishing

### Share with Your Team

Once approved, share the Chrome Web Store link:
```
https://chrome.google.com/webstore/detail/gmail-to-bizdash-crm/[YOUR-EXTENSION-ID]
```

### Team Setup Instructions

Send this to your team:

```
1. Install the extension from: [YOUR STORE LINK]
2. Click the extension icon in Chrome toolbar
3. Go to Settings/Options
4. Enter BizDash API URL: [YOUR BIZDASH URL]
5. Save settings
6. Go to Gmail, right-click any email → "Log to CRM"
```

---

## Updating the Extension

When you make changes:

1. Update version in `manifest.json` (e.g., `0.1.0` → `0.1.1`)
2. Run `npm run build`
3. Create new ZIP: `cd dist && zip -r ../gmail-to-bizdash-crm.zip . -x "*.map" -x ".vite/*"`
4. Go to Developer Dashboard
5. Click on your extension
6. Click **"Package"** → **"Upload new package"**
7. Upload the new ZIP
8. Submit for review

---

## Troubleshooting

**Review Rejected?**
Common reasons:
- Missing privacy policy
- Vague permission justifications
- Missing screenshots
- Description doesn't match functionality

**Team Can't Install?**
- Make sure it's Published (not Draft)
- For Unlisted extensions, share the direct link
- Check if their organization blocks extensions

---

## Alternative: Google Workspace Admin Distribution

If you have Google Workspace (formerly G Suite), you can force-install extensions for your organization:

1. Go to [Google Admin Console](https://admin.google.com)
2. Navigate to: Devices → Chrome → Apps & extensions
3. Add the extension by ID
4. Set installation policy to "Force install"

This bypasses the need for individual installs.
