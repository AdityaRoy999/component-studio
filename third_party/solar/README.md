# Solar Linear icons

Solar icons are by **480 Design**, distributed through Iconify's `@iconify-json/solar` package, and licensed under [Creative Commons Attribution 4.0 International (CC BY 4.0)](https://creativecommons.org/licenses/by/4.0/).

- Collection and author attribution: https://icon-sets.iconify.design/solar/
- Package: https://www.npmjs.com/package/@iconify-json/solar
- Upstream Iconify data: https://github.com/iconify/icon-sets/tree/master/json

Component Studio uses the **Linear** variants for its interface. The selected SVG paths are copied without geometry changes into `src/data/solar-linear-icons.json` by `scripts/generate-solar-icons.cjs`. A shared React renderer adds sizing, accessible labels, and semantic compatibility names. The favorite control uses these glyphs with its existing React Bits pulse animation. The sun glyph illustrates the Solar credit card; it is not presented as a Solar brand logo.

Only the selected glyphs are bundled into the interface; rendering does not fetch from the Iconify API. Run `npm run icons:generate` after updating the source package or the semantic mapping. The Thanks page provides visible attribution and a source link.
