import Redis from "ioredis";

type MemoryRecord = {
  count: number;
  resetAt: number;
};

type RateLimitInput = {
  key: string;
  limit: number;
  windowMs: number;
};

type RateLimitResult = {
  allowed: boolean;
  count: number;
  remaining: number;
  resetInSeconds: number;
};

const globalForRateLimit = globalThis as unknown as {
  redisClient?: Redis;
  memoryRateLimit?: Map<string, MemoryRecord>;
};

const memoryRateLimitStore =
  globalForRateLimit.memoryRateLimit ?? new Map<string, MemoryRecord>();

if (!globalForRateLimit.memoryRateLimit) {
  globalForRateLimit.memoryRateLimit = memoryRateLimitStore;
}

function getRedisClient(): Redis | null {
  const redisUrl = process.env.REDIS_URL;

  if (!redisUrl) {
    return null;
  }

  if (!globalForRateLimit.redisClient) {
    globalForRateLimit.redisClient = new Redis(redisUrl, {
      maxRetriesPerRequest: 1,
      lazyConnect: true,
    });
  }

  return globalForRateLimit.redisClient;
}

async function consumeMemoryRateLimit(input: RateLimitInput): Promise<RateLimitResult> {
  const now = Date.now();
  const existing = memoryRateLimitStore.get(input.key);

  if (!existing || existing.resetAt <= now) {
    memoryRateLimitStore.set(input.key, {
      count: 1,
      resetAt: now + input.windowMs,
    });

    return {
      allowed: true,
      count: 1,
      remaining: Math.max(0, input.limit - 1),
      resetInSeconds: Math.ceil(input.windowMs / 1000),
    };
  }

  existing.count += 1;
  memoryRateLimitStore.set(input.key, existing);

  return {
    allowed: existing.count <= input.limit,
    count: existing.count,
    remaining: Math.max(0, input.limit - existing.count),
    resetInSeconds: Math.max(0, Math.ceil((existing.resetAt - now) / 1000)),
  };
}

async function inspectMemoryRateLimit(input: RateLimitInput): Promise<RateLimitResult> {
  const now = Date.now();
  const existing = memoryRateLimitStore.get(input.key);

  if (!existing || existing.resetAt <= now) {
    return {
      allowed: true,
      count: 0,
      remaining: input.limit,
      resetInSeconds: Math.ceil(input.windowMs / 1000),
    };
  }

  return {
    allowed: existing.count < input.limit,
    count: existing.count,
    remaining: Math.max(0, input.limit - existing.count),
    resetInSeconds: Math.max(0, Math.ceil((existing.resetAt - now) / 1000)),
  };
}

async function consumeRedisRateLimit(redis: Redis, input: RateLimitInput): Promise<RateLimitResult> {
  const count = await redis.incr(input.key);

  if (count === 1) {
    await redis.pexpire(input.key, input.windowMs);
  }

  const ttl = await redis.pttl(input.key);

  return {
    allowed: count <= input.limit,
    count,
    remaining: Math.max(0, input.limit - count),
    resetInSeconds: Math.max(0, Math.ceil(ttl / 1000)),
  };
}

async function inspectRedisRateLimit(redis: Redis, input: RateLimitInput): Promise<RateLimitResult> {
  const [rawCount, ttl] = await redis
    .multi()
    .get(input.key)
    .pttl(input.key)
    .exec()
    .then((result) => [result?.[0]?.[1], result?.[1]?.[1]] as const);

  const count = Number.parseInt(String(rawCount ?? "0"), 10) || 0;
  const ttlMs = typeof ttl === "number" && ttl > 0 ? ttl : input.windowMs;

  return {
    allowed: count < input.limit,
    count,
    remaining: Math.max(0, input.limit - count),
    resetInSeconds: Math.max(0, Math.ceil(ttlMs / 1000)),
  };
}

export async function consumeRateLimit(input: RateLimitInput): Promise<RateLimitResult> {
  const redis = getRedisClient();

  if (!redis) {
    return consumeMemoryRateLimit(input);
  }

  try {
    if (redis.status !== "ready") {
      await redis.connect();
    }

    return await consumeRedisRateLimit(redis, input);
  } catch {
    return consumeMemoryRateLimit(input);
  }
}

export async function inspectRateLimit(input: RateLimitInput): Promise<RateLimitResult> {
  const redis = getRedisClient();

  if (!redis) {
    return inspectMemoryRateLimit(input);
  }

  try {
    if (redis.status !== "ready") {
      await redis.connect();
    }

    return await inspectRedisRateLimit(redis, input);
  } catch {
    return inspectMemoryRateLimit(input);
  }
}

export async function clearRateLimitKey(key: string): Promise<void> {
  memoryRateLimitStore.delete(key);

  const redis = getRedisClient();

  if (!redis) {
    return;
  }

  try {
    if (redis.status !== "ready") {
      await redis.connect();
    }

    await redis.del(key);
  } catch {
    // fallback memory store is already cleared
  }
}

export async function getRateLimitHealth(): Promise<{
  backend: "redis" | "memory";
  ok: boolean;
  detail: string;
}> {
  const redis = getRedisClient();

  if (!redis) {
    return {
      backend: "memory",
      ok: true,
      detail: "REDIS_URL is not set. Using in-memory fallback.",
    };
  }

  try {
    if (redis.status !== "ready") {
      await redis.connect();
    }

    await redis.ping();

    return {
      backend: "redis",
      ok: true,
      detail: "Redis is reachable.",
    };
  } catch {
    return {
      backend: "memory",
      ok: false,
      detail: "Redis is configured but unreachable. Falling back to memory.",
    };
  }
}
