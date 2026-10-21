'use client';

import React, { useState } from 'react';

interface ElasticSliderProps {
  label?: string;
  min?: number;
  max?: number;
  defaultValue?: number;
  accentColor?: string;
  showFloatingValue?: boolean;
}

export default function ElasticSlider({
  label = 'Synthesis Intensity',
  min = 0,
  max = 100,
  defaultValue = 65,
  accentColor = '#00d8ff',
  showFloatingValue = true,
}: ElasticSliderProps) {
  const [val, setVal] = useState(defaultValue);
  const [isDragging, setIsDragging] = useState(false);

  const percentage = ((val - min) / (max - min)) * 100;

  return (
    <div className="w-full max-w-md p-6 rounded-2xl bg-[#0d0d0d] border border-white/[0.08] shadow-2xl">
      <div className="flex items-center justify-between mb-4">
        <label className="text-sm font-medium text-zinc-300">{label}</label>
        <span
          className="text-xs font-mono font-semibold px-2 py-0.5 rounded bg-white/[0.05] border border-white/[0.08]"
          style={{ color: accentColor }}
        >
          {val}%
        </span>
      </div>

      <div className="relative pt-6 pb-2">
        {showFloatingValue && isDragging && (
          <div
            className="absolute -top-3 -translate-x-1/2 px-2 py-0.5 rounded text-xs font-mono font-bold text-black shadow-lg transition-all"
            style={{
              left: `${percentage}%`,
              backgroundColor: accentColor,
            }}
          >
            {val}
          </div>
        )}

        <div className="relative h-2 w-full rounded-full bg-white/[0.08] overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-75"
            style={{
              width: `${percentage}%`,
              backgroundColor: accentColor,
              boxShadow: `0 0 14px ${accentColor}88`,
            }}
          />
        </div>

        <input
          type="range"
          min={min}
          max={max}
          value={val}
          onMouseDown={() => setIsDragging(true)}
          onMouseUp={() => setIsDragging(false)}
          onTouchStart={() => setIsDragging(true)}
          onTouchEnd={() => setIsDragging(false)}
          onChange={(e) => setVal(Number(e.target.value))}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        />
      </div>

      <div className="flex justify-between text-[11px] font-mono text-zinc-600 mt-1">
        <span>MIN {min}</span>
        <span>MAX {max}</span>
      </div>
    </div>
  );
}
