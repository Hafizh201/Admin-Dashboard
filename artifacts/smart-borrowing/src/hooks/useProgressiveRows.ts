import { useState, useEffect, useRef } from "react";

export function useProgressiveRows<T>(
  data: T[],
  initialCount = 50,
  batchSize = 50
): { rows: T[]; hasMore: boolean; total: number; shown: number } {
  const [displayCount, setDisplayCount] = useState(initialCount);
  const prevLengthRef = useRef(data.length);

  // Reset when data array changes length significantly
  useEffect(() => {
    if (Math.abs(data.length - prevLengthRef.current) > 5) {
      setDisplayCount(initialCount);
    }
    prevLengthRef.current = data.length;
  }, [data.length, initialCount]);

  // Progressively add more rows
  useEffect(() => {
    if (displayCount >= data.length) return;
    const timer = setTimeout(() => {
      setDisplayCount((c) => Math.min(c + batchSize, data.length));
    }, 60);
    return () => clearTimeout(timer);
  }, [displayCount, data.length, batchSize]);

  const shown = Math.min(displayCount, data.length);
  return {
    rows: data.slice(0, shown),
    hasMore: shown < data.length,
    total: data.length,
    shown,
  };
}
