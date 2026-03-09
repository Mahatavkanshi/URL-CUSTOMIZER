import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { consumeRateLimit } from "@/lib/rate-limit";

const CUSTOM_CODE_REGEX = /^[a-zA-Z0-9_-]{4,32}$/;
const MAX_SHORT_CODE_ATTEMPTS = 8;
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX_REQUESTS = 15;

function normalizeUrl(input: string): string {
  const value = input.trim();

  if (!value) {
    throw new Error("Please provide a URL.");
  }

  const withProtocol = /^https?:\/\//i.test(value) ? value : `https://${value}`;

  try {
    const parsed = new URL(withProtocol);

    if (!parsed.hostname.includes(".")) {
      throw new Error("Invalid hostname");
    }

    return parsed.toString();
  } catch {
    throw new Error("Please enter a valid URL.");
  }
}

function makeCode(): string {
  return randomBytes(5).toString("base64url").slice(0, 7);
}

function parseExpiresAt(value?: string): Date | null {
  const input = value?.trim();

  if (!input) {
    return null;
  }

  const parsed = new Date(input);

  if (Number.isNaN(parsed.getTime())) {
    throw new Error("Expiration date is invalid.");
  }

  if (parsed.getTime() <= Date.now()) {
    throw new Error("Expiration date must be in the future.");
  }

  return parsed;
}

function getClientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");

  if (forwarded) {
    return forwarded.split(",")[0]?.trim() || "unknown";
  }

  return request.headers.get("x-real-ip") ?? "unknown";
}

export async function POST(request: Request) {
  try {
    const rateLimit = await consumeRateLimit({
      key: `shorten:${getClientIp(request)}`,
      limit: RATE_LIMIT_MAX_REQUESTS,
      windowMs: RATE_LIMIT_WINDOW_MS,
    });

    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          error: `Too many requests. Try again in ${rateLimit.resetInSeconds} seconds.`,
        },
        {
          status: 429,
          headers: {
            "X-RateLimit-Limit": String(RATE_LIMIT_MAX_REQUESTS),
            "X-RateLimit-Remaining": String(rateLimit.remaining),
            "X-RateLimit-Reset": String(rateLimit.resetInSeconds),
            "Retry-After": String(rateLimit.resetInSeconds),
          },
        },
      );
    }

    const body = (await request.json()) as {
      originalUrl?: string;
      customCode?: string;
      expiresAt?: string;
    };

    const originalUrl = normalizeUrl(body.originalUrl ?? "");
    const customCode = body.customCode?.trim();
    const expiresAt = parseExpiresAt(body.expiresAt);

    let shortCode: string;

    if (customCode) {
      if (!CUSTOM_CODE_REGEX.test(customCode)) {
        return NextResponse.json(
          {
            error:
              "Custom code must be 4-32 characters and only contain letters, numbers, dash, or underscore.",
          },
          { status: 400 },
        );
      }

      const existing = await prisma.url.findUnique({
        where: { shortCode: customCode },
      });

      if (existing) {
        return NextResponse.json(
          { error: "This custom code is already in use." },
          { status: 409 },
        );
      }

      shortCode = customCode;
    } else {
      shortCode = makeCode();

      for (let attempt = 0; attempt < MAX_SHORT_CODE_ATTEMPTS; attempt += 1) {
        const existing = await prisma.url.findUnique({
          where: { shortCode },
        });

        if (!existing) {
          break;
        }

        shortCode = makeCode();
      }
    }

    const created = await prisma.url.create({
      data: {
        originalUrl,
        shortCode,
        expiresAt,
      },
    });

    const shortUrl = new URL(`/${created.shortCode}`, request.url).toString();

    return NextResponse.json(
      {
        id: created.id,
        shortCode: created.shortCode,
        shortUrl,
        originalUrl: created.originalUrl,
        expiresAt: created.expiresAt,
      },
      {
        status: 201,
        headers: {
          "X-RateLimit-Limit": String(RATE_LIMIT_MAX_REQUESTS),
          "X-RateLimit-Remaining": String(rateLimit.remaining),
          "X-RateLimit-Reset": String(rateLimit.resetInSeconds),
        },
      },
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to create short URL.";

    return NextResponse.json({ error: message }, { status: 400 });
  }
}
