"use client";

import { cn } from "@/lib/utils";
import { useRef, useEffect, useCallback } from "react";

interface GlobeProps {
  className?: string;
  size?: number;
  dotColor?: string;
  arcColor?: string;
  markerColor?: string;
  autoRotateSpeed?: number;
  connections?: { from: [number, number]; to: [number, number] }[];
  markers?: { lat: number; lng: number; label?: string }[];
}

// All 16 Ghana regions spread across the globe surface.
// Each region occupies a sector so towns fill the entire sphere.
const DEFAULT_MARKERS = [
  // ── Greater Accra (center-front, the hub) ──
  { lat: 10, lng: 0, label: "Accra" },
  { lat: 6, lng: 10, label: "Tema" },
  { lat: 14, lng: -10, label: "Madina" },
  { lat: 4, lng: -5, label: "Ashaiman" },
  { lat: 16, lng: 8, label: "Dodowa" },

  // ── Ashanti (upper-right quadrant) ──
  { lat: 35, lng: 55, label: "Kumasi" },
  { lat: 30, lng: 65, label: "Obuasi" },
  { lat: 40, lng: 48, label: "Ejisu" },
  { lat: 28, lng: 58, label: "Mampong" },

  // ── Western (lower-left) ──
  { lat: -25, lng: -50, label: "Takoradi" },
  { lat: -30, lng: -58, label: "Tarkwa" },
  { lat: -20, lng: -44, label: "Axim" },
  { lat: -34, lng: -52, label: "Half Assini" },

  // ── Western North ──
  { lat: -10, lng: -75, label: "Sefwi Wiawso" },
  { lat: -6, lng: -82, label: "Bibiani" },
  { lat: -14, lng: -70, label: "Juaboso" },

  // ── Central (lower-front) ──
  { lat: -20, lng: 10, label: "Cape Coast" },
  { lat: -16, lng: 20, label: "Winneba" },
  { lat: -24, lng: 4, label: "Elmina" },
  { lat: -12, lng: 16, label: "Swedru" },

  // ── Eastern (right) ──
  { lat: 15, lng: 85, label: "Koforidua" },
  { lat: 20, lng: 92, label: "Nkawkaw" },
  { lat: 10, lng: 78, label: "Akosombo" },
  { lat: 22, lng: 80, label: "Suhum" },

  // ── Volta (far right) ──
  { lat: -5, lng: 120, label: "Ho" },
  { lat: 0, lng: 128, label: "Hohoe" },
  { lat: -10, lng: 114, label: "Keta" },
  { lat: -8, lng: 132, label: "Aflao" },

  // ── Oti (far-right upper) ──
  { lat: 25, lng: 135, label: "Dambai" },
  { lat: 30, lng: 142, label: "Jasikan" },
  { lat: 20, lng: 128, label: "Nkwanta" },

  // ── Northern (top) ──
  { lat: 60, lng: 0, label: "Tamale" },
  { lat: 64, lng: 12, label: "Savelugu" },
  { lat: 56, lng: -10, label: "Yendi" },
  { lat: 68, lng: 5, label: "Tolon" },

  // ── Savannah (top-left) ──
  { lat: 55, lng: -45, label: "Damongo" },
  { lat: 60, lng: -55, label: "Bole" },
  { lat: 50, lng: -38, label: "Salaga" },

  // ── North East (top-right) ──
  { lat: 58, lng: 50, label: "Nalerigu" },
  { lat: 62, lng: 58, label: "Walewale" },
  { lat: 54, lng: 44, label: "Gambaga" },

  // ── Upper East (top, slightly right) ──
  { lat: 72, lng: 35, label: "Bolgatanga" },
  { lat: 76, lng: 42, label: "Bawku" },
  { lat: 70, lng: 28, label: "Navrongo" },
  { lat: 78, lng: 38, label: "Paga" },

  // ── Upper West (top-left) ──
  { lat: 70, lng: -30, label: "Wa" },
  { lat: 74, lng: -22, label: "Lawra" },
  { lat: 68, lng: -38, label: "Tumu" },
  { lat: 76, lng: -26, label: "Jirapa" },

  // ── Bono (left) ──
  { lat: 30, lng: -110, label: "Sunyani" },
  { lat: 26, lng: -102, label: "Berekum" },
  { lat: 34, lng: -118, label: "Dormaa Ahenkro" },
  { lat: 22, lng: -106, label: "Wenchi" },

  // ── Bono East (back-left) ──
  { lat: 10, lng: -140, label: "Techiman" },
  { lat: 6, lng: -132, label: "Atebubu" },
  { lat: 14, lng: -148, label: "Kintampo" },
  { lat: 2, lng: -136, label: "Nkoranza" },

  // ── Ahafo (lower-back) ──
  { lat: -15, lng: -130, label: "Goaso" },
  { lat: -10, lng: -122, label: "Kenyasi" },
  { lat: -18, lng: -138, label: "Hwidiem" },
  { lat: -22, lng: -126, label: "Duayaw Nkwanta" },
];

const DEFAULT_CONNECTIONS: { from: [number, number]; to: [number, number] }[] = [
  // ── Accra as the central hub ──
  { from: [10, 0], to: [35, 55] },        // Accra → Kumasi
  { from: [10, 0], to: [-20, 10] },       // Accra → Cape Coast
  { from: [10, 0], to: [60, 0] },         // Accra → Tamale
  { from: [10, 0], to: [15, 85] },        // Accra → Koforidua
  { from: [10, 0], to: [-25, -50] },      // Accra → Takoradi
  { from: [10, 0], to: [-5, 120] },       // Accra → Ho

  // ── Regional capital connections (long arcs) ──
  { from: [35, 55], to: [30, -110] },     // Kumasi → Sunyani
  { from: [35, 55], to: [30, 65] },       // Kumasi → Obuasi
  { from: [60, 0], to: [72, 35] },        // Tamale → Bolgatanga
  { from: [60, 0], to: [70, -30] },       // Tamale → Wa
  { from: [60, 0], to: [55, -45] },       // Tamale → Damongo
  { from: [60, 0], to: [58, 50] },        // Tamale → Nalerigu
  { from: [-5, 120], to: [25, 135] },     // Ho → Dambai
  { from: [30, -110], to: [10, -140] },   // Sunyani → Techiman
  { from: [10, -140], to: [-15, -130] },  // Techiman → Goaso
  { from: [-20, 10], to: [-25, -50] },    // Cape Coast → Takoradi
  { from: [-25, -50], to: [-10, -75] },   // Takoradi → Sefwi Wiawso
  { from: [72, 35], to: [76, 42] },       // Bolgatanga → Bawku
  { from: [70, -30], to: [74, -22] },     // Wa → Lawra
  { from: [15, 85], to: [20, 92] },       // Koforidua → Nkawkaw

  // ── Cross-country long arcs (visual drama) ──
  { from: [72, 35], to: [-20, 10] },      // Bolgatanga → Cape Coast
  { from: [70, -30], to: [-5, 120] },     // Wa → Ho
  { from: [30, -110], to: [-25, -50] },   // Sunyani → Takoradi
  { from: [58, 50], to: [25, 135] },      // Nalerigu → Dambai
];

function latLngToXYZ(lat: number, lng: number, radius: number): [number, number, number] {
  const phi = ((90 - lat) * Math.PI) / 180;
  const theta = ((lng + 180) * Math.PI) / 180;
  return [
    -(radius * Math.sin(phi) * Math.cos(theta)),
    radius * Math.cos(phi),
    radius * Math.sin(phi) * Math.sin(theta),
  ];
}

function rotateY(x: number, y: number, z: number, angle: number): [number, number, number] {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  return [x * cos + z * sin, y, -x * sin + z * cos];
}

function rotateX(x: number, y: number, z: number, angle: number): [number, number, number] {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  return [x, y * cos - z * sin, y * sin + z * cos];
}

function project(x: number, y: number, z: number, cx: number, cy: number, fov: number): [number, number] {
  const scale = fov / (fov + z);
  return [x * scale + cx, y * scale + cy];
}

export function InteractiveGlobe({
  className,
  size = 600,
  dotColor = "rgba(43, 181, 160, ALPHA)",
  arcColor = "rgba(43, 181, 160, 0.4)",
  markerColor = "rgba(245, 200, 66, 1)",
  autoRotateSpeed = 0.0015,
  connections = DEFAULT_CONNECTIONS,
  markers = DEFAULT_MARKERS,
}: GlobeProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rotYRef = useRef(0.5);
  const rotXRef = useRef(0.15);
  const dragRef = useRef({
    active: false, startX: 0, startY: 0, startRotY: 0, startRotX: 0,
  });
  const animRef = useRef<number>(0);
  const timeRef = useRef(0);
  const dotsRef = useRef<[number, number, number][]>([]);

  useEffect(() => {
    const dots: [number, number, number][] = [];
    const numDots = 1200;
    const goldenRatio = (1 + Math.sqrt(5)) / 2;
    for (let i = 0; i < numDots; i++) {
      const theta = (2 * Math.PI * i) / goldenRatio;
      const phi = Math.acos(1 - (2 * (i + 0.5)) / numDots);
      dots.push([
        Math.cos(theta) * Math.sin(phi),
        Math.cos(phi),
        Math.sin(theta) * Math.sin(phi),
      ]);
    }
    dotsRef.current = dots;
  }, []);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    ctx.scale(dpr, dpr);

    const cx = w / 2;
    const cy = h / 2;
    const radius = Math.min(w, h) * 0.38;
    const fov = 600;

    if (!dragRef.current.active) {
      rotYRef.current += autoRotateSpeed;
    }

    timeRef.current += 0.015;
    const time = timeRef.current;

    ctx.clearRect(0, 0, w, h);

    // Outer glow — teal-tinted
    const glowGrad = ctx.createRadialGradient(cx, cy, radius * 0.8, cx, cy, radius * 1.5);
    glowGrad.addColorStop(0, "rgba(43, 181, 160, 0.04)");
    glowGrad.addColorStop(1, "rgba(43, 181, 160, 0)");
    ctx.fillStyle = glowGrad;
    ctx.fillRect(0, 0, w, h);

    // Globe ring
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.strokeStyle = "rgba(43, 181, 160, 0.08)";
    ctx.lineWidth = 1;
    ctx.stroke();

    const ry = rotYRef.current;
    const rx = rotXRef.current;

    // Dots (fibonacci sphere)
    const dots = dotsRef.current;
    for (let i = 0; i < dots.length; i++) {
      let [x, y, z] = dots[i];
      x *= radius; y *= radius; z *= radius;
      [x, y, z] = rotateX(x, y, z, rx);
      [x, y, z] = rotateY(x, y, z, ry);
      if (z > 0) continue;

      const [sx, sy] = project(x, y, z, cx, cy, fov);
      const depthAlpha = Math.max(0.1, 1 - (z + radius) / (2 * radius));
      ctx.beginPath();
      ctx.arc(sx, sy, 1 + depthAlpha * 0.8, 0, Math.PI * 2);
      ctx.fillStyle = dotColor.replace("ALPHA", depthAlpha.toFixed(2));
      ctx.fill();
    }

    // Arc connections
    for (const conn of connections) {
      let [x1, y1, z1] = latLngToXYZ(conn.from[0], conn.from[1], radius);
      let [x2, y2, z2] = latLngToXYZ(conn.to[0], conn.to[1], radius);

      [x1, y1, z1] = rotateX(x1, y1, z1, rx);
      [x1, y1, z1] = rotateY(x1, y1, z1, ry);
      [x2, y2, z2] = rotateX(x2, y2, z2, rx);
      [x2, y2, z2] = rotateY(x2, y2, z2, ry);

      if (z1 > radius * 0.3 && z2 > radius * 0.3) continue;

      const [sx1, sy1] = project(x1, y1, z1, cx, cy, fov);
      const [sx2, sy2] = project(x2, y2, z2, cx, cy, fov);

      // Elevated arc midpoint
      const midX = (x1 + x2) / 2;
      const midY = (y1 + y2) / 2;
      const midZ = (z1 + z2) / 2;
      const midLen = Math.sqrt(midX * midX + midY * midY + midZ * midZ);
      const arcH = radius * 1.25;
      const [scx, scy] = project(
        (midX / midLen) * arcH,
        (midY / midLen) * arcH,
        (midZ / midLen) * arcH,
        cx, cy, fov,
      );

      ctx.beginPath();
      ctx.moveTo(sx1, sy1);
      ctx.quadraticCurveTo(scx, scy, sx2, sy2);
      ctx.strokeStyle = arcColor;
      ctx.lineWidth = 1.2;
      ctx.stroke();

      // Traveling pulse along arc
      const t = (Math.sin(time * 1.2 + conn.from[0] * 0.1) + 1) / 2;
      const tx = (1 - t) * (1 - t) * sx1 + 2 * (1 - t) * t * scx + t * t * sx2;
      const ty = (1 - t) * (1 - t) * sy1 + 2 * (1 - t) * t * scy + t * t * sy2;
      ctx.beginPath();
      ctx.arc(tx, ty, 2, 0, Math.PI * 2);
      ctx.fillStyle = markerColor;
      ctx.fill();
    }

    // City markers
    for (const marker of markers) {
      let [x, y, z] = latLngToXYZ(marker.lat, marker.lng, radius);
      [x, y, z] = rotateX(x, y, z, rx);
      [x, y, z] = rotateY(x, y, z, ry);
      if (z > radius * 0.1) continue;

      const [sx, sy] = project(x, y, z, cx, cy, fov);

      // Pulse ring
      const pulse = Math.sin(time * 2 + marker.lat) * 0.5 + 0.5;
      ctx.beginPath();
      ctx.arc(sx, sy, 4 + pulse * 4, 0, Math.PI * 2);
      ctx.strokeStyle = markerColor.replace("1)", `${0.2 + pulse * 0.15})`);
      ctx.lineWidth = 1;
      ctx.stroke();

      // Core dot
      ctx.beginPath();
      ctx.arc(sx, sy, 2.5, 0, Math.PI * 2);
      ctx.fillStyle = markerColor;
      ctx.fill();

      // Label
      if (marker.label) {
        ctx.font = "10px system-ui, sans-serif";
        ctx.fillStyle = markerColor.replace("1)", "0.6)");
        ctx.fillText(marker.label, sx + 8, sy + 3);
      }
    }

    animRef.current = requestAnimationFrame(draw);
  }, [dotColor, arcColor, markerColor, autoRotateSpeed, connections, markers]);

  useEffect(() => {
    animRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(animRef.current);
  }, [draw]);

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    dragRef.current = {
      active: true,
      startX: e.clientX,
      startY: e.clientY,
      startRotY: rotYRef.current,
      startRotX: rotXRef.current,
    };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }, []);

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (!dragRef.current.active) return;
    rotYRef.current = dragRef.current.startRotY + (e.clientX - dragRef.current.startX) * 0.005;
    rotXRef.current = Math.max(-1, Math.min(1,
      dragRef.current.startRotX + (e.clientY - dragRef.current.startY) * 0.005,
    ));
  }, []);

  const onPointerUp = useCallback(() => {
    dragRef.current.active = false;
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className={cn("w-full h-full cursor-grab active:cursor-grabbing", className)}
      style={{ width: size, height: size }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
    />
  );
}
