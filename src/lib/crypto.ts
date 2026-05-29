import crypto from 'crypto';

// The key must be exactly 32 bytes (256 bits) for aes-256-cbc
const keyStr = process.env.ENCRYPTION_KEY || 'royale_gaming_secret_key_32bytes';
// Securely pad or truncate key to 32 bytes
const ENCRYPTION_KEY = Buffer.alloc(32, keyStr);
const IV_LENGTH = 16; // For AES, this is always 16 bytes

export function encryptSlug(text: string): string {
  try {
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv('aes-256-cbc', ENCRYPTION_KEY, iv);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    // Return iv and encrypted text joined by a dash (URL safe format)
    return `${iv.toString('hex')}-${encrypted}`;
  } catch (error) {
    console.error('Encryption error:', error);
    return text;
  }
}

export function decryptSlug(encryptedText: string): string {
  try {
    const parts = encryptedText.split('-');
    if (parts.length !== 2) {
      // Fallback: If not encrypted format, return as is
      return encryptedText;
    }
    const iv = Buffer.from(parts[0], 'hex');
    const encrypted = Buffer.from(parts[1], 'hex');
    
    if (iv.length !== IV_LENGTH) {
      return encryptedText;
    }
    
    const decipher = crypto.createDecipheriv('aes-256-cbc', ENCRYPTION_KEY, iv);
    let decrypted = decipher.update(encrypted);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    return decrypted.toString('utf8');
  } catch (error) {
    console.error('Decryption error, falling back to original value:', error);
    return encryptedText;
  }
}
