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
