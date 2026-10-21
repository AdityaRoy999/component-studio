React Bits by David Haz

Upstream: https://github.com/DavidHDev/react-bits
Repository revision at registry import: e12c22192ac7b4b452c5e2feb9b586d74765d696

Thirty React Bits components are integrated into this application under the included license. Code pages show the integrated implementation, companion styles, original usage examples, and upstream documentation. Exported implementation files include the upstream license text; its conditions continue to apply.

All 30 implementations and their 22 companion stylesheets were fetched from the official https://reactbits.dev/r/{Name}-TS-CSS.json registry. The unmodified registry snapshots and official example compositions are in artifacts/reactbits-official/. Every imported file's upstream and integrated hashes, source URL, and minimal compatibility patches are recorded in source-manifest.json.

Local compatibility patches preserve WebGL contexts during React Strict Mode effect replay, preserve transparent Letter Glitch backgrounds in both themes, and narrow Folder's union for the project's React 18 TypeScript definitions. Component animation/interaction engines otherwise use the official source. Elastic Slider and Stepper retain their official Hugeicons dependencies.

Demo compositions, responsive preview sizing, themes, and customization controls belong to this application. Tilted Card's sky photos are from the official React Bits demo assets: https://reactbits.dev/assets/demo/night-sky.webp and https://reactbits.dev/assets/demo/day-sky.webp.

To refresh source snapshots: node scripts/fetch-reactbits-official.mjs. To integrate the recorded source with compatibility patches: node scripts/integrate-reactbits-official.mjs. Review upstream license/dependency changes and run validation when refreshing.
