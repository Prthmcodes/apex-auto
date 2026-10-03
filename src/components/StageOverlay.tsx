"use client";

import { useEffect, useRef } from "react";
import scrollState from "@/lib/scrollState";
import { useReducedMotion } from "@/lib/useReducedMotion";
import { theme } from "./scene/theme";
import { siteContent } from "@/content/site";
import { fadeOpacity } from "./scene/stageFade";

function activeStageIndex(progress: number) {
  const stages = siteContent.stages;
  for (let i = 0; i < stages.length; i += 1) {
    if (progress <= stages[i].range[1] || i === stages.length - 1) return i;
  }
  return stages.length - 1;
}

export default function StageOverlay() {
  const captionRefs = useRef<(HTMLDivElement | null)[]>([]);
  const dotRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    let frame: number;
    const tick = () => {
      const progress = scrollState.progress;
      const active = activeStageIndex(progress);

      siteContent.stages.forEach((stage, i) => {
        const caption = captionRefs.current[i];
        if (caption) {
          caption.style.opacity = String(
            fadeOpacity(progress, stage.range, reducedMotion.current, 0.03)
          );
        }

        const dot = dotRefs.current[i];
        if (dot) {
          const isActive = i === active;
          dot.style.backgroundColor = isActive
            ? theme.primary
            : "rgba(255, 255, 255, 0.3)";
          dot.style.boxShadow = isActive
            ? `0 0 10px 2px ${theme.primary}99`
            : "none";
          dot.style.color = isActive ? theme.background : "rgba(255,255,255,0.7)";
          dot.style.transform = isActive ? "scale(1.15)" : "scale(1)";
        }
      });

      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(frame);
    };
  }, [reducedMotion]);

  return (
    <>
      <div className="pointer-events-none fixed inset-x-0 bottom-16 z-10 flex justify-center px-6 sm:bottom-20">
        <div className="relative h-16 w-full max-w-md text-center">
          {siteContent.stages.map((stage, i) => (
            <div
              key={stage.id}
              ref={(node) => {
                captionRefs.current[i] = node;
              }}
              className="absolute inset-0 flex flex-col items-center justify-center opacity-0"
            >
              <p
                className="text-xs font-semibold uppercase tracking-[0.3em]"
                style={{ color: theme.primary }}
              >
                {stage.title}
              </p>
              <p className="mt-1 text-base text-white/90 sm:text-lg">
                {stage.caption}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* A dark backdrop behind the stack: without it, a dot can wash out
          to near-invisible when it happens to sit over a bright/bloomed
          part of the scene (seen in QA screenshots during the brighter
          stages). */}
      <div
        className="pointer-events-none fixed right-3 top-1/2 z-10 flex -translate-y-1/2 flex-col gap-2.5 rounded-full px-1.5 py-2 sm:right-6"
        style={{ backgroundColor: "rgba(6, 9, 18, 0.45)" }}
      >
        {siteContent.stages.map((stage, i) => (
          <span
            key={stage.id}
            ref={(node) => {
              dotRefs.current[i] = node;
            }}
            className="flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-semibold transition-transform duration-200"
            style={{ backgroundColor: "rgba(255,255,255,0.3)" }}
          >
            {i + 1}
          </span>
        ))}
      </div>
    </>
  );
}
