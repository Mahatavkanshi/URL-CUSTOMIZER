import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type RouteContext = {
  params: Promise<{ shortCode: string }>;
};

export async function GET(request: Request, context: RouteContext) {
  const { shortCode } = await context.params;

  const existingUrl = await prisma.url.findUnique({
    where: { shortCode },
  });

  if (!existingUrl) {
    return NextResponse.redirect(new URL("/?error=not-found", request.url));
  }

  if (existingUrl.expiresAt && existingUrl.expiresAt.getTime() <= Date.now()) {
    return NextResponse.redirect(
      new URL(`/expired?code=${encodeURIComponent(shortCode)}`, request.url),
    );
  }

  await prisma.url.update({
    where: { id: existingUrl.id },
    data: {
      clickCount: {
        increment: 1,
      },
    },
  });

  return NextResponse.redirect(existingUrl.originalUrl, { status: 307 });
}
