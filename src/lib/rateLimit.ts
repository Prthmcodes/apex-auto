// Simple in-memory, per-process rate limiter. Fine for a single demo site —
// it resets on every server restart/cold start and isn't shared across
// multiple instances, but that's an acceptable tradeoff here (see
// PROGRESS.md). Not meant to replace a real rate-limiting service at scale.

const WINDOW_MS = 10 * 60 * 1000; // 10 minutes
const MAX_REQUESTS = 5;

const requestsByKey = new Map<string, number[]>();

/** Returns true if `key` is still under the limit (and records this request). */
export function checkRateLimit(key: string): boolean {
  const now = Date.now();
  const recent = (requestsByKey.get(key) ?? []).filter((t) => now - t < WINDOW_MS);

  if (recent.length >= MAX_REQUESTS) {
    requestsByKey.set(key, recent);
    return false;
  }

  recent.push(now);
  requestsByKey.set(key, recent);
  return true;
}

/** A best-effort client identifier from standard proxy headers (e.g. Vercel). */
export function getClientKey(request: Request): string {
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) return forwardedFor.split(",")[0].trim();

  const realIp = request.headers.get("x-real-ip");
  if (realIp) return realIp;

  return "unknown";
}
