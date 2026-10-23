"use client";

import { useEffect, useRef } from "react";

/** Fixed animated gradient + a lightweight canvas of drifting particles (~40 dots, paused when hidden). */
export function Background() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <div className="absolute -inset-[30%] animate-gradient opacity-70 [background:radial-gradient(40%_35%_at_20%_25%,rgb(34_211_238/0.22),transparent_70%),radial-gradient(35%_35%_at_80%_20%,rgb(168_85_247/0.25),transparent_70%),radial-gradient(45%_40%_at_60%_85%,rgb(244_114_182/0.18),transparent_70%)]" />
      <div className="absolute inset-0 opacity-[0.07] [background-image:linear-gradient(rgb(255_255_255/0.6)_1px,transparent_1px),linear-gradient(90deg,rgb(255_255_255/0.6)_1px,transparent_1px)] [background-size:56px_56px] [mask-image:radial-gradient(ellipse_at_center,black_20%,transparent_75%)]" />
      <Particles />
    </div>
  );
}

const COLORS = ["34,211,238", "168,85,247", "244,114,182"];

function Particles() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let width = 0;
    let height = 0;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const resize = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();

    const count = width < 640 ? 22 : 42;
    const dots = Array.from({ length: count }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      r: Math.random() * 1.6 + 0.4,
      vx: (Math.random() - 0.5) * 0.15,
      vy: -(Math.random() * 0.25 + 0.05),
      c: COLORS[Math.floor(Math.random() * COLORS.length)],
      a: Math.random() * 0.5 + 0.25,
    }));

    let frame = 0;
    const draw = () => {
      ctx.clearRect(0, 0, width, height);
      for (const d of dots) {
        d.x += d.vx;
        d.y += d.vy;
        if (d.y < -10) {
          d.y = height + 10;
          d.x = Math.random() * width;
        }
        if (d.x < -10) d.x = width + 10;
        if (d.x > width + 10) d.x = -10;
        ctx.beginPath();
        ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${d.c},${d.a})`;
        ctx.shadowBlur = 8;
        ctx.shadowColor = `rgba(${d.c},0.8)`;
        ctx.fill();
      }
      if (!reduced) frame = requestAnimationFrame(draw);
    };
    draw();

    const onVisibility = () => {
      cancelAnimationFrame(frame);
      if (!document.hidden && !reduced) frame = requestAnimationFrame(draw);
    };
    window.addEventListener("resize", resize);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", resize);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  return <canvas ref={ref} className="absolute inset-0 h-full w-full" />;
}
