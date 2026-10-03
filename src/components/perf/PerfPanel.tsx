"use client";

import { useEffect, useRef, useState } from "react";
import { siteContent } from "@/content/site";
import { qualityState } from "@/lib/qualityState";
import { perfStats } from "./perfStats";

/**
 * The ?perf corner panel: live fps and render numbers, plus a "Copy
 * report" button that copies a per-stage table to paste back to a
 * developer. Only ever loaded when the URL has ?perf (see Experience.tsx).
 *
 * Refreshes four times a second through a ref, never per frame, so the
 * panel itself barely registers in the numbers it shows.
 */
export default function PerfPanel() {
  const textRef = useRef<HTMLPreElement>(null);
  const [copied, setCopied] = useState<"idle" | "copied" | "failed">("idle");

  useEffect(() => {
    const update = () => {
      const latest = perfStats.latest;
      if (!textRef.current || !latest) return;
      const { fps, avgFps, worst1PercentMs } = perfStats.summary();
      textRef.current.textContent = [
        `fps        ${fps.toFixed(0).padStart(5)}`,
        `avg fps    ${avgFps.toFixed(1).padStart(5)}`,
        `1% low     ${worst1PercentMs.toFixed(1).padStart(5)} ms`,
        `draw calls ${String(latest.drawCalls).padStart(5)}`,
        `triangles  ${latest.triangles.toLocaleString("en-GB").padStart(9)}`,
        `lights     ${String(latest.lights).padStart(5)} (${latest.shadowLights} shadow)`,
        `pixel rt   ${latest.pixelRatio.toFixed(2).padStart(5)}`,
        `JS / frame ${latest.jsMs.toFixed(2).padStart(5)} ms`,
        `quality    ${qualityState.label}`,
        `stage      ${latest.stage + 1} ${siteContent.stages[latest.stage].title}`,
      ].join("\n");
    };
    const timer = window.setInterval(update, 250);
    return () => window.clearInterval(timer);
  }, []);

  const copyReport = async () => {
    const text = perfStats.report({
      screen: `${window.innerWidth}x${window.innerHeight} CSS px, devicePixelRatio ${window.devicePixelRatio}`,
      quality: qualityState.label,
      qualityChanges: qualityState.changes,
    });
    try {
      await navigator.clipboard.writeText(text);
      setCopied("copied");
    } catch {
      // Clipboard can be blocked (e.g. no permission); fall back to the
      // old select-and-copy route.
      const area = document.createElement("textarea");
      area.value = text;
      document.body.appendChild(area);
      area.select();
      const ok = document.execCommand("copy");
      area.remove();
      setCopied(ok ? "copied" : "failed");
    }
    window.setTimeout(() => setCopied("idle"), 2000);
  };

  return (
    <div
      className="fixed left-2 top-16 z-[60] w-60 rounded-lg border border-white/15 p-2 font-mono text-[11px] leading-snug text-white"
      style={{ backgroundColor: "rgba(0, 0, 0, 0.78)" }}
    >
      <pre ref={textRef} className="whitespace-pre">
        waiting for frames…
      </pre>
      <div className="mt-2 flex gap-2">
        <button
          type="button"
          onClick={copyReport}
          className="flex-1 rounded bg-white/90 px-2 py-1 font-sans text-[11px] font-semibold text-black"
        >
          {copied === "copied" ? "Copied!" : copied === "failed" ? "Copy failed" : "Copy report"}
        </button>
        <button
          type="button"
          onClick={() => perfStats.reset()}
          className="rounded border border-white/30 px-2 py-1 font-sans text-[11px]"
        >
          Reset
        </button>
      </div>
    </div>
  );
}
