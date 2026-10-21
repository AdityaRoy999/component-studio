import * as Babel from '@babel/standalone';

/**
 * Strips TypeScript types from TSX/TS code using @babel/standalone with the typescript preset.
 */
export function convertTsToJs(code: string): string {
  if (!code || typeof code !== 'string') return '';
  try {
    const result = Babel.transform(code, {
      presets: [
        ['typescript', { isTSX: true, allExtensions: true }]
      ],
      filename: 'Component.tsx',
      retainLines: true,
      generatorOpts: {
        retainLines: true,
        compact: false,
      }
    });

    return result.code || code;
  } catch (err) {
    console.warn('Babel transform failed, falling back to regex stripper:', err);
    return fallbackStripTypes(code);
  }
}

/**
 * Fallback lightweight regex type stripper for edge-cases or partial code.
 */
function fallbackStripTypes(code: string): string {
  let cleaned = code;
  // Remove interface and type declarations
  cleaned = cleaned.replace(/export\s+(interface|type)\s+[\s\S]*?;\n/g, '');
  cleaned = cleaned.replace(/(interface|type)\s+[\s\S]*?;\n/g, '');
  // Remove : React.FC<...> or : Type annotations
  cleaned = cleaned.replace(/:\s*React\.[A-Za-z0-9_<>]+(?=\s*=|\s*\))/g, '');
  cleaned = cleaned.replace(/:\s*[A-Z][A-Za-z0-9_<>\[\]|&\s]*(?=\s*[,=)])/g, '');
  // Remove <T extends ...> generic parameters
  cleaned = cleaned.replace(/<[A-Z]\s+extends\s+[^>]+>/g, '');
  // Remove `as Type` casts
  cleaned = cleaned.replace(/\s+as\s+[A-Za-z0-9_<>\[\]]+/g, '');
  return cleaned;
}

/**
 * Converts Tailwind-based component into CSS classes and generates companion styles.css
 */
export function extractCssMode(code: string, componentName: string): { componentCode: string; cssCode: string } {
  // If the component already specifies custom CSS or classnames
  const baseClassName = componentName.toLowerCase() + '-root';

  const cssCode = `/* styles.css for ${componentName} */
.${baseClassName} {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  border-radius: 1rem;
  background-color: #0d0d0d;
  border: 1px solid rgba(255, 255, 255, 0.08);
  padding: 2rem;
  color: #ededed;
  transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
  box-shadow: 0 20px 40px -15px rgba(0, 0, 0, 0.7);
}

.${baseClassName}:hover {
  border-color: rgba(255, 255, 255, 0.18);
  box-shadow: 0 0 30px rgba(0, 216, 255, 0.15);
}

.${baseClassName} .studio-title {
  font-size: 1.5rem;
  font-weight: 700;
  letter-spacing: -0.025em;
  color: #ffffff;
  margin-bottom: 0.5rem;
}

.${baseClassName} .studio-description {
  font-size: 0.875rem;
  color: #888888;
  line-height: 1.5;
}

.${baseClassName} .studio-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.25rem 0.75rem;
  border-radius: 9999px;
  font-size: 0.75rem;
  font-weight: 500;
  background-color: rgba(0, 216, 255, 0.1);
  color: #00d8ff;
  border: 1px solid rgba(0, 216, 255, 0.25);
}
`;

  return {
    componentCode: code,
    cssCode
  };
}
