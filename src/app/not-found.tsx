import Link from "next/link";
import { siteContent } from "@/content/site";
import { theme } from "@/components/scene/theme";

export default function NotFound() {
  return (
    <div
      className="flex min-h-screen flex-col items-center justify-center gap-4 px-6 text-center text-white"
      style={{ backgroundColor: theme.background }}
    >
      <p
        className="text-xs font-semibold uppercase tracking-[0.4em]"
        style={{ color: theme.teal }}
      >
        404
      </p>
      <h1 className="text-3xl font-semibold sm:text-4xl">Page not found</h1>
      <p className="max-w-sm text-white/65">
        That page doesn&apos;t exist. Head back to {siteContent.business.name}.
      </p>
      <Link
        href="/"
        className="mt-2 rounded-full px-6 py-3 text-sm font-semibold uppercase tracking-wide focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
        style={{ backgroundColor: theme.teal, color: theme.background }}
      >
        Back home
      </Link>
    </div>
  );
}
