import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

/**
 * AES-256-GCM sealing for health payloads.
 *
 * Format: "v1.<iv base64url>.<ciphertext‖tag base64url>". The associated data (AAD) binds a
 * ciphertext to its purpose and owner (e.g. "journal:<userId>"), so a row copied into another
 * user's account, or into another table, refuses to decrypt.
 */

const VERSION = "v1";
const IV_BYTES = 12;
const TAG_BYTES = 16;

export class DecryptError extends Error {
  constructor(message = "Could not decrypt this value") {
    super(message);
    this.name = "DecryptError";
  }
}

function assertKey(key: Buffer) {
  if (key.length !== 32) throw new RangeError("AES-256-GCM needs a 32-byte key");
}

function encrypt(plain: Buffer, key: Buffer, aad: string): string {
  assertKey(key);
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  cipher.setAAD(Buffer.from(aad, "utf8"));
  const body = Buffer.concat([cipher.update(plain), cipher.final(), cipher.getAuthTag()]);
  return `${VERSION}.${iv.toString("base64url")}.${body.toString("base64url")}`;
}

function decrypt(sealed: string, key: Buffer, aad: string): Buffer {
  assertKey(key);
  const parts = sealed.split(".");
  if (parts.length !== 3 || parts[0] !== VERSION) throw new DecryptError("Unrecognised sealed value");
  const iv = Buffer.from(parts[1], "base64url");
  const body = Buffer.from(parts[2], "base64url");
  if (iv.length !== IV_BYTES || body.length < TAG_BYTES) throw new DecryptError("Sealed value is truncated");
  try {
    const decipher = createDecipheriv("aes-256-gcm", key, iv);
    decipher.setAAD(Buffer.from(aad, "utf8"));
    decipher.setAuthTag(body.subarray(body.length - TAG_BYTES));
    return Buffer.concat([decipher.update(body.subarray(0, body.length - TAG_BYTES)), decipher.final()]);
  } catch {
    throw new DecryptError();
  }
}

export function seal(plaintext: string, key: Buffer, aad: string): string {
  return encrypt(Buffer.from(plaintext, "utf8"), key, aad);
}

export function open(sealed: string, key: Buffer, aad: string): string {
  return decrypt(sealed, key, aad).toString("utf8");
}

/** Wrap a user's data key with the master key. AAD is the user id. */
export function wrapKey(dataKey: Buffer, masterKey: Buffer, userId: string): string {
  return encrypt(dataKey, masterKey, `dek:${userId}`);
}

export function unwrapKey(wrapped: string, masterKey: Buffer, userId: string): Buffer {
  const key = decrypt(wrapped, masterKey, `dek:${userId}`);
  if (key.length !== 32) throw new DecryptError("Unwrapped key has the wrong length");
  return key;
}

export function newDataKey(): Buffer {
  return randomBytes(32);
}
