"use client";

import { Component, type ReactNode } from "react";
import FallbackSection from "./FallbackSection";

type Props = { children: ReactNode };
type State = { hasError: boolean };

/**
 * Catches failures mounting the 3D scene — most commonly WebGL being
 * unavailable, which makes @react-three/fiber's Canvas throw during
 * setup — and shows the static fallback section instead.
 */
export default class SceneErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: unknown) {
    console.error("3D scene failed to start, showing fallback:", error);
  }

  render() {
    if (this.state.hasError) {
      return <FallbackSection />;
    }
    return this.props.children;
  }
}
