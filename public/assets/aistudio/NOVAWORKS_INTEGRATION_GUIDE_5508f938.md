# NovaWorks OS — Animation & UI Polish Integration Guide

Share this single file with another AI or developer to replicate every visual, animation, and structural change in your project.

---

## Summary of Changes

1. **Removed Static Status & Dot-Pill Badges Across All Screens**
   - **Top Header (`TopNavBar.tsx`)**: Removed the `• ACTIVE` status pill next to the brand logo and changed the account dropdown role label to unboxed text.
   - **Projects Dashboard (`ProjectsScreen.tsx`)**: Removed the `• START FROM THE FUTURE • AI WORKFORCE ENGINE` hero pill, `v2.4 Engine` pill, `6 Active Projects` pill, and card dot-pill badges (`In Flight`, `Scoped`, `Testing`, `Planning`, `Active Sprint`, `Milestone 2/4`, category pills), rendering them as clean unboxed typography.
   - **Tasks Screen (`TasksScreen.tsx`)**: Removed the `• IN PROGRESS` and `HIGH PRIORITY` pills from the breadcrumb bar, as well as pill enclosures on `Sprint Alpha`, task statuses (kept clickable as unboxed colored text), and effort durations (`14 hrs`).
   - **Team Directory (`TeamDirectoryScreen.tsx`)**: Removed the `• ORGANIZATION / STAFF & TALENT` hero pill, `• ADMIN` / `• MANAGER` / `• AGENT` card pills, `• Read-Only Access` pill, and decorative dots next to squad names and operator counts.
   - **Sign-In & Footer (`SignInScreen.tsx`, `Footer.tsx`)**: Removed role pill capsules and decorative status dots.

2. **Animated Background Orbital Nodes (`OrbitalBackground.tsx`)**
   - Converted static `<ellipse>` elements into SVG `<path>` orbit tracks (`#hero-orbit-outer`, `#hero-orbit-mid`, `#hero-orbit-inner`, etc.).
   - Attached `<animateMotion>` + `<mpath>` to the small purple circles and satellite dots so they glide continuously along the orbital paths (respecting `prefers-reduced-motion`).

3. **Custom Diagonal Lattice Constellation Wave (`ParticleWaveCanvas.tsx`)**
   - Placed cleanly **below** the orbital rings (`top-[470px]` on hero, `top-[420px]` on subpages, `bottom-[-20px]` on auth) so it never overlaps the upper orbits.
   - Renders a staggered 14x66 node lattice driven by two slow counter-flowing harmonic swells, delicate sapphire-to-iris filament lines, crest halo rings, and subtle pointer parallax, with full curves framed cleanly inside the canvas bounds.

4. **Starting Intro Sequence (`IntroOverlay.tsx` + `App.tsx`)**
   - Renders on a clean `#faf9f5` alabaster canvas matching the site background.
   - **0s – 2.8s**: Calm flowing lattice constellation wave with full curves visible.
   - **2.8s – 4.1s**: Smooth radial expansion across the whole viewport and fade reveal into the website.
   - Includes a `Skip Intro` button and automatic `prefers-reduced-motion` bypass.

5. **Dependency Peer Conflict Fix (`package.json`)**
   - Updated `"esbuild": "^0.28.0"` in `devDependencies` to match `vite@^8.3.0` and `tsx`.

---

## 1. Create `src/components/ParticleWaveCanvas.tsx`

```tsx
import React, { useEffect, useRef } from 'react';

interface ParticleWaveCanvasProps {
  intensity?: 'hero' | 'subpage' | 'auth';
  className?: string;
}

export const ParticleWaveCanvas: React.FC<ParticleWaveCanvasProps> = ({
  intensity = 'hero',
  className = '',
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const prefersReducedMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)'
    ).matches;

    let animationFrameId = 0;
    let width = 0;
    let height = 0;
    let dpr = Math.min(window.devicePixelRatio || 1, 2);

    const pointer = { x: 0.5, y: 0.5, targetX: 0.5, targetY: 0.5 };

    const handlePointerMove = (e: PointerEvent) => {
      pointer.targetX = e.clientX / Math.max(window.innerWidth, 1);
      pointer.targetY = e.clientY / Math.max(window.innerHeight, 1);
    };

    window.addEventListener('pointermove', handlePointerMove, { passive: true });

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      width = Math.max(rect.width, 320);
      height = Math.max(rect.height, 220);
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    resize();
    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(canvas);

    const ROWS = 14;
    const COLS = 66;
    const baseOpacity =
      intensity === 'auth' ? 0.55 : intensity === 'hero' ? 0.52 : 0.4;

    interface ProjectedPoint {
      x: number;
      y: number;
      alpha: number;
      depth: number;
      isCrest: boolean;
      r: number;
      g: number;
      b: number;
    }

    const grid: ProjectedPoint[][] = Array.from({ length: ROWS }, () =>
      Array.from({ length: COLS }, () => ({
        x: 0,
        y: 0,
        alpha: 0,
        depth: 0,
        isCrest: false,
        r: 91,
        g: 59,
        b: 223,
      }))
    );

    const drawFrame = (timeSec: number) => {
      ctx.clearRect(0, 0, width, height);

      pointer.x += (pointer.targetX - pointer.x) * 0.03;
      pointer.y += (pointer.targetY - pointer.y) * 0.03;

      const pointerShiftX = (pointer.x - 0.5) * 24;
      const pointerShiftY = (pointer.y - 0.5) * 14;

      const centerY = height * 0.5 + pointerShiftY * 0.25;
      const spanX = width * 0.94;
      const startX = (width - spanX) * 0.5;
      const bandHeight = height * 0.36;

      for (let row = 0; row < ROWS; row++) {
        const vNorm = row / (ROWS - 1);
        const rowCentered = vNorm - 0.5;
        const stagger = (row % 2) * (0.5 / COLS);

        for (let col = 0; col < COLS; col++) {
          const uNorm = Math.min(1, col / (COLS - 1) + stagger);

          const diagonalBias = (uNorm - 0.5) * -height * 0.09;
          const swellA =
            Math.sin(uNorm * Math.PI * 2.1 + vNorm * 2.2 - timeSec * 0.28) *
            (height * 0.11);
          const swellB =
            Math.cos(uNorm * Math.PI * 1.5 - vNorm * 3.1 + timeSec * 0.2) *
            (height * 0.08);
          const standingNode =
            Math.sin((uNorm + vNorm) * 7.5 + timeSec * 0.14) * 4;

          const x =
            startX +
            uNorm * spanX +
            Math.sin(vNorm * Math.PI + timeSec * 0.16 + uNorm * 2.5) * 8 +
            pointerShiftX * (0.35 + vNorm * 0.5);

          const y =
            centerY +
            diagonalBias +
            rowCentered * bandHeight +
            swellA +
            swellB +
            standingNode;

          const elevation = (swellA + swellB) / (height * 0.19);
          const depth = Math.max(0.28, Math.min(1, 0.64 + elevation * 0.36));

          const edgeX = Math.pow(Math.sin(uNorm * Math.PI), 0.45);
          const edgeY = Math.pow(Math.sin(vNorm * Math.PI), 0.35);
          const alpha =
            baseOpacity * depth * (0.35 + 0.65 * edgeX) * (0.4 + 0.6 * edgeY);

          const crestFactor = Math.max(0, Math.min(1, (elevation + 1) * 0.5));
          const r = Math.round(13 + crestFactor * 116);
          const g = Math.round(27 + crestFactor * 54);
          const b = Math.round(62 + crestFactor * 180);

          const pt = grid[row][col];
          pt.x = x;
          pt.y = y;
          pt.alpha = alpha;
          pt.depth = depth;
          pt.isCrest = crestFactor > 0.76 && (col + row) % 9 === 0;
          pt.r = r;
          pt.g = g;
          pt.b = b;
        }
      }

      ctx.lineWidth = 0.75;
      for (let row = 0; row < ROWS; row++) {
        for (let col = 0; col < COLS; col++) {
          const p = grid[row][col];
          if (p.alpha < 0.05) continue;

          if (col + 1 < COLS) {
            const right = grid[row][col + 1];
            const lineAlpha = Math.min(p.alpha, right.alpha) * 0.24;
            if (lineAlpha > 0.015) {
              ctx.strokeStyle = `rgba(99, 68, 231, ${lineAlpha.toFixed(3)})`;
              ctx.beginPath();
              ctx.moveTo(p.x, p.y);
              ctx.lineTo(right.x, right.y);
              ctx.stroke();
            }
          }

          if (row + 1 < ROWS) {
            const below = grid[row + 1][col];
            const lineAlpha = Math.min(p.alpha, below.alpha) * 0.18;
            if (lineAlpha > 0.015) {
              ctx.strokeStyle = `rgba(13, 27, 62, ${(lineAlpha * 0.75).toFixed(3)})`;
              ctx.beginPath();
              ctx.moveTo(p.x, p.y);
              ctx.lineTo(below.x, below.y);
              ctx.stroke();
            }
          }
        }
      }

      for (let row = 0; row < ROWS; row++) {
        for (let col = 0; col < COLS; col++) {
          const p = grid[row][col];
          if (p.alpha <= 0.02) continue;

          const dotRadius = 0.95 + p.depth * 1.15;

          if (p.isCrest) {
            ctx.strokeStyle = `rgba(99, 68, 231, ${(p.alpha * 0.45).toFixed(3)})`;
            ctx.lineWidth = 0.9;
            ctx.beginPath();
            ctx.arc(p.x, p.y, dotRadius + 2.6, 0, Math.PI * 2);
            ctx.stroke();
          }

          ctx.fillStyle = `rgba(${p.r}, ${p.g}, ${p.b}, ${p.alpha.toFixed(3)})`;
          ctx.beginPath();
          ctx.arc(p.x, p.y, dotRadius, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    };

    if (prefersReducedMotion) {
      drawFrame(1.6);
    } else {
      const start = performance.now();
      const render = (now: number) => {
        if (!document.hidden) {
          drawFrame((now - start) * 0.001);
        }
        animationFrameId = requestAnimationFrame(render);
      };
      animationFrameId = requestAnimationFrame(render);
    }

    return () => {
      cancelAnimationFrame(animationFrameId);
      resizeObserver.disconnect();
      window.removeEventListener('pointermove', handlePointerMove);
    };
  }, [intensity]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className={`pointer-events-none block h-full w-full ${className}`}
    />
  );
};
```

---

## 2. Update `src/components/OrbitalBackground.tsx`

```tsx
import React from 'react';
import { ParticleWaveCanvas } from './ParticleWaveCanvas';

interface OrbitalBackgroundProps {
  variant?: 'hero' | 'auth' | 'subpage';
}

export const OrbitalBackground: React.FC<OrbitalBackgroundProps> = ({ variant = 'hero' }) => {
  const prefersReducedMotion =
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (variant === 'auth') {
    return (
      <div className="pointer-events-none fixed inset-0 overflow-hidden" aria-hidden="true">
        <div className="absolute inset-x-0 bottom-[-20px] h-[340px]">
          <ParticleWaveCanvas intensity="auth" />
        </div>

        <svg
          className="absolute left-1/2 top-1/2 h-[960px] w-[1440px] -translate-x-1/2 -translate-y-1/2"
          viewBox="0 0 1440 960"
          fill="none"
        >
          <path
            id="auth-orbit-outer"
            d="M 180 480 A 540 340 0 1 0 1260 480 A 540 340 0 1 0 180 480 Z"
            stroke="rgba(13, 27, 62, 0.055)"
            strokeWidth="1"
          />
          <path
            id="auth-orbit-mid"
            d="M 290 480 A 430 270 0 1 0 1150 480 A 430 270 0 1 0 290 480 Z"
            stroke="rgba(13, 27, 62, 0.05)"
            strokeWidth="1"
            strokeDasharray="4 6"
          />
          <path
            id="auth-orbit-inner"
            d="M 400 480 A 320 205 0 1 0 1040 480 A 320 205 0 1 0 400 480 Z"
            stroke="rgba(99, 68, 231, 0.06)"
            strokeWidth="1"
          />

          <g transform={prefersReducedMotion ? 'translate(345, 215)' : undefined}>
            <circle cx="0" cy="0" r="18" fill="rgba(99, 68, 231, 0.08)" />
            <circle cx="0" cy="0" r="8" fill="#ffffff" stroke="rgba(99, 68, 231, 0.25)" strokeWidth="1" />
            <circle cx="0" cy="0" r="3" fill="#6344e7" />
            {!prefersReducedMotion && (
              <animateMotion dur="44s" repeatCount="indefinite" begin="-12s">
                <mpath href="#auth-orbit-outer" />
              </animateMotion>
            )}
          </g>

          <g transform={prefersReducedMotion ? 'translate(1090, 215)' : undefined}>
            <circle cx="0" cy="0" r="18" fill="rgba(99, 68, 231, 0.08)" />
            <circle cx="0" cy="0" r="8" fill="#ffffff" stroke="rgba(99, 68, 231, 0.25)" strokeWidth="1" />
            <circle cx="0" cy="0" r="3" fill="#6344e7" />
            {!prefersReducedMotion && (
              <animateMotion dur="36s" repeatCount="indefinite" keyPoints="1;0" keyTimes="0;1" calcMode="linear" begin="-8s">
                <mpath href="#auth-orbit-mid" />
              </animateMotion>
            )}
          </g>

          <g transform={prefersReducedMotion ? 'translate(420, 480)' : undefined}>
            <circle cx="0" cy="0" r="2.4" fill="#8b5cf6" fillOpacity="0.5" />
            {!prefersReducedMotion && (
              <animateMotion dur="28s" repeatCount="indefinite" begin="-4s">
                <mpath href="#auth-orbit-inner" />
              </animateMotion>
            )}
          </g>
        </svg>
      </div>
    );
  }

  const prefix = variant === 'hero' ? 'hero' : 'subpage';

  return (
    <div
      className="pointer-events-none absolute inset-x-0 top-0 h-[920px] overflow-hidden"
      aria-hidden="true"
    >
      <svg
        className="absolute left-1/2 top-[-120px] h-[560px] w-[1440px] -translate-x-1/2"
        viewBox="0 0 1440 560"
        fill="none"
      >
        <path
          id={`${prefix}-orbit-outer`}
          d="M 100 140 A 620 340 0 1 0 1340 140 A 620 340 0 1 0 100 140 Z"
          stroke="rgba(13, 27, 62, 0.055)"
          strokeWidth="1"
        />
        <path
          id={`${prefix}-orbit-mid`}
          d="M 230 140 A 490 275 0 1 0 1210 140 A 490 275 0 1 0 230 140 Z"
          stroke="rgba(13, 27, 62, 0.06)"
          strokeWidth="1"
          strokeDasharray="3 5"
        />
        <path
          id={`${prefix}-orbit-inner`}
          d="M 360 140 A 360 200 0 1 0 1080 140 A 360 200 0 1 0 360 140 Z"
          stroke="rgba(99, 68, 231, 0.065)"
          strokeWidth="1"
        />

        <g transform={prefersReducedMotion ? 'translate(230, 220)' : undefined}>
          <circle cx="0" cy="0" r="14" fill="rgba(99, 68, 231, 0.1)" />
          <circle cx="0" cy="0" r="3.6" fill="#6344e7" />
          {!prefersReducedMotion && (
            <animateMotion dur="32s" repeatCount="indefinite" begin="-3s">
              <mpath href={`#${prefix}-orbit-mid`} />
            </animateMotion>
          )}
        </g>

        <g transform={prefersReducedMotion ? 'translate(1210, 240)' : undefined}>
          <circle cx="0" cy="0" r="16" fill="rgba(99, 68, 231, 0.09)" />
          <circle cx="0" cy="0" r="4" fill="#6344e7" />
          {!prefersReducedMotion && (
            <animateMotion dur="42s" repeatCount="indefinite" keyPoints="1;0" keyTimes="0;1" calcMode="linear" begin="-14s">
              <mpath href={`#${prefix}-orbit-outer`} />
            </animateMotion>
          )}
        </g>

        <g transform={prefersReducedMotion ? 'translate(380, 210)' : undefined}>
          <circle cx="0" cy="0" r="8" fill="rgba(99, 68, 231, 0.07)" />
          <circle cx="0" cy="0" r="2.4" fill="#6344e7" fillOpacity="0.65" />
          {!prefersReducedMotion && (
            <animateMotion dur="24s" repeatCount="indefinite" begin="-7s">
              <mpath href={`#${prefix}-orbit-inner`} />
            </animateMotion>
          )}
        </g>
      </svg>

      <div
        className={`absolute inset-x-0 ${
          variant === 'hero' ? 'top-[470px] h-[380px]' : 'top-[420px] h-[340px]'
        }`}
      >
        <ParticleWaveCanvas intensity={variant} />
      </div>
    </div>
  );
};
```

---

## 3. Create `src/components/IntroOverlay.tsx`

```tsx
import React, { useEffect, useRef, useState } from 'react';
import { NovaWorksLogo } from './NovaWorksLogo';

interface IntroOverlayProps {
  onComplete: () => void;
}

export const IntroOverlay: React.FC<IntroOverlayProps> = ({ onComplete }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [phase, setPhase] = useState<'flowing' | 'expanding' | 'done'>('flowing');

  useEffect(() => {
    const prefersReducedMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)'
    ).matches;

    if (prefersReducedMotion) {
      onComplete();
      return;
    }

    const expandTimer = window.setTimeout(() => setPhase('expanding'), 2800);
    const completeTimer = window.setTimeout(() => {
      setPhase('done');
      onComplete();
    }, 4100);

    return () => {
      window.clearTimeout(expandTimer);
      window.clearTimeout(completeTimer);
    };
  }, [onComplete]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId = 0;
    let width = 0;
    let height = 0;
    let dpr = Math.min(window.devicePixelRatio || 1, 2);

    const resize = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    resize();
    window.addEventListener('resize', resize);

    const ROWS = 16;
    const COLS = 74;

    interface NodePt {
      x: number;
      y: number;
      alpha: number;
      depth: number;
      r: number;
      g: number;
      b: number;
      isCrest: boolean;
    }

    const grid: NodePt[][] = Array.from({ length: ROWS }, () =>
      Array.from({ length: COLS }, () => ({
        x: 0,
        y: 0,
        alpha: 0,
        depth: 0,
        r: 91,
        g: 59,
        b: 223,
        isCrest: false,
      }))
    );

    const startTime = performance.now();
    const EXPAND_START = 2.8;
    const EXPAND_END = 4.1;

    const render = (now: number) => {
      const elapsed = (now - startTime) * 0.001;
      ctx.clearRect(0, 0, width, height);

      let expandT = 0;
      if (elapsed > EXPAND_START) {
        const raw = Math.min(1, (elapsed - EXPAND_START) / (EXPAND_END - EXPAND_START));
        expandT = raw < 0.5 ? 4 * raw * raw * raw : 1 - Math.pow(-2 * raw + 2, 3) / 2;
      }

      const radialScale = 1 + expandT * 1.9;
      const fadeOut = 1 - Math.pow(expandT, 1.5);

      const cx = width * 0.5;
      const cy = height * 0.52;
      const spanX = width * 0.92;
      const startX = (width - spanX) * 0.5;
      const baseBandH = height * (0.24 + expandT * 0.85);

      for (let row = 0; row < ROWS; row++) {
        const vNorm = row / (ROWS - 1);
        const rowCentered = vNorm - 0.5;
        const stagger = (row % 2) * (0.5 / COLS);

        for (let col = 0; col < COLS; col++) {
          const uNorm = Math.min(1, col / (COLS - 1) + stagger);

          const waveSpeedA = 0.52 + expandT * 0.85;
          const waveSpeedB = 0.36 + expandT * 0.65;

          const diagonalBias = (uNorm - 0.5) * -height * 0.08 * (1 - expandT * 0.5);
          const swellA =
            Math.sin(uNorm * Math.PI * 2.1 + vNorm * 2.2 - elapsed * waveSpeedA) *
            (height * (0.095 + expandT * 0.14));
          const swellB =
            Math.cos(uNorm * Math.PI * 1.5 - vNorm * 3.2 + elapsed * waveSpeedB) *
            (height * (0.065 + expandT * 0.1));

          const rawX = startX + uNorm * spanX;
          const rawY =
            cy + diagonalBias + rowCentered * baseBandH + swellA + swellB;

          const x = cx + (rawX - cx) * radialScale;
          const y = cy + (rawY - cy) * radialScale;

          const elevation = (swellA + swellB) / (height * 0.16);
          const depth = Math.max(0.32, Math.min(1, 0.65 + elevation * 0.35));

          const edgeX = Math.pow(Math.sin(uNorm * Math.PI), 0.45);
          const edgeY = Math.pow(Math.sin(vNorm * Math.PI), 0.35);
          const alpha =
            0.82 * fadeOut * depth * (0.35 + 0.65 * edgeX) * (0.4 + 0.6 * edgeY);

          const crestFactor = Math.max(0, Math.min(1, (elevation + 1) * 0.5));
          const r = Math.round(13 + crestFactor * 118);
          const g = Math.round(27 + crestFactor * 54);
          const b = Math.round(62 + crestFactor * 182);

          const pt = grid[row][col];
          pt.x = x;
          pt.y = y;
          pt.alpha = alpha;
          pt.depth = depth;
          pt.r = r;
          pt.g = g;
          pt.b = b;
          pt.isCrest = crestFactor > 0.76 && (col + row) % 8 === 0;
        }
      }

      ctx.lineWidth = 0.8 + expandT * 0.4;
      for (let row = 0; row < ROWS; row++) {
        for (let col = 0; col < COLS; col++) {
          const p = grid[row][col];
          if (p.alpha < 0.04) continue;

          if (col + 1 < COLS) {
            const right = grid[row][col + 1];
            const lineAlpha = Math.min(p.alpha, right.alpha) * 0.28;
            if (lineAlpha > 0.015) {
              ctx.strokeStyle = `rgba(99, 68, 231, ${lineAlpha.toFixed(3)})`;
              ctx.beginPath();
              ctx.moveTo(p.x, p.y);
              ctx.lineTo(right.x, right.y);
              ctx.stroke();
            }
          }

          if (row + 1 < ROWS) {
            const below = grid[row + 1][col];
            const lineAlpha = Math.min(p.alpha, below.alpha) * 0.2;
            if (lineAlpha > 0.015) {
              ctx.strokeStyle = `rgba(13, 27, 62, ${(lineAlpha * 0.7).toFixed(3)})`;
              ctx.beginPath();
              ctx.moveTo(p.x, p.y);
              ctx.lineTo(below.x, below.y);
              ctx.stroke();
            }
          }
        }
      }

      for (let row = 0; row < ROWS; row++) {
        for (let col = 0; col < COLS; col++) {
          const p = grid[row][col];
          if (p.alpha <= 0.02) continue;

          const dotRadius = (1.05 + p.depth * 1.25) * (1 + expandT * 0.55);

          if (p.isCrest) {
            ctx.strokeStyle = `rgba(99, 68, 231, ${(p.alpha * 0.5).toFixed(3)})`;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.arc(p.x, p.y, dotRadius + 3 + expandT * 4, 0, Math.PI * 2);
            ctx.stroke();
          }

          ctx.fillStyle = `rgba(${p.r}, ${p.g}, ${p.b}, ${p.alpha.toFixed(3)})`;
          ctx.beginPath();
          ctx.arc(p.x, p.y, dotRadius, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      if (elapsed < EXPAND_END) {
        animationFrameId = requestAnimationFrame(render);
      }
    };

    animationFrameId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', resize);
    };
  }, []);

  if (phase === 'done') return null;

  return (
    <div
      className={`fixed inset-0 z-50 flex flex-col items-center justify-between bg-[#faf9f5] transition-opacity duration-700 ease-out ${
        phase === 'expanding' ? 'pointer-events-none opacity-0' : 'opacity-100'
      }`}
      style={{ transitionDelay: phase === 'expanding' ? '550ms' : '0ms' }}
      aria-label="NovaWorks OS Intro Animation"
    >
      <div
        className={`relative z-10 pt-10 transition-all duration-500 ${
          phase === 'expanding' ? '-translate-y-3 opacity-0' : 'translate-y-0 opacity-100'
        }`}
      >
        <NovaWorksLogo size="md" />
      </div>

      <canvas
        ref={canvasRef}
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 h-full w-full"
      />

      <div
        className={`relative z-10 pb-8 transition-opacity duration-300 ${
          phase === 'expanding' ? 'opacity-0' : 'opacity-100'
        }`}
      >
        <button
          type="button"
          onClick={onComplete}
          className="rounded-full px-4 py-1.5 text-xs font-medium text-[#76767f] transition-colors hover:bg-[#efeeea] hover:text-[#0d1b3e]"
        >
          Skip Intro
        </button>
      </div>
    </div>
  );
};
```

---

## 4. Wire `IntroOverlay` in `src/App.tsx`

```tsx
import { useCallback, useState } from 'react';
import { IntroOverlay } from './components/IntroOverlay';

// Inside App():
const [showIntro, setShowIntro] = useState(true);
const handleIntroComplete = useCallback(() => setShowIntro(false), []);

// Inside return JSX (both signin and main layout):
{showIntro && <IntroOverlay onComplete={handleIntroComplete} />}
```

---

## 5. Checklist for Integrating UI Cleanup in Your Existing Components

- **`TopNavBar.tsx`**: Remove the `ACTIVE` pill badge next to `<NovaWorksLogo />`.
- **`ProjectsScreen.tsx`**:
  - Remove the `START FROM THE FUTURE • AI WORKFORCE ENGINE` pill above the hero `<h1>`.
  - Render `· v2.4 Engine`, `· {projects.length} Active Projects`, `{project.categoryEyebrow}`, and `{project.statusLabel}` as clean unboxed text without `rounded-full` capsules or colored dots.
- **`TasksScreen.tsx`**:
  - Remove the `• IN PROGRESS` and `HIGH PRIORITY` pills from the breadcrumb bar.
  - Render `{project.sprintLabel}`, `{task.status}`, and `{task.hours} hrs` without pill boxes.
- **`TeamDirectoryScreen.tsx`**:
  - Remove the `• ORGANIZATION / STAFF & TALENT` hero pill, `• ADMIN`/`• MANAGER`/`• AGENT` card pills, `• Read-Only Access` pill, and decorative dots next to squad names and active operator count.
- **`package.json`**:
  - Ensure `"esbuild": "^0.28.0"` in `devDependencies` if using `vite@^8.3.0`.
