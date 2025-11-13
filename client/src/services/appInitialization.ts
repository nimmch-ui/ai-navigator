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
});

export function notifyServicesReady() {
  resolveServicesReady();
}

export function notifyServicesError(err: Error) {
  rejectServicesReady(err);
}
