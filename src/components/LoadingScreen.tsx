"use client";

import { theme } from "./scene/theme";
import { siteContent } from "@/content/site";

/**
 * Fades out once the 3D scene has rendered its first frame. There's no
 * meaningful byte-level progress to track here (no large assets to fetch),
 * so the bar just jumps to full once `ready` flips true.
 */
export default function LoadingScreen({ ready }: { ready: boolean }) {
  return (
    <div
      aria-hidden={ready}
      className={`pointer-events-none fixed inset-0 z-50 flex flex-col items-center justify-center transition-opacity duration-700 ${
        ready ? "opacity-0" : "opacity-100"
      }`}
      style={{ backgroundColor: theme.background }}
    >
      <p
        className="text-sm font-semibold uppercase tracking-[0.5em]"
        style={{ color: theme.primary }}
      >
        {siteContent.business.name}
      </p>
      <div className="mt-4 h-0.5 w-40 overflow-hidden rounded-full bg-white/10">
        <div
          className="h-full rounded-full transition-[width] duration-500 ease-out"
          style={{
            backgroundColor: theme.primary,
            width: ready ? "100%" : "65%",
          }}
        />
      </div>
    </div>
  );
}
