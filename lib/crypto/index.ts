import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'crypto';

// Encryption key MUST be set via environment variable (checked lazily to avoid build-time errors)
function getEncryptionKey(): string {
  const key = process.env.API_KEY_ENCRYPTION_KEY || process.env.ENCRYPTION_KEY;
  if (!key) {
    throw new Error(
      'API_KEY_ENCRYPTION_KEY environment variable is required. ' +
      'Generate one with: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"'
    );
  }
  return key;
}

// Derive a 32-byte key using scrypt (must match salt used when keys were originally encrypted)
function getKey(): Buffer {
  const encKey = getEncryptionKey();
  return scryptSync(encKey, 'revify-salt', 32);
}

/**
 * Encrypts an API key using AES-256-GCM
 * @param plainKey - The plain text API key to encrypt
 * @returns Object containing encrypted string in format "iv:authTag:encrypted"
 */
export function encryptApiKey(plainKey: string): { encrypted: string; iv: string } {
  const key = getKey();
  const iv = randomBytes(16);

  const cipher = createCipheriv('aes-256-gcm', key, iv);

  let encrypted = cipher.update(plainKey, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  const authTag = cipher.getAuthTag().toString('hex');

  // Format: iv:authTag:encrypted
  const combined = `${iv.toString('hex')}:${authTag}:${encrypted}`;

  return {
    encrypted: combined,
    iv: iv.toString('hex'),
  };
}

/**
 * Decrypts an API key that was encrypted with encryptApiKey
 * @param encryptedData - The encrypted string in format "iv:authTag:encrypted"
 * @returns The decrypted plain text API key
 */
export function decryptApiKey(encryptedData: string): string {
  if (!encryptedData.includes(':')) {
    // Legacy plaintext key - allow but warn loudly
    console.warn('[Crypto] WARNING: Unencrypted API key detected. Re-save the key in Settings to encrypt it.');
    return encryptedData;
  }

  const parts = encryptedData.split(':');

  if (parts.length !== 3) {
    console.warn('[Crypto] API key in unexpected format, treating as plain text');
    return encryptedData;
  }

  const [ivHex, authTagHex, encrypted] = parts;

  const key = getKey();
  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');

  const decipher = createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}

/**
 * Generates a hint for the API key (last 4 characters)
 * @param key - The API key to generate hint for
 * @returns The last 4 characters of the key
 */
export function getKeyHint(key: string): string {
  if (!key || key.length < 4) {
    return key || '';
  }
  return key.slice(-4);
}

/**
 * Checks if a string appears to be encrypted (has the iv:authTag:encrypted format)
 * @param data - The string to check
 * @returns true if the data appears to be encrypted
 */
export function isEncrypted(data: string): boolean {
  if (!data || !data.includes(':')) {
    return false;
  }
  const parts = data.split(':');
  return parts.length === 3 && parts[0].length === 32; // IV is 16 bytes = 32 hex chars
}
