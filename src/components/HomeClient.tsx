"use client";

import dynamic from "next/dynamic";

// next/dynamic with ssr:false can't be called from a Server Component
// (page.tsx exports metadata, so it must stay one) — this thin client
// wrapper is that boundary. SceneGate (and everything it imports,
// including three.js) only ever loads in the browser.
const SceneGate = dynamic(() => import("@/components/SceneGate"), {
  ssr: false,
});

export default function HomeClient() {
  return <SceneGate />;
}
