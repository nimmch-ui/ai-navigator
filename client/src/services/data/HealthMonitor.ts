import { EventBus } from '@/services/eventBus';

interface CircuitBreakerState {
  failures: number;
  lastFailureTime: number;
  isOpen: boolean;
}

interface RetryConfig {
  maxRetries: number;
  initialDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
}

const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  initialDelay: 500,
  maxDelay: 5000,
  backoffMultiplier: 2,
};

export class HealthMonitor {
  private static circuitBreakers: Map<string, CircuitBreakerState> = new Map();
  private static readonly CIRCUIT_BREAKER_TIMEOUT = 30000;
  private static readonly CIRCUIT_BREAKER_FAILURE_THRESHOLD = 3;
  private static readonly REQUEST_TIMEOUT = 5000;

  static async executeWithHealth<T>(
    providerName: string,
    operation: () => Promise<T>,
    config: Partial<RetryConfig> = {}
  ): Promise<{ data: T; latency: number; attempts: number }> {
    const retryConfig = { ...DEFAULT_RETRY_CONFIG, ...config };
    
    if (this.isCircuitOpen(providerName)) {
      const breaker = this.circuitBreakers.get(providerName)!;
      const timeElapsed = Date.now() - breaker.lastFailureTime;
      
      if (timeElapsed < this.CIRCUIT_BREAKER_TIMEOUT) {
        throw new Error(
          `[HealthMonitor] Circuit breaker open for ${providerName}. ` +
          `Wait ${Math.ceil((this.CIRCUIT_BREAKER_TIMEOUT - timeElapsed) / 1000)}s`
        );
      } else {
        console.log(`[HealthMonitor] Circuit breaker reset for ${providerName}`);
        this.resetCircuitBreaker(providerName);
      }
    }

    let lastError: Error | null = null;
    const startTime = Date.now();

    for (let attempt = 0; attempt < retryConfig.maxRetries; attempt++) {
      try {
        const data = await this.executeWithTimeout(operation, this.REQUEST_TIMEOUT);
        const latency = Date.now() - startTime;
        
        this.recordSuccess(providerName);
        
        return { data, latency, attempts: attempt + 1 };
      } catch (error) {
        lastError = error as Error;
        console.warn(
          `[HealthMonitor] ${providerName} attempt ${attempt + 1}/${retryConfig.maxRetries} failed:`,
          error
        );

        if (attempt < retryConfig.maxRetries - 1) {
          const delay = this.calculateBackoffDelay(
            attempt,
            retryConfig.initialDelay,
            retryConfig.maxDelay,
            retryConfig.backoffMultiplier
          );
          console.log(`[HealthMonitor] Retrying ${providerName} in ${delay}ms...`);
          await this.sleep(delay);
        }
      }
    }

    this.recordFailure(providerName);
    
    throw new Error(
      `[HealthMonitor] ${providerName} failed after ${retryConfig.maxRetries} attempts. ` +
      `Last error: ${lastError?.message}`
    );
  }

  private static async executeWithTimeout<T>(
    operation: () => Promise<T>,
    timeout: number
  ): Promise<T> {
    return Promise.race([
      operation(),
      new Promise<T>((_, reject) =>
        setTimeout(() => reject(new Error('Operation timeout')), timeout)
      ),
    ]);
  }

  private static calculateBackoffDelay(
    attempt: number,
    initialDelay: number,
    maxDelay: number,
    multiplier: number
  ): number {
    const delay = initialDelay * Math.pow(multiplier, attempt);
    return Math.min(delay, maxDelay);
  }

  private static sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private static isCircuitOpen(providerName: string): boolean {
    const breaker = this.circuitBreakers.get(providerName);
    return breaker?.isOpen ?? false;
  }

  private static recordSuccess(providerName: string): void {
    const breaker = this.circuitBreakers.get(providerName);
    if (breaker && breaker.failures > 0) {
      console.log(`[HealthMonitor] ${providerName} recovered, resetting failure count`);
      this.resetCircuitBreaker(providerName);
    }
  }

  private static recordFailure(providerName: string): void {
    const breaker = this.circuitBreakers.get(providerName) ?? {
      failures: 0,
      lastFailureTime: 0,
      isOpen: false,
    };

    breaker.failures++;
    breaker.lastFailureTime = Date.now();

    if (breaker.failures >= this.CIRCUIT_BREAKER_FAILURE_THRESHOLD) {
      breaker.isOpen = true;
      console.error(
        `[HealthMonitor] Circuit breaker opened for ${providerName} ` +
        `after ${breaker.failures} failures. Blocking for ${this.CIRCUIT_BREAKER_TIMEOUT}ms`
      );
      
      EventBus.emit('provider:circuit_breaker_opened', {
        provider: providerName,
        failures: breaker.failures,
        timeout: this.CIRCUIT_BREAKER_TIMEOUT,
      });
    }

    this.circuitBreakers.set(providerName, breaker);
  }

  private static resetCircuitBreaker(providerName: string): void {
    this.circuitBreakers.set(providerName, {
      failures: 0,
      lastFailureTime: 0,
      isOpen: false,
    });
  }

  static getCircuitBreakerStatus(providerName: string): CircuitBreakerState | null {
    return this.circuitBreakers.get(providerName) ?? null;
  }

  static resetAllCircuitBreakers(): void {
    console.log('[HealthMonitor] Resetting all circuit breakers');
    this.circuitBreakers.clear();
  }
}
