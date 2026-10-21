'use client';

import React, { useEffect, useRef } from 'react';

interface PatternWavesProps {
  cols?: number;
  rows?: number;
  speed?: number;
}

export default function PatternWaves({
  cols = 36,
  rows = 24,
  speed = 1,
}: PatternWavesProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let width = (canvas.width = canvas.parentElement?.clientWidth || 500);
    let height = (canvas.height = canvas.parentElement?.clientHeight || 400);
    const resizeObserver = new ResizeObserver(() => {
      if (!canvas.parentElement) return;
      width = canvas.width = canvas.parentElement.clientWidth;
      height = canvas.height = canvas.parentElement.clientHeight;
    });
    if (canvas.parentElement) resizeObserver.observe(canvas.parentElement);

    let t = 0;
    const render = () => {
      t += 0.025 * speed;
      ctx.fillStyle = '#050507';
      ctx.fillRect(0, 0, width, height);

      const cellW = width / cols;
      const cellH = height / rows;

      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const x = (c + 0.5) * cellW;
          const y = (r + 0.5) * cellH;

          // Wave equation
          const dist = Math.sin(c * 0.25 - t) + Math.cos(r * 0.35 + t * 0.8);
          const intensity = Math.max(0, (dist + 2) / 4);

          const dotSize = Math.max(0.8, intensity * 3.8);
          const alpha = 0.15 + intensity * 0.85;

          ctx.beginPath();
          ctx.arc(x, y, dotSize, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
          ctx.fill();
        }
      }

      animId = requestAnimationFrame(render);
    };

    render();

    return () => { cancelAnimationFrame(animId); resizeObserver.disconnect(); };
  }, [cols, rows, speed]);

  return (
    <div className="background-preview w-full h-full overflow-hidden relative bg-[#050507] flex items-center justify-center">
      <canvas ref={canvasRef} className="w-full h-full block" />
    </div>
  );
}
