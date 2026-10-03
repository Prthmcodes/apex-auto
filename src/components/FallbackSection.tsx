import { siteContent } from "@/content/site";
import { theme } from "./scene/theme";

/** Shown instead of the 3D scene when WebGL isn't available. */
export default function FallbackSection() {
  return (
    <div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-4 px-6 text-center"
      style={{ backgroundColor: theme.background }}
    >
      <p
        className="text-xs font-semibold uppercase tracking-[0.4em]"
        style={{ color: theme.teal }}
      >
        {siteContent.business.area}
      </p>
      <h1 className="text-3xl font-semibold text-white sm:text-4xl">
        {siteContent.business.name}
      </h1>
      <a
        href={siteContent.cta.callNowHref}
        className="mt-2 rounded-full px-6 py-3 text-sm font-semibold uppercase tracking-wide"
        style={{ backgroundColor: theme.teal, color: theme.background }}
      >
        {siteContent.cta.callNowLabel}
      </a>
    </div>
  );
}
