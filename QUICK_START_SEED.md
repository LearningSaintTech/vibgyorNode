# 🚀 Quick Start - Run Optimization Test Seed

## One Command Setup

```bash
cd vibgyor-backend
node scriptFiles/seedOptimizationTest.js
```

That's it! The script will:
- ✅ Create 500 users
- ✅ Upload your media files to S3
- ✅ Generate BlurHash for images
- ✅ Create 2000+ posts
- ✅ Create 500+ stories

---

## Prerequisites

1. **Media files in place:**
   ```
   vibgyor-backend/media/
   ├── harshpathak1160-20251205-0001.jpg
   ├── harshpathak1160-20251205-0002.jpg
   ├── harshpathak1160-20251205-0003.jpg
   └── WhatsApp Video 2025-12-05 at 4.51.55 PM.mp4
   ```

2. **Environment configured:**
   ```env
   AWS_S3_BUCKET=vibgyor-bucket
   AWS_S3_REGION=ap-south-1
   AWS_ACCESS_KEY_ID=your-key
   AWS_SECRET_ACCESS_KEY=your-secret
   MONGODB_URI=your-mongodb-uri
   ```

3. **Dependencies installed:**
   ```bash
   npm install sharp blurhash
   ```

---

## Expected Time

- **Total:** 30-60 minutes
- **Progress:** Shown every 100 items
- **Can be interrupted:** Resume by running again (will create more)

---

## What Gets Tested

✅ Image compression  
✅ BlurHash generation  
✅ CloudFront URLs  
✅ Video uploads  
✅ Responsive URLs  
✅ S3 storage  

---

## After Seeding

1. Check backend logs for BlurHash messages
2. Test feed API - should include blurhash
3. Test in app - should show BlurHash placeholders
4. Verify CloudFront URLs in responses

---

**Ready to test!** 🎉

