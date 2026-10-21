'use client';

import React from 'react';
import GradientASCII from '@/components/reactbits/GradientASCII';

interface GradientASCIIPreviewProps {
  shape?: 'horizon' | 'pinch' | 'rise' | 'eclipse';
  cellSize?: number;
  density?: number;
  glow?: number;
  speed?: number;
}

export default function GradientASCIIPreview({
  shape = 'rise',
  cellSize = 18,
  density = 0.95,
  glow = 0.3,
  speed = 1,
}: GradientASCIIPreviewProps) {
  return (
    <div className="background-preview w-full h-full overflow-hidden relative">
      <GradientASCII
        colors={['#1e3fd8', '#f6f8ff', '#a5d8ff', '#38bdf8']}
        shape={shape}
        characters=" =+xX0S8#@"
        cellSize={cellSize}
        density={density}
        glow={glow}
        speed={speed}
        clickEffect="burst"
      />
    </div>
  );
}
