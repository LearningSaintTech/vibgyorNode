# Encryption (Phase 1)

## Overview

- **At-rest:** Message text (`content`) is encrypted before saving to the database and decrypted when read. Uses `ENCRYPTION_KEY` (server only).
- **Transport (optional):** Request/response bodies can be encrypted end-to-end when client sends `X-Payload-Encrypted: true` and the same key is configured on client and server.

## Configuration

### Server (vibgyorNode)

Add to `.env`:

```env
# Encryption key: 64 hex chars (32 bytes) or any passphrase (derived via SHA256).
# Omit to disable at-rest encryption (message content stored plain).
ENCRYPTION_KEY=your-64-char-hex-or-passphrase
```

- **64 hex characters:** Used directly as AES-256 key.
- **Any other string:** Hashed with SHA256 to produce the 32-byte key.

If `ENCRYPTION_KEY` is not set, message content is stored and returned as plain text (backward compatible).

### Client (vibgyorMain)

In `src/api/config.js`, set the same value for transport encryption:

```js
ENCRYPTION_KEY: 'your-64-char-hex-or-passphrase', // same as server, or '' to disable
```

To use transport encryption on a specific request, pass `encryptBody: true` in options:

```js
await apiClient.post('/api/v1/user/messages', { chatId, content, type: 'text' }, { encryptBody: true });
```

When the server receives `X-Payload-Encrypted: true`, it decrypts the body and encrypts the response; the client decrypts the response automatically when `ENCRYPTION_KEY` is set.

## Algorithm

- **At-rest & transport:** AES-256-CBC, random 16-byte IV prepended to ciphertext, Base64-encoded. Stored/transmitted values start with `enc:` when encrypted.

## Files

- **Node:** `src/utils/cryptoUtil.js`, `src/middleware/encryptionMiddleware.js`; message services use `encrypt`/`decryptContent` for at-rest.
- **Client:** `src/utils/cryptoUtil.js`; `src/api/client.js` uses `encryptBody` and decrypts responses when `data.encrypted` is present.
