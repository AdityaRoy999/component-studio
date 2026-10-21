# How Component Studio works

Component Studio is a Next.js App Router application. The browser owns the workspace and saved history; server routes handle provider requests, compilation, validation, and exports.

## From prompt to preview

1. The composer sends a prompt, optional image references, model configuration, and existing component context to `/api/generate`.
2. A provider adapter starts the request. With `stream: true`, the server emits newline-delimited JSON events: `status`, `thinking`, `source`, `preview`, `done`, and `error`.
3. Partial source appears in Code. Renderable checkpoints are compiled with esbuild and Tailwind, then forwarded to the preview.
4. Completed output is parsed, checked for supported imports, and validated. Failed output can receive up to two targeted repair attempts using the compiler diagnostic.
5. The finished component and conversation are saved in browser-local IndexedDB. Follow-up requests include the current component as context.

Stopping a request propagates cancellation upstream. Failed or stopped revisions retain the last completed component. The server does not substitute a demo component for failed AI output.

## API routes

| Endpoint | Purpose |
| --- | --- |
| `GET /api/providers` | Provider availability and default settings; credentials are excluded. |
| `POST /api/providers` | Connection verification and model discovery, including pagination. |
| `POST /api/generate` | Generation, streaming, validation, and targeted repairs. |
| `POST /api/preview` | Local TSX/CSS compilation for the sandbox. |
| `POST /api/validate` | Validate manual source changes before applying them. |
| `POST /api/export` | Export source, compiled CSS, or a downloadable project ZIP. |

## Preview boundaries

Generated code runs in a scripts-only sandboxed iframe with an opaque origin and a restrictive content policy. The compiler accepts React, supported motion and icon imports, and companion source files; it rejects unsupported modules and server imports.

Property and theme changes are sent to the frame with messages, preserving the mounted component's React state. The preview forwards a host-managed `theme` prop and sets matching document classes and semantic CSS variables.

The read-only Code display is separate from source editing. Manual source changes are validated before application and retained as local versions. Usage snippets reflect selected property values.

## Models and persistence

The adapters support Gemini, OpenAI, Groq, OpenRouter, NVIDIA NIM, and custom OpenAI-compatible endpoints. Listing a model does not guarantee inference access or quota.

Browser-entered model profiles live in local storage. Server keys come from environment variables. A browser-supplied replacement endpoint never receives another endpoint's server-configured key. Custom endpoints use `/models` for discovery and `/chat/completions` for generation.

Build history, conversations, reference images, and recovery drafts live in IndexedDB. Favorites, titles, source versions, and customization travel with their saved builds. History can be backed up and imported through the interface.

Project ZIPs contain the component implementation, dependencies, and selected customization. They exclude provider credentials. JavaScript exports are transpiled from the actual TypeScript source; CSS exports are compiled from component utilities and companion stylesheets.

## Catalogs

- `src/data/presets.ts` and `src/data/expanded-presets.ts` define the 30 interactive presets.
- `src/data/featured.ts` and `src/data/featured-additions.json` define the 320-entry directory.
- `src/data/featured-logos.ts` maps entries to local assets under `public/featured/`.
- `public/featured/sources.json` records logo source URLs and hashes.
- `docs/featured-library-evidence.json` preserves primary-source license evidence for the additions.

Run `node scripts/check-featured.cjs` to check counts, unique entries, category coverage, logo files, provenance hashes, and license evidence. It writes a derived catalog to the ignored `artifacts/` directory for asset maintenance scripts.

## Local builds

Development uses `.next-dev`; production uses `.next`. `STUDIO_BUILD_DIR` overrides either directory, allowing an isolated build alongside a running server. Keep the same override for its corresponding `next start` command.

See [generation-quality.md](generation-quality.md) for validation behavior and regression-test coverage.
