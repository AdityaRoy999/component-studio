'use client';

import React, { useState } from 'react';

interface FluidGlassDockProps {
  magnification?: number;
  distance?: number;
  glowColor?: string;
  showLabels?: boolean;
}

const ITEMS = [
  { id: 'studio', icon: '✨', label: 'Studio' },
  { id: 'components', icon: '📦', label: 'Components' },
  { id: 'editor', icon: '⚡', label: 'Synthesizer' },
  { id: 'styles', icon: '🎨', label: 'Themes' },
  { id: 'settings', icon: '⚙️', label: 'Settings' },
];

export default function FluidGlassDock({
  magnification = 68,
  distance = 120,
  glowColor = '#00d8ff',
  showLabels = true,
}: FluidGlassDockProps) {
  const [mouseX, setMouseX] = useState<number | null>(null);
  const [activeItem, setActiveItem] = useState('studio');
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);

  return (
    <div className="p-8 flex flex-col items-center justify-center select-none">
      <div
        onMouseMove={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          setMouseX(e.clientX - rect.left);
        }}
        onMouseLeave={() => {
          setMouseX(null);
          setHoveredItem(null);
        }}
        className="relative flex items-end gap-3 px-4 py-3 rounded-2xl bg-[#0d0d0d]/90 border border-white/[0.08] backdrop-blur-xl shadow-2xl"
      >
        {ITEMS.map((item, idx) => {
          const itemCenter = 16 + idx * 56 + 24;
          let scale = 1;
          if (mouseX !== null) {
            const d = Math.abs(mouseX - itemCenter);
            if (d < distance) {
              const normal = 1 - d / distance;
              scale = 1 + normal * ((magnification - 48) / 48);
            }
          }

          const isActive = activeItem === item.id;

          return (
            <div key={item.id} className="relative flex flex-col items-center">
              {showLabels && hoveredItem === item.id && (
                <div className="absolute -top-9 px-2 py-0.5 rounded-md bg-[#18181b] border border-white/[0.1] text-[11px] font-mono text-zinc-200 whitespace-nowrap shadow-md pointer-events-none">
                  {item.label}
                </div>
              )}

              <button
                onClick={() => setActiveItem(item.id)}
                onMouseEnter={() => setHoveredItem(item.id)}
                style={{
                  width: `${48 * scale}px`,
                  height: `${48 * scale}px`,
                  transition: 'width 0.1s ease-out, height 0.1s ease-out',
                }}
                className="rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] flex items-center justify-center text-xl cursor-pointer relative"
              >
                <span>{item.icon}</span>
                {isActive && (
                  <span
                    className="absolute -bottom-1 w-1.5 h-1.5 rounded-full"
                    style={{
                      backgroundColor: glowColor,
                      boxShadow: `0 0 8px ${glowColor}`,
                    }}
                  />
                )}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
