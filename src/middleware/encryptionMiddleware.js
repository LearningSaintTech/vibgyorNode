const { encrypt, decrypt } = require('../utils/cryptoUtil');

const ENCRYPTED_HEADER = 'x-payload-encrypted';

/**
 * Decrypt request body when X-Payload-Encrypted: true and body is { encrypted: "<base64>" }.
 * Runs after express.json(). Sets req._responseEncrypt so response can be encrypted.
 */
function decryptRequestBody(req, res, next) {
  if (req.headers[ENCRYPTED_HEADER] !== 'true' || !req.body || typeof req.body !== 'object') {
    return next();
  }
  const raw = req.body.encrypted;
  if (typeof raw !== 'string') {
    return next();
  }
  try {
    const decrypted = decrypt(raw.startsWith('enc:') ? raw : 'enc:' + raw);
    if (decrypted && typeof decrypted === 'string') {
      const parsed = JSON.parse(decrypted);
      req.body = parsed;
      req._responseEncrypt = true;
      console.log('[ENCRYPT MIDDLEWARE] Request body decrypted, keys:', Object.keys(parsed));
    }
  } catch (err) {
    console.error('[encryptionMiddleware] decrypt request error:', err.message);
  }
  next();
}

/**
 * Wrap res.json to encrypt response when req._responseEncrypt is set.
 * Must be used after decryptRequestBody so that res.json is patched before route runs.
 */
function encryptResponseBody(req, res, next) {
  const _json = res.json.bind(res);
  res.json = function (body) {
    if (req._responseEncrypt && body !== undefined && body !== null) {
      try {
        const str = typeof body === 'string' ? body : JSON.stringify(body);
        const encrypted = encrypt(str);
        res.setHeader(ENCRYPTED_HEADER, 'true');
        console.log('[ENCRYPT MIDDLEWARE] Response encrypted, payload length:', str.length, '-> encrypted length:', encrypted?.length);
        return _json({ encrypted });
      } catch (err) {
        console.error('[encryptionMiddleware] encrypt response error:', err.message);
      }
    }
    return _json(body);
  };
  next();
}

/**
 * Combined middleware: decrypt request body, then patch res.json for encrypted response.
 * Place after express.json() and before routes.
 */
function encryptionMiddleware(req, res, next) {
  decryptRequestBody(req, res, () => encryptResponseBody(req, res, next));
}

module.exports = {
  encryptionMiddleware,
  decryptRequestBody,
  encryptResponseBody,
};
