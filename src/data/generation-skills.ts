export interface FrontendSkillPreset { id:string; title:string; summary:string; markdown:string }
const preset=(id:string,title:string,description:string,body:string):FrontendSkillPreset=>({id,title,summary:description,markdown:`---\nname: ${id}\ndescription: ${JSON.stringify(description)}\nmetadata:\n  author: Component Studio\n  version: "1.0"\n---\n\n${body}`});

/** Original, self-contained Studio presets following the Agent Skills format. */
export const FRONTEND_SKILLS:FrontendSkillPreset[]=[
  preset('frontend-design','Frontend design','Create distinctive, polished React components with clear visual hierarchy. Use for cards, forms, navigation, and interface design.',`# Frontend design

## Workflow
1. Identify the component's purpose, audience, primary action, and any visual references. Respect the requested scope and palette.
2. Choose one coherent visual direction. Establish type hierarchy, spacing, surface treatment, and a restrained accent. Avoid adding ornamental sections or unsupported claims.
3. Build the complete interaction before adding polish. Every visible control must have a useful outcome.
4. Refine alignment, optical balance, text wrapping, and empty space at narrow and wide widths.

## Craft
- Give the primary content and action the most visual weight. Keep secondary metadata quieter while maintaining contrast.
- Use a small spacing scale and consistent radii. Match icon weight and center icons optically in their controls.
- Use available fonts and assets; do not depend on remote font or image requests.
- Make light and dark palettes intentional, including hover, focus, selected, and disabled states.

## Review
Check the result at 320px, with long labels, and with default props. Verify keyboard access and meaningful feedback for each action. Return the finished component in the host's required output format.`),
  preset('accessible-interfaces','Accessible interfaces','Build keyboard-friendly, readable React interfaces. Use for forms, menus, dialogs, tabs, and interactive controls.',`# Accessible interfaces

## Instructions
- Choose native semantic HTML first: button for actions, labelled inputs for entry, and headings in a useful order. Set button types explicitly in forms.
- Give every control an accessible name. Keep labels visible; placeholders are supplementary. Connect error and help text with aria-describedby.
- Preserve visible focus and logical tab order. Avoid positive tabindex. Selected and disabled states must be understandable without color alone.
- For tabs, support arrow-key movement and link tabs to their panels. For dialogs, label the dialog, move focus inside, contain focus, support Escape, and restore focus on close.
- Announce asynchronous success or failure with a concise status region. Keep entered values when validation fails.
- Maintain readable contrast in both themes. Use comfortable touch targets, adequate spacing, and text that survives zoom and wrapping.
- Respect prefers-reduced-motion. Keep essential state changes understandable without animation.

## Review
Walk through the primary task using only the keyboard. Check labels, empty and error states, focus visibility, and the outcome of every action. Keep the host's runtime and output requirements.`),
  preset('thoughtful-motion','Thoughtful motion','Add smooth, purposeful motion to React interfaces. Use for animated controls, transitions, and state changes.',`# Thoughtful motion

## Instructions
1. Define the state change and its purpose before animating it. Use motion to explain selection, hierarchy, or continuity.
2. Prefer transform and opacity. Use subtle blur only during short transitions and restore filter to none afterward.
3. Keep direct feedback quick, around 120–200ms; use 200–350ms for content transitions. Use restrained springs with enough damping to settle promptly.
4. Preserve layout continuity when content changes size. Avoid end-of-animation jumps and transitions on unrelated properties.
5. Handle rapid repeated clicks, interrupted transitions, and entering/exiting content without stale states. Interactive content must remain reachable.
6. Honor reduced motion with immediate state changes or simple fades. Do not hide information behind hover-only or animation-only behavior.
7. Clean up timers, listeners, and animation loops on unmount. Pause unnecessary background work.

## Review
Test the first render, repeated toggling, long content, and reduced motion. Preserve functional interactions and the host's required component output.`),
  preset('responsive-layout','Responsive layout','Create compact, resilient layouts across mobile and desktop. Use for grids, cards, navigation, and dense component content.',`# Responsive layout

## Instructions
- Start at 320px. Use intrinsic sizing, min-width: 0, flexible tracks, and sensible maximum widths before introducing breakpoints.
- Let content determine height. Avoid viewport-height components, fixed text heights, and arbitrary device-specific offsets.
- Allow labels, prices, translations, and headings to wrap. Use overflow handling only where it communicates an intentional behavior.
- Collapse multi-column content when its minimum useful width no longer fits. Preserve reading order and the primary action.
- Use fluid spacing sparingly and a consistent spacing scale. Keep text comfortably readable and controls easy to tap.
- For horizontal data that cannot reflow, provide a contained scrolling region with an accessible label. Avoid page-wide overflow.
- Support light and dark themes without changing geometry. Keep selected and focus indicators from shifting layout.

## Review
Check 320px, 768px, and wide containers; long unbroken strings; empty collections; and maximum content. Return only the requested component with the host's required JSON schema.`),
  preset('design-system','Design system','Build consistent, reusable component styles and states. Use when creating a cohesive product interface or reusable UI primitives.',`# Design system

## Workflow
1. Derive a small set of tokens for surfaces, text, borders, accent, spacing, radii, and typography. Respect existing product references.
2. Apply tokens consistently across normal, hover, focus, active, selected, disabled, loading, and error states.
3. Separate meaningful component variants from one-off decoration. Keep public props small and useful; provide sensible defaults.
4. Compose native controls and local React pieces. Use only dependencies supported by the host; do not assume external UI primitives exist.

## Details
- Keep icon sizing, label baselines, control heights, and content padding consistent.
- Use one primary action per decision area. Convey destructive actions clearly and confirm through a useful local interaction when needed.
- Make theme tokens complete so text, borders, overlays, and feedback retain contrast in both modes.
- Avoid global selectors and style leakage. Scope custom CSS to the component.

## Review
Inspect the complete state set, keyboard navigation, long labels, theme changes, and narrow containers. Ensure exposed customization props are actually consumed.`),
  preset('react-craft','React craft','Write reliable, maintainable interactive React components. Use for complex state, derived values, forms, and reusable component logic.',`# React craft

## Instructions
- Keep the component's state minimal. Derive filtered lists, totals, and selected labels during rendering rather than synchronizing duplicate state in effects.
- Use stable keys. Use functional state updates when the next value depends on the previous value. Never mutate props or state collections.
- Keep hooks unconditional and at component top level. Use effects only for external synchronization; clean up subscriptions, timers, and listeners.
- Put action-specific logic in event handlers. Avoid unnecessary memoization and abstractions for small, cheap computations.
- Type props and event handlers precisely. Use useful defaults and handle empty or invalid input gracefully.
- Build real interaction states: pending, success, validation failure, and retry where relevant. Never show controls with no useful behavior.
- Preserve state during theme changes. Use refs for imperative focus and element measurements, not for hiding render state.
- Keep code compatible with React 18 and the host's available imports. Do not fetch remote data or assume server features.

## Review
Check state transitions, repeated actions, default rendering, controlled inputs, accessibility, and effect cleanup. Return complete source and only customization props used by the component.`),
];

export const CUSTOM_SKILL_TEMPLATE=`---
name: my-frontend-skill
description: Create frontend components in my preferred style. Use for interface design and component revisions.
metadata:
  author: Your name
  version: "1.0"
---

# My frontend skill

## Instructions
- Use a compact layout with clear typography and generous spacing.
- Use neutral surfaces with one restrained accent color.
- Keep every interaction keyboard accessible and respect reduced motion.

## Review
Check narrow layouts, both themes, long labels, and all interactive states.
`;
