"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Lenis from "lenis";
import scrollState from "@/lib/scrollState";

gsap.registerPlugin(ScrollTrigger);

export default function ScrollRig() {
  const spacerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const lenis = new Lenis();

    function syncLenis(time: number) {
      lenis.raf(time * 1000);
    }

    lenis.on("scroll", ScrollTrigger.update);
    gsap.ticker.add(syncLenis);
    gsap.ticker.lagSmoothing(0);

    const trigger = ScrollTrigger.create({
      trigger: spacerRef.current!,
      start: "top top",
      end: "bottom bottom",
      scrub: true,
      onUpdate: (self) => {
        scrollState.progress = self.progress;
      },
    });

    return () => {
      trigger.kill();
      gsap.ticker.remove(syncLenis);
      lenis.destroy();
    };
  }, []);

  return <div ref={spacerRef} style={{ height: "600vh", width: "100%" }} />;
}
