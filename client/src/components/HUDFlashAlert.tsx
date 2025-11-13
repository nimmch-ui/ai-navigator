import { useEffect, useState } from 'react';
import { EventBus } from '@/services/eventBus';

export default function HUDFlashAlert() {
  const [isFlashing, setIsFlashing] = useState(false);
  const [flashColor, setFlashColor] = useState('red');

  useEffect(() => {
    const unsubscribe = EventBus.subscribe('safety:hudFlash', ({ color, duration }) => {
      setFlashColor(color);
      setIsFlashing(true);

      setTimeout(() => {
        setIsFlashing(false);
      }, duration);
    });

    return () => unsubscribe();
  }, []);

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
