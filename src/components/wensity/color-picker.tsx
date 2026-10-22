"use client";

/**
 * ColorPicker — saturation/value canvas + hue/alpha rails + HEX/RGB/HSL fields.
 *
 * HSV is the internal source of truth so dragging through pure black or pure
 * white does not discard hue/saturation the way a hex round-trip would.
 * Chrome is token-driven; only the color surfaces themselves carry live values.
 */

import * as React from "react";
import { IconColorPicker, IconSelector, IconCheck } from '@/components/ui/icons';
import { Popover as BasePopover } from "@base-ui/react/popover";
import { cn } from "@/lib/utils";
import './color-picker.css';

/* ─── color math ────────────────────────────────────────────── */

export interface Hsva {
  h: number;
  s: number;
  v: number;
  a: number;
}

export interface Rgba {
  r: number;
  g: number;
  b: number;
  a: number;
}

const clamp = (n: number, min = 0, max = 100) =>
  Math.min(max, Math.max(min, n));

const round = (n: number, digits = 0) => {
  const p = 10 ** digits;
  return Math.round(n * p) / p;
};

function hsvaToRgba({ h, s, v, a }: Hsva): Rgba {
  const hh = ((h % 360) + 360) % 360 / 60;
  const ss = s / 100;
  const vv = v / 100;
  const c = vv * ss;
  const x = c * (1 - Math.abs((hh % 2) - 1));
  const m = vv - c;
  const seg = Math.floor(hh) % 6;
  const segments: readonly (readonly [number, number, number])[] = [
    [c, x, 0],
    [x, c, 0],
    [0, c, x],
    [0, x, c],
    [x, 0, c],
    [c, 0, x],
  ];
  const [r, g, b] = segments[seg] ?? segments[0]!;
  return {
    r: Math.round((r + m) * 255),
    g: Math.round((g + m) * 255),
    b: Math.round((b + m) * 255),
    a,
  };
}

function rgbaToHsva({ r, g, b, a }: Rgba): Hsva {
  const rr = r / 255;
  const gg = g / 255;
  const bb = b / 255;
  const max = Math.max(rr, gg, bb);
  const min = Math.min(rr, gg, bb);
  const d = max - min;
  let h = 0;
  if (d !== 0) {
    if (max === rr) h = 60 * (((gg - bb) / d) % 6);
    else if (max === gg) h = 60 * ((bb - rr) / d + 2);
    else h = 60 * ((rr - gg) / d + 4);
  }
  if (h < 0) h += 360;
  return {
    h: round(h, 1),
    s: max === 0 ? 0 : round((d / max) * 100, 1),
    v: round(max * 100, 1),
    a,
  };
}

function hsvaToHsl({ h, s, v }: Hsva) {
  const vv = v / 100;
  const ss = s / 100;
  const l = vv * (1 - ss / 2);
  const sl = l === 0 || l === 1 ? 0 : (vv - l) / Math.min(l, 1 - l);
  return { h: Math.round(h), s: Math.round(sl * 100), l: Math.round(l * 100) };
}

function hslToHsva(h: number, s: number, l: number, a: number): Hsva {
  const ll = l / 100;
  const ss = s / 100;
  const v = ll + ss * Math.min(ll, 1 - ll);
  return {
    h: ((h % 360) + 360) % 360,
    s: v === 0 ? 0 : (2 * (1 - ll / v)) * 100,
    v: v * 100,
    a,
  };
}

const hex2 = (n: number) => Math.round(clamp(n, 0, 255)).toString(16).padStart(2, "0");

export function rgbaToHex({ r, g, b, a }: Rgba, withAlpha = false): string {
  const base = `#${hex2(r)}${hex2(g)}${hex2(b)}`;
  if (!withAlpha || a >= 1) return base;
  return `${base}${hex2(a * 255)}`;
}

/** Parses `#rgb`, `#rgba`, `#rrggbb`, `#rrggbbaa` (with or without `#`). */
export function parseHex(input: string): Rgba | null {
  const raw = input.trim().replace(/^#/, "");
  if (!/^([0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/i.test(raw)) return null;
  const full =
    raw.length <= 4
      ? raw
          .split("")
          .map((c) => c + c)
          .join("")
      : raw;
  return {
    r: parseInt(full.slice(0, 2), 16),
    g: parseInt(full.slice(2, 4), 16),
    b: parseInt(full.slice(4, 6), 16),
    a: full.length === 8 ? parseInt(full.slice(6, 8), 16) / 255 : 1,
  };
}

/** WCAG relative luminance, used to pick a readable mark over a swatch. */
function isLightColor({ r, g, b }: Rgba) {
  const channel = (c: number) => {
    const v = c / 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b) > 0.45;
}

function hsvaToCss(hsva: Hsva, withAlpha: boolean) {
  const { r, g, b, a } = hsvaToRgba(hsva);
  return withAlpha ? `rgba(${r}, ${g}, ${b}, ${round(a, 2)})` : `rgb(${r}, ${g}, ${b})`;
}

/* ─── shared chrome ─────────────────────────────────────────── */

export type ColorFormat = "hex" | "rgb" | "hsl";

const FORMAT_ORDER: ColorFormat[] = ["hex", "rgb", "hsl"];

/**
 * 8px alpha checkerboard, drawn behind every translucent swatch.
 * These carry position/size syntax and a trailing base color, so they are only
 * valid in the `background` shorthand — `background-image` rejects both and
 * silently drops the whole declaration.
 */
const CHECKERBOARD_LAYER =
  "repeating-conic-gradient(color-mix(in srgb, var(--foreground) 26%, transparent) 0% 25%, transparent 0% 50%) 50% / 8px 8px";
const CHECKERBOARD_BASE = "var(--background)";
const CHECKERBOARD = `${CHECKERBOARD_LAYER}, ${CHECKERBOARD_BASE}`;

const thumbRingClass = cn(
  "pointer-events-none absolute block rounded-full",
  "border-2 border-white",
  "shadow-[0_0_0_1px_rgba(0,0,0,0.35),0_1px_4px_rgba(0,0,0,0.4)]",
);

const focusRing = cn(
  "outline-none",
  "focus-visible:ring-2 focus-visible:ring-[var(--primitive-ring)]",
  "focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--primitive-surface-overlay)]",
);

/** Maps a pointer event to 0..1 coordinates inside `el`. */
function pointerRatio(el: HTMLElement, event: { clientX: number; clientY: number }) {
  const rect = el.getBoundingClientRect();
  return {
    x: rect.width === 0 ? 0 : clamp((event.clientX - rect.left) / rect.width, 0, 1),
    y: rect.height === 0 ? 0 : clamp((event.clientY - rect.top) / rect.height, 0, 1),
  };
}

function useDrag(
  onMove: (el: HTMLElement, event: { clientX: number; clientY: number }) => void,
  disabled?: boolean,
) {
  const [dragging, setDragging] = React.useState(false);

  const onPointerDown = React.useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (disabled || event.button !== 0) return;
      const el = event.currentTarget;
      el.setPointerCapture(event.pointerId);
      setDragging(true);
      el.focus();
      onMove(el, event);
    },
    [disabled, onMove],
  );

  const onPointerMove = React.useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (!dragging) return;
      event.preventDefault();
      onMove(event.currentTarget, event);
    },
    [dragging, onMove],
  );

  const stop = React.useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    setDragging(false);
  }, []);

  return {
    dragging,
    handlers: {
      onPointerDown,
      onPointerMove,
      onPointerUp: stop,
      onPointerCancel: stop,
    },
  };
}

/** Arrow/Home/End stepping shared by the canvas and both rails. */
function arrowStep(
  key: string,
  step: number,
  big: number,
): { dx: number; dy: number } | null {
  switch (key) {
    case "ArrowLeft":
      return { dx: -step, dy: 0 };
    case "ArrowRight":
      return { dx: step, dy: 0 };
    case "ArrowUp":
      return { dx: 0, dy: step };
    case "ArrowDown":
      return { dx: 0, dy: -step };
    case "PageUp":
      return { dx: big, dy: big };
    case "PageDown":
      return { dx: -big, dy: -big };
    default:
      return null;
  }
}

/* ─── saturation / value canvas ─────────────────────────────── */

function SaturationCanvas({
  hsva,
  onChange,
  disabled,
  className,
}: {
  hsva: Hsva;
  onChange: (next: { s: number; v: number }) => void;
  disabled?: boolean;
  className?: string;
}) {
  const apply = React.useCallback(
    (el: HTMLElement, event: { clientX: number; clientY: number }) => {
      const { x, y } = pointerRatio(el, event);
      onChange({ s: round(x * 100, 1), v: round((1 - y) * 100, 1) });
    },
    [onChange],
  );

  const { dragging, handlers } = useDrag(apply, disabled);

  const onKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (disabled) return;
    if (event.key === "Home" || event.key === "End") {
      event.preventDefault();
      onChange(event.key === "Home" ? { s: 0, v: 100 } : { s: 100, v: 100 });
      return;
    }
    const delta = arrowStep(event.key, event.shiftKey ? 10 : 1, 10);
    if (!delta) return;
    event.preventDefault();
    onChange({
      s: clamp(hsva.s + delta.dx),
      v: clamp(hsva.v + delta.dy),
    });
  };

  return (
    <div
      role="slider"
      aria-label="Saturation and brightness"
      aria-valuetext={`Saturation ${Math.round(hsva.s)}%, brightness ${Math.round(hsva.v)}%`}
      aria-disabled={disabled || undefined}
      data-dragging={dragging || undefined}
      tabIndex={disabled ? -1 : 0}
      onKeyDown={onKeyDown}
      {...handlers}
      className={cn(
        "relative isolate w-full touch-none select-none",
        disabled ? "cursor-not-allowed" : dragging ? "cursor-grabbing" : "cursor-crosshair",
        focusRing,
        "focus-visible:ring-inset focus-visible:ring-offset-0",
        className,
      )}
      style={{ backgroundColor: `hsl(${hsva.h} 100% 50%)` }}
    >
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#fff,transparent)]" />
      <div className="absolute inset-0 bg-[linear-gradient(to_top,#000,transparent)]" />
      <span
        className={cn(
          thumbRingClass,
          "size-4 -translate-x-1/2 -translate-y-1/2",
          "transition-transform duration-100 ease-out data-[dragging]:scale-110",
          "motion-reduce:transition-none motion-reduce:data-[dragging]:scale-100",
        )}
        data-dragging={dragging || undefined}
        style={{
          // Clamped by half the thumb so it never clips against the panel's
          // rounded, overflow-hidden edges at the fully saturated corners.
          left: `clamp(8px, ${hsva.s}%, calc(100% - 8px))`,
          top: `clamp(8px, ${100 - hsva.v}%, calc(100% - 8px))`,
          backgroundColor: hsvaToCss({ ...hsva, a: 1 }, false),
        }}
      />
    </div>
  );
}

/* ─── rails ─────────────────────────────────────────────────── */

function Rail({
  label,
  value,
  max,
  step = 1,
  valueText,
  trackStyle,
  thumbColor,
  onChange,
  disabled,
}: {
  label: string;
  value: number;
  max: number;
  step?: number;
  valueText: string;
  trackStyle: React.CSSProperties;
  thumbColor: string;
  onChange: (next: number) => void;
  disabled?: boolean;
}) {
  const apply = React.useCallback(
    (el: HTMLElement, event: { clientX: number; clientY: number }) => {
      onChange(round(pointerRatio(el, event).x * max, 2));
    },
    [max, onChange],
  );

  const { dragging, handlers } = useDrag(apply, disabled);

  const onKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (disabled) return;
    if (event.key === "Home" || event.key === "End") {
      event.preventDefault();
      onChange(event.key === "Home" ? 0 : max);
      return;
    }
    const unit = step * (event.shiftKey ? 10 : 1);
    const delta = arrowStep(event.key, unit, step * 10);
    if (!delta) return;
    event.preventDefault();
    onChange(round(clamp(value + (delta.dx || delta.dy), 0, max), 2));
  };

  return (
    <div
      role="slider"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={max}
      aria-valuenow={round(value, 1)}
      aria-valuetext={valueText}
      aria-disabled={disabled || undefined}
      tabIndex={disabled ? -1 : 0}
      onKeyDown={onKeyDown}
      {...handlers}
      className={cn(
        "relative h-3 w-full touch-none select-none rounded-full",
        "shadow-[inset_0_0_0_1px_color-mix(in_srgb,var(--foreground)_12%,transparent)]",
        disabled ? "cursor-not-allowed" : dragging ? "cursor-grabbing" : "cursor-pointer",
        focusRing,
      )}
      style={trackStyle}
    >
      <span
        className={cn(
          thumbRingClass,
          "top-1/2 size-[18px] -translate-x-1/2 -translate-y-1/2",
          "transition-transform duration-100 ease-out data-[dragging]:scale-110",
          "motion-reduce:transition-none motion-reduce:data-[dragging]:scale-100",
        )}
        data-dragging={dragging || undefined}
        style={{
          // Inset by half the thumb so it never overhangs either rail end.
          left: `calc(9px + ${value / max} * (100% - 18px))`,
          background: thumbColor,
        }}
      />
    </div>
  );
}

/* ─── numeric + hex fields ──────────────────────────────────── */

const fieldShellClass = cn(
  "flex h-8 w-full items-center rounded-[var(--primitive-radius-control-sm)]",
  "border border-[var(--border)] bg-[var(--background)]",
  "transition-[border-color,box-shadow] duration-150 ease-[var(--primitive-ease)]",
  "hover:border-[color-mix(in_srgb,var(--foreground)_16%,transparent)]",
  "focus-within:border-[color-mix(in_srgb,var(--foreground)_26%,transparent)]",
  "focus-within:ring-2 focus-within:ring-[var(--primitive-ring)]",
  "focus-within:ring-offset-2 focus-within:ring-offset-[var(--primitive-surface-overlay)]",
  "motion-reduce:transition-none",
);

const fieldInputClass = cn(
  "h-full w-full bg-transparent text-center text-xs font-medium tabular-nums",
  "text-[var(--foreground)] outline-none",
  "[appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none",
  "disabled:cursor-not-allowed",
);

function ChannelField({
  label,
  value,
  min,
  max,
  onCommit,
  disabled,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  onCommit: (next: number) => void;
  disabled?: boolean;
}) {
  const [draft, setDraft] = React.useState<string | null>(null);
  const shown = draft ?? String(Math.round(value));

  const commit = (raw: string) => {
    const parsed = Number.parseFloat(raw);
    setDraft(null);
    if (Number.isNaN(parsed)) return;
    onCommit(clamp(Math.round(parsed), min, max));
  };

  return (
    <label className="flex min-w-0 flex-1 flex-col items-center gap-1.5">
      <span className={fieldShellClass}>
        <input
          type="text"
          inputMode="numeric"
          value={shown}
          disabled={disabled}
          aria-label={label}
          onChange={(event) => setDraft(event.target.value)}
          onBlur={(event) => commit(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              commit(event.currentTarget.value);
            }
            if (event.key === "ArrowUp" || event.key === "ArrowDown") {
              event.preventDefault();
              const step = (event.shiftKey ? 10 : 1) * (event.key === "ArrowUp" ? 1 : -1);
              setDraft(null);
              onCommit(clamp(Math.round(value) + step, min, max));
            }
          }}
          className={fieldInputClass}
        />
      </span>
      <span className="text-[10px] font-medium tracking-[0.08em] text-[var(--primitive-text-secondary)]">
        {label}
      </span>
    </label>
  );
}

function HexField({
  hex,
  onCommit,
  disabled,
}: {
  hex: string;
  onCommit: (next: string) => void;
  disabled?: boolean;
}) {
  const [draft, setDraft] = React.useState<string | null>(null);
  const shown = (draft ?? hex).replace(/^#/, "").toUpperCase();

  const commit = (raw: string) => {
    setDraft(null);
    if (parseHex(raw)) onCommit(raw.startsWith("#") ? raw : `#${raw}`);
  };

  return (
    <label className="flex min-w-0 flex-1 flex-col items-center gap-1.5">
      <span className={fieldShellClass}>
        <span className="pl-2.5 text-xs text-[var(--primitive-text-placeholder)]">#</span>
        <input
          type="text"
          spellCheck={false}
          autoComplete="off"
          value={shown}
          disabled={disabled}
          aria-label="Hex color"
          onChange={(event) => setDraft(event.target.value)}
          onBlur={(event) => commit(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              commit(event.currentTarget.value);
            }
          }}
          className={cn(fieldInputClass, "pl-1 pr-2.5 text-left uppercase tracking-[0.08em]")}
        />
      </span>
      <span className="text-[10px] font-medium tracking-[0.08em] text-[var(--primitive-text-secondary)]">
        HEX
      </span>
    </label>
  );
}

/* ─── eyedropper ────────────────────────────────────────────── */

type EyeDropperCtor = new () => { open: () => Promise<{ sRGBHex: string }> };

/** Support never changes for the life of the document, so nothing subscribes. */
const subscribeToNothing = () => () => {};

function useEyeDropper() {
  // Read through useSyncExternalStore rather than an effect: the server
  // snapshot is false, so SSR and the first client paint agree on markup
  // without a post-mount setState and the re-render it costs.
  const supported = React.useSyncExternalStore(
    subscribeToNothing,
    () => "EyeDropper" in window,
    () => false,
  );

  const pick = React.useCallback(async () => {
    const Ctor = (window as unknown as { EyeDropper?: EyeDropperCtor }).EyeDropper;
    if (!Ctor) return null;
    try {
      const result = await new Ctor().open();
      return result.sRGBHex;
    } catch {
      // User dismissed with Escape — not an error worth surfacing.
      return null;
    }
  }, []);

  return { supported, pick };
}

/* ─── panel ─────────────────────────────────────────────────── */

export interface ColorPickerPanelProps {
  /** Controlled color as a hex string (`#rrggbb` or `#rrggbbaa`). */
  value?: string;
  /** Initial color when uncontrolled. */
  defaultValue?: string;
  /** Fires on every committed change with a hex string. */
  onChange?: (hex: string) => void;
  /** Initial format shown in the fields row. */
  format?: ColorFormat;
  /** Adds the alpha rail and emits 8-digit hex below full opacity. */
  alpha?: boolean;
  /** Shows the eyedropper button where the browser supports it. */
  eyedropper?: boolean;
  /** Preset hex swatches rendered under the fields. */
  swatches?: string[];
  /** Disables every control. */
  disabled?: boolean;
  className?: string;
}

const DEFAULT_COLOR = "#3b82f6";

function useColorState({
  value,
  defaultValue,
  onChange,
  alpha,
}: Pick<ColorPickerPanelProps, "value" | "defaultValue" | "onChange" | "alpha">) {
  const withAlpha = Boolean(alpha);

  const [hsva, setHsvaState] = React.useState<Hsva>(() => {
    const parsed = parseHex(value ?? defaultValue ?? DEFAULT_COLOR) ??
      parseHex(DEFAULT_COLOR)!;
    return rgbaToHsva(parsed);
  });

  const rgba = React.useMemo(() => hsvaToRgba(hsva), [hsva]);
  const hex = React.useMemo(() => rgbaToHex(rgba, withAlpha), [rgba, withAlpha]);

  // Adopt an external controlled value only when it is a different color than
  // the one currently rendered, so hue survives achromatic round-trips and the
  // value we just emitted does not bounce back through here.
  //
  // This adjusts state during render rather than in an effect: React discards
  // the render and retries immediately, so the external color is never painted
  // one frame late. The condition clears once adopted, since `hex` recomputes
  // from the new state and both sides are normalised through `rgbaToHex`.
  const externalRgba = value === undefined ? null : parseHex(value);
  if (
    externalRgba &&
    rgbaToHex(externalRgba, withAlpha).toLowerCase() !== hex.toLowerCase()
  ) {
    setHsvaState((prev) => {
      const next = rgbaToHsva(externalRgba);
      return { ...next, h: next.s === 0 || next.v === 0 ? prev.h : next.h };
    });
  }

  // Commit outside the updater — a state updater must stay pure, so onChange
  // is called with the already-computed next color.
  const commit = (next: Hsva) => {
    setHsvaState(next);
    onChange?.(rgbaToHex(hsvaToRgba(next), withAlpha));
  };

  const setHsva = (patch: Partial<Hsva>) => commit({ ...hsva, ...patch });

  const setFromRgba = (next: Rgba) => {
    const converted = rgbaToHsva(next);
    commit({
      ...converted,
      h: converted.s === 0 || converted.v === 0 ? hsva.h : converted.h,
    });
  };

  return { hsva, rgba, hex, withAlpha, setHsva, setFromRgba };
}

export function ColorPickerPanel({
  value,
  defaultValue,
  onChange,
  format = "hex",
  alpha = false,
  eyedropper = true,
  swatches,
  disabled,
  className,
}: ColorPickerPanelProps) {
  const { hsva, rgba, hex, withAlpha, setHsva, setFromRgba } = useColorState({
    value,
    defaultValue,
    onChange,
    alpha,
  });

  const [activeFormat, setActiveFormat] = React.useState<ColorFormat>(format);
  const { supported: dropperSupported, pick } = useEyeDropper();
  const hsl = hsvaToHsl(hsva);
  const solid = hsvaToCss({ ...hsva, a: 1 }, false);
  const current = hsvaToCss(hsva, withAlpha);

  const cycleFormat = () =>
    setActiveFormat(
      (prev) =>
        FORMAT_ORDER[(FORMAT_ORDER.indexOf(prev) + 1) % FORMAT_ORDER.length] ?? "hex",
    );

  const onEyedropper = async () => {
    const picked = await pick();
    const parsed = picked ? parseHex(picked) : null;
    if (parsed) setFromRgba({ ...parsed, a: hsva.a });
  };

  const showDropper = eyedropper && dropperSupported;

  return (
    <div
      data-wensity-primitive=""
      data-slot="wensity-color-picker-panel"
      className={cn(
        "w-[268px] overflow-hidden select-none",
        "rounded-[var(--primitive-radius-surface)] border border-[var(--border)]",
        "bg-[var(--primitive-surface-overlay)] text-[var(--foreground)]",
        disabled && "pointer-events-none opacity-45",
        className,
      )}
    >
      <SaturationCanvas
        hsva={hsva}
        disabled={disabled}
        onChange={(next) => setHsva(next)}
        className="h-[164px]"
      />

      <div className="flex flex-col gap-3 p-3">
        <div className="flex items-center gap-2.5">
          {showDropper && (
            <button
              type="button"
              onClick={onEyedropper}
              disabled={disabled}
              aria-label="Pick a color from the screen"
              className={cn(
                "grid size-8 shrink-0 place-items-center rounded-[var(--primitive-radius-control-sm)]",
                "border border-[var(--border)] bg-[var(--background)]",
                "text-[var(--primitive-text-secondary)]",
                "transition-[color,background-color,border-color,transform] duration-100 ease-out",
                "hover:bg-[var(--primitive-surface-hover)] hover:text-[var(--foreground)]",
                "active:scale-[0.97] disabled:cursor-not-allowed",
                "motion-reduce:transition-none motion-reduce:active:scale-100",
                focusRing,
              )}
            >
              <IconColorPicker size={15} strokeWidth={1.7} aria-hidden />
            </button>
          )}

          <span
            aria-hidden
            className={cn(
              "size-8 shrink-0 rounded-full",
              "shadow-[inset_0_0_0_1px_color-mix(in_srgb,var(--foreground)_14%,transparent)]",
            )}
            style={{ background: CHECKERBOARD }}
          >
            <span
              className="block size-full rounded-full"
              style={{ backgroundColor: current }}
            />
          </span>

          <div className="flex min-w-0 flex-1 flex-col gap-2.5">
            <Rail
              label="Hue"
              value={hsva.h}
              max={360}
              valueText={`${Math.round(hsva.h)} degrees`}
              disabled={disabled}
              onChange={(h) => setHsva({ h })}
              thumbColor={`hsl(${hsva.h} 100% 50%)`}
              trackStyle={{
                backgroundImage:
                  "linear-gradient(to right, #f00 0%, #ff0 17%, #0f0 33%, #0ff 50%, #00f 67%, #f0f 83%, #f00 100%)",
              }}
            />
            {withAlpha && (
              <Rail
                label="Opacity"
                value={hsva.a * 100}
                max={100}
                valueText={`${Math.round(hsva.a * 100)}%`}
                disabled={disabled}
                onChange={(a) => setHsva({ a: clamp(a, 0, 100) / 100 })}
                thumbColor={current}
                trackStyle={{
                  background: `linear-gradient(to right, transparent, ${solid}), ${CHECKERBOARD}`,
                }}
              />
            )}
          </div>
        </div>

        <div className="flex items-start gap-2">
          {activeFormat === "hex" && (
            <HexField
              hex={hex}
              disabled={disabled}
              onCommit={(next) => {
                const parsed = parseHex(next);
                if (parsed) setFromRgba(withAlpha ? parsed : { ...parsed, a: hsva.a });
              }}
            />
          )}

          {activeFormat === "rgb" && (
            <>
              <ChannelField
                label="R"
                value={rgba.r}
                min={0}
                max={255}
                disabled={disabled}
                onCommit={(r) => setFromRgba({ ...rgba, r })}
              />
              <ChannelField
                label="G"
                value={rgba.g}
                min={0}
                max={255}
                disabled={disabled}
                onCommit={(g) => setFromRgba({ ...rgba, g })}
              />
              <ChannelField
                label="B"
                value={rgba.b}
                min={0}
                max={255}
                disabled={disabled}
                onCommit={(b) => setFromRgba({ ...rgba, b })}
              />
            </>
          )}

          {activeFormat === "hsl" && (
            <>
              <ChannelField
                label="H"
                value={hsl.h}
                min={0}
                max={360}
                disabled={disabled}
                onCommit={(h) => setHsva(hslToHsva(h, hsl.s, hsl.l, hsva.a))}
              />
              <ChannelField
                label="S"
                value={hsl.s}
                min={0}
                max={100}
                disabled={disabled}
                onCommit={(s) => setHsva(hslToHsva(hsl.h, s, hsl.l, hsva.a))}
              />
              <ChannelField
                label="L"
                value={hsl.l}
                min={0}
                max={100}
                disabled={disabled}
                onCommit={(l) => setHsva(hslToHsva(hsl.h, hsl.s, l, hsva.a))}
              />
            </>
          )}

          {withAlpha && activeFormat !== "hex" && (
            <ChannelField
              label="A"
              value={hsva.a * 100}
              min={0}
              max={100}
              disabled={disabled}
              onCommit={(a) => setHsva({ a: a / 100 })}
            />
          )}

          <button
            type="button"
            onClick={cycleFormat}
            disabled={disabled}
            aria-label={`Color format: ${activeFormat.toUpperCase()}. Switch format`}
            className={cn(
              "mt-0.5 grid size-8 shrink-0 place-items-center rounded-[var(--primitive-radius-control-sm)]",
              "text-[var(--primitive-text-secondary)]",
              "transition-[color,background-color] duration-100 ease-out",
              "hover:bg-[var(--primitive-surface-hover)] hover:text-[var(--foreground)]",
              "active:scale-[0.97] disabled:cursor-not-allowed",
              "motion-reduce:transition-none motion-reduce:active:scale-100",
              focusRing,
            )}
          >
            <IconSelector size={15} strokeWidth={1.7} aria-hidden />
          </button>
        </div>

        {swatches && swatches.length > 0 && (
          <div className="flex flex-wrap gap-1.5 border-t border-[var(--border)] pt-3">
            {swatches.map((swatch) => {
              const selected = swatch.toLowerCase() === hex.slice(0, 7).toLowerCase();
              const parsedSwatch = parseHex(swatch);
              const darkMark = parsedSwatch ? isLightColor(parsedSwatch) : false;
              return (
                <button
                  key={swatch}
                  type="button"
                  disabled={disabled}
                  aria-label={swatch}
                  aria-pressed={selected}
                  onClick={() => {
                    const parsed = parseHex(swatch);
                    if (parsed) setFromRgba({ ...parsed, a: hsva.a });
                  }}
                  className={cn(
                    "size-5 rounded-full",
                    "shadow-[inset_0_0_0_1px_color-mix(in_srgb,var(--foreground)_16%,transparent)]",
                    "transition-transform duration-100 ease-out",
                    "hover:scale-110 active:scale-[0.94]",
                    "motion-reduce:transition-none motion-reduce:hover:scale-100",
                    focusRing,
                  )}
                  style={{ backgroundColor: swatch }}
                >
                  <IconCheck
                    size={12}
                    strokeWidth={2.6}
                    aria-hidden
                    className={cn(
                      "mx-auto",
                      selected ? "opacity-100" : "opacity-0",
                      // Tick follows the swatch's luminance, so it stays legible
                      // on both a near-black and a pale swatch.
                      darkMark
                        ? "text-black/80"
                        : "text-white drop-shadow-[0_1px_1px_rgba(0,0,0,0.45)]",
                    )}
                  />
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── trigger + popover ─────────────────────────────────────── */

export interface ColorPickerProps extends ColorPickerPanelProps {
  /** Controlled open state of the popover. */
  open?: boolean;
  /** Initial open state when uncontrolled. */
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** Which side the panel opens on. */
  side?: "top" | "right" | "bottom" | "left";
  align?: "start" | "center" | "end";
  /** Hides the hex label inside the trigger. */
  showValue?: boolean;
  /** Replaces the default trigger. */
  children?: React.ReactNode;
}

export function ColorPicker({
  open,
  defaultOpen,
  onOpenChange,
  side = "bottom",
  align = "start",
  showValue = true,
  children,
  className,
  ...panelProps
}: ColorPickerProps) {
  const { value, defaultValue, alpha } = panelProps;
  const [internalHex, setInternalHex] = React.useState(
    () => value ?? defaultValue ?? DEFAULT_COLOR,
  );
  const hex = value ?? internalHex;
  const displayHex = React.useMemo(() => {
    const parsed = parseHex(hex);
    return parsed ? rgbaToHex(parsed, Boolean(alpha)) : hex;
  }, [hex, alpha]);

  return (
    <BasePopover.Root
      open={open}
      defaultOpen={defaultOpen}
      onOpenChange={onOpenChange ? (next) => onOpenChange(next) : undefined}
    >
      <BasePopover.Trigger
        disabled={panelProps.disabled}
        render={
          children ? (
            (children as React.ReactElement)
          ) : (
            <button
              type="button"
              data-wensity-primitive=""
              className={cn(
                "inline-flex h-[var(--primitive-control-height-md)] items-center gap-2.5",
                "rounded-[var(--primitive-radius-control)] border border-[var(--border)]",
                "bg-[var(--background)] pl-2 pr-3 text-sm text-[var(--foreground)]",
                "transition-[border-color,background-color,transform] duration-100 ease-out",
                "hover:border-[color-mix(in_srgb,var(--foreground)_16%,transparent)]",
                "hover:bg-[var(--primitive-surface-hover)]",
                "active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-45",
                "motion-reduce:transition-none motion-reduce:active:scale-100",
                focusRing,
                "focus-visible:ring-offset-[var(--background)]",
                className,
              )}
            >
              <span
                aria-hidden
                className="size-5 shrink-0 rounded-[6px] shadow-[inset_0_0_0_1px_color-mix(in_srgb,var(--foreground)_16%,transparent)]"
                style={{ background: CHECKERBOARD }}
              >
                <span
                  className="block size-full rounded-[6px]"
                  style={{ backgroundColor: displayHex }}
                />
              </span>
              {showValue && (
                <span className="font-medium uppercase tabular-nums tracking-[0.04em]">
                  {displayHex}
                </span>
              )}
            </button>
          )
        }
      />
      <BasePopover.Portal container={typeof document==='undefined'?undefined:document.fullscreenElement as HTMLElement||undefined}>
        <BasePopover.Positioner
          data-lenis-prevent
          side={side}
          align={align}
          sideOffset={8}
          collisionPadding={12}
          className="wensity-color-positioner z-[var(--primitive-z-popover)] outline-none"
        >
          <BasePopover.Popup
            aria-label="Color picker"
            data-wensity-primitive=""
            className={cn(
              "origin-[var(--transform-origin)] transform-gpu outline-none",
              "rounded-[var(--primitive-radius-surface)]",
              "[box-shadow:var(--primitive-shadow-overlay)]",
              "transition-[opacity,scale] duration-[180ms] ease-[var(--primitive-ease,cubic-bezier(0.23,1,0.32,1))]",
              "data-[ending-style]:duration-[120ms]",
              "data-[starting-style]:opacity-0 data-[ending-style]:opacity-0",
              "data-[starting-style]:scale-[0.96] data-[ending-style]:scale-[0.96]",
              "motion-reduce:transition-none motion-reduce:data-[starting-style]:scale-100 motion-reduce:data-[ending-style]:scale-100",
            )}
          >
            <ColorPickerPanel
              {...panelProps}
              onChange={(next) => {
                setInternalHex(next);
                panelProps.onChange?.(next);
              }}
            />
          </BasePopover.Popup>
        </BasePopover.Positioner>
      </BasePopover.Portal>
    </BasePopover.Root>
  );
}
