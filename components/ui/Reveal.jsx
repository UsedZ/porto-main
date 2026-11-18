"use client";

import { useRef, useEffect, useState } from "react";
import { useInView } from "framer-motion";

/**
 * Scroll-reveal wrapper.
 *
 * - Animates `opacity + translateY` once, when the element scrolls into view
 *   (IntersectionObserver via framer-motion's `useInView`, `once: true`).
 * - `stagger` (mapped from `data-stagger`) is the stagger index; delay equals
 *   `stagger * 0.06s`, so a section's children land one after another.
 * - Elements already revealed never animate again.
 * - `prefers-reduced-motion` wins: the element mounts statically (no animation).
 *
 * Elemen inside Hero keep the CSS `.rise` animation and never receive a
 * scroll-reveal, per spec §2.2.
 */
export default function Reveal({
  children,
  stagger = 0,
  className,
  style = {},
  duration = 0.7,
}) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-10%", threshold: 0.15 });

  // Reduced-motion: mount statically (no animation).
  const [reduceMotion, setReduceMotion] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  });

  // Subscribe to reduced-motion changes. The event handler (not the effect body)
  // performs the setState, keeping the effect body side-effect free.
  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onChange = (event) => {
      setReduceMotion(event.matches);
    };
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, []);

  // Saat prefers-reduced-motion aktif: tampilkan konten secara statis
  // (opacity 1, tanpa translansi/animasi) agar tidak hilang selamanya.
  const revealed = inView && !reduceMotion;

  return (
    <div
      ref={ref}
      data-stagger={stagger}
      className={`reveal ${className ?? ""}`}
      style={{
        ...style,
        opacity: reduceMotion ? 1 : revealed ? 1 : 0,
        transform: reduceMotion ? "none" : revealed ? "none" : "translateY(20px)",
        transitionDuration: reduceMotion ? 0 : `${duration}s`,
        transitionProperty: reduceMotion ? "none" : "opacity, transform",
        transitionTimingFunction: "cubic-bezier(0.22, 1, 0.36, 1)",
        transitionDelay: reduceMotion ? 0 : `${stagger * 0.06}s`,
      }}
    >
      {children}
    </div>
  );
}
