'use client';

import { useState } from 'react';
import { Button, Checkbox, ConfirmDialog, Dialog, Field, Input, Panel, Select, StatusTag, Switch, Textarea, Title, useToast } from '@/components/ui';

export function KitDemo() {
  const toast = useToast();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [infoOpen, setInfoOpen] = useState(false);
  const [published, setPublished] = useState(false);
  const [checked, setChecked] = useState(false);

  return (
    <div className="grid gap-8">
      <Panel>
        <Title as="h2" size="h3" className="mb-4">Fields</Title>
        <div className="grid max-w-md gap-4">
          <Field label="Caption" htmlFor="kit-caption" hint="Shown under the photo and in the viewer.">
            <Input id="kit-caption" label="Caption" placeholder="A quiet morning" />
          </Field>
          <Field label="Place" htmlFor="kit-place" error="Place is required.">
            <Input id="kit-place" label="Place" placeholder="Torrey Pines, San Diego" />
          </Field>
          <Field label="Notes" htmlFor="kit-notes">
            <Textarea id="kit-notes" label="Notes" placeholder="Anything worth remembering" />
          </Field>
          <Field label="Status" htmlFor="kit-status">
            <Select id="kit-status" label="Status" defaultValue="DRAFT">
              <option value="DRAFT">Draft</option>
              <option value="PUBLISHED">Published</option>
            </Select>
          </Field>
        </div>
      </Panel>

      <Panel>
        <Title as="h2" size="h3" className="mb-4">Controls</Title>
        <div className="flex flex-wrap items-center gap-6">
          <Switch checked={published} onChange={setPublished} label={published ? 'Published' : 'Draft'} />
          <Checkbox label="Select" checked={checked} onChange={(e) => setChecked(e.target.checked)} />
          <div className="flex gap-2">
            <StatusTag status="DRAFT" />
            <StatusTag status="PUBLISHED" />
            <StatusTag status="PENDING" />
            <StatusTag status="FAILED" />
          </div>
        </div>
      </Panel>

      <Panel>
        <Title as="h2" size="h3" className="mb-4">Dialogs and toasts</Title>
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => setInfoOpen(true)}>Open dialog</Button>
          <Button onClick={() => setConfirmOpen(true)}>Open confirm</Button>
          <Button variant="outline" onClick={() => toast('Saved')}>Info toast</Button>
          <Button variant="outline" onClick={() => toast('Upload failed: file too large', { tone: 'error' })}>Error toast</Button>
        </div>
      </Panel>

      <Dialog open={infoOpen} onClose={() => setInfoOpen(false)} title="About this dialog" description="It is a native dialog, so Esc closes it and focus stays inside." actions={<Button onClick={() => setInfoOpen(false)}>Close</Button>} />
      <ConfirmDialog
        open={confirmOpen}
        title="Delete this photo?"
        description="It appears in 2 published grids. This cannot be undone."
        confirmLabel="Delete"
        onCancel={() => setConfirmOpen(false)}
        onConfirm={() => {
          setConfirmOpen(false);
          toast('Deleted');
        }}
      />
    </div>
  );
}
