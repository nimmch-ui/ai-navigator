/**
 * App Initialization Service
 * Provides a module-level promise that resolves when all services are ready
 */

// Create a promise that will be resolved by App.tsx after initialization
let resolveServicesReady: () => void;
let rejectServicesReady: (err: Error) => void;

export const servicesReady = new Promise<void>((resolve, reject) => {
  resolveServicesReady = resolve;
  rejectServicesReady = reject;

  // Safety net: if initialization takes too long, reject with timeout
  const timeout = setTimeout(() => {
    reject(new Error('Service initialization timeout (30s exceeded)'));
  }, 30000); // 30 second timeout

  // Store original resolve to clear timeout
  const originalResolve = resolve;
  resolveServicesReady = () => {
    clearTimeout(timeout);
    originalResolve();
  };

  // Store original reject to clear timeout
  const originalReject = reject;
  rejectServicesReady = (err: Error) => {
    clearTimeout(timeout);
    originalReject(err);
  };
});

export function notifyServicesReady() {
  resolveServicesReady();
}

export function notifyServicesError(err: Error) {
  rejectServicesReady(err);
}
