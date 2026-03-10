import { createHmac, timingSafeEqual } from "node:crypto";
import bcrypt from "bcryptjs";

export const SESSION_COOKIE_NAME = "url_customizer_session";

function normalizePasswordHash(value: string): string {
  return value.replace(/\\\$/g, "$");
}

function getAdminPasswordHash(): string | null {
  const passwordHash = process.env.ADMIN_PASSWORD_HASH;

  if (!passwordHash) {
    return null;
  }

  return normalizePasswordHash(passwordHash);
}

function getAuthSecret(): string {
  return process.env.AUTH_SECRET ?? "dev-only-auth-secret";
}

export function createSessionToken(): string | null {
  const adminPasswordHash = getAdminPasswordHash();

  if (!adminPasswordHash) {
    return null;
  }

  const secret = getAuthSecret();

  return createHmac("sha256", secret).update(`admin:${adminPasswordHash}`).digest("hex");
}

export async function isValidPassword(password: string): Promise<boolean> {
  const passwordHash = getAdminPasswordHash();

  if (!passwordHash) {
    return false;
  }

  try {
    return await bcrypt.compare(password, passwordHash);
  } catch {
    return false;
  }
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
