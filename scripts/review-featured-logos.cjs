// Render source SVGs to temporary PNGs for visual and contrast review.
// Set STUDIO_RESVG_MODULE to a local installation of @resvg/resvg-js.
const fs = require('node:fs');
const path = require('node:path');
const { Resvg } = require(process.env.STUDIO_RESVG_MODULE || '@resvg/resvg-js');
const root = path.resolve(__dirname, '..');
const output = path.join(root, 'artifacts/featured-logo-review');
fs.mkdirSync(output, {recursive:true});
for (const file of fs.readdirSync(path.join(root, 'public/featured'))) {
  if (!file.endsWith('.svg')) continue;
  try {
    const source = path.join(root, 'public/featured', file);
    const target = path.join(output, file.replace(/\.svg$/, '.png'));
    if (fs.existsSync(target) && fs.statSync(target).mtimeMs >= fs.statSync(source).mtimeMs) continue;
    const image = new Resvg(fs.readFileSync(source), {fitTo:{mode:'width',value:180},font:{loadSystemFonts:false,fontFiles:['C:/Windows/Fonts/arial.ttf'],defaultFontFamily:'Arial'}}).render().asPng();
    fs.writeFileSync(target, image);
  } catch (error) { console.log(file, error.message); }
}
