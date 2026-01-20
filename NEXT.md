# Next Steps: After Chrome Web Store Approval

Once your extension is approved, follow these steps to deploy it to your team.

---

## Step 1: Get Your Extension ID

1. Go to [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole)
2. Click on "Gmail to BizDash CRM"
3. Copy the **Extension ID** (a 32-character string like `abcdefghijklmnopabcdefghijklmnop`)

---

## Step 2: Add to Google Workspace Admin Console

1. Go to [Google Admin Console](https://admin.google.com)
2. Sign in with your admin account
3. Navigate to: **Devices → Chrome → Apps & extensions → Users & browsers**
4. Select the organizational unit (OU) you want to deploy to (or root for everyone)
5. Click the **yellow "+" button** (bottom right)
6. Select **"Add Chrome app or extension by ID"**
7. Paste your Extension ID
8. Click **"Save"**

### Configure Installation Policy

After adding, click on the extension and set:

| Setting | Recommended Value |
|---------|-------------------|
| Installation policy | **Force install** (auto-installs) or **Allow install** (users choose) |
| Pin to toolbar | **On** (recommended for visibility) |

Click **"Save"** in the top right.

---

## Step 3: Configure BizDash API URL for Your Team

Each user needs to set the BizDash API URL. You have two options:

### Option A: Users Configure Manually
Send this to your team:
```
1. Click the extension icon in Chrome toolbar
2. Click "Settings" or right-click → "Options"
3. Enter BizDash API URL: https://[YOUR-BIZDASH-URL]
4. Click Save
```

### Option B: Pre-configure via Policy (Advanced)
You can set the default API URL via Chrome policy in Admin Console:
1. In the extension settings, look for "Policy for extensions"
2. Add managed configuration JSON

---

## Step 4: Notify Your Team

Send an email to your team:

```
Subject: New Tool: Log Gmail Emails to CRM with One Click

Hi team,

We've rolled out a new Chrome extension that lets you log emails to BizDash CRM directly from Gmail.

How to use:
1. Open Gmail in Chrome
2. Right-click on any email
3. Click "Log to CRM"
4. Done! The email is now in BizDash

First-time setup:
- Click the extension icon (puzzle piece) in Chrome toolbar
- Find "Gmail to BizDash CRM" and click the pin icon
- Click the extension → Settings
- Enter our BizDash URL: [YOUR-BIZDASH-URL]
- Save

Questions? Reply to this email.

Thanks!
```

---

## Troubleshooting

### Extension not appearing for users?
- Check the OU (organizational unit) - user must be in the targeted OU
- Wait 10-15 minutes for Chrome policy sync
- User can force sync: `chrome://policy` → "Reload policies"

### "Log to CRM" not showing in right-click menu?
- Refresh Gmail (Ctrl+R / Cmd+R)
- Check the extension is enabled in `chrome://extensions`
- Open DevTools (F12) and check console for `[Gmail CRM]` errors

### API connection errors?
- Verify BizDash URL is correct in extension settings
- Ensure BizDash server is running and accessible
- Check if user is on VPN (if BizDash is internal)

---

## Updating the Extension

When you release updates:

1. Update `version` in `manifest.json` (e.g., `1.0.0` → `1.0.1`)
2. Build: `npm run build`
3. Create ZIP: `cd dist && zip -r ../gmail-to-bizdash-crm.zip . -x "*.map" -x ".vite/*"`
4. Go to Developer Dashboard → Your extension → Package → Upload new package
5. Submit for review

Updates auto-deploy to all users once approved (usually within hours for Private extensions).

---

## Quick Reference

| Resource | Link |
|----------|------|
| Developer Dashboard | https://chrome.google.com/webstore/devconsole |
| Admin Console | https://admin.google.com |
| Chrome Policies | chrome://policy |
| Extension Management | chrome://extensions |
