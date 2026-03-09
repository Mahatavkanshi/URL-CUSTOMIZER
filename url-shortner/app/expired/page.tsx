import Link from "next/link";
import { pickRandomTheme } from "@/lib/background-themes";

type ExpiredPageProps = {
  searchParams: Promise<{ code?: string }>;
};

export default async function ExpiredPage({ searchParams }: ExpiredPageProps) {
  const theme = pickRandomTheme();
  const { code } = await searchParams;

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden px-5 py-10 text-white md:px-8">
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{
          backgroundImage: `url('${theme.imageUrl}')`,
        }}
      />
      <div className={`absolute inset-0 ${theme.overlayClass}`} />

      <main className="fade-up relative z-10 w-full max-w-xl rounded-3xl border border-white/25 bg-white/12 p-6 shadow-[0_30px_70px_-32px_rgba(0,0,0,0.75)] backdrop-blur-xl md:p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-amber-100">Link Status</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-white md:text-4xl">
          This link has expired
        </h1>
        <p className="mt-3 text-sm text-amber-50/95 md:text-base">
          The short URL{code ? ` /${code}` : ""} is no longer active. You can create a
          fresh link and continue sharing without interruption.
        </p>

        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            href="/"
            className="soft-glow inline-flex items-center justify-center rounded-xl bg-amber-300 px-5 py-2.5 text-sm font-semibold text-slate-900 transition hover:bg-amber-200"
          >
            Create new short URL
          </Link>
          <Link
            href="/links"
            className="inline-flex items-center justify-center rounded-xl border border-white/35 bg-white/10 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-white/20"
          >
            Open dashboard
          </Link>
        </div>
      </main>
    </div>
  );
}
