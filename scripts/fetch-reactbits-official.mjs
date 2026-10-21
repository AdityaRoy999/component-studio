import { readdir, readFile, writeFile, mkdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';

const directory = path.resolve('artifacts/reactbits-official');
await mkdir(directory, { recursive: true });
const names = (await readdir('src/components/reactbits/library')).filter(name => name.endsWith('.tsx')).map(name => name.slice(0, -4));
const revision = await fetch('https://api.github.com/repos/DavidHDev/react-bits/commits/main', { headers: { 'User-Agent': 'Component-Studio-source-sync' } }).then(response => { if (!response.ok) throw Error(`GitHub: ${response.status}`); return response.json(); });
const queue = [...names], results = [];
async function worker() {
  while (queue.length) {
    const name = queue.shift();
    const url = `https://reactbits.dev/r/${name}-TS-CSS.json`;
    const response = await fetch(url);
    if (!response.ok) throw Error(`${name}: ${response.status}`);
    const registry = await response.json();
    if (!registry.files?.some(file => file.path.endsWith(`${name}.tsx`))) throw Error(`${name}: missing implementation`);
    await writeFile(path.join(directory, `${name}.json`), JSON.stringify(registry, null, 2));
    const files = [];
    for (const file of registry.files) {
      const filename = path.basename(file.path);
      await writeFile(path.join(directory, filename), file.content);
      const local = await readFile(path.join('src/components/reactbits/library', filename), 'utf8').catch(() => '');
      files.push({ name: filename, sha256: createHash('sha256').update(file.content).digest('hex'), bytes: Buffer.byteLength(file.content), localBytes: Buffer.byteLength(local) });
    }
    results.push({ name, url, dependencies: registry.dependencies || [], files });
  }
}
await Promise.all(Array.from({ length: 4 }, worker));
results.sort((a, b) => a.name.localeCompare(b.name));
await writeFile(path.join(directory, 'manifest.json'), JSON.stringify({ repository: 'https://github.com/DavidHDev/react-bits', revision: revision.sha, fetchedAt: new Date().toISOString(), components: results }, null, 2));
await Promise.all([
  'src/demo/Components/ElasticSliderDemo.jsx',
  'src/demo/Components/TiltedCardDemo.jsx',
  'src/demo/Components/StepperDemo.jsx',
  'src/demo/Components/GlassIconsDemo.jsx',
  'src/demo/Backgrounds/WavesDemo.jsx',
].map(async source => {
  const response = await fetch(`https://api.github.com/repos/DavidHDev/react-bits/contents/${source}?ref=${revision.sha}`, { headers: { 'User-Agent': 'Component-Studio-source-sync' } });
  if (!response.ok) throw Error(`${source}: ${response.status}`);
  const file = await response.json();
  await writeFile(path.join(directory, path.basename(source)), Buffer.from(file.content, 'base64'));
}));
await mkdir('public/reactbits-demo', { recursive: true });
await Promise.all(['night-sky.webp', 'day-sky.webp'].map(async name => {
  const response = await fetch(`https://reactbits.dev/assets/demo/${name}`);
  if (!response.ok) throw Error(`${name}: ${response.status}`);
  await writeFile(path.join('public/reactbits-demo', name), Buffer.from(await response.arrayBuffer()));
}));
console.log(JSON.stringify({ revision: revision.sha, components: results.length, dependencies: [...new Set(results.flatMap(result => result.dependencies))], files: results.reduce((total, result) => total + result.files.length, 0) }, null, 2));
