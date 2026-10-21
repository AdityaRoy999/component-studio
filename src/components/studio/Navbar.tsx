'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { KeyRound, Moon, Sun, Command, History, ArrowUpRight, X } from 'lucide-react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { useLenis } from 'lenis/react';

const navigation = [
  { view: 'studio', label: 'Studio', description: 'Bring an idea to life' },
  { view: 'catalog', label: 'Components', description: 'Find your starting point' },
  { view: 'featured', label: 'Featured', description: 'Explore the component community' },
  { view: 'skills', label: 'Skills', description: 'Find skills for your coding agent' },
  { view: 'history', label: 'History', description: 'Pick up where you left off' },
  { view: 'thanks', label: 'Thanks', description: 'The people behind the details' },
] as const;

export type StudioView = typeof navigation[number]['view'];

interface NavbarProps {
  onOpenApiKeyModal: () => void;
  hasCustomApiKey: boolean;
  onResetToHome?: () => void;
  currentView: StudioView;
  onViewChange: (view: StudioView) => void;
  theme: 'dark' | 'light';
  onToggleTheme: () => void;
  chatTitle?: string;
  isGenerating?: boolean;
}

export default function Navbar(props: NavbarProps) {
  const reduce = useReducedMotion();
  const [menuOpen, setMenuOpen] = useState(false);
  const pendingAction = useRef<(() => void) | undefined>();
  const afterClose = useRef<number>();
  const menuTrigger = useRef<HTMLButtonElement>(null);
  const closeMenu = (action?: () => void) => {
    pendingAction.current = action;
    setMenuOpen(false);
  };

  useEffect(() => {
    const desktop = window.matchMedia('(min-width: 1001px)');
    const closeOnDesktop = () => { if (desktop.matches) setMenuOpen(false); };
    desktop.addEventListener('change', closeOnDesktop);
    return () => desktop.removeEventListener('change', closeOnDesktop);
  }, []);
  useEffect(() => { setMenuOpen(false); }, [props.currentView]);
  useEffect(() => () => { if (afterClose.current) cancelAnimationFrame(afterClose.current); }, []);
  const home = () => {
    props.onResetToHome?.();
    props.onViewChange('studio');
  };

  return (
    <><motion.header
      className="studio-nav"
      initial={reduce ? false : { opacity: 0, y: -12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 180, damping: 24 }}
    >
      <button className="brand" onClick={home} aria-label="Component Studio home">
        <span className="brand-symbol">
          <Command size={18} strokeWidth={1.75} />
        </span>
        <span>
          component<span className="brand-light">/studio</span>
        </span>
      </button>

      <AnimatePresence mode="wait" initial={false}>{props.chatTitle ? (
        <motion.div key="chat-title" className="nav-chat-header"
          initial={reduce?false:{opacity:0,filter:'blur(4px)'}} animate={{opacity:1,filter:'blur(0px)'}}
          exit={{opacity:0,filter:reduce?'none':'blur(3px)'}} transition={{duration:reduce?0:.18}}>
          <h1 className="nav-chat-title" title={props.chatTitle}>
            {props.chatTitle}
          </h1>
          {props.isGenerating && (
            <span className="build-generating-pill">
              <span className="build-generating-dot" />
              Generating
            </span>
          )}
        </motion.div>
      ) : (
        <motion.nav key="main-navigation" aria-label="Main navigation" className="nav-switch"
          initial={reduce?false:{opacity:0,filter:'blur(4px)'}} animate={{opacity:1,filter:'blur(0px)'}}
          exit={{opacity:0,filter:reduce?'none':'blur(3px)'}} transition={{duration:reduce?0:.18}}>
          {navigation.map(({view, label}) => (
            <button
              key={view}
              aria-current={props.currentView === view ? 'page' : undefined}
              onClick={() => props.onViewChange(view)}
            >
              {props.currentView === view && (
                <motion.span
                  className="nav-active-pill"
                  layoutId="main-navigation-pill"
                  transition={reduce ? { duration: 0 } : { type: 'spring', stiffness: 380, damping: 31 }}
                />
              )}
              <span className="nav-tab-label">{label}</span>
            </button>
          ))}
        </motion.nav>
      )}</AnimatePresence>

      <div className="nav-actions">
        {props.chatTitle&&<button className="icon-button nav-action-pill nav-desktop-action" aria-label="Open history" title="History" onClick={()=>props.onViewChange('history')}><History size={17}/></button>}
        <button
          className="icon-button nav-action-pill"
          onClick={props.onToggleTheme}
          aria-label={props.theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
        >
          {props.theme === 'light' ? <Moon size={17} strokeWidth={1.75} /> : <Sun size={17} strokeWidth={1.75} />}
        </button>
        <button
          className="button button-quiet nav-action-pill nav-desktop-action"
          onClick={props.onOpenApiKeyModal}
          aria-label="AI settings"
        >
          <KeyRound size={16} strokeWidth={1.75} />
          <span className="settings-label">AI settings</span>
          {props.hasCustomApiKey && <span className="status-dot" />}
        </button>
        <button ref={menuTrigger} type="button" className="mobile-menu-trigger"
          aria-label="Open navigation" aria-expanded={menuOpen} aria-controls="mobile-navigation"
          aria-haspopup="dialog" onClick={() => { pendingAction.current = undefined; setMenuOpen(true); }}>
          <span aria-hidden="true"><i/><i/></span>
        </button>
      </div>
    </motion.header>
    {typeof document !== 'undefined' && createPortal(
      <AnimatePresence onExitComplete={() => {
        const action = pendingAction.current;
        pendingAction.current = undefined;
        // Wait until the native modal is removed so the trigger is no longer inert.
        afterClose.current = requestAnimationFrame(() => {
          if (menuTrigger.current?.getClientRects().length) menuTrigger.current.focus({ preventScroll: true });
          action?.();
        });
      }}>
        {menuOpen && <MobileNavigation key="mobile-navigation" {...props} onClose={closeMenu}/>}
      </AnimatePresence>, document.body)}
    </>
  );
}

function MobileNavigation(props: NavbarProps & { onClose: (action?: () => void) => void }) {
  const reduce = useReducedMotion();
  const dialog = useRef<HTMLDialogElement>(null);
  const lenis = useLenis();
  const ease = [.22, 1, .36, 1] as const;

  useEffect(() => {
    const element = dialog.current;
    const previousOverflow = document.body.style.overflow;
    const wasScrolling = lenis && !lenis.isStopped;
    element?.showModal();
    document.body.style.overflow = 'hidden';
    if (wasScrolling) lenis.stop();
    const trapFocus = (event: KeyboardEvent) => {
      if (event.key !== 'Tab' || !element) return;
      const buttons = element.querySelectorAll<HTMLButtonElement>('button:not(:disabled)');
      const first = buttons[0], last = buttons[buttons.length - 1];
      if (!first || !last) return;
      if (event.shiftKey && (document.activeElement === first || !element.contains(document.activeElement))) {
        event.preventDefault(); last.focus();
      } else if (!event.shiftKey && (document.activeElement === last || !element.contains(document.activeElement))) {
        event.preventDefault(); first.focus();
      }
    };
    document.addEventListener('keydown', trapFocus);
    return () => {
      document.removeEventListener('keydown', trapFocus);
      element?.close();
      document.body.style.overflow = previousOverflow;
      if (wasScrolling) lenis.start();
    };
  }, [lenis]);

  return <motion.dialog ref={dialog} id="mobile-navigation" aria-labelledby="mobile-menu-title"
    className="mobile-navigation" data-lenis-prevent
    onCancel={event => { event.preventDefault(); props.onClose(); }}
    onClick={event => { if (event.target === event.currentTarget) props.onClose(); }}
    initial={{ opacity: reduce ? 1 : 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
    transition={{ duration: reduce ? 0 : .24 }}>
    <motion.div className="mobile-navigation-panel"
      initial={reduce ? false : { clipPath: 'circle(0% at 100% 0%)', x: 12, y: -12 }}
      animate={{ clipPath: 'circle(150% at 100% 0%)', x: 0, y: 0 }}
      exit={reduce ? { opacity: 0 } : { clipPath: 'circle(0% at 100% 0%)', x: 12, y: -12 }}
      transition={{ duration: reduce ? 0 : .42, ease }}>
      <div className="mobile-navigation-heading">
        <span id="mobile-menu-title">Explore the studio</span>
        <button type="button" className="mobile-menu-close" aria-label="Close navigation" autoFocus onClick={() => props.onClose()}><X size={21} strokeWidth={1.6}/></button>
      </div>
      <nav aria-label="Mobile navigation">
        {navigation.map(({ view, label, description }, index) => <motion.button key={view} type="button"
          aria-current={props.currentView === view ? 'page' : undefined}
          onClick={() => props.onClose(() => props.onViewChange(view))}
          initial={reduce ? false : { opacity: 0, x: 18, y: -8, filter: 'blur(4px)' }}
          animate={{ opacity: 1, x: 0, y: 0, filter: 'blur(0px)' }}
          transition={{ duration: reduce ? 0 : .32, delay: reduce ? 0 : .08 + index * .045, ease }}>
          <span className="mobile-navigation-copy"><span>{label}</span><small>{description}</small></span>
          <ArrowUpRight size={22} strokeWidth={1.5} aria-hidden="true"/>
        </motion.button>)}
      </nav>
      <div className="mobile-navigation-footer">
        <button type="button" onClick={() => props.onClose(props.onOpenApiKeyModal)}><KeyRound size={18}/><span>AI settings</span>{props.hasCustomApiKey && <span className="status-dot"/>}</button>
        <span>Ideas in. Interfaces out.</span>
      </div>
    </motion.div>
  </motion.dialog>;
}
