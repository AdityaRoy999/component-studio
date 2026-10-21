'use client';

import React from 'react';
import { MotionConfig } from 'motion/react';
import { ReactLenis } from 'lenis/react';
import ClickGlow from '@/components/studio/ClickGlow';

const scrollOptions = {
  autoRaf: true,
  lerp: 0.1,
  smoothWheel: true,
  syncTouch: false,
  anchors: true,
  respectReducedMotion: true,
};

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <MotionConfig reducedMotion="user">
      <ReactLenis root options={scrollOptions}><ClickGlow>{children}</ClickGlow></ReactLenis>
    </MotionConfig>
  );
}
