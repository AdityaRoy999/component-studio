import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';

const snapshot = 'artifacts/reactbits-official';
const manifest = JSON.parse(await readFile(path.join(snapshot, 'manifest.json'), 'utf8'));
const integrated = [];
function replaceRequired(source, before, after, name) {
  if (!source.includes(before)) throw Error(`${name}: expected compatibility patch no longer matches upstream`);
  return source.replace(before, after);
}
for (const component of manifest.components) {
  const registry = JSON.parse(await readFile(path.join(snapshot, `${component.name}.json`), 'utf8'));
  const patches = [];
  for (const file of registry.files) {
    const name = path.basename(file.path);
    if (name !== `${component.name}.tsx` && name !== `${component.name}.css`) throw Error(`Unexpected registry file: ${name}`);
    let code = file.content;
    if (name.endsWith('.tsx')) {
      if (['Waves', 'LetterGlitch'].includes(component.name)) {
        code = replaceRequired(code, "gl.getExtension('WEBGL_lose_context')?.loseContext();", "// Effect replay keeps the canvas attached; release only after real unmount.\n      queueMicrotask(() => {\n        if (!canvas.isConnected) gl.getExtension('WEBGL_lose_context')?.loseContext();\n      });", name);
        patches.push('Keep attached WebGL contexts alive during React Strict Mode effect replay.');
      }
      if (component.name === 'LetterGlitch') {
        code = replaceRequired(code, 'uniform vec4 uBackground;\n', '', name);
        code = replaceRequired(code, 'outColor = color + uBackground * (1.0 - color.a);', 'outColor = color;', name);
        code = replaceRequired(code, `      if (s.backgroundColor) {\n        const [r, g, b] = parse(s.backgroundColor);\n        gl.uniform4f(u.uBackground, r, g, b, 1);\n      } else {\n        gl.uniform4f(u.uBackground, 0, 0, 0, 0);\n      }`, '      // CSS on the wrapper preserves transparent and translucent backgrounds.', name);
        code = replaceRequired(code, 'style={style} {...rest}', 'style={{ backgroundColor, ...style }} {...rest}', name);
        patches.push('Composite backgroundColor in CSS so transparency works in both themes.');
      }
      if (component.name === 'Folder') {
        code = replaceRequired(code, "if (item && typeof item === 'object') {", "if (item && typeof item === 'object' && !('type' in item)) {", name);
        patches.push('Narrow FolderEntry for the project React 18 TypeScript definitions.');
      }
      const attribution = `/* React Bits by David Haz. Copyright (c) 2026 David Haz.\n * MIT + Commons Clause; see third_party/reactbits/LICENSE.md.\n * Official registry: ${component.url}\n * Repository revision at import: ${manifest.revision}\n */\n`;
      code = code.replace("'use client';", `'use client';\n\n${attribution}`);
    }
    await writeFile(path.join('src/components/reactbits/library', name), code);
    integrated.push({ name, registry: component.url, upstreamSha256: createHash('sha256').update(file.content).digest('hex'), integratedSha256: createHash('sha256').update(code).digest('hex'), patches: name.endsWith('.tsx') ? patches : [] });
  }
}
await writeFile('third_party/reactbits/source-manifest.json', JSON.stringify({ repository: manifest.repository, revision: manifest.revision, files: integrated }, null, 2));
console.log(`Integrated ${manifest.components.length} official React Bits components (${integrated.length} files).`);
