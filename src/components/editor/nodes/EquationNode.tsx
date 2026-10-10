'use client';

import type { JSX } from 'react';
import katex from 'katex';
import 'katex/dist/katex.min.css';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { $applyNodeReplacement, DecoratorNode, createCommand, type LexicalCommand, type LexicalNode, type NodeKey, type SerializedLexicalNode, type Spread } from 'lexical';
import { cx } from '@/lib/cx';

/** Asks the equation plugin to open its dialog, to add an equation (nodeKey null) or edit one. */
export const OPEN_EQUATION_DIALOG: LexicalCommand<{ nodeKey: NodeKey | null; inline: boolean; equation: string }> = createCommand('OPEN_EQUATION_DIALOG');

export type SerializedEquationNode = Spread<{ equation: string; inline: boolean }, SerializedLexicalNode>;

export function renderEquationPreview(tex: string, inline: boolean): string {
  return katex.renderToString(tex, { displayMode: !inline, throwOnError: false, strict: 'ignore', trust: false, output: 'html' });
}

function EquationView({ equation, inline, nodeKey }: { equation: string; inline: boolean; nodeKey: NodeKey }): JSX.Element {
  const [editor] = useLexicalComposerContext();
  const open = () => editor.dispatchCommand(OPEN_EQUATION_DIALOG, { nodeKey, inline, equation });
  const Tag = inline ? 'span' : 'div';
  return (
    <Tag
      role="button"
      tabIndex={0}
      aria-label={`Equation: ${equation}. Press Enter to edit.`}
      onClick={open}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          open();
        }
      }}
      className={cx('cursor-pointer rounded-ui transition-colors hover:bg-accent-wash focus-visible:bg-accent-wash', inline ? 'px-0.5' : 'block py-1')}
      dangerouslySetInnerHTML={{ __html: renderEquationPreview(equation, inline) }}
    />
  );
}

export class EquationNode extends DecoratorNode<JSX.Element> {
  __equation: string;
  __inline: boolean;

  static getType(): string {
    return 'equation';
  }
  static clone(node: EquationNode): EquationNode {
    return new EquationNode(node.__equation, node.__inline, node.__key);
  }
  static importJSON(json: SerializedEquationNode): EquationNode {
    return $createEquationNode(json.equation, json.inline);
  }

  constructor(equation: string, inline: boolean, key?: NodeKey) {
    super(key);
    this.__equation = equation;
    this.__inline = inline;
  }

  exportJSON(): SerializedEquationNode {
    return { type: 'equation', version: 1, equation: this.__equation, inline: this.__inline };
  }
  createDOM(): HTMLElement {
    return document.createElement(this.__inline ? 'span' : 'div');
  }
  updateDOM(): boolean {
    return false;
  }
  isInline(): boolean {
    return this.__inline;
  }
  getEquation(): string {
    return this.getLatest().__equation;
  }
  setEquation(equation: string): void {
    this.getWritable().__equation = equation;
  }
  decorate(): JSX.Element {
    return <EquationView equation={this.__equation} inline={this.__inline} nodeKey={this.__key} />;
  }
}

export function $createEquationNode(equation: string, inline: boolean): EquationNode {
  return $applyNodeReplacement(new EquationNode(equation, inline));
}

export function $isEquationNode(node: LexicalNode | null | undefined): node is EquationNode {
  return node instanceof EquationNode;
}
