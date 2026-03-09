"use client";

import Image from "next/image";
import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";

type CreateResponse = {
  shortUrl: string;
  shortCode: string;
  originalUrl: string;
  expiresAt: string | null;
};

type UtmPreset = "none" | "instagram" | "whatsapp" | "email";

function appendUtmParams(inputUrl: string, preset: UtmPreset): string {
  if (preset === "none") {
    return inputUrl;
  }

  const withProtocol = /^https?:\/\//i.test(inputUrl.trim())
    ? inputUrl.trim()
    : `https://${inputUrl.trim()}`;
  const parsed = new URL(withProtocol);

  if (preset === "instagram") {
    parsed.searchParams.set("utm_source", "instagram");
    parsed.searchParams.set("utm_medium", "social");
    parsed.searchParams.set("utm_campaign", "bio_link");
  }

  if (preset === "whatsapp") {
    parsed.searchParams.set("utm_source", "whatsapp");
    parsed.searchParams.set("utm_medium", "chat");
    parsed.searchParams.set("utm_campaign", "direct_share");
  }

  if (preset === "email") {
    parsed.searchParams.set("utm_source", "email");
    parsed.searchParams.set("utm_medium", "newsletter");
    parsed.searchParams.set("utm_campaign", "weekly_update");
  }

  return parsed.toString();
}

export default function Home() {
  const [originalUrl, setOriginalUrl] = useState("");
  const [customCode, setCustomCode] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [utmPreset, setUtmPreset] = useState<UtmPreset>("none");
  const [result, setResult] = useState<CreateResponse | null>(null);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [redirectError, setRedirectError] = useState<string | null>(null);
  const [toast, setToast] = useState("");

  const shortCodePreview = useMemo(() => customCode.trim(), [customCode]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setRedirectError(params.get("error"));
  }, []);

  useEffect(() => {
    if (!toast) {
      return;
    }

    const timeout = window.setTimeout(() => setToast(""), 2500);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  async function handleCopyShortUrl() {
    if (!result) {
      return;
    }

    try {
      await navigator.clipboard.writeText(result.shortUrl);
      setToast("Short URL copied");
    } catch {
      setToast("Copy failed. Please copy manually.");
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      const originalUrlWithPreset = appendUtmParams(originalUrl, utmPreset);

      const response = await fetch("/api/shorten", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          originalUrl: originalUrlWithPreset,
          customCode,
          expiresAt,
        }),
      });

      const payload = (await response.json()) as CreateResponse & { error?: string };

      if (!response.ok) {
        throw new Error(payload.error ?? "Failed to create short URL.");
      }

      setResult(payload);
    } catch (err) {
      setResult(null);
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="relative min-h-screen overflow-hidden text-white">
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{
          backgroundImage:
            "url('https://images.unsplash.com/photo-1472120435266-53107fd0c44a?auto=format&fit=crop&w=2200&q=80')",
        }}
      />
      <div className="absolute inset-0 bg-[linear-gradient(120deg,rgba(9,18,37,0.88)_0%,rgba(21,43,90,0.62)_45%,rgba(18,135,126,0.5)_100%)]" />

      <header className="fade-up relative z-10 border-b border-white/20 bg-black/15 backdrop-blur-md">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-5 py-4 md:px-8">
          <div>
            <p className="text-xs tracking-[0.3em] text-cyan-200/90">URL CUSTOMIZER</p>
            <h1 className="text-xl font-semibold tracking-tight">LinkForge</h1>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/links"
              className="rounded-lg border border-white/30 bg-white/10 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/20"
            >
              Dashboard
            </Link>
            <Link
              href="/login"
              className="rounded-lg bg-cyan-500 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300"
            >
              Login
            </Link>
          </div>
        </div>
      </header>

      <main className="relative z-10 mx-auto grid min-h-[calc(100vh-81px)] w-full max-w-6xl items-center gap-10 px-5 py-10 md:grid-cols-[1.2fr_1fr] md:px-8">
        <section className="fade-up fade-delay-1 space-y-5">
          <p className="inline-flex rounded-full border border-cyan-200/40 bg-cyan-300/10 px-4 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-cyan-100">
            Fast • Custom • Trackable
          </p>
          <h2 className="text-4xl font-semibold leading-tight tracking-tight md:text-6xl">
            Turn long URLs into
            <span className="block bg-[linear-gradient(90deg,#7dd3fc_0%,#5eead4_45%,#f0fdfa_100%)] bg-clip-text text-transparent">
              branded short links
            </span>
          </h2>
          <p className="max-w-xl text-base text-slate-200 md:text-lg">
            Create memorable URLs, set custom aliases, add expiration dates, and
            monitor click performance from one clean dashboard.
          </p>
        </section>

        <section className="fade-up fade-delay-2 rounded-3xl border border-white/25 bg-white/12 p-5 shadow-[0_24px_70px_-28px_rgba(0,0,0,0.65)] backdrop-blur-xl md:p-6">
          <h3 className="text-xl font-semibold">Create your short link</h3>

          <form onSubmit={handleSubmit} className="mt-5 space-y-3">
            <input
              type="text"
              value={originalUrl}
              onChange={(event) => setOriginalUrl(event.target.value)}
              placeholder="https://example.com/very/long/path"
              className="w-full rounded-xl border border-white/30 bg-white/95 px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-200"
              required
            />
            <input
              type="text"
              value={customCode}
              onChange={(event) => setCustomCode(event.target.value)}
              placeholder="Custom code (optional)"
              className="w-full rounded-xl border border-white/30 bg-white/95 px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-200"
            />
            <input
              type="datetime-local"
              value={expiresAt}
              onChange={(event) => setExpiresAt(event.target.value)}
              className="w-full rounded-xl border border-white/30 bg-white/95 px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-cyan-400 focus:ring-2 focus:ring-cyan-200"
            />
            <select
              value={utmPreset}
              onChange={(event) => setUtmPreset(event.target.value as UtmPreset)}
              className="w-full rounded-xl border border-white/30 bg-white/95 px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-cyan-400 focus:ring-2 focus:ring-cyan-200"
            >
              <option value="none">No UTM preset</option>
              <option value="instagram">Instagram preset</option>
              <option value="whatsapp">WhatsApp preset</option>
              <option value="email">Email preset</option>
            </select>

            <div className="rounded-xl border border-cyan-100/30 bg-black/20 px-4 py-2 text-xs text-cyan-100">
              Preview: {typeof window !== "undefined" ? window.location.origin : "your-domain"}/
              {shortCodePreview || "abc1234"}
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="soft-glow inline-flex w-full items-center justify-center rounded-xl bg-cyan-400 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:bg-cyan-200"
            >
              {isLoading ? "Creating..." : "Generate Short URL"}
            </button>
          </form>

          {error ? (
            <p className="mt-3 rounded-xl border border-rose-200/60 bg-rose-100/95 px-4 py-2 text-sm text-rose-700">
              {error}
            </p>
          ) : null}

          {redirectError === "not-found" ? (
            <p className="mt-3 rounded-xl border border-rose-200/60 bg-rose-100/95 px-4 py-2 text-sm text-rose-700">
              This short URL does not exist.
            </p>
          ) : null}

          {redirectError === "expired" ? (
            <p className="mt-3 rounded-xl border border-amber-200/60 bg-amber-100/95 px-4 py-2 text-sm text-amber-700">
              This short URL has expired.
            </p>
          ) : null}

          {result ? (
            <section className="mt-4 rounded-2xl border border-emerald-200/60 bg-emerald-100/95 p-4 text-slate-900">
              <p className="text-sm font-semibold text-emerald-900">Your short URL</p>
              <a
                href={result.shortUrl}
                target="_blank"
                rel="noreferrer"
                className="mt-1 block break-all text-base font-semibold text-emerald-700 underline decoration-emerald-400 underline-offset-4"
              >
                {result.shortUrl}
              </a>
              <button
                type="button"
                onClick={handleCopyShortUrl}
                className="mt-2 rounded-lg bg-emerald-700 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-emerald-600"
              >
                Copy short URL
              </button>
              <p className="mt-1 text-xs text-emerald-900/90">Redirects to: {result.originalUrl}</p>
              {result.expiresAt ? (
                <p className="mt-1 text-xs text-emerald-900/90">
                  Expires at: {new Date(result.expiresAt).toLocaleString()}
                </p>
              ) : null}
              <div className="mt-3">
                <p className="text-xs font-semibold text-emerald-900">QR Code</p>
                <Image
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(result.shortUrl)}`}
                  alt="Short URL QR code"
                  width={112}
                  height={112}
                  className="mt-2 h-28 w-28 rounded-lg border border-emerald-300 bg-white p-1"
                />
                <a
                  href={`https://api.qrserver.com/v1/create-qr-code/?size=512x512&data=${encodeURIComponent(result.shortUrl)}`}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-2 inline-block text-xs font-semibold text-emerald-800 underline underline-offset-4"
                >
                  Open high-res QR
                </a>
              </div>
            </section>
          ) : null}
        </section>
      </main>

      {toast ? (
        <div className="pointer-events-none fixed bottom-5 right-5 z-20 rounded-lg border border-cyan-200/70 bg-cyan-100/95 px-4 py-2 text-sm font-semibold text-cyan-800 shadow-lg">
          {toast}
        </div>
      ) : null}
    </div>
  );
}
