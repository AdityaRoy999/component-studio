'use client';

import React, { useState, useEffect, useRef } from 'react';

const GLYPHS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+-=[]{}|;:,.<>?';

interface TechTextDecodeProps {
  text?: string;
  speed?: number;
  scrambleColor?: string;
  resolvedColor?: string;
  enableGlow?: boolean;
  fontTracking?: 'normal' | 'wide' | 'widest';
}

export default function TechTextDecode({
  text = 'COMPONENT STUDIO',
  speed = 45,
  scrambleColor = '#71717a',
  resolvedColor = '#fafafa',
  enableGlow = false,
  fontTracking = 'wide',
}: TechTextDecodeProps) {
  const [displayText, setDisplayText] = useState(text);
  const [resolvedIndices, setResolvedIndices] = useState<Set<number>>(new Set());

  const trackingClass =
    fontTracking === 'widest'
      ? 'tracking-[0.3em]'
      : fontTracking === 'wide'
      ? 'tracking-widest'
      : 'tracking-normal';

  useEffect(() => {
    let index = 0;
    const interval = setInterval(() => {
      setDisplayText(
        text
          .split('')
          .map((letter, i) => {
            if (letter === ' ') return ' ';
            if (i < index) return text[i];
            return GLYPHS[Math.floor(Math.random() * GLYPHS.length)];
          })
          .join('')
      );

      setResolvedIndices(new Set(Array.from({ length: Math.floor(index) }, (_, k) => k)));

      if (index >= text.length) {
        clearInterval(interval);
      }
      index += 1 / 3;
    }, Math.max(15, speed));

    return () => clearInterval(interval);
  }, [text, speed]);

  const replay = () => {
    let index = 0;
    const interval = setInterval(() => {
      setDisplayText(
        text
          .split('')
          .map((letter, i) => {
            if (letter === ' ') return ' ';
            if (i < index) return text[i];
            return GLYPHS[Math.floor(Math.random() * GLYPHS.length)];
          })
          .join('')
      );
      setResolvedIndices(new Set(Array.from({ length: Math.floor(index) }, (_, k) => k)));
      if (index >= text.length) {
        clearInterval(interval);
      }
      index += 1 / 2;
    }, Math.max(15, speed));
  };

  return (
    <div
      className="relative group p-8 sm:p-12 rounded-2xl bg-zinc-950/80 border border-zinc-800 flex flex-col items-center justify-center cursor-pointer select-none shadow-xl transition-all hover:border-zinc-700"
      onClick={replay}
    >
      {enableGlow && (
        <div
          className="absolute inset-0 blur-3xl opacity-10 transition-opacity duration-500 pointer-events-none rounded-2xl"
          style={{ backgroundColor: scrambleColor }}
        />
      )}

      <div className="relative z-10 flex flex-col items-center gap-4">
        <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-zinc-900 border border-zinc-800 text-xs font-mono text-zinc-400">
          <span className="w-1.5 h-1.5 rounded-full bg-zinc-400" />
          <span>CYBER_DECODE_KERNEL</span>
        </div>

        <p className={`text-2xl sm:text-4xl md:text-5xl font-mono font-black uppercase transition-all duration-200 text-center ${trackingClass}`}>
          {displayText.split('').map((char, idx) => {
            const isResolved = resolvedIndices.has(idx);
            return (
              <span
                key={idx}
                style={{
                  color: isResolved ? resolvedColor : scrambleColor,
                  textShadow: !isResolved && enableGlow ? `0 0 14px ${scrambleColor}` : undefined,
                }}
                className={!isResolved ? 'opacity-90 inline-block scale-105' : 'opacity-100 inline-block'}
              >
                {char === ' ' ? '\u00A0' : char}
              </span>
            );
          })}
        </p>

        <span className="text-xs font-mono text-zinc-500 mt-1">
          Click to re-trigger sequence
        </span>
      </div>
    </div>
  );
}
