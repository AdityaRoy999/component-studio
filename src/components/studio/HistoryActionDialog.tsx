'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, useReducedMotion } from 'motion/react';
import { Pencil, Star, Trash2, X } from '@/components/ui/icons';
import { useLenis } from 'lenis/react';
import type { HistoryEntry } from '@/lib/generation-history';

export type HistoryAction = 'favorite' | 'rename' | 'delete';

export default function HistoryActionDialog({ entry, action, onClose, onConfirm }: {
  entry: HistoryEntry;
  action: HistoryAction;
  onClose: () => void;
  onConfirm: (label: string) => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const initialFocus = useRef<HTMLInputElement | HTMLButtonElement | null>(null);
  const reduce = useReducedMotion();
  const lenis = useLenis();
  const name = entry.label || entry.component.title;
  const [label, setLabel] = useState(name);
  const deleting = action === 'delete';
  const renaming = action === 'rename';
  const title = deleting ? 'Delete this build?' : renaming ? 'Rename build' : entry.favorite ? 'Remove from favorites?' : 'Add to favorites?';
  const confirm = deleting ? 'Delete build' : renaming ? 'Save name' : entry.favorite ? 'Remove favorite' : 'Add favorite';
  const Icon = deleting ? Trash2 : renaming ? Pencil : Star;

  useEffect(() => {
    const element = dialog.current;
    const previousOverflow = document.body.style.overflow;
    const wasScrolling = lenis && !lenis.isStopped;
    const trigger = document.activeElement as HTMLElement | null;
    element?.showModal();
    initialFocus.current?.focus();
    document.body.style.overflow = 'hidden';
    if (wasScrolling) lenis.stop();
    return () => {
      element?.close();
      document.body.style.overflow = previousOverflow;
      if (wasScrolling) lenis.start();
      if (trigger?.isConnected) trigger.focus();
      else document.getElementById('history-title')?.focus();
    };
  }, [lenis]);

  return createPortal(<motion.dialog ref={dialog} className="history-action-dialog" aria-modal="true" aria-labelledby="history-action-title" aria-describedby="history-action-description" data-lenis-prevent
    onCancel={event => { event.preventDefault(); onClose(); }}
    onClick={event => { if (event.target === event.currentTarget) onClose(); }}
    initial={{ opacity: reduce ? 1 : 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: reduce ? 0 : .2 }}>
    <motion.form className="history-action-panel" onSubmit={event => { event.preventDefault(); if (!renaming || label.trim()) onConfirm(label.trim().slice(0, 150)); }}
      initial={reduce ? false : { opacity: 0, scale: .96, y: 16 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: .98, y: 8 }} transition={{ duration: reduce ? 0 : .24, ease: [.22, 1, .36, 1] }}>
      <div className="history-dialog-heading"><span className={`history-dialog-symbol${deleting ? ' is-destructive' : ''}`}><Icon size={22}/></span><button type="button" className="icon-button" aria-label="Close dialog" onClick={onClose}><X size={19}/></button></div>
      <h2 id="history-action-title">{title}</h2>
      <p id="history-action-description">{deleting ? <>“{name}” and its saved revisions will be deleted from this browser. This cannot be undone.</> : renaming ? 'Give this saved build a name that’s easy to find.' : <>“{name}” will be {entry.favorite ? 'removed from' : 'added to'} your favorites.</>}</p>
      {renaming && <label className="history-dialog-field">Build name<input ref={element => { if (renaming) initialFocus.current = element; }} value={label} maxLength={150} onChange={event => setLabel(event.target.value)}/></label>}
      <div className="history-dialog-actions"><button ref={element => { if (!renaming) initialFocus.current = element; }} type="button" className="button button-quiet" onClick={onClose}>Cancel</button><button type="submit" className={`button ${deleting ? 'button-destructive' : 'button-primary'}`} disabled={renaming && !label.trim()}>{confirm}</button></div>
    </motion.form>
  </motion.dialog>, document.body);
}
