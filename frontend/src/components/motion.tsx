"use client";

import { domAnimation, LazyMotion, m, MotionConfig, type HTMLMotionProps } from "framer-motion";

/** LazyMotion + `m` keeps the animation runtime to the small DOM feature set. */
export function MotionProvider({ children }: { children: React.ReactNode }) {
  return (
    <LazyMotion features={domAnimation} strict>
      <MotionConfig reducedMotion="user">{children}</MotionConfig>
    </LazyMotion>
  );
}

export function FadeIn({ delay = 0, y = 16, ...props }: HTMLMotionProps<"div"> & { delay?: number; y?: number }) {
  return (
    <m.div
      initial={{ opacity: 0, y }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay, ease: [0.22, 1, 0.36, 1] }}
      {...props}
    />
  );
}

export { m };
