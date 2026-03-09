import { createHmac, timingSafeEqual } from "node:crypto";
import bcrypt from "bcryptjs";

export const SESSION_COOKIE_NAME = "url_customizer_session";

function getAdminPasswordHash(): string {
  const passwordHash = process.env.ADMIN_PASSWORD_HASH;

  if (!passwordHash) {
    throw new Error("ADMIN_PASSWORD_HASH is not configured.");
  }

  return passwordHash;
}

function getAuthSecret(): string {
  return process.env.AUTH_SECRET ?? "dev-only-auth-secret";
}

export function createSessionToken(): string {
  const adminPasswordHash = getAdminPasswordHash();
  const secret = getAuthSecret();

  return createHmac("sha256", secret).update(`admin:${adminPasswordHash}`).digest("hex");
}

export async function isValidPassword(password: string): Promise<boolean> {
  return bcrypt.compare(password, getAdminPasswordHash());
}

export function isValidSessionToken(token: string): boolean {
  if (!token) {
    return false;
  }

  const expected = createSessionToken();
  const tokenBuffer = Buffer.from(token);
  const expectedBuffer = Buffer.from(expected);

  if (tokenBuffer.length !== expectedBuffer.length) {
    return false;
  }

  return timingSafeEqual(tokenBuffer, expectedBuffer);
}
