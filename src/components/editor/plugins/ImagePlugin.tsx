'use client';

import { useEffect } from 'react';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { $insertNodeToNearestRoot, mergeRegister } from '@lexical/utils';
import { COMMAND_PRIORITY_EDITOR, COMMAND_PRIORITY_HIGH, DROP_COMMAND, PASTE_COMMAND, createCommand, type LexicalCommand } from 'lexical';
import { useToast } from '@/components/ui';
import { uploadArticleImage } from '@/lib/richtext/image-client';
import { $createImageNode } from '../nodes/ImageNode';

/** Upload these image files and insert them. Used by the toolbar button, drag and drop, and paste. */
export const INSERT_IMAGE_FILES: LexicalCommand<File[]> = createCommand('INSERT_IMAGE_FILES');

const isImage = (file: File) => file.type.startsWith('image/') || /\.(jpe?g|png|webp|heic)$/i.test(file.name);

export function ImagePlugin(): null {
  const [editor] = useLexicalComposerContext();
  const toast = useToast();

  useEffect(() => {
    const insert = async (files: File[]) => {
      for (const file of files) {
        try {
          toast(`Uploading ${file.name}…`, { durationMs: 2500 });
          const image = await uploadArticleImage(file);
          editor.update(() => $insertNodeToNearestRoot($createImageNode(image.url, '', image.width, image.height, image.id)));
        } catch (error) {
          toast(error instanceof Error ? error.message : 'Could not add that image.', { tone: 'error' });
        }
      }
    };

    return mergeRegister(
      editor.registerCommand(INSERT_IMAGE_FILES, (files) => (void insert(files), true), COMMAND_PRIORITY_EDITOR),
      editor.registerCommand(
        DROP_COMMAND,
        (event) => {
          const files = Array.from(event.dataTransfer?.files ?? []).filter(isImage);
          if (!files.length) return false;
          event.preventDefault();
          void insert(files);
          return true;
        },
        COMMAND_PRIORITY_HIGH
      ),
      editor.registerCommand(
        PASTE_COMMAND,
        (event) => {
          const files = event instanceof ClipboardEvent ? Array.from(event.clipboardData?.files ?? []).filter(isImage) : [];
          if (!files.length) return false;
          event.preventDefault();
          void insert(files);
          return true;
        },
        COMMAND_PRIORITY_HIGH
      )
    );
  }, [editor, toast]);

  return null;
}
