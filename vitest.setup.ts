import "dotenv/config";

// Only used by mailbox/crypto.test.ts - not a real secret, and never read
// outside test runs (the app requires a real ENCRYPTION_KEY in .env).
process.env.ENCRYPTION_KEY ??= "vitest-only-encryption-key-not-for-real-use";
