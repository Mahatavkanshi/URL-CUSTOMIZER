import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { createSessionToken, isValidPassword, isValidSessionToken, SESSION_COOKIE_NAME } from "@/lib/auth";
import {
  clearLoginFailures,
  getClientIp,
  getLoginThrottleState,
  recordLoginFailure,
} from "@/lib/login-rate-limit";

type LoginPageProps = {
  searchParams: Promise<{ error?: string; status?: string; next?: string; retry?: string }>;
};

async function loginAction(formData: FormData) {
  "use server";

  const password = String(formData.get("password") ?? "");
  const nextPath = String(formData.get("next") ?? "/links");
  const headerStore = await headers();
  const clientIp = getClientIp(headerStore);

  const throttleState = await getLoginThrottleState(clientIp);

  if (throttleState.isLocked) {
    redirect(
      `/login?error=locked&retry=${throttleState.retryAfterSeconds}${
        nextPath ? `&next=${encodeURIComponent(nextPath)}` : ""
      }`,
    );
  }

  if (!(await isValidPassword(password))) {
    const nextState = await recordLoginFailure(clientIp);

    if (nextState.isLocked) {
      redirect(
        `/login?error=locked&retry=${nextState.retryAfterSeconds}${
          nextPath ? `&next=${encodeURIComponent(nextPath)}` : ""
        }`,
      );
    }

    redirect(`/login?error=invalid${nextPath ? `&next=${encodeURIComponent(nextPath)}` : ""}`);
  }

  await clearLoginFailures(clientIp);

  const sessionStore = await cookies();
  sessionStore.set({
    name: SESSION_COOKIE_NAME,
    value: createSessionToken(),
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });

  redirect(nextPath.startsWith("/") ? nextPath : "/links");
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const sessionStore = await cookies();
  const sessionToken = sessionStore.get(SESSION_COOKIE_NAME)?.value;

  if (sessionToken && isValidSessionToken(sessionToken)) {
    redirect("/links");
  }

  const { error, status, next, retry } = await searchParams;
  const nextPath = next && next.startsWith("/") ? next : "/links";
  const retrySeconds = Number.parseInt(retry ?? "0", 10) || 0;

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden px-5 py-10 text-white md:px-8">
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{
          backgroundImage:
            "url('https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=2200&q=80')",
        }}
      />
      <div className="absolute inset-0 bg-[linear-gradient(130deg,rgba(7,18,38,0.9)_0%,rgba(21,43,90,0.66)_48%,rgba(10,98,132,0.62)_100%)]" />

      <main className="fade-up fade-delay-1 relative z-10 w-full max-w-md rounded-3xl border border-white/25 bg-white/10 p-6 shadow-[0_30px_70px_-32px_rgba(0,0,0,0.7)] backdrop-blur-xl md:p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-cyan-100">Admin Access</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-white">Sign in</h1>
        <p className="mt-2 text-sm text-slate-200">
          Login to manage links, update short codes, and handle analytics.
        </p>

        {error === "invalid" ? (
          <p className="mt-4 rounded-xl border border-rose-200/70 bg-rose-100/95 px-4 py-3 text-sm font-medium text-rose-700">
            Wrong password. Try again.
          </p>
        ) : null}

        {error === "unauthorized" ? (
          <p className="mt-4 rounded-xl border border-rose-200/70 bg-rose-100/95 px-4 py-3 text-sm font-medium text-rose-700">
            Please login to continue.
          </p>
        ) : null}

        {error === "locked" ? (
          <p className="mt-4 rounded-xl border border-amber-200/70 bg-amber-100/95 px-4 py-3 text-sm font-medium text-amber-800">
            Too many failed attempts. Try again in {retrySeconds} seconds.
          </p>
        ) : null}

        {status === "logged-out" ? (
          <p className="mt-4 rounded-xl border border-emerald-200/70 bg-emerald-100/95 px-4 py-3 text-sm font-medium text-emerald-800">
            Logged out successfully.
          </p>
        ) : null}

        <form action={loginAction} className="mt-6 space-y-4">
          <input type="hidden" name="next" value={nextPath} />
          <label className="block">
            <span className="mb-2 block text-sm font-medium text-slate-100">Admin Password</span>
            <input
              type="password"
              name="password"
              placeholder="Enter your admin password"
              className="w-full rounded-xl border border-white/35 bg-white/95 px-4 py-3 text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-200"
              required
            />
          </label>

          <button
            type="submit"
            className="soft-glow inline-flex w-full items-center justify-center rounded-xl bg-cyan-400 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300"
          >
            Login
          </button>
        </form>
      </main>
    </div>
  );
}
