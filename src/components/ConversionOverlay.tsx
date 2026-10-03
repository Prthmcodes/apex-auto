"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import scrollState from "@/lib/scrollState";
import { useReducedMotion } from "@/lib/useReducedMotion";
import { theme } from "./scene/theme";
import { siteContent } from "@/content/site";
import { fadeOpacity } from "./scene/stageFade";
import { setStyle } from "@/lib/setStyle";

const TOP_BAR_VISIBLE_FROM = siteContent.stages[1].range[0]; // "inspect" stage start
const FINAL_CTA_RANGE = siteContent.stages[5].range; // "done" stage
const credit = siteContent.carModelCredit;

/**
 * Two scroll-driven HTML pieces, both outside the canvas per the project
 * rules: a slim top bar (name + a small Book link) that appears from stage
 * 2 onward and stays, and the final "Book a service" / "Call us" buttons
 * that fade in during the last stage, with the car model's licence credit
 * underneath.
 */
export default function ConversionOverlay() {
  const topBarRef = useRef<HTMLDivElement>(null);
  const finalCtaRef = useRef<HTMLDivElement>(null);
  const creditRef = useRef<HTMLParagraphElement>(null);
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    let frame: number;
    const tick = () => {
      const progress = scrollState.progress;

      if (topBarRef.current) {
        setStyle(
          topBarRef.current,
          "opacity",
          String(fadeOpacity(progress, [TOP_BAR_VISIBLE_FROM, 1], reducedMotion.current, 0.03))
        );
      }

      if (finalCtaRef.current) {
        setStyle(
          finalCtaRef.current,
          "opacity",
          String(fadeOpacity(progress, FINAL_CTA_RANGE, reducedMotion.current))
        );
      }

      if (creditRef.current) {
        const opacity = fadeOpacity(progress, FINAL_CTA_RANGE, reducedMotion.current);
        setStyle(creditRef.current, "opacity", String(opacity * 0.7));
        // Only clickable while it's actually visible.
        setStyle(creditRef.current, "pointerEvents", opacity > 0.5 ? "auto" : "none");
      }

      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);

    return () => cancelAnimationFrame(frame);
  }, [reducedMotion]);

  return (
    <>
      <div
        ref={topBarRef}
        className="fixed inset-x-0 top-0 z-20 flex items-center justify-between px-4 py-3 opacity-0 sm:px-6"
        style={{
          backgroundColor: "rgba(6, 9, 18, 0.55)",
          backdropFilter: "blur(6px)",
        }}
      >
        <span className="text-sm font-semibold uppercase tracking-[0.25em] text-white">
          {siteContent.business.name}
        </span>
        <Link
          href={siteContent.cta.bookNowHref}
          className="rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-wide transition-transform focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white active:scale-95"
          style={{ backgroundColor: theme.primary, color: theme.background }}
        >
          {siteContent.cta.topBarBookLabel}
        </Link>
      </div>

      {/* bottom-40 deliberately clears the stage-caption zone (StageOverlay
          sits at bottom-16/bottom-20, h-16), so the "Done" caption and these
          buttons don't overlap while both are visible during stage 6. */}
      <div
        ref={finalCtaRef}
        className="pointer-events-none fixed inset-x-0 bottom-40 z-20 flex justify-center px-4 opacity-0"
      >
        <div className="pointer-events-auto flex w-full max-w-md flex-col gap-3 sm:flex-row">
          <Link
            href={siteContent.cta.bookNowHref}
            className="flex min-h-[52px] flex-1 items-center justify-center rounded-full px-6 text-base font-semibold uppercase tracking-wide transition-transform focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white active:scale-95"
            style={{ backgroundColor: theme.primary, color: theme.background }}
          >
            {siteContent.cta.bookNowLabel}
          </Link>
          <a
            href={siteContent.cta.callNowHref}
            className="flex min-h-[52px] flex-1 items-center justify-center rounded-full border-2 px-6 text-base font-semibold uppercase tracking-wide transition-transform focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white active:scale-95"
            style={{ borderColor: theme.accent, color: theme.accent }}
          >
            {siteContent.cta.callNowLabel}
          </a>
        </div>
      </div>

      {/* Licence credit for the 3D car model (CC BY 4.0 requires one). */}
      <p
        ref={creditRef}
        className="pointer-events-none fixed inset-x-0 bottom-2 z-20 px-16 text-center text-[10px] leading-snug text-white/80 opacity-0"
      >
        {credit.prefix}:{" "}
        <a href={credit.titleUrl} className="underline underline-offset-2" target="_blank" rel="noopener noreferrer">
          “{credit.title}”
        </a>{" "}
        by{" "}
        <a href={credit.authorUrl} className="underline underline-offset-2" target="_blank" rel="noopener noreferrer">
          {credit.author}
        </a>
        ,{" "}
        <a href={credit.licenseUrl} className="underline underline-offset-2" target="_blank" rel="noopener noreferrer">
          {credit.license}
        </a>{" "}
        ({credit.changes})
      </p>
    </>
  );
}
