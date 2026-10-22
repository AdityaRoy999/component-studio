import { PHASE_DEVELOPMENT_SERVER } from 'next/constants.js';

// The preview compiler resolves these browser packages at runtime. Static tracing
// cannot see imports inside generated component source or TypeScript declarations.
const previewFiles = [
  'react', 'react-dom', 'scheduler', 'loose-envify', 'js-tokens', 'motion', 'framer-motion',
  'motion-dom', 'motion-utils', 'tslib', 'lucide-react', 'html-to-image',
].map(name => `./node_modules/${name}/**/*`).concat(
  './node_modules/tailwindcss/lib/css/preflight.css',
);
const declarationFiles = ['@types/react', '@types/react-dom', '@types/prop-types', 'csstype']
  .map(name => `./node_modules/${name}/**/*`).concat(
    // TypeScript loads these through its compiler host at runtime. Tracing the
    // compiler JavaScript does not include the transitive ES/DOM declarations.
    './node_modules/typescript/lib/lib*.d.ts',
  );

/** Keep production builds from replacing the chunks of a running dev server. */
const config = (phase) => ({
  distDir: process.env.STUDIO_BUILD_DIR || (phase === PHASE_DEVELOPMENT_SERVER ? '.next-dev' : '.next'),
  experimental: {
    serverComponentsExternalPackages: ['esbuild','typescript'],
    optimizePackageImports: ['@hugeicons/core-free-icons'],
    outputFileTracingIncludes: {
      '/api/preview': previewFiles,
      '/api/generate': [...previewFiles, ...declarationFiles],
      '/api/validate': [...previewFiles, ...declarationFiles],
    },
  },
});
export default config;
