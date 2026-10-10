'use client';

import { useEffect, useId, useState, type ReactNode } from 'react';
import { DndContext, KeyboardSensor, PointerSensor, closestCenter, useSensor, useSensors, type Announcements, type DragEndEvent } from '@dnd-kit/core';
import { SortableContext, arrayMove, rectSortingStrategy, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy, type SortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical } from 'lucide-react';
import { cx } from '@/lib/cx';

export type SortableItemState = {
  /** The grip to render inside the item: dragging it with a mouse, finger or the keyboard reorders the list. */
  handle: ReactNode;
  dragging: boolean;
};

export type SortableListProps<T extends { id: string }> = {
  items: readonly T[];
  /** Called with the new order of ids once an item is dropped. */
  onReorder: (orderedIds: string[]) => void;
  /** Names an item for screen readers ("Reorder Italy"). */
  itemLabel: (item: T) => string;
  renderItem: (item: T, state: SortableItemState) => ReactNode;
  /** `list` stacks the items; `grid` lets them wrap. */
  layout?: 'list' | 'grid';
  /** Accessible name of the whole list. */
  label: string;
  className?: string;
};

/** The stock strategies stretch the other items when their heights differ (a text block next to a photo grid); moving them is enough. */
const withoutScale =
  (strategy: SortingStrategy): SortingStrategy =>
  (args) => {
    const transform = strategy(args);
    return transform ? { ...transform, scaleX: 1, scaleY: 1 } : null;
  };
const LIST_STRATEGY = withoutScale(verticalListSortingStrategy);
const GRID_STRATEGY = withoutScale(rectSortingStrategy);

const INSTRUCTIONS = 'To pick up an item, focus its grip and press space. Use the arrow keys to move it, space to drop it, or escape to cancel.';

/**
 * A reorderable list that works with a mouse, a finger and the keyboard. Only the grip starts a drag, so scrolling and
 * clicking inside an item are untouched. The new order shows at once; `onReorder` is told so it can save it.
 */
export function SortableList<T extends { id: string }>({ items, onReorder, itemLabel, renderItem, layout = 'list', label, className }: SortableListProps<T>) {
  const contextId = useId();
  const incoming = items.map((item) => item.id);
  const [order, setOrder] = useState(incoming);
  // Follow the parent whenever it hands over a different set or order (after a save or a reload).
  useEffect(() => setOrder(incoming), [incoming.join('|')]); // eslint-disable-line react-hooks/exhaustive-deps

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const byId = new Map(items.map((item) => [item.id, item]));
  const nameOf = (id: string | number) => {
    const item = byId.get(String(id));
    return item ? itemLabel(item) : 'item';
  };
  const place = (id: string | number | undefined) => (id === undefined ? '' : `position ${order.indexOf(String(id)) + 1} of ${order.length}`);

  const announcements: Announcements = {
    onDragStart: ({ active }) => `Picked up ${nameOf(active.id)}, ${place(active.id)}.`,
    onDragOver: ({ active, over }) => (over ? `${nameOf(active.id)} is over ${place(over.id)}.` : undefined),
    onDragEnd: ({ active, over }) => (over ? `Dropped ${nameOf(active.id)} at ${place(over.id)}.` : `Dropped ${nameOf(active.id)} where it was.`),
    onDragCancel: ({ active }) => `Moving ${nameOf(active.id)} was cancelled.`,
  };

  const onDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return;
    const from = order.indexOf(String(active.id));
    const to = order.indexOf(String(over.id));
    if (from < 0 || to < 0) return;
    const next = arrayMove(order, from, to);
    setOrder(next);
    onReorder(next);
  };

  return (
    <DndContext id={contextId} sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd} accessibility={{ announcements, screenReaderInstructions: { draggable: INSTRUCTIONS } }}>
      <SortableContext items={order} strategy={layout === 'grid' ? GRID_STRATEGY : LIST_STRATEGY}>
        <ul aria-label={label} className={cx('m-0 grid list-none gap-3 p-0', className)}>
          {order.map((id) => {
            const item = byId.get(id);
            return item ? (
              <SortableRow key={id} id={id} label={itemLabel(item)}>
                {(state) => renderItem(item, state)}
              </SortableRow>
            ) : null;
          })}
        </ul>
      </SortableContext>
    </DndContext>
  );
}

function SortableRow({ id, label, children }: { id: string; label: string; children: (state: SortableItemState) => ReactNode }) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({ id });
  const handle = (
    <button
      type="button"
      ref={setActivatorNodeRef}
      {...attributes}
      {...listeners}
      aria-label={`Reorder ${label}`}
      className="inline-grid size-8 shrink-0 cursor-grab touch-none place-items-center rounded-ui border border-transparent text-muted transition-colors duration-150 hover:border-border hover:text-accent active:cursor-grabbing"
    >
      <GripVertical aria-hidden="true" className="size-4" />
    </button>
  );
  return (
    <li ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition }} className={cx('relative min-w-0', isDragging && 'z-10 opacity-80')}>
      {children({ handle, dragging: isDragging })}
    </li>
  );
}
