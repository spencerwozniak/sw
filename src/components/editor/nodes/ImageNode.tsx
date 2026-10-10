'use client';

import type { JSX } from 'react';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { $applyNodeReplacement, $getNodeByKey, DecoratorNode, type LexicalNode, type NodeKey, type SerializedLexicalNode, type Spread } from 'lexical';

export type SerializedImageNode = Spread<{ src: string; alt: string; width: number; height: number; assetId?: string }, SerializedLexicalNode>;

function ImageView({ src, alt, width, height, nodeKey }: { src: string; alt: string; width: number; height: number; nodeKey: NodeKey }): JSX.Element {
  const [editor] = useLexicalComposerContext();
  return (
    // contentEditable={false} makes this a self-contained island, so typing in the alt-text box is not captured by the editor.
    <figure contentEditable={false} className="my-4">
      {/* eslint-disable-next-line @next/next/no-img-element -- the editor shows the image exactly as stored */}
      <img src={src} alt={alt} width={width} height={height} className="h-auto max-w-full rounded-ui border border-border" />
      <input
        aria-label="Alt text for this image"
        placeholder="Describe this image for people using screen readers"
        value={alt}
        onChange={(e) => editor.update(() => { const node = $getNodeByKey(nodeKey); if ($isImageNode(node)) node.setAlt(e.target.value); })}
        className="mt-2 h-9 w-full rounded-ui border border-faint bg-transparent px-3 font-sans text-[0.8125rem] text-fg placeholder:text-muted focus-visible:border-accent"
      />
    </figure>
  );
}

export class ImageNode extends DecoratorNode<JSX.Element> {
  __src: string;
  __alt: string;
  __width: number;
  __height: number;
  __assetId: string | undefined;

  static getType(): string {
    return 'image';
  }
  static clone(node: ImageNode): ImageNode {
    return new ImageNode(node.__src, node.__alt, node.__width, node.__height, node.__assetId, node.__key);
  }
  static importJSON(json: SerializedImageNode): ImageNode {
    return $createImageNode(json.src, json.alt, json.width, json.height, json.assetId);
  }

  constructor(src: string, alt: string, width: number, height: number, assetId?: string, key?: NodeKey) {
    super(key);
    this.__src = src;
    this.__alt = alt;
    this.__width = width;
    this.__height = height;
    this.__assetId = assetId;
  }

  exportJSON(): SerializedImageNode {
    return { type: 'image', version: 1, src: this.__src, alt: this.__alt, width: this.__width, height: this.__height, ...(this.__assetId ? { assetId: this.__assetId } : {}) };
  }
  createDOM(): HTMLElement {
    return document.createElement('div');
  }
  updateDOM(): boolean {
    return false;
  }
  isInline(): boolean {
    return false;
  }
  setAlt(alt: string): void {
    this.getWritable().__alt = alt;
  }
  decorate(): JSX.Element {
    return <ImageView src={this.__src} alt={this.__alt} width={this.__width} height={this.__height} nodeKey={this.__key} />;
  }
}

export function $createImageNode(src: string, alt: string, width: number, height: number, assetId?: string): ImageNode {
  return $applyNodeReplacement(new ImageNode(src, alt, width, height, assetId));
}

export function $isImageNode(node: LexicalNode | null | undefined): node is ImageNode {
  return node instanceof ImageNode;
}
