# Firebase Cloud Messaging Setup Guide

**Issue:** Push notifications not appearing because Firebase service account file is missing.

---

## 🔴 Current Problem

**Error Message:**
```
[PUSH] ⚠️ FCM service account file not found: C:\Users\PushkarLS68\Deskktop\vibgyorNode\vibgyorNode\config\firebase-service-account.json
```

**Root Cause:**
- Firebase service account JSON file is missing
- FCM cannot initialize without this file
- Push notifications are disabled

---

## ✅ Solution: Setup Firebase Service Account

### Step 1: Get Firebase Service Account Key

1. **Go to Firebase Console:**
   - Visit: https://console.firebase.google.com/
   - Select your project (or create one if needed)

2. **Navigate to Service Accounts:**
   - Click on the gear icon ⚙️ (Project Settings)
   - Go to "Service Accounts" tab
   - Click "Generate New Private Key"
   - Click "Generate Key" in the popup
   - A JSON file will download

3. **Save the JSON file:**
   - The downloaded file will be named something like: `your-project-name-firebase-adminsdk-xxxxx.json`
   - Rename it to: `firebase-service-account.json`
   - Place it in: `vibgyorNode/config/firebase-service-account.json`

### Step 2: Verify File Location

**Correct Path Structure:**
```
vibgyorNode/
  ├── config/
  │   └── firebase-service-account.json  ← This file must exist
  ├── src/
  ├── .env  ← Contains: FCM_SERVICE_ACCOUNT_PATH=./config/firebase-service-account.json
  └── ...
```

### Step 3: Verify .env Configuration

**Check your `.env` file contains:**
```env
FCM_SERVICE_ACCOUNT_PATH=./config/firebase-service-account.json
```

### Step 4: Restart Server

After placing the file:
```bash
# Stop the server (Ctrl+C)
# Then restart:
npm run dev
```

### Step 5: Verify Initialization

**Look for this log on server start:**
```
[PUSH] ✅ FCM initialized successfully
```

**If you see this, Firebase is working! ✅**

---

## 🔍 Troubleshooting

### Issue: File Still Not Found

**Check 1: File Path**
```bash
# Navigate to vibgyorNode directory
cd vibgyorNode

# Check if config directory exists
dir config

# Check if file exists
dir config\firebase-service-account.json
```

**Check 2: Working Directory**
- Make sure you're running the server from `vibgyorNode` directory
- The path `./config/firebase-service-account.json` is relative to where you run `npm start`

**Check 3: Absolute Path (Alternative)**
If relative path doesn't work, use absolute path in `.env`:
```env
FCM_SERVICE_ACCOUNT_PATH=C:\Users\PushkarLS68\Desktop\vibgyorNode\vibgyorNode\config\firebase-service-account.json
```

### Issue: Permission Errors

**If you get permission errors:**
1. Make sure the JSON file is readable
2. Check file permissions (should be readable by Node.js process)
3. On Windows, ensure file isn't locked by another process

### Issue: Invalid JSON

**If you get JSON parsing errors:**
1. Verify the downloaded file is valid JSON
2. Open it in a text editor and check for syntax errors
3. Make sure it contains `project_id`, `private_key`, `client_email` fields

---

## 📋 Firebase Service Account File Structure

**The JSON file should look like this:**
```json
{
  "type": "service_account",
  "project_id": "your-project-id",
  "private_key_id": "...",
  "private_key": "-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n",
  "client_email": "firebase-adminsdk-xxxxx@your-project.iam.gserviceaccount.com",
  "client_id": "...",
  "auth_uri": "https://accounts.google.com/o/oauth2/auth",
  "token_uri": "https://oauth2.googleapis.com/token",
  "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
  "client_x509_cert_url": "..."
}
```

---

## ✅ Verification Checklist

- [ ] Firebase project created in Firebase Console
- [ ] Service account key downloaded
- [ ] File renamed to `firebase-service-account.json`
- [ ] File placed in `vibgyorNode/config/` directory
- [ ] `.env` file has `FCM_SERVICE_ACCOUNT_PATH=./config/firebase-service-account.json`
- [ ] Server restarted
- [ ] Log shows: `[PUSH] ✅ FCM initialized successfully`
- [ ] Push notifications appear in notification tray

---

## 🚀 After Setup

Once Firebase is initialized, you should see:

**Backend Logs:**
```
[PUSH] ✅ FCM initialized successfully
[DELIVERY] 📤 Sending push notification to X device(s)
[DELIVERY] ✅ Push notification sent to X device(s)
```

**Frontend:**
- Push notifications appear in notification tray
- Both Socket.IO (in-app) and Firebase (push) notifications work together

---

**Last Updated:** 2025-01-15  
**Status:** ⚠️ Waiting for Firebase service account file

