import { useEffect, useRef } from "react";

/** A ref that tracks prefers-reduced-motion, without triggering re-renders. */
export function useReducedMotion() {
  const reduced = useRef(false);

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    reduced.current = query.matches;

    const handleChange = (event: MediaQueryListEvent) => {
      reduced.current = event.matches;
    };
    query.addEventListener("change", handleChange);
    return () => query.removeEventListener("change", handleChange);
  }, []);

  return reduced;
}
