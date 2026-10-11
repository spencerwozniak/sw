'use client';

import type { JSX } from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { $isHeadingNode, $createHeadingNode, $createQuoteNode } from '@lexical/rich-text';
import { $isListNode, INSERT_ORDERED_LIST_COMMAND, INSERT_UNORDERED_LIST_COMMAND, REMOVE_LIST_COMMAND, ListNode } from '@lexical/list';
import { $isLinkNode, TOGGLE_LINK_COMMAND } from '@lexical/link';
import { $setBlocksType } from '@lexical/selection';
import { $findMatchingParent, $getNearestNodeOfType, mergeRegister } from '@lexical/utils';
import {
  $createParagraphNode, $getSelection, $isRangeSelection, $isRootOrShadowRoot, CAN_REDO_COMMAND, CAN_UNDO_COMMAND, COMMAND_PRIORITY_CRITICAL,
  FORMAT_TEXT_COMMAND, REDO_COMMAND, SELECTION_CHANGE_COMMAND, UNDO_COMMAND, type TextFormatType,
} from 'lexical';
import { Bold, Code, ImagePlus, Italic, Link2, List, ListOrdered, Redo2, Sigma, Superscript, Underline, Undo2 } from 'lucide-react';
import { Button, Dialog, Field, IconButton, Input, Select } from '@/components/ui';
import { cx } from '@/lib/cx';
import { safeLinkUrl } from '@/lib/richtext/to-html';
import { OPEN_EQUATION_DIALOG } from '../nodes/EquationNode';
import { INSERT_IMAGE_FILES } from './ImagePlugin';

type BlockType = 'paragraph' | 'h2' | 'h3' | 'h4' | 'quote' | 'list';

const BLOCK_OPTIONS: Array<{ value: Exclude<BlockType, 'list'>; label: string }> = [
  { value: 'paragraph', label: 'Paragraph' },
  { value: 'h2', label: 'Heading' },
  { value: 'h3', label: 'Subheading' },
  { value: 'h4', label: 'Small heading' },
  { value: 'quote', label: 'Quote' },
];

export function ToolbarPlugin(): JSX.Element {
  const [editor] = useLexicalComposerContext();
  const [formats, setFormats] = useState<Record<string, boolean>>({});
  const [blockType, setBlockType] = useState<BlockType>('paragraph');
  const [listType, setListType] = useState<'bullet' | 'number' | null>(null);
  const [linkUrl, setLinkUrl] = useState<string | null>(null);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const [linkDialog, setLinkDialog] = useState(false);
  const [linkValue, setLinkValue] = useState('');
  const fileInput = useRef<HTMLInputElement>(null);

  const readSelection = useCallback(() => {
    const selection = $getSelection();
    if (!$isRangeSelection(selection)) return;
    setFormats({
      bold: selection.hasFormat('bold'), italic: selection.hasFormat('italic'), underline: selection.hasFormat('underline'),
      code: selection.hasFormat('code'), superscript: selection.hasFormat('superscript'),
    });

    const anchor = selection.anchor.getNode();
    const element = anchor.getKey() === 'root' ? anchor : $findMatchingParent(anchor, (e) => $isRootOrShadowRoot(e.getParent())) ?? anchor.getTopLevelElementOrThrow();
    if ($isListNode(element)) {
      const list = $getNearestNodeOfType(anchor, ListNode);
      setBlockType('list');
      setListType((list ?? element).getListType() === 'number' ? 'number' : 'bullet');
    } else {
      setListType(null);
      const type = $isHeadingNode(element) ? element.getTag() : element.getType();
      setBlockType(type === 'h2' || type === 'h3' || type === 'h4' || type === 'quote' ? type : 'paragraph');
    }

    const node = selection.getNodes()[0];
    const link = node ? ($isLinkNode(node) ? node : $isLinkNode(node.getParent()) ? node.getParent() : null) : null;
    setLinkUrl($isLinkNode(link) ? link.getURL() : null);
  }, []);

  useEffect(
    () =>
      mergeRegister(
        editor.registerUpdateListener(({ editorState }) => editorState.read(readSelection)),
        editor.registerCommand(SELECTION_CHANGE_COMMAND, () => (readSelection(), false), COMMAND_PRIORITY_CRITICAL),
        editor.registerCommand(CAN_UNDO_COMMAND, (value) => (setCanUndo(value), false), COMMAND_PRIORITY_CRITICAL),
        editor.registerCommand(CAN_REDO_COMMAND, (value) => (setCanRedo(value), false), COMMAND_PRIORITY_CRITICAL)
      ),
    [editor, readSelection]
  );

  const format = (type: TextFormatType) => editor.dispatchCommand(FORMAT_TEXT_COMMAND, type);

  const changeBlock = (value: Exclude<BlockType, 'list'>) =>
    editor.update(() => {
      const selection = $getSelection();
      if (!$isRangeSelection(selection)) return;
      $setBlocksType(selection, () => (value === 'paragraph' ? $createParagraphNode() : value === 'quote' ? $createQuoteNode() : $createHeadingNode(value)));
    });

  const toggleList = (type: 'bullet' | 'number') =>
    editor.dispatchCommand(listType === type ? REMOVE_LIST_COMMAND : type === 'bullet' ? INSERT_UNORDERED_LIST_COMMAND : INSERT_ORDERED_LIST_COMMAND, undefined);

  const openLink = () => {
    setLinkValue(linkUrl ?? '');
    setLinkDialog(true);
  };
  const cleanedLink = safeLinkUrl(linkValue);
  const applyLink = () => {
    if (!cleanedLink) return;
    editor.dispatchCommand(TOGGLE_LINK_COMMAND, cleanedLink);
    setLinkDialog(false);
    editor.focus();
  };
  const removeLink = () => {
    editor.dispatchCommand(TOGGLE_LINK_COMMAND, null);
    setLinkDialog(false);
    editor.focus();
  };

  const group = 'flex items-center gap-0.5';
  const divider = <span aria-hidden="true" className="mx-1 h-5 w-px bg-border" />;
  const tool = (label: string, icon: JSX.Element, onClick: () => void, pressed?: boolean, disabled?: boolean) => (
    <IconButton variant="ghost" size="md" label={label} title={label} icon={icon} onClick={onClick} pressed={pressed} disabled={disabled} className={cx(pressed && 'border-border text-accent')} />
  );

  return (
    <div role="toolbar" aria-label="Formatting" className="sticky top-[var(--nav-h)] z-10 flex flex-wrap items-center gap-1 border-b border-border bg-bg px-2 py-1.5">
      <div className={group}>
        {tool('Undo', <Undo2 />, () => editor.dispatchCommand(UNDO_COMMAND, undefined), undefined, !canUndo)}
        {tool('Redo', <Redo2 />, () => editor.dispatchCommand(REDO_COMMAND, undefined), undefined, !canRedo)}
      </div>
      {divider}
      <Select label="Text style" value={blockType === 'list' ? 'paragraph' : blockType} onChange={(e) => changeBlock(e.target.value as Exclude<BlockType, 'list'>)} wrapperClassName="w-40" className="h-9 text-[0.8125rem]">
        {BLOCK_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </Select>
      {divider}
      <div className={group}>
        {tool('Bold', <Bold />, () => format('bold'), formats.bold)}
        {tool('Italic', <Italic />, () => format('italic'), formats.italic)}
        {tool('Underline', <Underline />, () => format('underline'), formats.underline)}
        {tool('Code', <Code />, () => format('code'), formats.code)}
        {tool('Superscript', <Superscript />, () => format('superscript'), formats.superscript)}
      </div>
      {divider}
      <div className={group}>
        {tool('Link', <Link2 />, openLink, linkUrl !== null)}
        {tool('Bulleted list', <List />, () => toggleList('bullet'), listType === 'bullet')}
        {tool('Numbered list', <ListOrdered />, () => toggleList('number'), listType === 'number')}
      </div>
      {divider}
      <div className={group}>
        {tool('Inline equation', <Sigma />, () => editor.dispatchCommand(OPEN_EQUATION_DIALOG, { nodeKey: null, inline: true, equation: '' }))}
        <Button size="sm" variant="ghost" onClick={() => editor.dispatchCommand(OPEN_EQUATION_DIALOG, { nodeKey: null, inline: false, equation: '' })}>
          Equation
        </Button>
        {tool('Add an image', <ImagePlus />, () => fileInput.current?.click())}
        <input
          ref={fileInput}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          aria-label="Choose images to add"
          className="sr-only"
          tabIndex={-1}
          onChange={(e) => {
            const chosen = Array.from(e.target.files ?? []);
            if (chosen.length) editor.dispatchCommand(INSERT_IMAGE_FILES, chosen);
            e.target.value = '';
          }}
        />
      </div>

      <Dialog
        open={linkDialog}
        onClose={() => setLinkDialog(false)}
        title={linkUrl ? 'Edit link' : 'Add a link'}
        actions={
          <>
            {linkUrl && (
              <Button variant="outline" onClick={removeLink}>
                Remove link
              </Button>
            )}
            <Button variant="outline" onClick={() => setLinkDialog(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={applyLink} disabled={!cleanedLink}>
              Apply
            </Button>
          </>
        }
      >
        <Field label="Address" htmlFor="link-url" hint="https://…, mailto:…, #section, or a page on this site like /writing/…" error={linkValue.trim() && !cleanedLink ? 'That address is not allowed.' : undefined}>
          <Input id="link-url" label="Address" value={linkValue} onChange={(e) => setLinkValue(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); applyLink(); } }} autoFocus />
        </Field>
      </Dialog>
    </div>
  );
}
