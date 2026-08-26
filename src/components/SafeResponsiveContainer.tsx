import React, { useLayoutEffect, useRef, useState } from 'react';
import { ResponsiveContainer } from 'recharts';

type SafeResponsiveContainerProps = React.ComponentProps<typeof ResponsiveContainer> & {
  children: React.ReactElement;
};

/**
 * O Recharts emite um warning quando é montado antes de um painel flex/grid
 * receber dimensões. Este wrapper aguarda uma dimensão real e reage também a
 * mudanças de orientação, resize e abertura de drawers.
 */
export default function SafeResponsiveContainer({
  children,
  minWidth = 1,
  minHeight = 1,
  ...props
}: SafeResponsiveContainerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });

  useLayoutEffect(() => {
    const element = containerRef.current;
    if (!element) return;

    const updateSize = () => {
      const rect = element.getBoundingClientRect();
      const nextSize = {
        width: Math.floor(rect.width),
        height: Math.floor(rect.height),
      };

      setSize((previous) => (
        previous.width === nextSize.width && previous.height === nextSize.height
          ? previous
          : nextSize
      ));
    };

    updateSize();

    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', updateSize);
      return () => window.removeEventListener('resize', updateSize);
    }

    const observer = new ResizeObserver(updateSize);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const hasValidSize = size.width >= Number(minWidth) && size.height >= Number(minHeight);

  return (
    <div ref={containerRef} className="h-full w-full min-h-[1px] min-w-[1px]">
      {hasValidSize ? (
        <ResponsiveContainer {...props} minWidth={minWidth} minHeight={minHeight}>
          {children}
        </ResponsiveContainer>
      ) : null}
    </div>
  );
}
