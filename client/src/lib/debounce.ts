/**
 * Debounce utility with AbortController support for cancelling in-flight requests
 */

/**
 * Debounce a function with AbortController support
 * Returns a debounced function that cancels previous calls
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;

  return function (...args: Parameters<T>) {
    if (timeout) {
      clearTimeout(timeout);
    }

    timeout = setTimeout(() => {
      func(...args);
    }, wait);
  };
}

/**
 * Debounced fetch with automatic abort of previous requests
 */
export class DebouncedFetcher {
  private timeout: NodeJS.Timeout | null = null;
  private abortController: AbortController | null = null;
  private pendingResolve: ((value: any) => void) | null = null;

  constructor(private wait: number = 300) {}

  /**
   * Fetch with debouncing and automatic abort of previous requests
   */
  async fetch<T>(
    fetcher: (signal: AbortSignal) => Promise<T>
  ): Promise<T | null> {
    // Resolve previous pending promise with null (cancelled)
    if (this.pendingResolve) {
      this.pendingResolve(null);
      this.pendingResolve = null;
    }

    // Cancel previous timeout
    if (this.timeout) {
      clearTimeout(this.timeout);
      this.timeout = null;
    }

    // Abort previous request
    if (this.abortController) {
      this.abortController.abort();
    }

    // Create new AbortController
    this.abortController = new AbortController();
    const signal = this.abortController.signal;

    return new Promise((resolve) => {
      // Store resolve function so we can cancel this promise if needed
      this.pendingResolve = resolve;

      this.timeout = setTimeout(async () => {
        this.timeout = null;
        const currentResolve = this.pendingResolve;
        this.pendingResolve = null;

        try {
          const result = await fetcher(signal);
          this.abortController = null; // Reset after successful completion
          if (currentResolve) {
            currentResolve(result);
          }
        } catch (error) {
          // Ignore abort errors
          if (error instanceof Error && error.name === 'AbortError') {
            if (currentResolve) {
              currentResolve(null);
            }
          } else {
            console.error('Fetch error:', error);
            if (currentResolve) {
              currentResolve(null);
            }
          }
        }
      }, this.wait);
    });
  }

  /**
   * Cancel any pending requests
   */
  cancel(): void {
    // Resolve pending promise with null
    if (this.pendingResolve) {
      this.pendingResolve(null);
      this.pendingResolve = null;
    }

    if (this.timeout) {
      clearTimeout(this.timeout);
      this.timeout = null;
    }
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
    }
  }
}
