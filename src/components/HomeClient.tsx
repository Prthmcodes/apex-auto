"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import ScrollRig from "@/components/ScrollRig";
import StageOverlay from "@/components/StageOverlay";
import ConversionOverlay from "@/components/ConversionOverlay";
import LoadingScreen from "@/components/LoadingScreen";
import SceneErrorBoundary from "@/components/SceneErrorBoundary";

const Experience = dynamic(() => import("@/components/Experience"), {
  ssr: false,
});

export default function HomeClient() {
  const [ready, setReady] = useState(false);

  return (
    <SceneErrorBoundary>
      <Experience onReady={() => setReady(true)} />
      <StageOverlay />
      <ConversionOverlay />
      <ScrollRig />
      <LoadingScreen ready={ready} />
    </SceneErrorBoundary>
  );
}
