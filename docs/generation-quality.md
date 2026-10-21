# Reviewing generated components

The generation prompt lives in `src/lib/component-prompt.ts`. Every request includes the current preview theme, styling format, and (for revisions) the existing TSX and CSS. User instructions and references take priority over the default visual direction.

Use the same short requests after changing the prompt or model:

| Request | Theme | What to inspect |
| --- | --- | --- |
| Create an event booking card with dates, time slots and an attendee count. | Light | Clear date hierarchy, aligned controls, readable prices, working selections, confirmation. |
| Create a compact music player with transport controls and a progress slider. | Dark | Recognizable player anatomy, balanced artwork and text, usable controls, no unnecessary glow. |
| Create a weekly activity summary with a small chart and a period switcher. | Light | Legible chart, aligned numbers and units, clear selected period, actual content changes. |

Review each at desktop width and a 375px phone preview. Check:

- The requested component is immediately recognizable and contains useful domain-specific content.
- Type size, weight, alignment and spacing establish a clear reading order.
- Theme, color contrast and surface separation are deliberate.
- Buttons and controls work; focus and selected states are visible.
- Narrow layouts fit without clipping or horizontal scrolling.
- Decoration and motion support the design rather than obscuring it.
- A follow-up edit preserves unrelated styling and functionality.
- Exported TSX/CSS match the preview, and compilation succeeds.

Build validation verifies syntax, imports and CSS. It cannot certify visual quality or guarantee that a model follows every design instruction. The visual review above is still necessary. Reasoning depth affects model behavior and latency; use only settings supported by the selected adapter/model.
