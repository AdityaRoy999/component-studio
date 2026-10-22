import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { transform } from 'esbuild';
import postcss from 'postcss';
import tailwindcss from 'tailwindcss';
import { PRESETS } from '@/data/presets';
import { resolveGeneratedImport } from './generated-files';
import solarIcons from '@/data/solar-linear-icons.json';
import { npmPackage, packageImports } from './npm-imports';

// Studio demo exports cannot depend on this app's private @/components alias.
// Inline only the trusted local glyphs used by an owned demo, with attribution.
function portableIconSource(code:string){
  return code.replace(/import\s*\{([^}]+)\}\s*from\s*['"]@\/components\/ui\/icons['"];?/g,(_,imports:string)=>{
    const declarations=imports.split(',').map(item=>{
      const [name,alias]=item.trim().split(/\s+as\s+/);
      const icon=solarIcons[name as keyof typeof solarIcons];
      if(!icon)throw new Error(`Unregistered Solar icon in component source: ${name}`);
      return `const ${alias||name} = ({size=24,strokeWidth:_strokeWidth,absoluteStrokeWidth:_absoluteStrokeWidth,...props}:Record<string,any>) => <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 ${icon.width} ${icon.height}" fill="none" color="currentColor" aria-hidden={props['aria-label']?undefined:true} data-icon="solar:${icon.name}" {...props}><g dangerouslySetInnerHTML={{__html:${JSON.stringify(icon.body)}}}/></svg>;`;
    });
    return `/*! Solar Linear by 480 Design, via Iconify. CC BY 4.0: https://creativecommons.org/licenses/by/4.0/ — https://icon-sets.iconify.design/solar/ */\n${declarations.join('\n')}`;
  });
}

const sources: Record<string, { name: string; file: string; css?: string }> = {
  'gradient-ascii': { name: 'GradientASCII', file: 'reactbits/GradientASCII.tsx', css: 'reactbits/GradientASCII.css' },
  'border-glow': { name: 'BorderGlow', file: 'reactbits/BorderGlow.tsx', css: 'reactbits/BorderGlow.css' },
  'flux-lines': { name: 'FluxLines', file: 'studio/previews/FluxLines.tsx' },
  'holo-3d-card': { name: 'Holo3DCard', file: 'studio/previews/Holo3DCard.tsx' },
  'crystalized-ball': { name: 'CrystalizedBall', file: 'studio/previews/CrystalizedBall.tsx' },
  'pattern-waves': { name: 'PatternWaves', file: 'studio/previews/PatternWaves.tsx' },
  'circular-carousel': { name: 'CircularCarousel', file: 'studio/previews/CircularCarousel.tsx' },
  'tech-text-decode': { name: 'TechTextDecode', file: 'studio/previews/TechTextDecode.tsx' },
  'elastic-slider': { name: 'ElasticSlider', file: 'studio/previews/ElasticSlider.tsx' },
  'magnetic-cursor': { name: 'MagneticCursor', file: 'studio/previews/MagneticCursor.tsx' },
  'fluid-glass-dock': { name: 'FluidGlassDock', file: 'studio/previews/FluidGlassDock.tsx' },
};
export interface ComponentSource { id?: string; name: string; code: string; cssCode?: string; files?:Record<string,string>; }
export async function resolveSource(component: ComponentSource): Promise<ComponentSource> {
  const library = PRESETS.find(item=>item.id===component.id&&item.sourceUrl);
  if(library){
    const root=path.join(process.cwd(),'src/components/reactbits/library');
    const code=await readFile(path.join(root,`${library.name}.tsx`),'utf8');
    let cssCode:string|undefined;
    try{cssCode=await readFile(path.join(root,`${library.name}.css`),'utf8');}catch(error){if((error as NodeJS.ErrnoException).code!=='ENOENT')throw error;}
    return {id:component.id,name:library.name,code,cssCode};
  }
  const source = component.id ? sources[component.id] : undefined;
  if (!source) return component;
  const root = path.join(process.cwd(), 'src/components');
  const [code, cssCode] = await Promise.all([
    readFile(path.join(root, source.file), 'utf8'),
    source.css ? readFile(path.join(root, source.css), 'utf8') : undefined,
  ]);
  return { id: component.id, name: source.name, code:portableIconSource(code), cssCode };
}
const exportCache = new Map<string, Awaited<ReturnType<typeof createExport>>>();
export async function exportComponent(component: ComponentSource, language: 'TS' | 'JS', styling: 'Tailwind' | 'CSS') {
  const source = await resolveSource(component);
  const key = JSON.stringify([source, language, styling]);
  const cached = exportCache.get(key);
  if (cached) return cached;
  const result = await createExport(source, language, styling);
  if (exportCache.size >= 30) exportCache.delete(exportCache.keys().next().value!);
  exportCache.set(key, result);
  return result;
}
async function createExport(source: ComponentSource, language: 'TS' | 'JS', styling: 'Tailwind' | 'CSS') {
  const name = source.name.replace(/[^A-Za-z0-9_]/g, '') || 'Component';
  let code = source.code;
  let cssCode = source.cssCode || '';
  if(cssCode)code=code.replace(/(import\s+['"])([^'"]+\.css)(['"];?)/g,(match:string,before:string,specifier:string,after:string)=>!specifier.startsWith('.')||resolveGeneratedImport('Component.tsx',specifier,source.files||{})?match:`${before}./${name}.css${after}`);
  if (styling === 'CSS') {
    // Preserve the original utility classes and generate their real stylesheet.
    const compiled = await postcss([tailwindcss({ darkMode:'class', content: [code,...Object.values(source.files||{})].map(raw=>({raw,extension:'tsx'})), corePlugins: { preflight: false } })])
      .process('@tailwind utilities;', { from: undefined });
    cssCode = [cssCode, compiled.css].filter(Boolean).join('\n\n');
  }
  if (cssCode && !code.includes(`'./${name}.css'`)&&!code.includes(`"./${name}.css"`)) {
    code = code.replace(/(['"]use client['"];?\s*)?/, match => `${match}\nimport './${name}.css';\n`);
  }
  if (language === 'JS') code = (await transform(code, { loader: 'tsx', jsx: 'preserve', target: 'es2020', format: 'esm' })).code;
  if(PRESETS.some(item=>item.id===source.id&&item.sourceUrl)){
    const license=await readFile(path.join(process.cwd(),'third_party/reactbits/LICENSE.md'),'utf8');
    code=`/*! React Bits by David Haz.\n${license}\n*/\n${code}`;
  }
  const dependencies = [...new Set(packageImports([code,...Object.values(source.files||{})]).map(npmPackage).filter((name):name is string=>Boolean(name)&&name!=='react'))];
  return { name, componentCode: code, cssCode: cssCode || undefined, filename: `${name}.${language === 'TS' ? 'tsx' : 'jsx'}`, cssFilename: `${name}.css`, dependencies,files:source.files||{} };
}
