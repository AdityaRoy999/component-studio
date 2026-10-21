'use client';

import React, { useState, useEffect } from 'react';

const ITEMS = [
  { id: 1, title: 'Arch One', subtitle: 'Brutalist Monolith', img: 'https://images.unsplash.com/photo-1513694203232-719a280e022f?w=400&q=80' },
  { id: 2, title: 'Coastline', subtitle: 'Pacific Wave Crest', img: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=400&q=80' },
  { id: 3, title: 'Geometry', subtitle: 'Bauhaus Spatial Grid', img: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=400&q=80' },
  { id: 4, title: 'Portrait', subtitle: 'High-contrast Studio', img: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&q=80' },
  { id: 5, title: 'Abstract', subtitle: 'Chrome Liquid Form', img: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=400&q=80' },
];

export default function CircularCarousel() {
  const [rotation, setRotation] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setRotation((prev) => prev - 0.4);
    }, 16);
    return () => clearInterval(interval);
  }, []);

  const total = ITEMS.length;
  const radius = 240;

  return (
    <div
      className="w-full h-[380px] sm:h-[460px] rounded-2xl overflow-hidden relative border border-white/[0.08] bg-[#08080b] flex items-center justify-center select-none"
      style={{ perspective: '1100px' }}
    >
      <div
        className="relative w-40 h-56 transition-transform"
        style={{
          transformStyle: 'preserve-3d',
          transform: `rotateY(${rotation}deg)`,
        }}
      >
        {ITEMS.map((item, index) => {
          const angle = (360 / total) * index;
          return (
            <div
              key={item.id}
              className="absolute inset-0 rounded-2xl overflow-hidden border border-white/20 bg-zinc-900 shadow-xl"
              style={{
                transform: `rotateY(${angle}deg) translateZ(${radius}px)`,
                backfaceVisibility: 'hidden',
              }}
            >
              <img
                src={item.img}
                alt={item.title}
                className="w-full h-full object-cover grayscale contrast-125"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent p-3 flex flex-col justify-end">
                <span className="text-xs font-bold text-white">{item.title}</span>
                <span className="text-[10px] text-zinc-400">{item.subtitle}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
