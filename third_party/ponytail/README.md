# Ponytail prompt guidance

Source: https://github.com/DietrichGebert/ponytail/blob/main/skills/ponytail/SKILL.md

Ponytail 5.3.2, retrieved 2026-10-17. Copyright (c) 2026 DietrichGebert, MIT; see LICENSE.
Snapshot SHA-256: 9BADD22A32E19CB884E46DFA8D3AAE82BB81DFA5484105B8B4F0262DF823A509.

The original prompt is retained here. `src/lib/ponytail-prompt.ts` adapts its smallest-complete-change guidance to this app's component-generation API. The adapter preserves complete JSON output, design quality, accessibility and validation. It does not install an agent plugin, add telemetry, remove provider limits, or truncate generated source. The generator uses bounded initial output budgets and one recovery attempt for incomplete output or interrupted streams.
