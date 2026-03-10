import { createHmac, timingSafeEqual } from "node:crypto";
import bcrypt from "bcryptjs";

export const SESSION_COOKIE_NAME = "url_customizer_session";

function normalizePasswordHash(value: string): string {
  return value.trim().replace(/\\\$/g, "$");
}

function getAdminPasswordHash(): string | null {
  const passwordHash = process.env.ADMIN_PASSWORD_HASH;

  if (!passwordHash) {
    return null;
  }

  return normalizePasswordHash(passwordHash);
}

function getAdminPasswordPlain(): string | null {
  const password = process.env.ADMIN_PASSWORD;

  if (!password) {
    return null;
  }

  return password.trim();
}

function getAdminCredentialSeed(): string | null {
  const hash = getAdminPasswordHash();

  if (hash) {
    return `hash:${hash}`;
  }

  const plain = getAdminPasswordPlain();

  if (plain) {
    return `plain:${plain}`;
  }

  return null;
}

function getAuthSecret(): string {
  return process.env.AUTH_SECRET ?? "dev-only-auth-secret";
}

export function createSessionToken(): string | null {
  const credentialSeed = getAdminCredentialSeed();

  if (!credentialSeed) {
    return null;
  }

  const secret = getAuthSecret();

  return createHmac("sha256", secret).update(`admin:${credentialSeed}`).digest("hex");
}

export async function isValidPassword(password: string): Promise<boolean> {
  const passwordHash = getAdminPasswordHash();

  if (passwordHash) {
    try {
      return await bcrypt.compare(password, passwordHash);
    } catch {
      return false;
    }
  }

  const plain = getAdminPasswordPlain();

  if (!plain) {
    return false;
  }

  return password === plain;
}

export function isValidSessionToken(token: string): boolean {
  if (!token) {
    return false;
  }

  const expected = createSessionToken();

  if (!expected) {
    return false;
  }

  const tokenBuffer = Buffer.from(token);
  const expectedBuffer = Buffer.from(expected);

  if (tokenBuffer.length !== expectedBuffer.length) {
    return false;
  }

  return timingSafeEqual(tokenBuffer, expectedBuffer);
}
