"use client";

import dynamic from "next/dynamic";
import ScrollRig from "@/components/ScrollRig";

const Experience = dynamic(() => import("@/components/Experience"), {
  ssr: false,
});

export default function Home() {
  return (
    <>
      <Experience />
      <ScrollRig />
    </>
  );
}
