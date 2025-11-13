/**
 * Resilient Fetcher - Combines retry logic, exponential backoff, 
 * rate limit detection, and circuit breaker pattern for external API calls.
 * 
 * Responsibilities:
 * - Detect and respect HTTP 429 (Rate Limit) and Retry-After headers
 * - Exponential backoff with jitter for retries
 * - Circuit breaker to prevent cascading failures
 * - Structured event emission for UI notifications
 * - Timeout enforcement with configurable limits
 */

import { HealthMonitor } from '@/services/data/HealthMonitor';
import { EventBus } from '@/services/eventBus';

export interface ResilientFetchOptions {
  maxRetries?: number;
  initialDelay?: number;
  maxDelay?: number;
  backoffMultiplier?: number;
  timeout?: number;
  serviceName?: string;
}

export interface RateLimitInfo {
  retryAfter: number; // seconds
  limit: number;
  remaining: number;
  reset: number;
}

const DEFAULT_OPTIONS: Required<ResilientFetchOptions> = {
  maxRetries: 3,
  initialDelay: 1000,
  maxDelay: 32000,
  backoffMultiplier: 2,
  timeout: 10000,
  serviceName: 'unknown',
};

/**
 * Parse rate limit headers from response
 */
function parseRateLimitHeaders(headers: Headers): RateLimitInfo | null {
  const retryAfter = headers.get('retry-after');
  const limit = headers.get('x-rate-limit-limit');
  const remaining = headers.get('x-rate-limit-remaining');
  const reset = headers.get('x-rate-limit-reset');

  if (!retryAfter) return null;

  return {
    retryAfter: parseInt(retryAfter, 10) || 60,
    limit: limit ? parseInt(limit, 10) : 0,
    remaining: remaining ? parseInt(remaining, 10) : 0,
    reset: reset ? parseInt(reset, 10) : 0,
  };
}

/**
 * Calculate backoff delay with jitter to prevent thundering herd
 */
function calculateBackoffWithJitter(
  attempt: number,
  initialDelay: number,
  maxDelay: number,
  multiplier: number
): number {
  const exponentialDelay = Math.min(
    initialDelay * Math.pow(multiplier, attempt),
    maxDelay
  );
  
  // Add jitter: random value between 0 and exponentialDelay * 0.5
  // This keeps total delay within initialDelay to maxDelay window
  const jitter = Math.random() * exponentialDelay * 0.5;
  const totalDelay = Math.min(exponentialDelay + jitter, maxDelay);
  return Math.floor(totalDelay);
}

/**
 * Resilient fetch wrapper with rate limiting, retries, and circuit breaker
 */
export async function resilientFetch(
  url: string,
  init: RequestInit = {},
  options: ResilientFetchOptions = {}
): Promise<Response> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const { serviceName, maxRetries, initialDelay, maxDelay, backoffMultiplier, timeout } = opts;

  return HealthMonitor.executeWithHealth(
    serviceName,
    async () => {
      let lastError: Error | null = null;

      for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
          // Create abort controller for timeout
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), timeout);

          // Merge signals if one is provided
          const signal = init.signal
            ? combineSignals([init.signal, controller.signal])
            : controller.signal;

          const response = await fetch(url, {
            ...init,
            signal,
          });

          clearTimeout(timeoutId);

          // Handle rate limiting (429)
          if (response.status === 429) {
            const rateLimitInfo = parseRateLimitHeaders(response.headers);
            
            if (rateLimitInfo) {
              const waitTime = rateLimitInfo.retryAfter * 1000; // Convert to ms
              
              EventBus.emit('api:rate_limit_hit', {
                service: serviceName,
                retryAfter: rateLimitInfo.retryAfter,
                limit: rateLimitInfo.limit,
                remaining: rateLimitInfo.remaining,
              });

              console.warn(
                `[ResilientFetch] ${serviceName} rate limited. Retry after ${rateLimitInfo.retryAfter}s`
              );

              // Wait for retry-after period if within bounds
              if (waitTime <= maxDelay && attempt < maxRetries - 1) {
                await sleep(waitTime);
                continue;
              }
            }

            throw new Error(`Rate limit exceeded for ${serviceName}`);
          }

          // Return response if successful or client error (4xx except 429)
          if (response.ok || (response.status >= 400 && response.status < 500)) {
            return response;
          }

          // Server error (5xx) - retry with backoff
          if (response.status >= 500) {
            throw new Error(`Server error: ${response.status} ${response.statusText}`);
          }

          return response;
        } catch (error) {
          lastError = error as Error;

          // Don't retry on abort
          if (error instanceof Error && error.name === 'AbortError') {
            throw error;
          }

          // Retry with exponential backoff (except on last attempt)
          if (attempt < maxRetries - 1) {
            const delay = calculateBackoffWithJitter(
              attempt,
              initialDelay,
              maxDelay,
              backoffMultiplier
            );

            console.warn(
              `[ResilientFetch] ${serviceName} attempt ${attempt + 1}/${maxRetries} failed. ` +
              `Retrying in ${delay}ms...`,
              error
            );

            await sleep(delay);
          }
        }
      }

      // All retries exhausted
      EventBus.emit('api:all_retries_exhausted', {
        service: serviceName,
        error: lastError?.message,
      });

      throw lastError || new Error(`${serviceName} failed after ${maxRetries} attempts`);
    },
    {
      maxRetries: 1, // HealthMonitor already provides retry logic
      initialDelay: 0,
    }
  );
}

/**
 * Combine multiple abort signals into one
 */
function combineSignals(signals: AbortSignal[]): AbortSignal {
  const controller = new AbortController();

  for (const signal of signals) {
    if (signal.aborted) {
      controller.abort();
      return controller.signal;
    }

    signal.addEventListener('abort', () => controller.abort(), { once: true });
  }

  return controller.signal;
}

/**
 * Sleep utility
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
