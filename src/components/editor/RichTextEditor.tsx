'use client';

import type { JSX } from 'react';
import { LexicalComposer, type InitialConfigType } from '@lexical/react/LexicalComposer';
import { RichTextPlugin } from '@lexical/react/LexicalRichTextPlugin';
import { ContentEditable } from '@lexical/react/LexicalContentEditable';
import { LexicalErrorBoundary } from '@lexical/react/LexicalErrorBoundary';
import { HistoryPlugin } from '@lexical/react/LexicalHistoryPlugin';
import { ListPlugin } from '@lexical/react/LexicalListPlugin';
import { LinkPlugin } from '@lexical/react/LexicalLinkPlugin';
import { OnChangePlugin } from '@lexical/react/LexicalOnChangePlugin';
import { HeadingNode, QuoteNode } from '@lexical/rich-text';
import { ListItemNode, ListNode } from '@lexical/list';
import { LinkNode } from '@lexical/link';
import { cx } from '@/lib/cx';
import type { LexState } from '@/lib/richtext/state';
import { safeLinkUrl } from '@/lib/richtext/to-html';
import { EquationNode } from './nodes/EquationNode';
import { ImageNode } from './nodes/ImageNode';
import { EquationPlugin } from './plugins/EquationPlugin';
import { ImagePlugin } from './plugins/ImagePlugin';
import { ToolbarPlugin } from './plugins/ToolbarPlugin';
import { editorTheme } from './theme';

export type RichTextEditorProps = {
  /** The state to start from. Changing it later does not reset the editor: give the component a new `key` to reload. */
  initialState: LexState;
  onChange: (state: LexState) => void;
  /** Accessible name of the writing area. */
  label: string;
  className?: string;
};

const NODES = [HeadingNode, QuoteNode, ListNode, ListItemNode, LinkNode, EquationNode, ImageNode];

/**
 * The editor for articles and collection pages. Requires a <ToastProvider> above it (image uploads report through it).
 * The editing surface carries the site's `.prose` classes, so it looks like the published page.
 */
export function RichTextEditor({ initialState, onChange, label, className }: RichTextEditorProps): JSX.Element {
  const config: InitialConfigType = {
    namespace: 'sw-richtext',
    theme: editorTheme,
    nodes: NODES,
    editorState: JSON.stringify(initialState),
    onError: (error) => {
      throw error;
    },
  };

  return (
    <div className={cx('rounded-ui border border-faint bg-bg focus-within:border-accent', className)}>
      <LexicalComposer initialConfig={config}>
        <ToolbarPlugin />
        <div className="relative">
          <RichTextPlugin
            contentEditable={<ContentEditable aria-label={label} className="prose prose-lg min-h-[24rem] px-4 py-4 outline-none sm:px-6" />}
            placeholder={<div aria-hidden="true" className="pointer-events-none absolute left-4 top-4 font-serif text-[1.1875rem] text-muted sm:left-6">Start writing…</div>}
            ErrorBoundary={LexicalErrorBoundary}
          />
        </div>
        <HistoryPlugin />
        <ListPlugin />
        <LinkPlugin validateUrl={(url) => safeLinkUrl(url) !== null} />
        <OnChangePlugin ignoreSelectionChange onChange={(state) => onChange(state.toJSON() as unknown as LexState)} />
        <EquationPlugin />
        <ImagePlugin />
      </LexicalComposer>
    </div>
  );
}
