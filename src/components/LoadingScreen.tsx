"use client";

import { theme } from "./scene/theme";
import { siteContent } from "@/content/site";

/**
 * Shows real download progress for the car model, HDR and textures (0 to
 * 100, reported by Experience), then fades out once the 3D scene has
 * rendered its first frame.
 */
export default function LoadingScreen({
  ready,
  progress,
}: {
  ready: boolean;
  progress: number;
}) {
  // Never show a completely empty bar, and hold just short of full until
  // the first frame has actually rendered.
  const width = ready ? 100 : Math.min(95, Math.max(5, progress));

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
      <div
        className="mt-4 h-0.5 w-40 overflow-hidden rounded-full bg-white/10"
        role="progressbar"
        aria-label="Loading"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(width)}
      >
        <div
          className="h-full rounded-full transition-[width] duration-500 ease-out"
          style={{
            backgroundColor: theme.primary,
            width: `${width}%`,
          }}
        />
      </div>
    </div>
  );
}
