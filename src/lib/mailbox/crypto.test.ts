import { describe, expect, it } from "vitest";
import { decrypt, encrypt } from "./crypto";

describe("mailbox crypto — encrypt/decrypt", () => {
  it("round-trips a mailbox password", () => {
    const secret = "a fake IMAP password, not the real one but long enough";
    const encrypted = encrypt(secret);
    expect(encrypted).not.toContain(secret);
    expect(decrypt(encrypted)).toBe(secret);
  });

  it("produces a different ciphertext each time (random IV)", () => {
    const secret = "same-plaintext";
    expect(encrypt(secret)).not.toBe(encrypt(secret));
  });

  it("throws rather than silently returning garbage for a malformed payload", () => {
    expect(() => decrypt("not-the-right-shape")).toThrow();
  });

  it("fails closed if the auth tag doesn't match (tampered ciphertext)", () => {
    const encrypted = encrypt("secret-value");
    const [iv, authTag] = encrypted.split(":");
    const tampered = [iv, authTag, Buffer.from("tampered").toString("base64")].join(":");
    expect(() => decrypt(tampered)).toThrow();
  });
});
