'use client';

import { Component, type ReactNode } from 'react';
import { RotateCcw } from '@/components/ui/icons';

/** A broken library example must not take down the catalog or the editor. */
export default class PreviewBoundary extends Component<
  { children: ReactNode; resetKey: string },
  { error: Error | null; attempt: number }
> {
  state = { error: null as Error | null, attempt: 0 };

  static getDerivedStateFromError(error: Error) { return { error }; }

  componentDidUpdate(previous: Readonly<{ resetKey: string }>) {
    if (previous.resetKey !== this.props.resetKey && this.state.error) {
      this.setState({ error: null });
    }
  }

  render() {
    if (this.state.error) {
      const chunkFailed = /ChunkLoadError|Loading (?:CSS )?chunk|Failed to fetch dynamically imported module/i.test(String(this.state.error));
      return <div className="library-preview-error" role="alert">
        <p>{chunkFailed ? 'The preview files could not load.' : 'This preview could not render.'}</p>
        <button type="button" className="rb-replay" onClick={() => {
          if (chunkFailed) window.location.reload();
          else this.setState(state => ({ error: null, attempt: state.attempt + 1 }));
        }}><RotateCcw size={14}/>{chunkFailed ? 'Reload preview' : 'Try again'}</button>
      </div>;
    }
    return <div key={this.state.attempt} className="library-preview-boundary">{this.props.children}</div>;
  }
}
