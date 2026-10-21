# Wensity Color Picker

Installed from the official Wensity CLI on 2026-10-18 using `npx --yes wensity@latest add color-picker` after the requested pnpm invocation encountered a pnpm dependency-resolution error.

Official library: https://ui.wensity.com/

Source: `src/components/wensity/color-picker.tsx`.
Dependencies: `@base-ui/react`, `@tabler/icons-react`.
Working controlled example: `src/components/wensity/color-picker-example.tsx`.

The original saturation/value canvas, hue/alpha rails, HEX/RGB/HSL fields, swatches and keyboard behavior are retained. The app adapter uses the host's surface, ink, border and focus tokens. Styles are scoped in `color-picker.css`; CLI-generated global tokens were replaced to preserve the existing page palette. The component's utility classes work with this project's Tailwind 3.4 pipeline, so the existing component compiler does not need a Tailwind migration.

The popover supports the app's expanded preview and native fullscreen container. Eyedropper access is disabled in the app adapter; no screen-capture permission is needed to edit a color.
