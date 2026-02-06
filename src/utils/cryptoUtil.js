const crypto = require('crypto');

const ALGORITHM = 'aes-256-cbc';
const IV_LENGTH = 16;
const KEY_LENGTH = 32;
const ENCRYPTED_PREFIX = 'enc:';

/**
 * Get or derive encryption key from env (32 bytes for AES-256).
 * ENCRYPTION_KEY can be: 64 hex chars (= 32 bytes) or any passphrase (derived via sha256).
 */
function getKey() {
  const raw = process.env.ENCRYPTION_KEY;
  if (!raw || typeof raw !== 'string') {
    return null;
  }
  const trimmed = raw.trim();
  if (/^[0-9a-fA-F]{64}$/.test(trimmed)) {
    return Buffer.from(trimmed, 'hex');
  }
  return crypto.createHash('sha256').update(trimmed, 'utf8').digest();
}

/**
 * Encrypt plaintext. Returns ENCRYPTED_PREFIX + base64(iv + ciphertext).
 * If ENCRYPTION_KEY is not set or plaintext is empty, returns plaintext unchanged.
 */
function encrypt(plaintext) {
  if (plaintext == null || plaintext === '') return plaintext;
  const key = getKey();
  if (!key) {
    console.log('[ENCRYPT] (skip - no key) plaintext preview:', String(plaintext).slice(0, 50));
    return plaintext;
  }
  try {
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
    const enc = Buffer.concat([cipher.update(String(plaintext), 'utf8'), cipher.final()]);
    const combined = Buffer.concat([iv, enc]);
    const result = ENCRYPTED_PREFIX + combined.toString('base64');
    console.log('[ENCRYPT] plaintext preview:', String(plaintext).slice(0, 50), '-> encrypted length:', result.length);
    return result;
  } catch (err) {
    console.error('[cryptoUtil] encrypt error:', err.message);
    return plaintext;
  }
}

/**
 * Decrypt content. If value starts with ENCRYPTED_PREFIX, decrypt and return; otherwise return as-is.
 */
function decrypt(value) {
  if (value == null || typeof value !== 'string') return value;
  if (!value.startsWith(ENCRYPTED_PREFIX)) {
    console.log('[DECRYPT] (skip - not encrypted) value (full):', String(value));
    return value;
  }
  const key = getKey();
  if (!key) {
    console.log('[DECRYPT] (skip - no key) encrypted length:', value.length);
    return value;
  }
  try {
    const raw = Buffer.from(value.slice(ENCRYPTED_PREFIX.length), 'base64');
    if (raw.length < IV_LENGTH) return value;
    const iv = raw.subarray(0, IV_LENGTH);
    const ciphertext = raw.subarray(IV_LENGTH);
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    const result = decipher.update(ciphertext) + decipher.final('utf8');
    console.log('[DECRYPT] encrypted length:', value.length, '-> decrypted (full):', result);
    return result;
  } catch (err) {
    console.error('[cryptoUtil] decrypt error:', err.message);
    return value;
  }
}

/**
 * Decrypt message content for display/API. Safe for null/undefined or already plain.
 */
function decryptContent(content) {
  if (content == null || content === '') return content;
  return decrypt(String(content));
}

module.exports = {
  encrypt,
  decrypt,
  decryptContent,
  ENCRYPTED_PREFIX,
  getKey,
};
