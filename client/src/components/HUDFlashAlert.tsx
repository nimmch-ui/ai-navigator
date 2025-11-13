import { useEffect, useState } from 'react';
import { EventBus } from '@/services/eventBus';

export default function HUDFlashAlert() {
  const [isFlashing, setIsFlashing] = useState(false);
  const [flashColor, setFlashColor] = useState('red');
  const [flashTimeout, setFlashTimeout] = useState<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const unsubscribeFlash = EventBus.subscribe('safety:hudFlash', ({ color, duration }) => {
      // Clear any existing flash timeout to prevent stacking
      if (flashTimeout) {
        clearTimeout(flashTimeout);
      }

      setFlashColor(color);
      setIsFlashing(true);

      // Set new timeout and track it
      const newTimeout = setTimeout(() => {
        setIsFlashing(false);
        setFlashTimeout(null);
      }, duration);
      setFlashTimeout(newTimeout);
    });

    const unsubscribeClear = EventBus.subscribe('safety:clearAlert', () => {
      // Clear flash when risk de-escalates
      if (flashTimeout) {
        clearTimeout(flashTimeout);
      }
      setIsFlashing(false);
      setFlashTimeout(null);
    });

    return () => {
      unsubscribeFlash();
      unsubscribeClear();
      if (flashTimeout) {
        clearTimeout(flashTimeout);
      }
    };
  }, [flashTimeout]);

  if (!isFlashing) {
    return null;
  }

  // Use design token colors with explicit light/dark variants
  const getFlashStyles = () => {
    if (flashColor === 'red') {
      return 'bg-destructive/20 dark:bg-destructive/30 ring-destructive/40 dark:ring-destructive/50';
    } else if (flashColor === 'orange') {
      return 'bg-orange-600/20 dark:bg-orange-500/30 ring-orange-600/40 dark:ring-orange-500/50';
    } else if (flashColor === 'yellow') {
      return 'bg-yellow-600/20 dark:bg-yellow-500/30 ring-yellow-600/40 dark:ring-yellow-500/50';
    }
    return 'bg-destructive/20 dark:bg-destructive/30 ring-destructive/40 dark:ring-destructive/50';
  };

  return (
    <div
      className={`fixed inset-0 z-50 pointer-events-none animate-pulse ${getFlashStyles()}`}
      data-testid="hud-flash-alert"
      aria-live="assertive"
      aria-label="Critical safety alert"
    >
      <div className={`absolute inset-0 ring-4 ring-inset animate-pulse ${getFlashStyles()}`} />
    </div>
  );
}
