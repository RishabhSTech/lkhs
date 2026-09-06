import "server-only";
import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from "node:crypto";

/**
 * AES-256-GCM at-rest encryption for the one real secret this integration
 * stores in our own database: the Hostinger/IMAP mailbox password. Hostinger
 * has no OAuth alternative for a plain IMAP mailbox, so unlike an OAuth
 * refresh token this is the actual account password — never logged, never
 * returned from any API response, only ever decrypted right before an IMAP
 * connection attempt.
 *
 * ENCRYPTION_KEY can be any string (not necessarily 32 bytes) — scrypt
 * derives a proper 32-byte key from it, so `openssl rand -base64 32` or a
 * long passphrase both work.
 */

const IV_LENGTH = 12; // recommended for GCM

function deriveKey(): Buffer {
  const secret = process.env.ENCRYPTION_KEY;
  if (!secret) {
    throw new Error("ENCRYPTION_KEY is not set — cannot encrypt/decrypt stored credentials.");
  }
  return scryptSync(secret, "lime-kraft-mailbox-integration", 32);
}

/** Returns `iv:authTag:ciphertext`, all base64. */
export function encrypt(plaintext: string): string {
  const key = deriveKey();
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return [iv.toString("base64"), authTag.toString("base64"), ciphertext.toString("base64")].join(":");
}

export function decrypt(payload: string): string {
  const [ivB64, authTagB64, ciphertextB64] = payload.split(":");
  if (!ivB64 || !authTagB64 || !ciphertextB64) {
    throw new Error("Malformed encrypted payload.");
  }
  const key = deriveKey();
  const decipher = createDecipheriv("aes-256-gcm", key, Buffer.from(ivB64, "base64"));
  decipher.setAuthTag(Buffer.from(authTagB64, "base64"));
  const plaintext = Buffer.concat([
    decipher.update(Buffer.from(ciphertextB64, "base64")),
    decipher.final(),
  ]);
  return plaintext.toString("utf8");
}
