export const PREVIEW_WIDTH_PRESETS = { laptop: 1280, tablet: 768, phone: 390 } as const;

export function clampPreviewWidth(requested: number | null, available: number) {
  if (!Number.isFinite(available) || available <= 0) return 0;
  const maximum = Math.floor(available);
  const minimum = Math.min(280, maximum);
  return requested === null || !Number.isFinite(requested)
    ? maximum
    : Math.round(Math.max(minimum, Math.min(maximum, requested)));
}
