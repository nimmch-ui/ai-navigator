/**
 * useMapLongPressToggle - Long-press gesture for map mode toggle
 * Detects single-touch long-press on map to toggle Classic ↔ 3D mode
 */

import { useEffect, useRef } from 'react';

interface LongPressOptions {
  onTrigger: () => void;
  duration?: number;
  movementThreshold?: number;
}

export function useMapLongPressToggle(
  containerRef: React.RefObject<HTMLElement>,
  options: LongPressOptions
) {
  const {
    onTrigger,
    duration = 600,
    movementThreshold = 10
  } = options;

  const longPressTimerRef = useRef<number | null>(null);
  const longPressStartPosRef = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const clearLongPress = () => {
      if (longPressTimerRef.current) {
        clearTimeout(longPressTimerRef.current);
        longPressTimerRef.current = null;
      }
      longPressStartPosRef.current = null;
    };

    const handlePointerDown = (e: PointerEvent) => {
      // Only handle single touch gestures
      if (e.pointerType === 'touch' && e.isPrimary) {
        longPressStartPosRef.current = { x: e.clientX, y: e.clientY };
        
        longPressTimerRef.current = window.setTimeout(() => {
          onTrigger();
          clearLongPress();
        }, duration);
      }
    };

    const handlePointerMove = (e: PointerEvent) => {
      if (longPressStartPosRef.current) {
        const dx = e.clientX - longPressStartPosRef.current.x;
        const dy = e.clientY - longPressStartPosRef.current.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        // Cancel if user moved beyond threshold (likely panning)
        if (distance > movementThreshold) {
          clearLongPress();
        }
      }
    };

    const handlePointerUp = () => {
      clearLongPress();
    };

    const handlePointerCancel = () => {
      clearLongPress();
    };

    // Register event listeners
    container.addEventListener('pointerdown', handlePointerDown);
    container.addEventListener('pointermove', handlePointerMove);
    container.addEventListener('pointerup', handlePointerUp);
    container.addEventListener('pointercancel', handlePointerCancel);

    return () => {
      clearLongPress();
      container.removeEventListener('pointerdown', handlePointerDown);
      container.removeEventListener('pointermove', handlePointerMove);
      container.removeEventListener('pointerup', handlePointerUp);
      container.removeEventListener('pointercancel', handlePointerCancel);
    };
  }, [containerRef, onTrigger, duration, movementThreshold]);
}
