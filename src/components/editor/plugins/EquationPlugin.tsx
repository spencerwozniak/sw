'use client';

import type { JSX } from 'react';
import { useEffect, useState } from 'react';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { $insertNodeToNearestRoot } from '@lexical/utils';
import { $getNodeByKey, $insertNodes, COMMAND_PRIORITY_EDITOR, type NodeKey } from 'lexical';
import { Button, Dialog, Field, Textarea } from '@/components/ui';
import { mathError } from '@/lib/richtext/math';
import { $createEquationNode, $isEquationNode, OPEN_EQUATION_DIALOG, renderEquationPreview } from '../nodes/EquationNode';

type DialogState = { nodeKey: NodeKey | null; inline: boolean };

/** The dialog for adding and editing equations, with a live preview and the same TeX checking the server applies on save. */
export function EquationPlugin(): JSX.Element {
  const [editor] = useLexicalComposerContext();
  const [dialog, setDialog] = useState<DialogState | null>(null);
  const [tex, setTex] = useState('');

  useEffect(
    () =>
      editor.registerCommand(
        OPEN_EQUATION_DIALOG,
        (payload) => {
          setTex(payload.equation);
          setDialog({ nodeKey: payload.nodeKey, inline: payload.inline });
          return true;
        },
        COMMAND_PRIORITY_EDITOR
      ),
    [editor]
  );

  const trimmed = tex.trim();
  const problem = trimmed ? mathError(trimmed, !dialog?.inline) : null;
  const editing = dialog?.nodeKey != null;
  const close = () => setDialog(null);

  const apply = () => {
    if (!dialog || !trimmed || problem) return;
    editor.update(() => {
      if (dialog.nodeKey) {
        const node = $getNodeByKey(dialog.nodeKey);
        if ($isEquationNode(node)) node.setEquation(trimmed);
      } else {
        const node = $createEquationNode(trimmed, dialog.inline);
        if (dialog.inline) $insertNodes([node]);
        else $insertNodeToNearestRoot(node);
      }
    });
    close();
    editor.focus();
  };

  const remove = () => {
    if (!dialog?.nodeKey) return;
    editor.update(() => {
      const node = $getNodeByKey(dialog.nodeKey!);
      if ($isEquationNode(node)) node.remove();
    });
    close();
    editor.focus();
  };

  return (
    <Dialog
      open={dialog !== null}
      onClose={close}
      title={editing ? 'Edit equation' : dialog?.inline ? 'Add an inline equation' : 'Add an equation'}
      description="Write it in TeX, for example \frac{a}{b} or p_{new} = 1 - (1 - p_1)(1 - p_2)."
      size="lg"
      actions={
        <>
          {editing && (
            <Button variant="outline" onClick={remove}>
              Delete
            </Button>
          )}
          <Button variant="outline" onClick={close}>
            Cancel
          </Button>
          <Button variant="primary" onClick={apply} disabled={!trimmed || !!problem}>
            {editing ? 'Update' : 'Insert'}
          </Button>
        </>
      }
    >
      <Field label="TeX" htmlFor="equation-tex" error={problem ?? undefined}>
        <Textarea id="equation-tex" label="TeX" rows={3} value={tex} onChange={(e) => setTex(e.target.value)} className="font-mono" autoFocus />
      </Field>
      <div aria-label="Preview" className="min-h-14 overflow-x-auto rounded-ui border border-border bg-surface px-4 py-3 text-[1.1rem]">
        {trimmed && !problem ? (
          <div dangerouslySetInnerHTML={{ __html: renderEquationPreview(trimmed, !!dialog?.inline) }} />
        ) : (
          <span className="font-sans text-[0.875rem] text-muted">The preview appears here.</span>
        )}
      </div>
    </Dialog>
  );
}
