import { encryptApiKey, decryptApiKey, getKeyHint, isEncrypted } from '@/lib/crypto';

describe('Crypto Module', () => {
  const testApiKey = 'sk-1234567890abcdefghijklmnopqrstuvwxyz';

  describe('encryptApiKey', () => {
    it('should encrypt an API key', () => {
      const result = encryptApiKey(testApiKey);

      expect(result).toHaveProperty('encrypted');
      expect(result).toHaveProperty('iv');
      expect(result.encrypted).not.toBe(testApiKey);
      expect(result.encrypted).toContain(':'); // Should have the iv:authTag:encrypted format
    });

    it('should produce different encrypted values for the same input', () => {
      const result1 = encryptApiKey(testApiKey);
      const result2 = encryptApiKey(testApiKey);

      // Due to random IV, encrypted values should differ
      expect(result1.encrypted).not.toBe(result2.encrypted);
    });

    it('should handle empty strings', () => {
      const result = encryptApiKey('');

      expect(result).toHaveProperty('encrypted');
      expect(result.encrypted).toContain(':');
    });

    it('should handle special characters', () => {
      const specialKey = 'sk-!@#$%^&*()_+-={}[]|:;<>?/';
      const result = encryptApiKey(specialKey);

      expect(result).toHaveProperty('encrypted');
      expect(result.encrypted).toContain(':');
    });
  });

  describe('decryptApiKey', () => {
    it('should decrypt an encrypted API key', () => {
      const { encrypted } = encryptApiKey(testApiKey);
      const decrypted = decryptApiKey(encrypted);

      expect(decrypted).toBe(testApiKey);
    });

    it('should handle plain text keys (legacy support)', () => {
      // Plain text keys don't have colons in the expected format
      const plainKey = 'sk-plainkey1234567890';
      const result = decryptApiKey(plainKey);

      expect(result).toBe(plainKey);
    });

    it('should handle empty strings', () => {
      const { encrypted } = encryptApiKey('');
      const decrypted = decryptApiKey(encrypted);

      expect(decrypted).toBe('');
    });

    it('should handle special characters', () => {
      const specialKey = 'sk-!@#$%^&*()_+-={}[]|:;<>?/';
      const { encrypted } = encryptApiKey(specialKey);
      const decrypted = decryptApiKey(encrypted);

      expect(decrypted).toBe(specialKey);
    });

    it('should handle unicode characters', () => {
      const unicodeKey = 'sk-key-with-unicode-日本語-한국어';
      const { encrypted } = encryptApiKey(unicodeKey);
      const decrypted = decryptApiKey(encrypted);

      expect(decrypted).toBe(unicodeKey);
    });
  });

  describe('getKeyHint', () => {
    it('should return last 4 characters', () => {
      const hint = getKeyHint(testApiKey);

      expect(hint).toBe('wxyz');
    });

    it('should handle short keys', () => {
      expect(getKeyHint('abc')).toBe('abc');
      expect(getKeyHint('ab')).toBe('ab');
      expect(getKeyHint('')).toBe('');
    });

    it('should handle exactly 4 characters', () => {
      expect(getKeyHint('abcd')).toBe('abcd');
    });
  });

  describe('isEncrypted', () => {
    it('should return true for encrypted data', () => {
      const { encrypted } = encryptApiKey(testApiKey);

      expect(isEncrypted(encrypted)).toBe(true);
    });

    it('should return false for plain text', () => {
      expect(isEncrypted(testApiKey)).toBe(false);
    });

    it('should return false for empty string', () => {
      expect(isEncrypted('')).toBe(false);
    });

    it('should return false for strings with wrong format', () => {
      expect(isEncrypted('abc:def')).toBe(false); // Only 2 parts
      expect(isEncrypted('short:tag:data')).toBe(false); // IV too short
    });
  });

  describe('Round-trip encryption/decryption', () => {
    const testCases = [
      'sk-1234567890abcdefghijklmnopqrstuvwxyz',
      'pit-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx',
      'tvly-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
      'sk-ant-api03-xxxxxxxxxxxxxxxxxxxxxxxx',
      'AI_XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX',
    ];

    testCases.forEach((key) => {
      it(`should round-trip ${key.substring(0, 10)}...`, () => {
        const { encrypted } = encryptApiKey(key);
        const decrypted = decryptApiKey(encrypted);

        expect(decrypted).toBe(key);
      });
    });
  });
});
