# Firebase Configuration Directory

## Required File

**`firebase-service-account.json`** - Firebase Admin SDK service account key

## How to Get This File

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project
3. Click ⚙️ (Settings) → Project Settings
4. Go to "Service Accounts" tab
5. Click "Generate New Private Key"
6. Download the JSON file
7. Rename it to `firebase-service-account.json`
8. Place it in this directory (`config/`)

## File Structure

The file should contain:
- `project_id`: Your Firebase project ID
- `private_key`: Your service account private key
- `client_email`: Service account email
- Other authentication fields

## Security Note

⚠️ **DO NOT commit this file to Git!**

This file contains sensitive credentials. It should be:
- Added to `.gitignore`
- Kept secure and private
- Not shared publicly

## Verification

After placing the file, restart your server and look for:
```
[PUSH] ✅ FCM initialized successfully
```

If you see this, Firebase is configured correctly! ✅

