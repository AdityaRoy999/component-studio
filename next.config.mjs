import { PHASE_DEVELOPMENT_SERVER } from 'next/constants.js';

/** Keep production builds from replacing the chunks of a running dev server. */
const config = (phase) => ({
  distDir: process.env.STUDIO_BUILD_DIR || (phase === PHASE_DEVELOPMENT_SERVER ? '.next-dev' : '.next'),
  experimental: { serverComponentsExternalPackages: ['esbuild','typescript'], optimizePackageImports: ['@hugeicons/core-free-icons'] },
});
export default config;
