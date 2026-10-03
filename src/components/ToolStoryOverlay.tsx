"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import scrollState from "@/lib/scrollState";
import { siteContent } from "@/content/site";
import { theme } from "./scene/theme";
import {
  closeStory,
  getServerSnapshot,
  getSnapshot,
  markHintSeen,
  openStory,
  setHover,
  subscribe,
} from "@/lib/toolStory";
import { RISE_START } from "./scene/toolReveal";

const HINT_VISIBLE_MS = 5200;

/**
 * The glass card that opens when a visitor taps one of the floating
 * tools, the one-off hint that tells them they can, and a hidden set of
 * buttons that put the same stories on the keyboard.
 *
 * All of this lives outside the <Canvas> deliberately: a real HTML card
 * reflows to fit a phone, scales its text with the user's settings and is
 * reachable by a screen reader, none of which is true of text drawn into
 * the 3D scene. It talks to the 3D tools through the small shared store
 * in lib/toolStory.ts.
 */
export default function ToolStoryOverlay() {
  const state = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const story = siteContent.toolStories.find((entry) => entry.id === state.openId);
  const closeRef = useRef<HTMLButtonElement>(null);

  // --- the first-time hint ------------------------------------------------
  const [hintVisible, setHintVisible] = useState(false);
  useEffect(() => {
    if (state.hintSeen) {
      setHintVisible(false);
      return;
    }
    // Only offer it once the tools are actually on screen to be tapped.
    let timer: number | undefined;
    let frame = requestAnimationFrame(function check() {
      if (scrollState.progress >= RISE_START + 0.05) {
        setHintVisible(true);
        timer = window.setTimeout(() => {
          setHintVisible(false);
          markHintSeen();
        }, HINT_VISIBLE_MS);
        return;
      }
      frame = requestAnimationFrame(check);
    });
    return () => {
      cancelAnimationFrame(frame);
      if (timer) clearTimeout(timer);
    };
  }, [state.hintSeen]);

  // --- closing ------------------------------------------------------------
  useEffect(() => {
    if (!state.openId) return;

    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeStory();
    };
    window.addEventListener("keydown", onKey);

    // Scrolling on dismisses the card, so it never trails the camera into
    // the next stage. Recorded at the moment it opened.
    const openedAt = scrollState.progress;
    let frame = requestAnimationFrame(function watch() {
      if (Math.abs(scrollState.progress - openedAt) > 0.012) {
        closeStory();
        return;
      }
      frame = requestAnimationFrame(watch);
    });

    return () => {
      window.removeEventListener("keydown", onKey);
      cancelAnimationFrame(frame);
    };
  }, [state.openId]);

  // Move focus to the card's close button so keyboard users land inside it.
  useEffect(() => {
    if (state.openId) closeRef.current?.focus();
  }, [state.openId]);

  return (
    <>
      {/* Hidden, but in the tab order: the same six stories, reachable
          without a pointer. Placed before the card so Tab order reads
          tool -> its card. */}
      <div className="sr-only">
        <h2>Workshop tools</h2>
        <ul>
          {siteContent.toolStories.map((entry) => (
            <li key={entry.id}>
              <button
                type="button"
                aria-expanded={state.openId === entry.id}
                onFocus={() => setHover(entry.id)}
                onBlur={() => setHover(null)}
                onClick={() => openStory(entry.id)}
              >
                {entry.title}
              </button>
            </li>
          ))}
        </ul>
      </div>

      {/* Click-away backdrop. Transparent and, crucially, not a scroll
          blocker: it only listens for a click, so wheel and touch scrolling
          pass straight through to the page underneath. */}
      {story ? (
        <div
          className="fixed inset-0 z-20"
          style={{ background: "transparent" }}
          onClick={closeStory}
          aria-hidden="true"
        />
      ) : null}

      {story ? (
        <div
          className="pointer-events-none fixed inset-x-0 top-20 z-30 flex justify-center px-4 sm:top-24"
          role="dialog"
          aria-modal="false"
          aria-labelledby="tool-story-title"
        >
          <div
            className="pointer-events-auto w-full max-w-xs rounded-2xl border p-4 shadow-2xl backdrop-blur-md sm:max-w-sm"
            style={{
              borderColor: `${theme.primary}40`,
              backgroundColor: "rgba(10, 14, 24, 0.82)",
            }}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3">
              <h3
                id="tool-story-title"
                className="text-sm font-semibold uppercase tracking-[0.18em]"
                style={{ color: theme.primary }}
              >
                {story.title}
              </h3>
              <button
                ref={closeRef}
                type="button"
                onClick={closeStory}
                aria-label="Close"
                className="-m-1 shrink-0 rounded-full p-1 text-white/60 transition-colors hover:text-white focus:outline-none focus-visible:ring-2"
                style={{ outlineColor: theme.primary }}
              >
                <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
                  <path
                    d="M4 4l8 8M12 4l-8 8"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                  />
                </svg>
              </button>
            </div>
            <p className="mt-2 text-sm leading-relaxed text-white/85">{story.body}</p>
          </div>
        </div>
      ) : null}

      {/* The one-off nudge. Sits above the stage caption, never over it. */}
      <div
        className="pointer-events-none fixed inset-x-0 bottom-36 z-10 flex justify-center px-6 transition-opacity duration-700 sm:bottom-40"
        style={{ opacity: hintVisible && !story ? 1 : 0 }}
        aria-hidden="true"
      >
        <span
          className="rounded-full border px-3 py-1 text-[11px] font-medium tracking-wide text-white/80 backdrop-blur-sm"
          style={{
            borderColor: "rgba(255,255,255,0.16)",
            backgroundColor: "rgba(10, 14, 24, 0.6)",
          }}
        >
          {siteContent.toolHint}
        </span>
      </div>
    </>
  );
}
