'use client';

import React, { useEffect, useRef } from 'react';

interface FluxLinesProps {
  lineCount?: number;
  speed?: number;
  color?: string;
}

export default function FluxLines({
  lineCount = 18,
  speed = 1,
  color = '#ffffff',
}: FluxLinesProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = canvas.parentElement?.clientWidth || 600);
    let height = (canvas.height = canvas.parentElement?.clientHeight || 400);

    const handleResize = () => {
      if (!canvas.parentElement) return;
      width = canvas.width = canvas.parentElement.clientWidth;
      height = canvas.height = canvas.parentElement.clientHeight;
    };
    const resizeObserver = new ResizeObserver(handleResize);
    if (canvas.parentElement) resizeObserver.observe(canvas.parentElement);

    let t = 0;
    const render = () => {
      t += 0.008 * speed;
      ctx.fillStyle = '#060608';
      ctx.fillRect(0, 0, width, height);

      for (let i = 0; i < lineCount; i++) {
        const offset = (i / lineCount) * Math.PI * 2;
        ctx.beginPath();
        const yStart = height * 0.5 + Math.sin(t + offset) * (height * 0.28);
        ctx.moveTo(0, yStart);

        for (let x = 0; x <= width; x += 12) {
          const normX = x / width;
          const y =
            height * 0.5 +
            Math.sin(normX * 4 + t + offset) * 50 +
            Math.cos(normX * 7 - t * 1.5 + offset * 0.5) * 35 +
            Math.sin(normX * 12 + t * 2) * 15;
          ctx.lineTo(x, y);
        }

        const alpha = 0.15 + 0.45 * Math.sin((i / lineCount) * Math.PI);
        ctx.strokeStyle = color === '#ffffff' ? `rgba(255, 255, 255, ${alpha})` : color;
        ctx.lineWidth = 1.8;
        ctx.shadowBlur = 10;
        ctx.shadowColor = 'rgba(255, 255, 255, 0.4)';
        ctx.stroke();
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
      resizeObserver.disconnect();
    };
  }, [lineCount, speed, color]);

  return (
    <div className="background-preview w-full h-full overflow-hidden relative bg-[#060608]">
      <canvas ref={canvasRef} className="w-full h-full block" />
    </div>
  );
}
