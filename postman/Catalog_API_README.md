# Catalog API Postman Collection

This Postman collection provides endpoints for managing the User Catalog with S3 file upload support for SVG icons.

## 📋 Collection Overview

The collection includes endpoints for:
- **Get Catalog** - Fetch all catalog data (public)
- **Get Specific List** - Fetch a specific list type (public)
- **Create Catalog** - Create new catalog (Admin/SubAdmin only)
- **Update Catalog** - Update existing catalog (Admin/SubAdmin only)
- **Add Items to List** - Add items to specific list (Admin/SubAdmin only)
- **Remove Items from List** - Remove items from specific list (Admin/SubAdmin only)
- **Delete Catalog** - Delete entire catalog (Admin/SubAdmin only)

## 🚀 Quick Start

### 1. Import Collection and Environment

1. Open Postman
2. Click **Import** button
3. Import:
   - `Catalog_API.postman_collection.json`
   - `VibgyorNode_API.postman_environment.json` (or use existing environment)
4. Select the environment from the dropdown

### 2. Set Environment Variables

Make sure your environment has:
- `base_url`: Your server URL (default: `http://localhost:3000`)
- `admin_token`: Admin JWT token (required for create/update/delete operations)
- `subadmin_token`: SubAdmin JWT token (optional, can use instead of admin_token)

### 3. Get Admin Token

If you don't have an admin token:

1. Use admin authentication endpoints to login:
   ```
   POST /admin-auth/send-otp
   Body: { "phoneNumber": "9999999999" }
   ```

2. Verify OTP:
   ```
   POST /admin-auth/verify-otp
   Body: { "phoneNumber": "9999999999", "otp": "123456" }
   ```

3. Copy the `accessToken` from response and paste in `admin_token` environment variable

## 📤 S3 File Upload Usage

### File Upload Feature

**IMPORTANT**: SVG file uploads are **ONLY supported for `likeList` and `interestList` arrays**. Other fields (genderList, pronounList, hereForList, languageList) do NOT support file uploads.

The catalog API supports uploading SVG files for items in the `likes` and `interests` arrays. Uploaded files are automatically:
1. Uploaded to S3
2. Associated with matching items based on filename
3. Stored with the `svgUrl` field in the catalog item

### File Naming Convention

**Important**: File names must match item names (case-insensitive, extension is ignored).

Examples:
- For likeList item `"dancing"` → upload file `dancing.svg`
- For interestList item `"hiking"` → upload file `hiking.svg`
- For likeList item `"music"` → upload file `music.svg`
- Case-insensitive: `Dancing.svg` will match `"dancing"` item

### Uploading Files in Postman

1. Select **Create Catalog (With S3 File Upload - Likes & Interests Only)** or **Update Catalog (With S3 File Upload - Likes & Interests Only)**
2. Set the `body` to `form-data`
3. Add your catalog data as JSON strings:
   - `likeList`: `[{"name": "dancing"}, {"name": "music"}, {"name": "travel"}]`
   - `interestList`: `[{"name": "dancing"}, {"name": "hiking"}, {"name": "photography"}]`
   - Other fields (genderList, pronounList, etc.) are regular arrays (no SVG support)
4. Add SVG files:
   - Click on `files` field
   - Select **File** type
   - Choose your SVG files matching item names (e.g., `dancing.svg`, `music.svg`)
   - **Only files matching items in likeList or interestList will be processed**
5. Send the request

### Example Request

**Body (form-data):**
```
genderList: ["male", "female", "non-binary"]
pronounList: ["he/him", "she/her", "they/them"]
likeList: [{"name": "dancing"}, {"name": "music"}, {"name": "travel"}]
interestList: [{"name": "dancing"}, {"name": "hiking"}, {"name": "photography"}]
hereForList: ["friendship", "dating", "networking"]
languageList: ["English", "Hindi", "Spanish"]
files: [Select File] dancing.svg
files: [Select File] music.svg
files: [Select File] hiking.svg
```

**Result:**
- `dancing.svg` will be uploaded and associated with both the "dancing" item in likeList AND interestList
- `music.svg` will be associated with "music" in likeList
- `hiking.svg` will be associated with "hiking" in interestList
- Other fields (genderList, pronounList, etc.) are saved without any file processing

**Headers:**
```
Authorization: Bearer {{admin_token}}
```

## 📝 API Endpoints

### 1. Get Catalog
- **Method**: `GET`
- **URL**: `{{base_url}}/user/catalog`
- **Auth**: None required
- **Description**: Fetches all catalog data

### 2. Get Specific List
- **Method**: `GET`
- **URL**: `{{base_url}}/user/catalog/:listType`
- **Auth**: None required
- **Parameters**:
  - `listType`: `gender`, `pronouns`, `likes`, `interests`
- **Description**: Fetches a specific list type

### 3. Create Catalog (JSON)
- **Method**: `POST`
- **URL**: `{{base_url}}/user/catalog`
- **Auth**: Bearer token (Admin/SubAdmin)
- **Body**: JSON
- **Description**: Creates new catalog with JSON data only

### 4. Create Catalog (With S3 File Upload)
- **Method**: `POST`
- **URL**: `{{base_url}}/user/catalog`
- **Auth**: Bearer token (Admin/SubAdmin)
- **Body**: `multipart/form-data`
- **Description**: Creates catalog with SVG file uploads

### 5. Update Catalog (JSON)
- **Method**: `PUT`
- **URL**: `{{base_url}}/user/catalog`
- **Auth**: Bearer token (Admin/SubAdmin)
- **Body**: JSON
- **Description**: Updates entire catalog with JSON data

### 6. Update Catalog (With S3 File Upload)
- **Method**: `PUT`
- **URL**: `{{base_url}}/user/catalog`
- **Auth**: Bearer token (Admin/SubAdmin)
- **Body**: `multipart/form-data`
- **Description**: Updates catalog with SVG file uploads

### 7. Add Items to List
- **Method**: `PATCH`
- **URL**: `{{base_url}}/user/catalog/add`
- **Auth**: Bearer token (Admin/SubAdmin)
- **Body**: JSON
- **Example**:
  ```json
  {
    "listType": "interests",
    "items": ["yoga", "art", "pets"]
  }
  ```

### 8. Remove Items from List
- **Method**: `PATCH`
- **URL**: `{{base_url}}/user/catalog/remove`
- **Auth**: Bearer token (Admin/SubAdmin)
- **Body**: JSON
- **Example**:
  ```json
  {
    "listType": "interests",
    "items": ["yoga", "art"]
  }
  ```

### 9. Delete Catalog
- **Method**: `DELETE`
- **URL**: `{{base_url}}/user/catalog`
- **Auth**: Bearer token (Admin/SubAdmin)
- **Description**: Deletes the entire catalog

## 📦 Request/Response Examples

### Create Catalog Request (JSON)

```json
{
  "genderList": ["male", "female", "non-binary"],
  "pronounList": ["he/him", "she/her", "they/them"],
  "likeList": [
    { "name": "music" },
    { "name": "travel" },
    { "name": "movies" }
  ],
  "interestList": [
    { "name": "hiking" },
    { "name": "photography" },
    { "name": "coding" }
  ],
  "hereForList": ["friendship", "dating", "networking"],
  "languageList": ["English", "Hindi", "Spanish"]
}
```

### Create Catalog Response (With SVG Uploads)

```json
{
  "success": true,
  "message": "Catalog created successfully",
  "data": {
    "id": "507f1f77bcf86cd799439011",
    "gender": ["male", "female", "non-binary"],
    "pronouns": ["he/him", "she/her", "they/them"],
    "likes": [
      {
        "name": "dancing",
        "svgUrl": "https://s3.amazonaws.com/bucket/catalog/svgs/dancing.svg"
      },
      {
        "name": "music",
        "svgUrl": "https://s3.amazonaws.com/bucket/catalog/svgs/music.svg"
      },
      {
        "name": "travel"
      }
    ],
    "interests": [
      {
        "name": "dancing",
        "svgUrl": "https://s3.amazonaws.com/bucket/catalog/svgs/dancing.svg"
      },
      {
        "name": "hiking",
        "svgUrl": "https://s3.amazonaws.com/bucket/catalog/svgs/hiking.svg"
      },
      {
        "name": "photography"
      }
    ],
    "hereFor": ["friendship", "dating", "networking"],
    "languages": ["English", "Hindi", "Spanish"],
    "version": 1
  }
}
```

**Note**: Items without matching SVG files will not have a `svgUrl` field. Only items in `likes` and `interests` arrays can have SVG URLs.

## 🔒 Authentication

All create/update/delete operations require:
- **Role**: Admin or SubAdmin
- **Header**: `Authorization: Bearer <token>`
- **Token Source**: Obtained from admin authentication endpoints

## ⚠️ Important Notes

1. **File Uploads**:
   - **SVG uploads are ONLY supported for `likeList` and `interestList` arrays**
   - Other fields (genderList, pronounList, hereForList, languageList) do NOT support file uploads
   - Only SVG files are supported (`image/svg+xml` or `image/svg`)
   - File names must match item names (case-insensitive, extension ignored)
   - Maximum file size: 10MB per file
   - Files are uploaded to S3 under `catalog/svgs/` path
   - Files that don't match any item names in likes/interests will be ignored

2. **Form Data**:
   - When using file upload, use `multipart/form-data`
   - Array fields (likeList, interestList) should be JSON strings
   - File field name must be `files` (plural) for multiple uploads

3. **Backward Compatibility**:
   - JSON-only requests (without files) are fully supported
   - Items without uploaded files will work normally
   - Existing catalogs without SVG URLs are valid

4. **File Matching**:
   - Files are matched to items by filename (without extension)
   - Matching is case-insensitive
   - If no matching file is found, item is saved without svgUrl

## 🐛 Troubleshooting

### File Upload Not Working
- Check file name matches item name exactly (case-insensitive)
- Ensure file is SVG format (`image/svg+xml` or `image/svg`)
- Verify file size is under 10MB
- Check S3 credentials are configured correctly

### Authentication Errors
- Verify token is valid and not expired
- Ensure token has Admin or SubAdmin role
- Check Authorization header format: `Bearer <token>`

### Catalog Already Exists
- Use PUT (update) instead of POST (create)
- Or delete existing catalog first

## 📚 Related Documentation

- Main API Documentation: `scriptFiles/API_DOCUMENTATION.txt`
- S3 Service: `src/services/s3Service.js`
- Catalog Controller: `src/user/auth/controller/userCatalogController.js`

