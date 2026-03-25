/**
 * VirtualGrid — Virtualized grid component using @tanstack/react-virtual
 *
 * Renders only visible rows of a grid layout, reducing DOM nodes and memory
 * usage for large lists (500+ items). Supports responsive column counts.
 *
 * Usage:
 *   <VirtualGrid
 *     items={warts}
 *     columns={3}
 *     rowHeight={320}
 *     renderItem={(item, index) => <WartCard wart={item} key={item.id} />}
 *   />
 */

import { useRef, useMemo } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';

interface VirtualGridProps<T> {
  items: T[];
  columns: number;
  rowHeight: number;
  gap?: number;
  overscan?: number;
  renderItem: (item: T, index: number) => React.ReactNode;
  className?: string;
  emptyMessage?: string;
}

export default function VirtualGrid<T>({
  items,
  columns,
  rowHeight,
  gap = 8,
  overscan = 3,
  renderItem,
  className = '',
  emptyMessage = 'No items found',
}: VirtualGridProps<T>) {
  const parentRef = useRef<HTMLDivElement>(null);

  const rows = useMemo(() => {
    const result: T[][] = [];
    for (let i = 0; i < items.length; i += columns) {
      result.push(items.slice(i, i + columns));
    }
    return result;
  }, [items, columns]);

  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => rowHeight + gap,
    overscan,
  });

  if (items.length === 0) {
    return (
      <div className="flex items-center justify-center py-20 opacity-40 text-sm">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div
      ref={parentRef}
      className={`overflow-auto ${className}`}
      style={{ contain: 'strict' }}
    >
      <div
        style={{
          height: `${virtualizer.getTotalSize()}px`,
          width: '100%',
          position: 'relative',
        }}
      >
        {virtualizer.getVirtualItems().map((virtualRow) => {
          const row = rows[virtualRow.index];
          return (
            <div
              key={virtualRow.key}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: `${virtualRow.size}px`,
                transform: `translateY(${virtualRow.start}px)`,
              }}
            >
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: `repeat(${columns}, 1fr)`,
                  gap: `${gap}px`,
                  height: '100%',
                }}
              >
                {row.map((item, colIndex) => {
                  const itemIndex = virtualRow.index * columns + colIndex;
                  return renderItem(item, itemIndex);
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
