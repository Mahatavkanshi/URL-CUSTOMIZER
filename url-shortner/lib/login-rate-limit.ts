import { clearRateLimitKey, consumeRateLimit, inspectRateLimit } from "@/lib/rate-limit";

const MAX_FAILED_ATTEMPTS = 5;
const COOLDOWN_MS = 10 * 60 * 1000;

function getLoginKey(clientIp: string): string {
  return `login-failed:${clientIp}`;
}

export function getClientIp(headers: Headers): string {
  const forwarded = headers.get("x-forwarded-for");

  if (forwarded) {
    return forwarded.split(",")[0]?.trim() || "unknown";
  }

  return headers.get("x-real-ip") ?? "unknown";
}

export async function getLoginThrottleState(clientIp: string): Promise<{
  isLocked: boolean;
  retryAfterSeconds: number;
}> {
  const state = await inspectRateLimit({
    key: getLoginKey(clientIp),
    limit: MAX_FAILED_ATTEMPTS,
    windowMs: COOLDOWN_MS,
  });

  return {
    isLocked: !state.allowed,
    retryAfterSeconds: !state.allowed ? state.resetInSeconds : 0,
  };
}

export async function recordLoginFailure(clientIp: string): Promise<{
  isLocked: boolean;
  retryAfterSeconds: number;
}> {
  const state = await consumeRateLimit({
    key: getLoginKey(clientIp),
    limit: MAX_FAILED_ATTEMPTS,
    windowMs: COOLDOWN_MS,
  });

  return {
    isLocked: !state.allowed,
    retryAfterSeconds: !state.allowed ? state.resetInSeconds : 0,
  };
}

export async function clearLoginFailures(clientIp: string): Promise<void> {
  await clearRateLimitKey(getLoginKey(clientIp));
}
