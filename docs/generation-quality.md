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

Build validation verifies syntax, imports, available type declarations, customization bindings and CSS. Candidate builds then render in an isolated browser frame with default props and selected customization in dark and light themes. Rendering errors and rejected promises are sent back with the exact candidate source for targeted edits. A build is saved as complete only after these checks pass. This checks startup rendering, not every possible interaction or visual quality; the review above is still necessary.

Generation, transport recovery, static repairs and browser repairs share a maximum of three provider requests per message. Identical failures stop early. Automated corrections ask for minimal exact edits and disable optional reasoning (NVIDIA Nemotron Super uses `reasoning_effort: "none"`). Requests and browser checks have deadlines, and Stop cancels subsequent work. Provider speed and availability still affect latency.

An interrupted provider repair can retry the same correction once within that shared budget. The browser stream sends quiet keepalives while waiting and finishes as soon as it receives the validated completion event. A dropped connection preserves the message and received source and reports an actionable error; it never silently starts another full build.

Customization controls are scalar values only. Array/object defaults stay in TSX; incompatible controls are removed before host props are created. The validator checks control defaults against the component's actual prop types and detects list operations on `any`-typed props without confusing shadowed variables or parsed CSV strings. Source edits and undo/redo retain the validated schema and update carried values. The iframe waits for host props and theme before its first render. Browser verification preserves source identifiers and supplies exact rendered values, their types and the theme to targeted repairs.

The deployed validator must include TypeScript's standard ES and DOM declaration files as well as React's types. `npm run build` checks both function deployment traces for these libraries. A runtime preflight detects missing standard libraries before contacting a model, so infrastructure failures cannot trigger repeated source repairs or false errors about arrays, iterators and hooks.

Response decoding preserves complete source even when optional JSON metadata is malformed. Closed TSX/CSS source fences, supporting files, plain modules and wrapped JSON are accepted, then receive the same compilation, type and browser checks. Incomplete strings and source fences are rejected. If local recovery fails, one format recovery requests unescaped, separately fenced files; it does not repeatedly ask the model to JSON-escape the same large component.

There is no fixed npm package whitelist. Browser-compatible packages and their transitive imports resolve through esm.sh, sharing the preview's React 18 instance. Package CSS and assets are included, and exported projects list imports as npm dependencies. Node-only packages need a server runtime; missing packages, unsupported exports and CDN failures produce a repair diagnostic. New remote packages are bundled as data on the server, then execute only inside the isolated preview; package install scripts never run on the host.
