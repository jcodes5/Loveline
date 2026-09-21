import { getApp, getApps, initializeApp } from "firebase/app";
import {
  getMessaging,
  getToken,
  isSupported,
  onMessage,
  type MessagePayload,
  type Messaging,
} from "firebase/messaging";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

const vapidKey = import.meta.env.VITE_FIREBASE_VAPID_KEY;

export const isFirebaseMessagingConfigured = Object.values(firebaseConfig).every(Boolean) && Boolean(vapidKey);

async function getMessagingClient(): Promise<Messaging | null> {
  if (!isFirebaseMessagingConfigured || typeof window === "undefined") {
    return null;
  }

  if (!(await isSupported())) {
    return null;
  }

  const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
  return getMessaging(app);
}

async function getActiveWorker(registration: ServiceWorkerRegistration): Promise<ServiceWorker> {
  if (registration.active) {
    return registration.active;
  }

  const installingWorker = registration.installing ?? registration.waiting;
  if (!installingWorker) {
    throw new Error("Notification service worker is unavailable.");
  }

  await new Promise<void>((resolve, reject) => {
    const onStateChange = () => {
      if (installingWorker.state === "activated") {
        installingWorker.removeEventListener("statechange", onStateChange);
        resolve();
      }
      if (installingWorker.state === "redundant") {
        installingWorker.removeEventListener("statechange", onStateChange);
        reject(new Error("Notification service worker could not start."));
      }
    };
    installingWorker.addEventListener("statechange", onStateChange);
    onStateChange();
  });

  return registration.active ?? installingWorker;
}

async function configureServiceWorker(registration: ServiceWorkerRegistration) {
  const worker = await getActiveWorker(registration);

  await new Promise<void>((resolve, reject) => {
    const timeout = window.setTimeout(() => {
      navigator.serviceWorker.removeEventListener("message", onMessage);
      reject(new Error("Notification service worker did not respond."));
    }, 5000);

    const onMessage = (event: MessageEvent) => {
      if (event.data?.type !== "loveline-fcm-configured") {
        return;
      }
      window.clearTimeout(timeout);
      navigator.serviceWorker.removeEventListener("message", onMessage);
      resolve();
    };

    navigator.serviceWorker.addEventListener("message", onMessage);
    worker.postMessage({ type: "loveline-configure-fcm", config: firebaseConfig });
  });
}

export async function listenForForegroundNotifications(
  onNotification: () => void,
): Promise<() => void> {
  const messaging = await getMessagingClient();
  if (!messaging) {
    return () => undefined;
  }

  return onMessage(messaging, (_payload: MessagePayload) => {
    onNotification();
  });
}

export async function registerForNotifications(): Promise<string> {
  const messaging = await getMessagingClient();
  if (!messaging || !vapidKey) {
    throw new Error("Push notifications are not supported in this browser.");
  }

  const registration = await navigator.serviceWorker.ready;
  await configureServiceWorker(registration);

  const token = await getToken(messaging, {
    vapidKey,
    serviceWorkerRegistration: registration,
  });

  if (!token) {
    throw new Error("Your browser did not provide a notification address.");
  }

  return token;
}

// Check for service worker updates
export async function checkForSWUpdate(): Promise<boolean> {
  if (!("serviceWorker" in navigator)) return false;

  const registration = await navigator.serviceWorker.ready;
  await registration.update();

  if (registration.waiting) {
    return true;
  }

  // Use a simpler approach - wait for updatefound event
  return new Promise<boolean>((resolve) => {
    const handleUpdateFound = () => {
      const newWorker = registration.installing;
      if (newWorker) {
        newWorker.addEventListener("statechange", () => {
          if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
            resolve(true);
          }
        });
      }
    };

    registration.addEventListener("updatefound", handleUpdateFound, { once: true });

    // Timeout after 30 seconds
    setTimeout(() => resolve(false), 30000);
  });
}

// Apply service worker update
export async function applySWUpdate(): Promise<void> {
  if (!("serviceWorker" in navigator)) return;

  const registration = await navigator.serviceWorker.ready;
  if (registration.waiting) {
    registration.waiting.postMessage({ type: "SKIP_WAITING" });
    window.location.reload();
  }
}