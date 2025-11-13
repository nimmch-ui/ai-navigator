/**
 * Mobile Browser Optimizations - Safari/Chrome specific performance enhancements
 */

/**
 * Safe requestIdleCallback with fallback for Safari
 */
export function requestIdleCallback(callback: () => void, options?: { timeout?: number }): number {
  if ('requestIdleCallback' in window) {
    return window.requestIdleCallback(callback, options);
  }
  
  // Fallback for Safari: use setTimeout with low priority
  return window.setTimeout(callback, options?.timeout || 1) as unknown as number;
}

/**
 * Safe cancelIdleCallback with fallback for Safari
 */
export function cancelIdleCallback(handle: number): void {
  if ('cancelIdleCallback' in window) {
    window.cancelIdleCallback(handle);
  } else {
    window.clearTimeout(handle);
  }
}

/**
 * Add passive event listener (improves scroll performance)
 */
export function addPassiveEventListener(
  target: EventTarget,
  event: string,
  handler: EventListener,
  options?: AddEventListenerOptions
): void {
  const supportsPassive = checkPassiveSupport();
  
  if (supportsPassive) {
    target.addEventListener(event, handler, { ...options, passive: true });
  } else {
    target.addEventListener(event, handler, options);
  }
}

/**
 * Check if browser supports passive event listeners
 */
let passiveSupported: boolean | null = null;

function checkPassiveSupport(): boolean {
  if (passiveSupported !== null) {
    return passiveSupported;
  }

  try {
    const opts = Object.defineProperty({}, 'passive', {
      get() {
        passiveSupported = true;
        return true;
      }
    });
    window.addEventListener('test' as any, null as any, opts);
    window.removeEventListener('test' as any, null as any, opts);
  } catch (e) {
    passiveSupported = false;
  }

  return passiveSupported || false;
}

/**
 * Optimize element for animation (adds will-change hint)
 */
export function optimizeForAnimation(element: HTMLElement, properties: string[] = ['transform', 'opacity']): void {
  element.style.willChange = properties.join(', ');
  
  // Remove will-change after animation completes to free resources
  requestIdleCallback(() => {
    element.style.willChange = 'auto';
  }, { timeout: 5000 });
}

/**
 * Batch DOM reads to avoid layout thrashing
 */
export function batchDOMReads<T>(reads: Array<() => T>): T[] {
  return reads.map(read => read());
}

/**
 * Batch DOM writes to avoid layout thrashing
 */
export function batchDOMWrites(writes: Array<() => void>): void {
  requestAnimationFrame(() => {
    writes.forEach(write => write());
  });
}

/**
 * Debounce for expensive operations
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;
  
  return function(...args: Parameters<T>) {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

/**
 * Throttle for high-frequency events
 */
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean = false;
  
  return function(...args: Parameters<T>) {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}

/**
 * iOS Safari viewport height fix
 */
export function fixIOSViewportHeight(): void {
  if (!isIOS()) return;

  const setVH = () => {
    const vh = window.innerHeight * 0.01;
    document.documentElement.style.setProperty('--vh', `${vh}px`);
  };

  setVH();
  window.addEventListener('resize', throttle(setVH, 200));
  window.addEventListener('orientationchange', setVH);
}

/**
 * Detect iOS
 */
export function isIOS(): boolean {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
}

/**
 * Detect Safari
 */
export function isSafari(): boolean {
  return /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
}

/**
 * Detect Chrome mobile
 */
export function isChromeMobile(): boolean {
  return /Chrome/.test(navigator.userAgent) && /Mobile/.test(navigator.userAgent);
}

/**
 * Prevent rubber band scrolling on iOS
 */
export function preventRubberBand(element: HTMLElement): () => void {
  if (!isIOS()) return () => {};

  const preventScroll = (e: TouchEvent) => {
    const scrollTop = element.scrollTop;
    const scrollHeight = element.scrollHeight;
    const height = element.clientHeight;
    const deltaY = (e as any).deltaY || 0;

    // At top and trying to scroll up
    if (scrollTop === 0 && deltaY < 0) {
      e.preventDefault();
    }
    // At bottom and trying to scroll down
    if (scrollTop + height >= scrollHeight && deltaY > 0) {
      e.preventDefault();
    }
  };

  element.addEventListener('touchmove', preventScroll as any, { passive: false });

  return () => {
    element.removeEventListener('touchmove', preventScroll as any);
  };
}

/**
 * Enable hardware acceleration for element
 */
export function enableHardwareAcceleration(element: HTMLElement): void {
  element.style.transform = 'translateZ(0)';
  element.style.backfaceVisibility = 'hidden';
  element.style.perspective = '1000px';
}

/**
 * Optimize canvas for mobile
 */
export function optimizeCanvas(canvas: HTMLCanvasElement, devicePixelRatio?: number): void {
  const dpr = devicePixelRatio || window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();

  // Set actual size in memory (scaled to account for extra pixel density)
  canvas.width = rect.width * dpr;
  canvas.height = rect.height * dpr;

  // Normalize coordinate system to use CSS pixels
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.scale(dpr, dpr);
  }
}
