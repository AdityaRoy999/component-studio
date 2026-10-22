const fs=require('node:fs'),path=require('node:path');
const root=process.cwd(),dist=path.resolve(root,process.env.STUDIO_BUILD_DIR||'.next');
const directory=path.dirname(require.resolve('typescript'));
const libraries=fs.readdirSync(directory).filter(name=>/^lib\..*\.d\.ts$/.test(name)).map(name=>path.resolve(directory,name));
for(const route of ['generate','validate']){
  const filename=path.join(dist,'server/app/api',route,'route.js.nft.json');
  const trace=JSON.parse(fs.readFileSync(filename,'utf8'));
  const shipped=new Set(trace.files.map(name=>path.resolve(path.dirname(filename),name)));
  const missing=libraries.filter(name=>!shipped.has(name));
  if(missing.length)throw new Error(`/api/${route} is missing ${missing.length} TypeScript standard libraries in its deployment trace: ${missing.slice(0,5).map(name=>path.basename(name)).join(', ')}. Check outputFileTracingIncludes before deploying.`);
}
console.log(`Verified ${libraries.length} TypeScript standard libraries in both validator function bundles.`);
