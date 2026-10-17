import { createContext, useContext, useEffect, useRef, useCallback } from 'react';
import { View } from 'react-native';

export const FocusScrollContext = createContext<((node: View) => void) | null>(null);

// Repeat after layout/route animation: initial focus can arrive before native measurement is ready.
export function useFocusReveal(focused: boolean) {
  const ref = useRef<View>(null);
  const reveal = useContext(FocusScrollContext);
  const show = useCallback(() => {
    if (focused && ref.current) reveal?.(ref.current);
  }, [focused, reveal]);
  useEffect(() => {
    if (!focused) return;
    const frame = requestAnimationFrame(show);
    const timer = setTimeout(show, 350);
    return () => {
      cancelAnimationFrame(frame);
      clearTimeout(timer);
    };
  }, [focused, show]);
  return { ref, onLayout: show };
}

// null means the focused item is already visible: preserve the current viewport.
export function focusScrollTarget(
  top: number,
  height: number,
  scrollY: number,
  viewportHeight: number,
  margin: number,
): number | null {
  if (viewportHeight <= 0 || height <= 0) return null;
  const visibleTop = scrollY + margin;
  const visibleBottom = scrollY + viewportHeight - margin;
  if (top >= visibleTop && top + height <= visibleBottom) return null;
  if (top < visibleTop) return Math.max(0, top - margin);
  if (height > viewportHeight - 2 * margin) return Math.max(0, top - margin);
  return Math.max(0, top + height + margin - viewportHeight);
}
