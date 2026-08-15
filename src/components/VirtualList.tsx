import React, { useState, useRef, useEffect, UIEvent } from 'react';

interface VirtualListProps<T> {
  items: T[];
  itemHeight: number;
  renderItem: (item: T, index: number) => React.ReactNode;
  containerHeight?: number | string;
  className?: string;
  buffer?: number;
  threshold?: number;
  keyExtractor?: (item: T, index: number) => string | number;
}

export function VirtualList<T>({
  items,
  itemHeight,
  renderItem,
  containerHeight = '100%',
  className = '',
  buffer = 5,
  threshold = 20,
  keyExtractor
}: VirtualListProps<T>) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [viewportHeight, setViewportHeight] = useState(600);

  useEffect(() => {
    if (!containerRef.current) return;
    const updateSize = () => {
      if (containerRef.current) {
        setViewportHeight(containerRef.current.clientHeight || 600);
      }
    };
    updateSize();

    const resizeObserver = new ResizeObserver(updateSize);
    resizeObserver.observe(containerRef.current);
    return () => resizeObserver.disconnect();
  }, []);

  const handleScroll = (e: UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
  };

  // If item count is 20 or less, render standard list without virtualization overhead
  if (!items || items.length <= threshold) {
    return (
      <div className={className}>
        {items?.map((item, index) => (
          <React.Fragment key={keyExtractor ? keyExtractor(item, index) : index}>
            {renderItem(item, index)}
          </React.Fragment>
        ))}
      </div>
    );
  }

  // Calculate visible range with buffer of 5 items above and below
  const totalHeight = items.length * itemHeight;
  const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - buffer);
  const endIndex = Math.min(
    items.length - 1,
    Math.ceil((scrollTop + viewportHeight) / itemHeight) + buffer
  );

  const visibleItems = items.slice(startIndex, endIndex + 1);
  const topPadding = startIndex * itemHeight;
  const bottomPadding = (items.length - 1 - endIndex) * itemHeight;

  return (
    <div
      ref={containerRef}
      onScroll={handleScroll}
      className={`overflow-y-auto relative ${className}`}
      style={{ height: typeof containerHeight === 'number' ? `${containerHeight}px` : containerHeight }}
    >
      <div style={{ height: `${totalHeight}px`, position: 'relative' }}>
        <div style={{ transform: `translateY(${topPadding}px)` }}>
          {visibleItems.map((item, sliceIndex) => {
            const actualIndex = startIndex + sliceIndex;
            return (
              <div key={keyExtractor ? keyExtractor(item, actualIndex) : actualIndex} style={{ height: `${itemHeight}px` }}>
                {renderItem(item, actualIndex)}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/**
 * Virtualized Table Body for large tables (> 20 rows)
 */
interface VirtualTableProps<T> {
  items: T[];
  rowHeight: number;
  renderRow: (item: T, index: number) => React.ReactNode;
  buffer?: number;
  keyExtractor?: (item: T, index: number) => string | number;
}

export function VirtualTableBody<T>({
  items,
  rowHeight,
  renderRow,
  buffer = 5,
  keyExtractor
}: VirtualTableProps<T>) {
  const [scrollTop, setScrollTop] = useState(0);
  const [containerHeight, setContainerHeight] = useState(500);
  const tableParentRef = useRef<HTMLTableSectionElement>(null);

  useEffect(() => {
    const parentDiv = tableParentRef.current?.closest('.overflow-y-auto') || tableParentRef.current?.parentElement;
    if (!parentDiv) return;

    const onScroll = () => setScrollTop(parentDiv.scrollTop);
    setContainerHeight(parentDiv.clientHeight || 500);

    parentDiv.addEventListener('scroll', onScroll, { passive: true });
    return () => parentDiv.removeEventListener('scroll', onScroll);
  }, []);

  if (!items || items.length <= 20) {
    return (
      <tbody ref={tableParentRef}>
        {items?.map((item, index) => (
          <React.Fragment key={keyExtractor ? keyExtractor(item, index) : index}>
            {renderRow(item, index)}
          </React.Fragment>
        ))}
      </tbody>
    );
  }

  const startIndex = Math.max(0, Math.floor(scrollTop / rowHeight) - buffer);
  const endIndex = Math.min(items.length - 1, Math.ceil((scrollTop + containerHeight) / rowHeight) + buffer);
  const visibleItems = items.slice(startIndex, endIndex + 1);

  const topSpace = startIndex * rowHeight;
  const bottomSpace = (items.length - 1 - endIndex) * rowHeight;

  return (
    <tbody ref={tableParentRef}>
      {topSpace > 0 && <tr style={{ height: `${topSpace}px` }}><td colSpan={100} /></tr>}
      {visibleItems.map((item, sliceIndex) => {
        const actualIndex = startIndex + sliceIndex;
        return (
          <React.Fragment key={keyExtractor ? keyExtractor(item, actualIndex) : actualIndex}>
            {renderRow(item, actualIndex)}
          </React.Fragment>
        );
      })}
      {bottomSpace > 0 && <tr style={{ height: `${bottomSpace}px` }}><td colSpan={100} /></tr>}
    </tbody>
  );
}
