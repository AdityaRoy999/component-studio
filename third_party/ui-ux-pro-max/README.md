# UI/UX Pro Max generation guidance

The generation policy in `src/lib/ui-ux-guidance.ts` is adapted from the user's installed `ui-ux-pro-max/SKILL.md`: its design workflow, priority table, quick reference, and professional UI checks. This source was read on 2026-10-18.

The runtime adaptation includes design-system selection, content hierarchy, accessibility, touch and keyboard interaction, performance, consistent style, responsive layout, typography and semantic color, purposeful motion, forms, and a final review. It applies to unspecified choices. Explicit user preferences and visual references take priority for the aspects they specify; revisions preserve accepted designs.

The installed skill includes native-app guidance, local Python commands, font downloads and libraries unavailable in the preview. The runtime version translates relevant principles to React/web, keeps the preview's allowed imports and host theme contract, and excludes those unavailable operations. It does not tell provider models to read a local path or run tools they do not have.

The same policy is included in the system message for all six providers, in streamed and regular generation, and in compiler repair requests. A short design directive also appears in each request brief and final contract. No extra AI request or runtime Python installation is required.

Local review used the skill's design-system search and UX search for animation, accessibility, stacking and loading. Its page-level sections and remote font suggestions were deliberately not applied to isolated preview components.
