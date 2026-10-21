'use client';

import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { useReducedMotion } from 'motion/react';

export default function HistoryTitle({ title }: { title: string }) {
  const viewport = useRef<HTMLHeadingElement>(null);
  const text = useRef<HTMLSpanElement>(null);
  const [distance, setDistance] = useState(0);
  const reduce = useReducedMotion();

  useEffect(() => {
    const heading = viewport.current, label = text.current;
    if (!heading || !label) return;
    const measure = () => setDistance(label.scrollWidth > heading.clientWidth + 1 ? label.scrollWidth + 32 : 0);
    const observer = new ResizeObserver(measure);
    observer.observe(heading);
    observer.observe(label);
    measure();
    return () => observer.disconnect();
  }, [title]);

  const scrolling = distance > 0 && !reduce;
  return <h2 ref={viewport} className="history-title" aria-label={title} title={title} data-scrolling={scrolling}>
    <span className="history-title-track" aria-hidden="true" style={{ '--title-distance': `${distance}px`, '--title-duration': `${Math.max(8, distance / 24)}s` } as CSSProperties}>
      <span ref={text} className="history-title-text">{title}</span>
      {scrolling && <span className="history-title-text">{title}</span>}
    </span>
  </h2>;
}
