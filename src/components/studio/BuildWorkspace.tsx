'use client';
import { useImageReferences, ImageReferenceButton, ImageReferenceTray } from './ImageReferences';
import type { ImageReference } from '@/lib/image-references';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { ArrowUp, Check, Code2, Eye, RotateCcw, Sparkles, Square } from 'lucide-react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { useLenis } from 'lenis/react';
import BuildOrb from './BuildOrb';
import BuildNotes from './BuildNotes';
import StreamingText from './StreamingText';
import LiveSource from './LiveSource';
import PreviewFullscreen, { PreviewFullscreenButton } from './PreviewFullscreen';
import dynamic from 'next/dynamic';
import type { BuildTurn } from '@/lib/generation-events';
import { canDisableThinking, supportsThinking, type ThinkingEffort, type Provider } from '@/lib/ai-shared';

const GeneratedPreview = dynamic(() => import('./GeneratedPreview'), { ssr: false });
const VoicePill = dynamic(() => import('./VoicePill'), { ssr: false });
const ThinkingDropdown = dynamic(() => import('./ThinkingDropdown'), { ssr: false });

interface Props {
  turns: BuildTurn[];
  working: boolean;
  source: string;
  draft: { code: string; cssCode?: string } | null;
  theme: 'dark' | 'light';
  hasComponent: boolean;
  children: ReactNode;
  onSend: (prompt: string,images?:ImageReference[]) => Promise<boolean>;
  onRetry: (turnId: string, prompt: string) => Promise<boolean>;
  onStop: () => void;
  model: string;
  componentTitle?: string;
  componentDescription?: string;
  provider?: Provider;
  thinkingEffort?: ThinkingEffort;
  onThinkingEffortChange?: (effort: ThinkingEffort) => void;
}

function getDisplayTitle(componentTitle?: string, initialPrompt?: string): string {
  if (componentTitle && componentTitle.trim()) return componentTitle;
  if (!initialPrompt) return 'Component Studio';
  const clean = initialPrompt
    .replace(/^(build|create|make|generate|design|add|give me|a|an|the)\s+/gi, '')
    .trim();
  if (!clean) return 'Component Studio';
  const words = clean.split(/\s+/).slice(0, 4);
  return words.map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
}

function parseTraceEvent(message: string, phase?: string) {
  if(phase==='validating')return {verb:'Verify',target:message};
  if(phase==='repairing')return {verb:'Refine',target:message};
  if (/connecting/i.test(message)) {
    const model = message.replace(/connecting to/i, '').replace(/[….]+$/, '').trim();
    return { verb: 'Connect', target: model || 'AI Model' };
  }
  if (/thinking/i.test(message)) {
    return { verb: 'Plan', target: 'Component architecture & props' };
  }
  if (/source|writing/i.test(message)) {
    return { verb: 'Generate', target: 'Component.tsx' };
  }
  if (/validating|bundle/i.test(message)) {
    return { verb: 'Verify', target: 'TSX syntax & bundle' };
  }
  if (/repairing/i.test(message)) {
    return { verb: 'Refine', target: 'Correcting build output' };
  }
  return { verb: 'Step', target: message };
}

export default function BuildWorkspace(props: Props) {
  const lenis=useLenis();
  const references=useImageReferences(props.provider||'gemini',props.model);
  const [prompt, setPrompt] = useState('');
  const [editing, setEditing] = useState<{ id: string; prompt: string } | null>(null);
  const retryTrigger = useRef<HTMLButtonElement>(null);
  const [tab, setTab] = useState<'preview' | 'code'>('preview');
  const reduce = useReducedMotion();
  const log = useRef<HTMLDivElement>(null);
  const follow = useRef(true);
  const autoScrollUntil=useRef(0);
  const latest = props.turns.at(-1);
  function cancelRetry() {
    setEditing(null);
    requestAnimationFrame(()=>retryTrigger.current?.focus({preventScroll:true}));
  }
  useEffect(()=>{
    lenis?.scrollTo(0,{immediate:true,force:true});lenis?.stop();window.scrollTo(0,0);
    return()=>{lenis?.start();};
  },[lenis]);
  const phase = latest?.events.at(-1)?.phase;

  const displayTitle = getDisplayTitle(props.componentTitle, props.turns[0]?.prompt);

  useEffect(() => {
    let frame=0;
    const scroll=()=>{
      const el=log.current;if(!el||!follow.current)return;
      const distance=el.scrollHeight-el.clientHeight-el.scrollTop;
      if(distance<.5)return;
      autoScrollUntil.current=performance.now()+100;
      el.scrollTop+=reduce?distance:Math.max(.6,distance*.24);
      if(distance>1)frame=requestAnimationFrame(scroll);
    };
    frame=requestAnimationFrame(scroll);
    return()=>cancelAnimationFrame(frame);
  }, [props.turns,reduce]);

  async function send(event: React.FormEvent) {
    event.preventDefault();
    if (!prompt.trim() || props.working || references.busy || references.blocked) return;
    const value = prompt.trim();
    setPrompt('');
    follow.current = true;
    if (!(await props.onSend(value,references.images))) setPrompt(value);else references.clear();
  }

  const fileName = props.componentTitle
    ? `${props.componentTitle.replace(/[^A-Za-z0-9]/g, '')}.tsx`
    : 'Component.tsx';

  return (
    <section className="build-workspace" data-lenis-prevent>
      <aside className="build-chat" aria-label="Component conversation">
        <motion.div
          className="build-transcript"
          data-lenis-prevent
          ref={log}
          initial={reduce ? false : { opacity: 0, x: -8 }}
          animate={{ opacity: 1, x:0 }}
          transition={{ duration: reduce?0:0.22 }}
          onWheel={event=>{if(event.deltaY<0){follow.current=false;autoScrollUntil.current=0;}}}
          onTouchMove={()=>{follow.current=false;autoScrollUntil.current=0;}}
          onScroll={event => {
            const el = event.currentTarget;
            if(performance.now()>autoScrollUntil.current)follow.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
          }}
        >
          {props.turns.map(turn => {
            const turnPhase=turn.events.at(-1)?.phase;
            const turnSource=turn.source||(turn.id===latest?.id?props.source:'');
            return (
            <motion.div className="build-turn" key={turn.id} initial={reduce?false:{opacity:0,y:8}} animate={{opacity:1,y:0}} transition={{duration:.3}}>
              <div className="build-user-message">{turn.images?.length? <div className="reference-tray reference-sent">{turn.images.map(image=><img key={image.id} src={image.dataUrl} alt={image.name}/>)}</div>:null}
                <AnimatePresence mode="wait" initial={false}>
                  {editing?.id === turn.id && turn.id === latest?.id ? <motion.form key="editing" id={`retry-${turn.id}`} className="build-message-editor"
                    initial={reduce?false:{opacity:0,filter:'blur(3px)'}} animate={{opacity:1,filter:'blur(0px)'}} exit={{opacity:0}}
                    transition={{duration:reduce?0:.18}}
                    onSubmit={async event => {
                      event.preventDefault();
                      const value = editing.prompt.trim();
                      if (!value || props.working) return;
                      const submitted = {id:turn.id,prompt:value};
                      setEditing(null);follow.current=true;
                      if (!(await props.onRetry(turn.id,value))) setEditing(submitted);
                    }}>
                    <label htmlFor={`retry-prompt-${turn.id}`}>Edit your message</label>
                    <textarea autoFocus id={`retry-prompt-${turn.id}`} data-lenis-prevent rows={4}
                      value={editing.prompt} disabled={props.working}
                      onChange={event=>setEditing({id:turn.id,prompt:event.target.value})}
                      onKeyDown={event=>{if(event.key==='Escape'){event.preventDefault();cancelRetry();}}}/>
                    <div className="build-message-editor-actions">
                      <button type="button" className="button button-quiet" onClick={cancelRetry}>Cancel</button>
                      <button type="submit" className="button button-primary" disabled={props.working||!editing.prompt.trim()}><RotateCcw size={14}/>Retry</button>
                    </div>
                  </motion.form> : <motion.div key="message" initial={reduce?false:{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} transition={{duration:reduce?0:.15}}>{turn.prompt}</motion.div>}
                </AnimatePresence>
              </div>
              <div className="build-assistant-message">
                <div className="build-agent-timeline">
                <div className="build-agent-label">
                  <BuildOrb size={19} phase={turnPhase} message={turn.events.at(-1)?.message} source={turnSource} status={turn.status}/>
                  <span>Component Studio</span>
                </div>

                {/* Codex-style inline execution steps & thinking traces (Image 3) */}
                <ol className="build-codex-trace" aria-label="Build stages">
                  {turn.events.map((event, i) => {
                    const trace = parseTraceEvent(event.message, event.phase);
                    const isDone = turn.status === 'done' || i < turn.events.length - 1;
                    return (
                      <li className="build-trace-item" key={i}>
                        <span className={`build-trace-icon ${isDone?'build-trace-complete':''}`} aria-label={isDone?'Completed':undefined}>
                          {isDone ? (
                            <Check size={12} strokeWidth={1.75} className="text-zinc-300" />
                          ) : (
                            <BuildOrb size={13} phase={event.phase} message={event.message} source={turnSource} status={turn.status}/>
                          )}
                        </span>
                        <span className="build-trace-verb">{trace.verb}</span>
                        <span className="build-trace-target" title={trace.target}>{trace.target}</span>
                      </li>
                    );
                  })}

                  {/* Real-time inline thinking stream without sub-card */}
                  {turn.thinking&&<li><BuildNotes text={turn.thinking} working={turn.status==='working'}/></li>}

                  {/* Real-time Code Generation Separation */}
                  {(turnSource ||
                    turn.events.some(
                      e => e.phase === 'writing' || e.phase === 'validating' || e.phase === 'repairing'
                    )) && (
                    <li className="build-codegen-section">
                      <div className="build-codegen-divider">
                        <Code2 size={11} strokeWidth={1.75} className="text-zinc-300" />
                        <span>Code generation</span>
                      </div>
                      <div className="build-codegen-file">
                        <span className="build-file-badge">TSX</span>
                        <span className="build-file-name">{turn.fileName||(turn.id===latest?.id?fileName:'Component.tsx')}</span>
                        <span className="build-file-lines">
                          {turn.status === 'working' ? (
                            <span className="build-file-streaming">
                              <span className="build-pulse-dot" />
                              {turnSource ? `${turnSource.split('\n').length} lines` : 'Generating…'}
                            </span>
                          ) : (
                            <span className="text-zinc-400">
                              {turnSource ? `${turnSource.split('\n').length} lines` : 'Ready'}
                            </span>
                          )}
                        </span>
                      </div>
                    </li>
                  )}

                  {turn.status === 'working' && (
                    <li className="build-trace-active">
                      <BuildOrb size={14} phase={turnPhase} message={turn.events.at(-1)?.message} source={turnSource}/>
                      <span>{turnPhase === 'repairing' ? 'Refining component…' : turnPhase === 'validating' ? 'Verifying bundle…' : 'Working'}</span>
                    </li>
                  )}
                </ol>
                </div>

                {turn.status === 'done' && (
                  <p className="build-result" role="status"><StreamingText text={turn.response||(turn.id===latest?.id?props.componentDescription:'')||'Your component is ready. Preview it, take the code, or keep refining.'} animate={!reduce}/></p>
                )}
                {turn.status === 'stopped' && (
                  <p className="build-result">Generation stopped. Your last completed component is kept.</p>
                )}
                {turn.error && (
                  <div role="alert">
                    <p className="form-error">{turn.error}</p>
                  </div>
                )}
                {turn.id===latest?.id&&turn.status!=='working'&&editing?.id!==turn.id&&<button ref={retryTrigger} type="button" className="build-retry" disabled={props.working}
                  aria-label="Edit and retry latest message" aria-expanded={editing?.id===turn.id} aria-controls={`retry-${turn.id}`}
                  onClick={()=>setEditing({id:turn.id,prompt:turn.prompt})}><RotateCcw size={14}/>Retry</button>}
              </div>
            </motion.div>
          );})}
        </motion.div>

        {/* Anchored Chat Composer with shared motion layoutId */}
        <motion.div
          layout="position"
          layoutId="studio-chat-composer"
          initial={false}
          className="build-composer-wrapper"
          transition={{ duration: reduce?0:.26, ease: [.22,1,.36,1] }}
        >
          <form className="build-composer" onSubmit={send}>
            <label htmlFor="build-prompt" className="sr-only">
              Message the component builder
            </label>
            <ImageReferenceTray references={references}/>
            <textarea
              id="build-prompt"
              onPaste={event=>{if(!props.working)references.onPaste(event);}}
              data-lenis-prevent
              value={prompt}
              onChange={e => setPrompt(e.target.value)}
              rows={2}
              placeholder="What would you like to change? (or dictate)"
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
                  e.preventDefault();
                  void send(e);
                }
              }}
            />
            <div className="build-composer-footer">
              <div className="composer-left-tools"><ImageReferenceButton references={references} disabled={props.working}/>
                {supportsThinking(props.provider || 'gemini', props.model || '') && (
                  <ThinkingDropdown
                    allowOff={canDisableThinking(props.provider||'gemini',props.model||'')}
                    effort={props.thinkingEffort || 'high'}
                    onChange={effort => props.onThinkingEffortChange?.(effort)}
                    disabled={props.working}
                  />
                )}
              </div>
              <div className="composer-right-tools">
                <VoicePill size={38} onTranscript={text => setPrompt(p => (p ? `${p} ${text}` : text))} />
                {props.working ? (
                  <button key="stop" type="button" className="build-send" aria-label="Stop generation" onClick={event=>{event.preventDefault();props.onStop();}}>
                    <Square size={13} strokeWidth={1.75} />
                  </button>
                ) : (
                  <button key="send" type="submit" className="build-send" aria-label="Send message" disabled={!prompt.trim()||references.busy||references.blocked}>
                    <ArrowUp size={15} strokeWidth={1.75} />
                  </button>
                )}
              </div>
            </div>
          </form>
        </motion.div>
      </aside>

      {/* The generation glow belongs to the inner preview, below its toolbar. */}
      <PreviewFullscreen className="build-preview-host"><motion.div
        className={`build-artifact ${props.working ? 'build-artifact-active' : props.hasComponent ? 'build-artifact-completed' : ''}`}
        aria-label="Live component workspace"
        aria-busy={props.working}
        initial={reduce ? false : { opacity: 0, x: 12 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: reduce?0:0.32, ease: [0.16, 1, 0.3, 1] }}
      >
        {props.working || !props.hasComponent ? (
          <>
            <div className="build-artifact-toolbar">
              <span>
                <span className={`build-live-dot ${props.working ? 'active' : ''}`} />
                {props.working ? 'Live build' : 'Component preview'}
              </span>
              <div className="workspace-view-actions"><div className="view-tabs" role="tablist" aria-label="Live build view">
                {(['preview', 'code'] as const).map(value => (
                  <button
                    key={value}
                    role="tab"
                    aria-selected={tab === value}
                    onClick={() => setTab(value)}
                    onKeyDown={e => {
                      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
                        e.preventDefault();
                        setTab(value === 'preview' ? 'code' : 'preview');
                        (
                          e.currentTarget.parentElement?.querySelector(`[aria-selected="false"]`) as HTMLButtonElement
                        )?.focus();
                      }
                    }}
                  >
                    {value === tab && (
                      <motion.span
                        className="nav-active-pill"
                        layoutId="build-view-pill"
                        transition={reduce ? { duration: 0 } : { type: 'spring', stiffness: 420, damping: 32 }}
                      />
                    )}
                    <span className="nav-tab-label">
                      {value === 'preview' ? <Eye size={15} /> : <Code2 size={15} />} {value === 'preview' ? 'Preview' : 'Code'}
                    </span>
                  </button>
                ))}
              </div><PreviewFullscreenButton/></div>
            </div>
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                className="build-live-surface"
                key={tab}
                initial={reduce?false:{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: reduce ? 0 : 0.16 }}
              >
                <div className="build-generation-glow" data-active={props.working&&tab==='preview'} aria-hidden="true">
                  <span className="build-generation-haze"/>
                </div>
                {tab === 'preview' && props.draft ? (
                  <GeneratedPreview
                    code={props.draft.code}
                    cssCode={props.draft.cssCode}
                    propValues={{}}
                    theme={props.theme}
                    quiet
                  />
                ) : tab === 'code' ? (
                  <LiveSource source={props.source}/>
                ) : (
                  <div className="build-waiting">
                    <BuildOrb size={48} phase={phase} message={latest?.events.at(-1)?.message} source={props.source} status={props.working?'working':'stopped'}/>
                    <h2>{props.working ? 'An idea, taking shape.' : 'Ready when you are.'}</h2>
                    <p>
                      {props.working
                        ? 'Source arrives live. The preview appears as soon as a renderable version is available.'
                        : 'Send a message to continue your component.'}
                    </p>
                    <LiveSource source={props.source} tail/>
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          </>
        ) : (
          <motion.div className="build-completed-content" initial={reduce?false:{opacity:0,filter:'blur(9px)'}} animate={{opacity:1,filter:'blur(0px)',transitionEnd:{filter:'none'}}} transition={{duration:reduce?0:.38,ease:[.22,1,.36,1]}}>{props.children}</motion.div>
        )}
      </motion.div></PreviewFullscreen>
    </section>
  );
}
