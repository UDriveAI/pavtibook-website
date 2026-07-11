/**
 * crypto.js
 * AES-256-GCM encryption/decryption utility for sensitive database fields.
 *
 * Usage:
 *   const { encrypt, decrypt } = require('./crypto');
 *   const encrypted = encrypt(JSON.stringify({ api_key: 'secret' }));
 *   const plaintext = decrypt(encrypted);
 *
 * Requires ENCRYPTION_KEY env var: a 64-character hex string (32 bytes).
 * Generate one: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
 */

const crypto = require('crypto');

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12; // 96-bit IV is standard for GCM
const AUTH_TAG_LENGTH = 16; // 128-bit auth tag

function getKey() {
  const hexKey = process.env.ENCRYPTION_KEY;
  if (!hexKey) {
    // Warn loudly but fall back to a dev-only deterministic key
    // In production this MUST be set via environment variable
    console.warn(
      '[SECURITY WARNING] ENCRYPTION_KEY env var is not set. ' +
      'Using insecure dev-only key. Never do this in production!'
    );
    return Buffer.from('0'.repeat(64), 'hex'); // 32 bytes of zeros — dev only
  }
  if (hexKey.length !== 64) {
    throw new Error('ENCRYPTION_KEY must be a 64-character hex string (32 bytes).');
  }
  return Buffer.from(hexKey, 'hex');
}

/**
 * Encrypts a plaintext string.
 * Returns a base64-encoded string: <iv>:<authTag>:<ciphertext>
 */
function encrypt(plaintext) {
  if (plaintext === null || plaintext === undefined) return null;
  const key = getKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv, { authTagLength: AUTH_TAG_LENGTH });

  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();

  // Format: base64(iv):base64(authTag):base64(ciphertext)
  return [
    iv.toString('base64'),
    authTag.toString('base64'),
    encrypted.toString('base64'),
  ].join(':');
}

/**
 * Decrypts a value produced by encrypt().
 * Returns original plaintext string, or null if input is null.
 */
function decrypt(encryptedValue) {
  if (encryptedValue === null || encryptedValue === undefined) return null;
  const key = getKey();

  const parts = encryptedValue.split(':');
  if (parts.length !== 3) {
    throw new Error('Invalid encrypted value format. Expected iv:authTag:ciphertext.');
  }

  const iv = Buffer.from(parts[0], 'base64');
  const authTag = Buffer.from(parts[1], 'base64');
  const ciphertext = Buffer.from(parts[2], 'base64');

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv, { authTagLength: AUTH_TAG_LENGTH });
  decipher.setAuthTag(authTag);

  const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  return decrypted.toString('utf8');
}

/**
 * Convenience: encrypt a plain JS object as JSON.
 */
function encryptObject(obj) {
  if (obj === null || obj === undefined) return null;
  return encrypt(JSON.stringify(obj));
}

/**
 * Convenience: decrypt an encrypted string back to a JS object.
 */
function decryptObject(encryptedValue) {
  const json = decrypt(encryptedValue);
  if (json === null) return null;
  return JSON.parse(json);
}

module.exports = { encrypt, decrypt, encryptObject, decryptObject };
