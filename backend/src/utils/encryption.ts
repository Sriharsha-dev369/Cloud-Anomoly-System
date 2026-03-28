import crypto from 'crypto';

// Derive a stable 32-byte key from the env var (any length input → 32-byte output).
const RAW_KEY = process.env.ENCRYPTION_KEY ?? 'cloud-anomaly-default-key-change-me';
const KEY = crypto.createHash('sha256').update(RAW_KEY).digest();

// AES-256-GCM: authenticated encryption — detects tampering.
// Output format: "<iv_hex>:<authTag_hex>:<ciphertext_hex>"
export function encrypt(plaintext: string): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', KEY, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString('hex')}:${tag.toString('hex')}:${encrypted.toString('hex')}`;
}

export function decrypt(ciphertext: string): string {
  const parts = ciphertext.split(':');
  if (parts.length !== 3) throw new Error('Invalid ciphertext format');
  const [ivHex, tagHex, encHex] = parts;
  const iv = Buffer.from(ivHex, 'hex');
  const tag = Buffer.from(tagHex, 'hex');
  const encrypted = Buffer.from(encHex, 'hex');
  const decipher = crypto.createDecipheriv('aes-256-gcm', KEY, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString('utf8');
}
