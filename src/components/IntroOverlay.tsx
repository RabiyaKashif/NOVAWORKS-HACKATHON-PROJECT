import React, { useEffect, useRef, useState } from 'react';
import { NovaWorksLogo } from './NovaWorksLogo.tsx';

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
