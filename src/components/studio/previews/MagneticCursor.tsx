'use client';

import React, { useState, useRef } from 'react';

interface MagneticCursorProps {
  text?: string;
  pullRadius?: number;
  elasticity?: number;
  accentColor?: string;
  sparkEffect?: boolean;
}

export default function MagneticCursor({
  text = 'Explore Modules',
  pullRadius = 60,
  elasticity = 0.35,
  accentColor = '#7a5af8',
  sparkEffect = true,
}: MagneticCursorProps) {
  const btnRef = useRef<HTMLButtonElement>(null);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [clicked, setClicked] = useState(false);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!btnRef.current) return;
    const rect = btnRef.current.getBoundingClientRect();
    const btnCenterX = rect.left + rect.width / 2;
    const btnCenterY = rect.top + rect.height / 2;

    const distX = e.clientX - btnCenterX;
    const distY = e.clientY - btnCenterY;
    const dist = Math.hypot(distX, distY);

    if (dist < pullRadius) {
      setOffset({
        x: distX * elasticity,
        y: distY * elasticity,
      });
    } else {
      setOffset({ x: 0, y: 0 });
    }
  };

  const handleMouseLeave = () => {
    setOffset({ x: 0, y: 0 });
  };

  const handleClick = () => {
    if (!sparkEffect) return;
    setClicked(true);
    setTimeout(() => setClicked(false), 300);
  };

  return (
    <div
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className="p-16 flex items-center justify-center select-none"
    >
      <button
        ref={btnRef}
        onClick={handleClick}
        style={{
          transform: `translate3d(${offset.x}px, ${offset.y}px, 0) scale(${clicked ? 0.95 : 1})`,
          transition: 'transform 0.15s cubic-bezier(0.25, 1, 0.5, 1)',
          boxShadow: `0 0 25px ${accentColor}44`,
          borderColor: accentColor,
        }}
        className="relative px-8 py-4 rounded-full bg-[#111] border text-white font-medium text-sm flex items-center gap-2 group cursor-pointer hover:bg-white/[0.05]"
      >
        <span
          className="w-2 h-2 rounded-full transition-transform group-hover:scale-125"
          style={{ backgroundColor: accentColor }}
        />
        <span>{text}</span>
        <span className="text-zinc-500 group-hover:translate-x-1 transition-transform">→</span>
      </button>
    </div>
  );
}
