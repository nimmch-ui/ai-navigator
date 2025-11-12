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
 * Create a cancellable async function with AbortController
 * Only the most recent call will complete; previous calls are aborted
 */
export function createCancellableRequest<T extends (...args: any[]) => Promise<any>>() {
  let abortController: AbortController | null = null;

  return async function (...args: Parameters<T>): Promise<ReturnType<T> | null> {
    // Cancel previous request
    if (abortController) {
      abortController.abort();
    }

    // Create new AbortController for this request
    abortController = new AbortController();
    const signal = abortController.signal;

    try {
      // Execute the request with the abort signal
      const result = await (args[0] as any)(signal);
      return result;
    } catch (error) {
      // Ignore abort errors
      if (error instanceof Error && error.name === 'AbortError') {
        return null;
      }
      throw error;
    }
  };
}

/**
 * Debounced fetch with automatic abort of previous requests
 */
export class DebouncedFetcher {
  private timeout: NodeJS.Timeout | null = null;
  private abortController: AbortController | null = null;

  constructor(private wait: number = 300) {}

  /**
   * Fetch with debouncing and automatic abort of previous requests
   */
  async fetch<T>(
    fetcher: (signal: AbortSignal) => Promise<T>
  ): Promise<T | null> {
    // Cancel previous timeout
    if (this.timeout) {
      clearTimeout(this.timeout);
    }

    // Abort previous request
    if (this.abortController) {
      this.abortController.abort();
    }

    // Create new AbortController
    this.abortController = new AbortController();
    const signal = this.abortController.signal;

    return new Promise((resolve) => {
      this.timeout = setTimeout(async () => {
        try {
          const result = await fetcher(signal);
          resolve(result);
        } catch (error) {
          // Ignore abort errors
          if (error instanceof Error && error.name === 'AbortError') {
            resolve(null);
          } else {
            console.error('Fetch error:', error);
            resolve(null);
          }
        }
      }, this.wait);
    });
  }

  /**
   * Cancel any pending requests
   */
  cancel(): void {
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
