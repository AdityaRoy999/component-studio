'use client';

import React, { useEffect, useRef } from 'react';

interface CrystalizedBallProps {
  particleCount?: number;
  glowColor?: string;
  speed?: number;
}

export default function CrystalizedBall({
  particleCount = 180,
  glowColor = '#d946ef',
  speed = 1,
}: CrystalizedBallProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let width = (canvas.width = canvas.parentElement?.clientWidth || 500);
    let height = (canvas.height = canvas.parentElement?.clientHeight || 400);

    const particles = Array.from({ length: particleCount }, () => ({
      theta: Math.random() * Math.PI * 2,
      r: Math.sqrt(Math.random()) * 85,
      speed: (0.01 + Math.random() * 0.02) * (Math.random() > 0.5 ? 1 : -1),
      size: 1 + Math.random() * 2,
      alpha: 0.3 + Math.random() * 0.7,
    }));

    let t = 0;
    const render = () => {
      t += 0.02 * speed;
      ctx.fillStyle = '#060608';
      ctx.fillRect(0, 0, width, height);

      const cx = width / 2;
      const cy = height / 2;
      const radius = 95;

      // Outer glowing ring
      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      ctx.strokeStyle = glowColor;
      ctx.lineWidth = 3.5;
      ctx.shadowBlur = 24;
      ctx.shadowColor = glowColor;
      ctx.stroke();

      // Outer soft ring
      ctx.lineWidth = 1;
      ctx.shadowBlur = 40;
      ctx.stroke();
      ctx.restore();

      // Inner swirling particles
      particles.forEach((p) => {
        p.theta += p.speed * speed;
        const px = cx + Math.cos(p.theta) * p.r;
        const py = cy + Math.sin(p.theta) * (p.r * 0.85);

        ctx.beginPath();
        ctx.arc(px, py, p.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(240, 171, 252, ${p.alpha})`;
        ctx.shadowBlur = 8;
        ctx.shadowColor = glowColor;
        ctx.fill();
      });

      animId = requestAnimationFrame(render);
    };

    render();

    return () => cancelAnimationFrame(animId);
  }, [particleCount, glowColor, speed]);

  return (
    <div className="w-full h-[380px] sm:h-[460px] rounded-2xl overflow-hidden relative border border-white/[0.08] bg-[#060608] flex items-center justify-center">
      <canvas ref={canvasRef} className="w-full h-full block" />
    </div>
  );
}
