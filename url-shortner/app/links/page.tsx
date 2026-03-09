import Link from "next/link";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { isValidSessionToken, SESSION_COOKIE_NAME } from "@/lib/auth";
import { pickRandomTheme } from "@/lib/background-themes";
import { prisma } from "@/lib/prisma";

const CUSTOM_CODE_REGEX = /^[a-zA-Z0-9_-]{4,32}$/;

function normalizeUrl(input: string): string | null {
  const value = input.trim();

  if (!value) {
    return null;
  }

  const withProtocol = /^https?:\/\//i.test(value) ? value : `https://${value}`;

  try {
    const parsed = new URL(withProtocol);

    if (!parsed.hostname.includes(".")) {
      return null;
    }

    return parsed.toString();
  } catch {
    return null;
  }
}

async function updateLink(formData: FormData) {
  "use server";

  const sessionStore = await cookies();
  const sessionToken = sessionStore.get(SESSION_COOKIE_NAME)?.value;

  if (!sessionToken || !isValidSessionToken(sessionToken)) {
    redirect("/login?error=unauthorized");
  }

  const id = String(formData.get("id") ?? "").trim();
  const shortCode = String(formData.get("shortCode") ?? "").trim();
  const originalUrlInput = String(formData.get("originalUrl") ?? "");

  const normalizedUrl = normalizeUrl(originalUrlInput);

  if (!id || !normalizedUrl || !CUSTOM_CODE_REGEX.test(shortCode)) {
    redirect("/links?status=invalid-input");
  }

  const existingCode = await prisma.url.findFirst({
    where: {
      shortCode,
      id: {
        not: id,
      },
    },
  });

  if (existingCode) {
    redirect("/links?status=duplicate-code");
  }

  try {
    await prisma.url.update({
      where: { id },
      data: {
        shortCode,
        originalUrl: normalizedUrl,
      },
    });
  } catch {
    redirect("/links?status=update-failed");
  }

  revalidatePath("/links");
  redirect("/links?status=updated");
}

async function deleteLink(formData: FormData) {
  "use server";

  const sessionStore = await cookies();
  const sessionToken = sessionStore.get(SESSION_COOKIE_NAME)?.value;

  if (!sessionToken || !isValidSessionToken(sessionToken)) {
    redirect("/login?error=unauthorized");
  }

  const id = String(formData.get("id") ?? "").trim();

  if (!id) {
    redirect("/links?status=delete-failed");
  }

  try {
    await prisma.url.delete({
      where: { id },
    });
  } catch {
    redirect("/links?status=delete-failed");
  }

  revalidatePath("/links");
  redirect("/links?status=deleted");
}

async function logoutAction() {
  "use server";

  const sessionStore = await cookies();
  sessionStore.delete(SESSION_COOKIE_NAME);
  redirect("/login?status=logged-out");
}

function formatDate(value: Date): string {
  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(value);
}

export const dynamic = "force-dynamic";

type LinksPageProps = {
  searchParams: Promise<{ status?: string; q?: string; page?: string }>;
};

const statusMessageMap: Record<string, { tone: "success" | "error"; text: string }> = {
  updated: { tone: "success", text: "Link updated successfully." },
  deleted: { tone: "success", text: "Link deleted successfully." },
  "invalid-input": {
    tone: "error",
    text: "Invalid input. Use a valid URL and a short code (4-32 chars).",
  },
  "duplicate-code": {
    tone: "error",
    text: "That short code is already in use.",
  },
  "update-failed": {
    tone: "error",
    text: "Could not update this link. Please try again.",
  },
  "delete-failed": {
    tone: "error",
    text: "Could not delete this link. Please try again.",
  },
};

export default async function LinksPage({ searchParams }: LinksPageProps) {
  const theme = pickRandomTheme();
  const sessionStore = await cookies();
  const sessionToken = sessionStore.get(SESSION_COOKIE_NAME)?.value;

  if (!sessionToken || !isValidSessionToken(sessionToken)) {
    redirect("/login?error=unauthorized");
  }

  const { status, q, page } = await searchParams;
  const statusInfo = status ? statusMessageMap[status] : undefined;
  const query = q?.trim() ?? "";
  const pageNumber = Math.max(Number.parseInt(page ?? "1", 10) || 1, 1);
  const pageSize = 10;

  const whereFilter = query
    ? {
        OR: [
          { shortCode: { contains: query, mode: "insensitive" as const } },
          { originalUrl: { contains: query, mode: "insensitive" as const } },
        ],
      }
    : undefined;

  const totalCount = await prisma.url.count({ where: whereFilter });
  const totalPages = Math.max(Math.ceil(totalCount / pageSize), 1);
  const safePageNumber = Math.min(pageNumber, totalPages);

  const urls = await prisma.url.findMany({
    where: whereFilter,
    orderBy: { createdAt: "desc" },
    skip: (safePageNumber - 1) * pageSize,
    take: pageSize,
  });

  const previousPage = Math.max(safePageNumber - 1, 1);
  const nextPage = Math.min(safePageNumber + 1, totalPages);
  const hasPreviousPage = safePageNumber > 1;
  const hasNextPage = safePageNumber < totalPages;

  const pageHref = (nextValue: number): string => {
    const params = new URLSearchParams();

    if (query) {
      params.set("q", query);
    }

    params.set("page", String(nextValue));
    return `/links?${params.toString()}`;
  };

  return (
    <div className="relative min-h-screen overflow-hidden px-5 py-10 text-white md:px-8">
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{
          backgroundImage: `url('${theme.imageUrl}')`,
        }}
      />
      <div className={`absolute inset-0 ${theme.overlayClass}`} />

      <main className="fade-up fade-delay-1 relative z-10 mx-auto w-full max-w-6xl rounded-3xl border border-white/25 bg-white/10 p-6 shadow-[0_30px_70px_-32px_rgba(0,0,0,0.75)] backdrop-blur-xl md:p-10">
        <div className="fade-up fade-delay-2 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.25em] text-cyan-100">
              URL Analytics
            </p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-white md:text-4xl">
              Recent short links
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="soft-glow inline-flex items-center justify-center rounded-xl bg-cyan-400 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300"
            >
              Create new URL
            </Link>
            <form action={logoutAction}>
              <button
                type="submit"
                className="inline-flex items-center justify-center rounded-xl border border-white/35 bg-white/10 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/20"
              >
                Logout
              </button>
            </form>
          </div>
        </div>

        {statusInfo ? (
          <p
            className={`mt-5 rounded-xl px-4 py-3 text-sm font-medium ${
              statusInfo.tone === "success"
                ? "border border-emerald-200/70 bg-emerald-100/95 text-emerald-800"
                : "border border-rose-200/70 bg-rose-100/95 text-rose-700"
            }`}
          >
            {statusInfo.text}
          </p>
        ) : null}

        <form className="mt-6 flex flex-col gap-3 rounded-2xl border border-white/30 bg-black/15 p-4 md:flex-row">
          <input
            type="text"
            name="q"
            defaultValue={query}
            placeholder="Search by short code or destination URL"
            className="w-full rounded-xl border border-white/30 bg-white/95 px-4 py-2.5 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-200"
          />
          <button
            type="submit"
            className="inline-flex items-center justify-center rounded-xl bg-cyan-400 px-4 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300"
          >
            Search
          </button>
          <Link
            href="/links"
            className="inline-flex items-center justify-center rounded-xl border border-white/35 bg-white/10 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-white/20"
          >
            Reset
          </Link>
        </form>

        <div className="mt-6 overflow-x-auto rounded-2xl border border-white/30 bg-white/95 text-slate-800">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-100/70 text-left text-slate-700">
              <tr>
                <th className="px-4 py-3 font-semibold">Short Code</th>
                <th className="px-4 py-3 font-semibold">Destination</th>
                <th className="px-4 py-3 font-semibold">Clicks</th>
                <th className="px-4 py-3 font-semibold">Expires</th>
                <th className="px-4 py-3 font-semibold">Created</th>
                <th className="px-4 py-3 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {urls.map((url) => (
                <tr key={url.id} className="hover:bg-slate-50/80">
                  <td className="px-4 py-3">
                    <input
                      form={`update-${url.id}`}
                      name="shortCode"
                      defaultValue={url.shortCode}
                      minLength={4}
                      maxLength={32}
                      pattern="[A-Za-z0-9_-]{4,32}"
                      className="w-40 rounded-lg border border-slate-300 px-3 py-2 font-mono font-semibold text-slate-900 outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
                      required
                    />
                    <div className="mt-1 text-xs text-slate-500">
                      <Link href={`/${url.shortCode}`} className="underline underline-offset-4">
                        Open /{url.shortCode}
                      </Link>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <input
                      form={`update-${url.id}`}
                      name="originalUrl"
                      defaultValue={url.originalUrl}
                      className="w-full min-w-64 rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
                      required
                    />
                  </td>
                  <td className="px-4 py-3 font-semibold text-slate-900">{url.clickCount}</td>
                  <td className="px-4 py-3">
                    {url.expiresAt ? formatDate(url.expiresAt) : "Never"}
                  </td>
                  <td className="px-4 py-3">{formatDate(url.createdAt)}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <form id={`update-${url.id}`} action={updateLink}>
                        <input type="hidden" name="id" value={url.id} />
                        <button
                          type="submit"
                          className="rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold text-white hover:bg-slate-700"
                        >
                          Save
                        </button>
                      </form>

                      <form action={deleteLink}>
                        <input type="hidden" name="id" value={url.id} />
                        <button
                          type="submit"
                          className="rounded-lg border border-rose-300 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-100"
                        >
                          Delete
                        </button>
                      </form>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {urls.length === 0 ? (
            <p className="px-4 py-10 text-center text-slate-500">
              {query ? "No links matched your search." : "No links yet. Create your first short URL."}
            </p>
          ) : null}
        </div>

        <div className="mt-4 flex flex-col gap-3 text-sm text-slate-100 md:flex-row md:items-center md:justify-between">
          <p>
            Showing page {safePageNumber} of {totalPages} ({totalCount} total links)
          </p>
          <div className="flex items-center gap-2">
            <Link
              href={hasPreviousPage ? pageHref(previousPage) : "#"}
              aria-disabled={!hasPreviousPage}
              className={`rounded-lg px-3 py-1.5 font-semibold ${
                hasPreviousPage
                  ? "border border-white/35 bg-white/10 text-white hover:bg-white/20"
                  : "cursor-not-allowed border border-white/20 bg-white/10 text-slate-300"
              }`}
            >
              Previous
            </Link>
            <Link
              href={hasNextPage ? pageHref(nextPage) : "#"}
              aria-disabled={!hasNextPage}
              className={`rounded-lg px-3 py-1.5 font-semibold ${
                hasNextPage
                  ? "border border-white/35 bg-white/10 text-white hover:bg-white/20"
                  : "cursor-not-allowed border border-white/20 bg-white/10 text-slate-300"
              }`}
            >
              Next
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
