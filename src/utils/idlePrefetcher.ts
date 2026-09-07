/**
 * Idle Module Prefetcher service that pre-downloads and caches heavy algorithm and worker modules
 * during browser idle time (requestIdleCallback), pausing whenever user activity is detected.
 */

let isPrefetched = false;
let idleCallbackId: number | null = null;
let activityTimeoutId: number | null = null;
let isUserActive = false;

const USER_ACTIVITY_EVENTS = ['mousemove', 'keydown', 'touchstart', 'pointerdown', 'scroll'];

const performPrefetch = async () => {
  if (isPrefetched || isUserActive) return;
  isPrefetched = true;
  try {
    // Dynamic imports trigger browser prefetching & chunk caching
    await Promise.all([
      import('./workerManager'),
      import('./styleEngine'),
      import('./inpaintingEngine')
    ]);
  } catch (err) {
    console.warn('[IdlePrefetcher] Module prefetching notice:', err);
  }
};

const scheduleIdlePrefetch = () => {
  if (isPrefetched) return;

  if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
    if (idleCallbackId !== null) {
      window.cancelIdleCallback(idleCallbackId);
    }
    idleCallbackId = window.requestIdleCallback(
      (deadline) => {
        if (!isUserActive && (deadline.timeRemaining() > 0 || deadline.didTimeout)) {
          performPrefetch();
        } else if (!isPrefetched) {
          scheduleIdlePrefetch();
        }
      },
      { timeout: 3000 }
    );
  } else {
    setTimeout(() => {
      if (!isUserActive) {
        performPrefetch();
      }
    }, 2000);
  }
};

const handleUserActivity = () => {
  isUserActive = true;

  if (idleCallbackId !== null && typeof window !== 'undefined' && 'cancelIdleCallback' in window) {
    window.cancelIdleCallback(idleCallbackId);
    idleCallbackId = null;
  }

  if (activityTimeoutId !== null) {
    clearTimeout(activityTimeoutId);
  }

  // Resume idle prefetching 1.5 seconds after user becomes inactive
  activityTimeoutId = window.setTimeout(() => {
    isUserActive = false;
    if (!isPrefetched) {
      scheduleIdlePrefetch();
    }
  }, 1500) as unknown as number;
};

export const startIdlePrefetching = () => {
  if (typeof window === 'undefined') return;

  USER_ACTIVITY_EVENTS.forEach((event) => {
    window.addEventListener(event, handleUserActivity, { passive: true });
  });

  scheduleIdlePrefetch();
};

export const cleanupIdlePrefetching = () => {
  if (typeof window === 'undefined') return;

  USER_ACTIVITY_EVENTS.forEach((event) => {
    window.removeEventListener(event, handleUserActivity);
  });

  if (idleCallbackId !== null && 'cancelIdleCallback' in window) {
    window.cancelIdleCallback(idleCallbackId);
  }

  if (activityTimeoutId !== null) {
    clearTimeout(activityTimeoutId);
  }
};
