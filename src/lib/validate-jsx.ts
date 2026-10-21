import { transform } from '@babel/standalone';

// Parse only; generated code must never execute on the server during validation.
export function validateJSX(code:string,cssCode='') {
  const palette=new Set(['slate','gray','zinc','neutral','stone','red','orange','amber','yellow','lime','green','emerald','teal','cyan','sky','blue','indigo','violet','purple','fuchsia','pink','rose']);
  const missing=new Set<string>();
  const unsupported3D=new Set<string>();
  const reactNames=new Set(['React','useState','useEffect','useRef','useMemo','useCallback','useReducer','useLayoutEffect','useContext','useImperativeHandle','useId','useSyncExternalStore','useTransition','useDeferredValue','useInsertionEffect']);
  function checkClasses(text:string) {
    for(const token of text.split(/\s+/)) {
      const plain=token.split(':').pop()||'';
      if(/^(?:perspective-(?:\d+|none|normal|dramatic|distant|near)|backface-(?:hidden|visible)|transform-(?:3d|flat)|(?:transform-style-)?preserve-3d|-?rotate-[xy]-\d+)$/.test(plain))unsupported3D.add(plain);
      const color=plain.match(/^(?:bg|text|border|ring|from|via|to|fill|stroke|decoration|accent|outline)-([a-z]+)-(?:50|[1-9]00|950)(?:\/\d+)?$/);
      if(color&&color[1]!=='opacity'&&!palette.has(color[1]) || /^(?:bg-background|text-foreground|text-muted-foreground|border-border|ring-ring|font-display)$/.test(plain))missing.add(plain);
    }
  }
  transform(code, {
    filename: 'Component.tsx',
    presets: [['typescript', {isTSX:true, allExtensions:true}]],
    code: false, ast: false,
    plugins: [() => ({visitor:{ReferencedIdentifier(path:any){
      const name=path.node.name;
      if(reactNames.has(name)&&!path.scope.hasBinding(name))throw path.buildCodeFrameError(`Missing React import: ${name}. Import ${name} from react before using it. Every hook and React namespace must be explicitly imported.`);
    },JSXOpeningElement(path:any){
      let name=path.node.name;
      while(name?.type==='JSXMemberExpression')name=name.object;
      if(name?.type==='JSXIdentifier'&&/^[A-Z]/.test(name.name)&&!path.scope.hasBinding(name.name))throw path.buildCodeFrameError(`Missing component import or declaration: ${name.name}. Import or define this component before rendering it.`);
    },CallExpression(path:any) {
      const callee=path.node.callee;
      const name=callee.type==='Identifier'&&!path.scope.hasBinding(callee.name)?callee.name:
        callee.type==='MemberExpression'&&!callee.computed&&callee.object?.name==='window'?callee.property?.name:'';
      if(['alert','confirm','prompt'].includes(name))throw path.buildCodeFrameError('Native browser dialogs are blocked in the sandbox preview. Show an inline React confirmation or an accessible in-component dialog with state instead.');
    },JSXAttribute(path:any) {
      if(path.node.name?.name === 'className'&&!cssCode.trim()) {
        if(path.node.value?.type==='StringLiteral')checkClasses(path.node.value.value);
        path.traverse({StringLiteral(child:any){checkClasses(child.node.value);}});
      }
      if(path.node.name?.name !== 'style') return;
      const attribute=path.node.value;
      const value=attribute?.type==='JSXExpressionContainer'?attribute.expression:attribute;
      if(!attribute || ['StringLiteral','NumericLiteral','BooleanLiteral'].includes(value?.type)) {
        throw path.buildCodeFrameError('React style must be an object, e.g. style={{ border: "1px solid #ddd" }}, never an HTML style string.');
      }
    }}})],
  });
  if(unsupported3D.size)throw new Error(`These 3D utilities are unavailable in Tailwind 3: ${[...unsupported3D].join(', ')}. Use inline React styles or supported arbitrary properties: [perspective:1000px] on the outer wrapper, [transform-style:preserve-3d] on the rotating inner wrapper, [backface-visibility:hidden] on BOTH faces, and [transform:rotateY(180deg)] on the back. Avoid flattening the rotating inner wrapper with overflow:hidden or filters. Keep the flip control outside the rotating faces and hide the inactive face from keyboard and assistive technology.`);
  if(missing.size)throw new Error(`These Tailwind classes have no styles in the standard theme: ${[...missing].slice(0,10).join(', ')}. Use standard palette colors, explicit hex values such as bg-[#c1694f], or supply matching scoped cssCode. Preserve the intended design and interactions.`);
}
