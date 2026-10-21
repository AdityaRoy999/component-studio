// Validate the complete catalog and export the input used by the logo cache.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { createHash } = require('node:crypto');
const { createRequire } = require('node:module');
const ts = require('typescript');
const root = path.resolve(__dirname, '..');
fs.mkdirSync(path.join(root, 'artifacts'), { recursive: true });
const source = path.join(root, 'src/data/featured.ts');
const output = {};
new Function('exports', 'require', ts.transpileModule(fs.readFileSync(source, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, esModuleInterop: true }
}).outputText)(output, createRequire(source));
const { FEATURED_LIBRARIES: libraries, FEATURED_CATEGORIES: categories } = output;
assert(libraries.length >= 300 && libraries.length <= 400, 'Expected 300–400 libraries');
assert(categories.length >= 20, 'Expected specialist categories');
for (const key of ['id', 'name', 'url']) {
  assert.equal(new Set(libraries.map(row => row[key])).size, libraries.length, `Duplicate ${key}`);
}
for (const row of libraries) {
  assert(categories.some(category => category.id === row.category), `Unknown category: ${row.id}`);
  assert(row.description.length > 25, `Missing summary: ${row.id}`);
  assert(new URL(row.url).protocol === 'https:', `Invalid URL: ${row.id}`);
}
for (const category of categories) assert(libraries.some(row => row.category === category.id), `Empty category: ${category.id}`);
fs.writeFileSync(path.join(root, 'artifacts/featured-library-sources.json'), JSON.stringify(libraries, null, 2));
if (!process.argv.includes('--catalog-only')) {
  const logoSource = path.join(root, 'src/data/featured-logos.ts');
  const logoOutput = {};
  new Function('exports', ts.transpileModule(fs.readFileSync(logoSource, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS }
  }).outputText)(logoOutput);
  const sources = JSON.parse(fs.readFileSync(path.join(root, 'public/featured/sources.json'), 'utf8'));
  for (const library of libraries) {
    const logo = logoOutput.FEATURED_LOGOS[library.id];
    assert(logo, `Missing logo: ${library.id}`);
    assert(fs.existsSync(path.join(root, 'public', logo.src)), `Missing logo file: ${library.id}`);
    const asset = sources.find(row => row.id === library.id);
    assert(asset?.source && !asset.source.includes('github.githubassets.com'), `Generic branding: ${library.id}`);
    assert.equal(createHash('sha256').update(fs.readFileSync(path.join(root, 'public', logo.src))).digest('hex'), asset.sha256, `Logo provenance mismatch: ${library.id}`);
  }
  const evidence = JSON.parse(fs.readFileSync(path.join(root, 'docs/featured-library-evidence.json'), 'utf8'));
  const additions = new Set(Object.values(require('../src/data/featured-additions.json')).flat().map(([name]) => name.toLowerCase().replace(/[^a-z0-9]+/g, '-')));
  for (const library of libraries) {
    const record = evidence.find(row => row.id === library.id);
    if (additions.has(library.id)) assert(record?.license && record.licenseSource, `Unverified license: ${library.id}`);
  }
}
console.log(JSON.stringify({libraries:libraries.length, categories:categories.length,
  totals:Object.fromEntries(categories.map(category => [category.label, libraries.filter(row => row.category === category.id).length]))}, null, 2));
