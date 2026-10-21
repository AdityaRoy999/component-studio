'use client';

import { useEffect, useRef, useState } from 'react';
import './DotSlider.css';

export default function DotSlider({ value, min, max, step, label, onChange }: {
  value: number; min: number; max: number; step: number; label: string;
  onChange: (value: number) => void;
}) {
  const track = useRef<HTMLDivElement>(null);
  const [count, setCount] = useState(32);
  const progress = Math.min(1, Math.max(0, (value - min) / (max - min || 1)));

  useEffect(() => {
    const element = track.current;
    if (!element) return;
    const measure = () => setCount(Math.max(2, Math.min(48, Math.floor((element.clientWidth - 4) / 8) + 1)));
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return <div className="dot-slider" ref={track}>
    <div className="dot-slider-dots" aria-hidden="true">
      {Array.from({ length: count }, (_, index) => <span key={index} data-filled={index / (count - 1) <= progress}/>)}
    </div>
    <input type="range" min={min} max={max} step={step} value={value} aria-label={label}
      onChange={event => onChange(event.currentTarget.valueAsNumber)}/>
  </div>;
}
