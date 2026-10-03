"use client";

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";

/** Fires onReady once, the first time the scene actually renders a frame. */
export default function SceneReady({ onReady }: { onReady?: () => void }) {
  const fired = useRef(false);

  useFrame(() => {
    if (!fired.current) {
      fired.current = true;
      onReady?.();
    }
  });

  return null;
}
