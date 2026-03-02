"use client";

/**
 * Ambient particle system — teal & gold dust floating upward.
 *
 * WHAT: Canvas-based particle animation that runs in the background.
 * WHY:  Adds depth and "aliveness" without distracting. GPU-accelerated
 *       via <canvas> so no layout thrashing.
 * HOW:  requestAnimationFrame loop, respects prefers-reduced-motion.
 *
 * PERFORMANCE NOTES:
 * - 30–50 particles at most — felt, not seen.
 * - Particles are simple circles, no images or gradients.
 * - On mobile we halve the count.
 * - Cleans up on unmount.
 */

import { useEffect, useRef } from "react";

interface Particle {
  x: number;
  y: number;
  size: number;
  speedY: number;
  speedX: number;
  opacity: number;
  color: string; // partial rgba string, e.g. "rgba(43,181,160,"
}

interface ParticlesProps {
  /** Max particle count (halved on mobile) */
  count?: number;
  className?: string;
}

export function Particles({ count = 40, className = "" }: ParticlesProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Respect accessibility: no animation if user prefers reduced motion
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (mq.matches) return;

    let animId: number;
    const isMobile = window.innerWidth < 640;
    const actualCount = isMobile ? Math.floor(count / 2) : count;

    // ── Size canvas to container ──
    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      canvas.width = canvas.offsetWidth * dpr;
      canvas.height = canvas.offsetHeight * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener("resize", resize);

    // ── Create particles ──
    const particles: Particle[] = Array.from({ length: actualCount }, () => ({
      x: Math.random() * canvas.offsetWidth,
      y: Math.random() * canvas.offsetHeight,
      size: 1.5 + Math.random() * 2.5,
      speedY: -(0.15 + Math.random() * 0.35), // float upward
      speedX: (Math.random() - 0.5) * 0.25,   // gentle horizontal drift
      opacity: 0.08 + Math.random() * 0.14,
      color: Math.random() > 0.75
        ? "rgba(245,200,66,"   // gold — 25 % chance
        : "rgba(43,181,160,",  // teal — 75 % chance
    }));

    // ── Animation loop ──
    const animate = () => {
      const w = canvas.offsetWidth;
      const h = canvas.offsetHeight;
      ctx.clearRect(0, 0, w, h);

      for (const p of particles) {
        p.y += p.speedY;
        p.x += p.speedX;

        // Wrap around when going off-screen
        if (p.y < -10) {
          p.y = h + 10;
          p.x = Math.random() * w;
        }

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = `${p.color}${p.opacity})`;
        ctx.fill();
      }

      animId = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", resize);
    };
  }, [count]);

  return (
    <canvas
      ref={canvasRef}
      className={`pointer-events-none absolute inset-0 h-full w-full ${className}`}
      aria-hidden="true"
    />
  );
}
