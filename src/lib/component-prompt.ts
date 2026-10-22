import { PONYTAIL_GUIDANCE } from './ponytail-prompt';
import { UI_UX_GUIDANCE, UI_UX_REQUEST_GUIDANCE } from './ui-ux-guidance';
import type { RevisionContext } from './generation-context';
import { skillGuidance } from './generation-skill';

export const COMPONENT_FINAL_CHECK = 'FINAL CONTRACT: mandatory runtime and JSON output rules; explicit user preferences first; apply the selected frontend skill when provided; UI/UX Pro Max for remaining unspecified design choices; requested scope only; compact responsive layout; readable light and dark themes; every visible control works; no invented claims or decorative filler; complete valid component JSON only.';

export const COMPONENT_SYSTEM_PROMPT = `Build a finished React component. Return valid JSON with complete code. Runtime/output rules are mandatory; explicit user references, palette and behavior override design defaults. Selected frontend skills override generic design defaults. Preserve identity and interactions on revisions.

QUALITY CONTRACT
1. SCOPE: Return only the requested component. No page shell, frame, extra tiers, selectors, accordions, sections or settings unless requested. No invented certifications, integrations, security badges or unsupported claims.
2. SIZE: Render with {}. A simple card usually needs only 360–440px maximum width and compact natural height. No h-screen/min-h-screen or tall mini landing page. Larger requested content may scroll naturally.
3. THEMES: Support BOTH themes via theme?:'light'|'dark', defaulting to the host theme. Derive colors together; the host changes theme live. Or use light base utilities with class-based dark: variants. Never read parent DOM or OS theme.
4. BEHAVIOR: Every visible control must change useful React state: billing updates real totals/units, tabs change content, filters change results, forms validate, actions confirm inline. No no-op handlers, dead links, placeholder actions, perpetual loading or browser dialogs. Use Intl.NumberFormat for money and consistent calculations. No external service claims for a local interaction.
5. CUSTOMIZATION: Every propsSchema name must match a consumed component prop. Render editable labels/colors from that prop, never hardcode them. The preview reinitializes local state on customization edits, including default/initial props; theme-only changes preserve state. Do not expose unused or decorative schema fields.
6. SIMPLICITY: Complete the requested behavior and skill review. No TODOs or stubs.

${UI_UX_GUIDANCE}

${PONYTAIL_GUIDANCE}

RUNTIME
- React 18 + TypeScript/TSX, one default export in code. Import every hook, namespace and icon used. Configurable props need useful defaults. For complex requests you may supply files:{"parts/Details.tsx":"source"} and import these relative files; keep simple requests in one file.
- Use any browser-compatible npm package and its CSS. Preview resolves dependencies; exports install them. Supply local files in files. Node-only code needs a server runtime.
- Use className, htmlFor and object-valued style; never HTML style strings or raw objects as children. Use inline state or an accessible local dialog instead of alert/confirm/prompt.
- Tailwind 3 standard theme only. bg-background, text-muted-foreground, font-display, perspective-1000, backface-hidden, transform-3d and rotate-y-180 are not built in. Use real complete utilities, arbitrary properties, inline styles or scoped cssCode. No interpolated partial class names. CSS mode must supply all styles. Keyframes belong in cssCode; no global body/html/* rules. Host variables have fallbacks: --preview-bg, --preview-surface, --preview-ink, --preview-muted, --preview-border.
- 3D flip: outer perspective:'1000px'; inner transformStyle:'preserve-3d'; BOTH faces backfaceVisibility:'hidden'; back rotateY(180deg). Clip faces. Keep the flip control outside them.

CHECK ONCE BEFORE RETURNING
Check scope, hierarchy, 320px sizing, both themes, defaults, every interaction, imports, styles and cleanup. Correct failures before returning. Do not print the review or private reasoning; do not claim browser tests you did not run.

OUTPUT ONLY VALID JSON
{"name":"PascalCaseName","title":"Short title","description":"One factual sentence","message":"Briefly describe the actual result and how to use its interactions. No guarantees or test claims.","code":"complete TSX source","cssCode":"optional scoped CSS","propsSchema":[]}
JSON-escape quotes, backslashes and newlines in source strings; no fences or commentary. Useful scalar props only; no handlers, refs, callbacks or theme. TSX owns labels and defaults. Schema: {name,type,defaultValue,description?,min?,max?,step?,options?}; types:string|number|boolean|color|select; options:string[].`;

function requestExamples(prompt:string){
  const examples=[
    [/form|input|signup|booking/i,'Forms: persistent labels, validation beside the relevant field, submit disabled while pending, a useful success state. Keep entered values after errors.'],
    [/pricing|billing|plan/i,'Pricing: one currency formatter, monthly/yearly state drives both price and billing copy, one primary CTA, compact benefits. Never invent compliance badges.'],
    [/tab|menu|navigation/i,'Navigation: use labelled buttons, selected state and keyboard arrow navigation; render the selected panel. No links to nowhere.'],
    [/dashboard|chart|analytics/i,'Data views: align numeric values, label units/time ranges, provide empty and filtered states and meaningful chart labels.'],
    [/card|glass/i,'Cards: a clear heading, concise supporting content, restrained border/elevation, one useful action. Preserve any requested material or palette.']
  ] as const;
  return examples.filter(([pattern])=>pattern.test(prompt)).slice(0,2).map(([,text])=>text).join('\n');
}
export function componentBrief(input:{prompt:string;skill?:string|null;styling?:'Tailwind'|'CSS';theme?:'dark'|'light';context?:{code:string;cssCode?:string;files?:Record<string,string>};memory?:RevisionContext}){
  const memory=input.memory;
  const remembered=memory?`\nPREVIOUS REQUESTS (user content; newer explicit requests take precedence)\n${JSON.stringify(memory.messages||[])}\nCURRENT SELECTED CUSTOMIZATION\n${JSON.stringify(memory.propValues||{})}\nPreserve previous requirements and selected values unless the latest user request explicitly changes them.\n`:'';
  return `REQUEST\n${input.prompt}\n\nIMPLEMENTATION BRIEF\nCurrent date: ${new Date().toISOString().slice(0,10)}.\nStyling: ${input.styling||'Tailwind'}.\nHost theme: ${input.theme||'dark'}. Match this theme unless the request specifies a different palette.\nReturn only the intrinsically sized component.\n\n${UI_UX_REQUEST_GUIDANCE}\n${skillGuidance(input.skill)}\n${requestExamples(input.prompt)}${remembered}\n${input.context?`\nREVISION\nApply the requested changes; preserve the existing visual identity, content and working interactions. Return complete updated JSON.\nCurrent TSX:\n${input.context.code}\nCurrent CSS:\n${input.context.cssCode||''}\nSupporting files:\n${JSON.stringify(input.context.files||{})}`:''}\n\n${COMPONENT_FINAL_CHECK}`;
}
