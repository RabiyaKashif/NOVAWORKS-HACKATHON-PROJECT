import React from 'react';
import { ParticleWaveCanvas } from './ParticleWaveCanvas.tsx';

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
          {/* Outer celestial orbit path */}
          <path
            id="auth-orbit-outer"
            d="M 180 480 A 540 340 0 1 0 1260 480 A 540 340 0 1 0 180 480 Z"
            stroke="rgba(13, 27, 62, 0.055)"
            strokeWidth="1"
          />
          {/* Mid dashed orbit path */}
          <path
            id="auth-orbit-mid"
            d="M 290 480 A 430 270 0 1 0 1150 480 A 430 270 0 1 0 290 480 Z"
            stroke="rgba(13, 27, 62, 0.05)"
            strokeWidth="1"
            strokeDasharray="4 6"
          />
          {/* Inner soft orbit path */}
          <path
            id="auth-orbit-inner"
            d="M 400 480 A 320 205 0 1 0 1040 480 A 320 205 0 1 0 400 480 Z"
            stroke="rgba(99, 68, 231, 0.06)"
            strokeWidth="1"
          />

          {/* Orbiting node badge 1 along outer orbit */}
          <g transform={prefersReducedMotion ? 'translate(345, 215)' : undefined}>
            <circle cx="0" cy="0" r="18" fill="rgba(99, 68, 231, 0.08)" />
            <circle
              cx="0"
              cy="0"
              r="8"
              fill="#ffffff"
              stroke="rgba(99, 68, 231, 0.25)"
              strokeWidth="1"
            />
            <circle cx="0" cy="0" r="3" fill="#6344e7" />
            {!prefersReducedMotion && (
              <animateMotion dur="44s" repeatCount="indefinite" begin="-12s">
                <mpath href="#auth-orbit-outer" />
              </animateMotion>
            )}
          </g>

          {/* Orbiting node badge 2 along mid dashed orbit (counter-direction) */}
          <g transform={prefersReducedMotion ? 'translate(1090, 215)' : undefined}>
            <circle cx="0" cy="0" r="18" fill="rgba(99, 68, 231, 0.08)" />
            <circle
              cx="0"
              cy="0"
              r="8"
              fill="#ffffff"
              stroke="rgba(99, 68, 231, 0.25)"
              strokeWidth="1"
            />
            <circle cx="0" cy="0" r="3" fill="#6344e7" />
            {!prefersReducedMotion && (
              <animateMotion
                dur="36s"
                repeatCount="indefinite"
                keyPoints="1;0"
                keyTimes="0;1"
                calcMode="linear"
                begin="-8s"
              >
                <mpath href="#auth-orbit-mid" />
              </animateMotion>
            )}
          </g>

          {/* Orbiting micro-dot along inner orbit */}
          <g transform={prefersReducedMotion ? 'translate(420, 480)' : undefined}>
            <circle cx="0" cy="0" r="2.4" fill="#8b5cf6" fillOpacity="0.5" />
            {!prefersReducedMotion && (
              <animateMotion dur="28s" repeatCount="indefinite" begin="-4s">
                <mpath href="#auth-orbit-inner" />
              </animateMotion>
            )}
          </g>

          {/* Subtle secondary micro-dot along outer orbit */}
          <g transform={prefersReducedMotion ? 'translate(1040, 655)' : undefined}>
            <circle cx="0" cy="0" r="2.5" fill="#0d1b3e" fillOpacity="0.28" />
            {!prefersReducedMotion && (
              <animateMotion dur="44s" repeatCount="indefinite" begin="-34s">
                <mpath href="#auth-orbit-outer" />
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
        {/* Outer orbit path */}
        <path
          id={`${prefix}-orbit-outer`}
          d="M 100 140 A 620 340 0 1 0 1340 140 A 620 340 0 1 0 100 140 Z"
          stroke="rgba(13, 27, 62, 0.055)"
          strokeWidth="1"
        />
        {/* Mid dashed orbit path */}
        <path
          id={`${prefix}-orbit-mid`}
          d="M 230 140 A 490 275 0 1 0 1210 140 A 490 275 0 1 0 230 140 Z"
          stroke="rgba(13, 27, 62, 0.06)"
          strokeWidth="1"
          strokeDasharray="3 5"
        />
        {/* Inner orbit path */}
        <path
          id={`${prefix}-orbit-inner`}
          d="M 360 140 A 360 200 0 1 0 1080 140 A 360 200 0 1 0 360 140 Z"
          stroke="rgba(99, 68, 231, 0.065)"
          strokeWidth="1"
        />

        {/* Primary small purple circle with soft halo traveling along the mid dashed orbit */}
        <g transform={prefersReducedMotion ? 'translate(230, 220)' : undefined}>
          <circle cx="0" cy="0" r="14" fill="rgba(99, 68, 231, 0.1)" />
          <circle cx="0" cy="0" r="3.6" fill="#6344e7" />
          {!prefersReducedMotion && (
            <animateMotion dur="32s" repeatCount="indefinite" begin="-3s">
              <mpath href={`#${prefix}-orbit-mid`} />
            </animateMotion>
          )}
        </g>

        {/* Secondary small purple circle with soft halo traveling along the outer orbit */}
        <g transform={prefersReducedMotion ? 'translate(1210, 240)' : undefined}>
          <circle cx="0" cy="0" r="16" fill="rgba(99, 68, 231, 0.09)" />
          <circle cx="0" cy="0" r="4" fill="#6344e7" />
          {!prefersReducedMotion && (
            <animateMotion
              dur="42s"
              repeatCount="indefinite"
              keyPoints="1;0"
              keyTimes="0;1"
              calcMode="linear"
              begin="-14s"
            >
              <mpath href={`#${prefix}-orbit-outer`} />
            </animateMotion>
          )}
        </g>

        {/* Smaller violet satellite traveling along the inner orbit */}
        <g transform={prefersReducedMotion ? 'translate(380, 210)' : undefined}>
          <circle cx="0" cy="0" r="8" fill="rgba(99, 68, 231, 0.07)" />
          <circle cx="0" cy="0" r="2.4" fill="#6344e7" fillOpacity="0.65" />
          {!prefersReducedMotion && (
            <animateMotion dur="24s" repeatCount="indefinite" begin="-7s">
              <mpath href={`#${prefix}-orbit-inner`} />
            </animateMotion>
          )}
        </g>

        {/* Subtle dark sapphire micro-dot on the outer orbit */}
        <g transform={prefersReducedMotion ? 'translate(1095, 150)' : undefined}>
          <circle cx="0" cy="0" r="2.2" fill="#0d1b3e" fillOpacity="0.28" />
          {!prefersReducedMotion && (
            <animateMotion dur="42s" repeatCount="indefinite" begin="-29s">
              <mpath href={`#${prefix}-orbit-outer`} />
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
