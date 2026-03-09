import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getRateLimitHealth } from "@/lib/rate-limit";

export async function GET() {
  const checks = {
    app: { ok: true, detail: "Application is running." },
    db: { ok: false, detail: "Not checked yet." },
    rateLimit: { ok: false, detail: "Not checked yet.", backend: "memory" as "memory" | "redis" },
  };

  try {
    await prisma.$queryRaw`SELECT 1`;
    checks.db = { ok: true, detail: "Database is reachable." };
  } catch {
    checks.db = { ok: false, detail: "Database connection failed." };
  }

  const limiterHealth = await getRateLimitHealth();
  checks.rateLimit = {
    ok: limiterHealth.ok,
    detail: limiterHealth.detail,
    backend: limiterHealth.backend,
  };

  const ok = checks.app.ok && checks.db.ok;

  return NextResponse.json(
    {
      ok,
      timestamp: new Date().toISOString(),
      checks,
    },
    { status: ok ? 200 : 503 },
  );
}
