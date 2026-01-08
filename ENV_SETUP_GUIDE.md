# Environment Variables Setup Guide

## 🔑 Required Environment Variables for 2Factor Authentication

Add the following environment variables to your `.env` file:

```env
# 2Factor API Configuration
TWOFACTOR_API_KEY=your_2factor_api_key_here
TWOFACTOR_BASE_URL=https://2factor.in/API/V1
TWOFACTOR_OTP_TEMPLATE_NAME=YourTemplateName
```

## 📝 Setup Instructions

### 1. Get 2Factor API Key

1. Visit [2Factor.in](https://2factor.in/)
2. Sign up for an account
3. Navigate to API section
4. Generate or copy your API key

### 2. Configure Template Name

1. In your 2Factor dashboard, create an OTP template
2. Note the template name
3. Use this name in `TWOFACTOR_OTP_TEMPLATE_NAME`

### 3. Add to .env File

Add the variables to your `.env` file in the project root:

```env
# Existing variables...
# ... your other env variables ...

# 2Factor API Configuration
TWOFACTOR_API_KEY=abc123def456ghi789
TWOFACTOR_BASE_URL=https://2factor.in/API/V1
TWOFACTOR_OTP_TEMPLATE_NAME=OTP
```

## ⚠️ Important Notes

- **Never commit `.env` file to version control**
- Keep your API key secure
- The `TWOFACTOR_BASE_URL` defaults to `https://2factor.in/API/V1` if not set
- The `TWOFACTOR_OTP_TEMPLATE_NAME` is optional but recommended

## 🧪 Development Mode

For development/testing, you can use the development bypass:
- User: `+911234567890` / OTP: `123456`
- Admin: `9999999999` / OTP: `123456`
- SubAdmin: `8888888888` / OTP: `123456`

These bypass numbers will skip the 2Factor API call and work without API credentials.

## ✅ Verification

After setting up, verify the configuration:

1. Check if variables are loaded:
   ```javascript
   console.log(process.env.TWOFACTOR_API_KEY);
   ```

2. Test service status endpoint (after implementation):
   ```
   GET /admin/auth/2factor-status
   ```

## 🔒 Security Best Practices

1. Use different API keys for development and production
2. Monitor API usage and set up alerts
3. Rotate API keys periodically
4. Use environment-specific `.env` files

---

**Note**: The 2Factor integration will work even without these variables set, but will use development bypass mode for testing.

