/**
 * Service Worker Registration
 * Handles PWA installation and updates
 */

export async function registerServiceWorker() {
  if (!("serviceWorker" in navigator)) {
    console.log("Service Workers not supported");
    return;
  }

  try {
    const registration = await navigator.serviceWorker.register("/sw.js", {
      scope: "/",
    });

    console.log("Service Worker registered:", registration);

    // Check for updates periodically
    setInterval(() => {
      registration.update();
    }, 60000); // Check every minute

    // Handle updates
    registration.addEventListener("updatefound", () => {
      const newWorker = registration.installing;
      if (!newWorker) return;

      newWorker.addEventListener("statechange", () => {
        if (
          newWorker.state === "installed" &&
          navigator.serviceWorker.controller
        ) {
          // New service worker available
          console.log("New service worker available");
          // You could show a notification to the user here
        }
      });
    });
  } catch (error) {
    console.error("Service Worker registration failed:", error);
  }
}

export function isInstallable(): boolean {
  return (
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}

export async function requestInstallPrompt(): Promise<boolean> {
  if (!isInstallable()) {
    return false;
  }

  try {
    // The install prompt is typically triggered by the browser
    // This function is here for future enhancement
    return true;
  } catch {
    return false;
  }
}
