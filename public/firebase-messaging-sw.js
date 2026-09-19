importScripts(
  "https://www.gstatic.com/firebasejs/12.19.0/firebase-app-compat.js",
  "https://www.gstatic.com/firebasejs/12.19.0/firebase-messaging-compat.js",
);

let messagingConfigured = false;

self.addEventListener("message", async (event) => {
  if (event.data?.type !== "loveline-configure-fcm") {
    return;
  }

  if (!messagingConfigured) {
    firebase.initializeApp(event.data.config);
    const messaging = firebase.messaging();
    messaging.onBackgroundMessage(() => {
      self.registration.showNotification("A little note from Loveline", {
        body: "Your person left something for you.",
        icon: "/icon.svg",
        badge: "/icon.svg",
        tag: "loveline-personal-message",
        data: { url: "/" },
      });
    });
    messagingConfigured = true;
  }

  if (event.source) {
    event.source.postMessage({ type: "loveline-fcm-configured" });
  } else {
    const clients = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    clients.forEach((client) => client.postMessage({ type: "loveline-fcm-configured" }));
  }
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url ?? "/";

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      const existingClient = clients.find((client) => "focus" in client);
      if (existingClient) {
        existingClient.navigate(targetUrl);
        return existingClient.focus();
      }
      return self.clients.openWindow(targetUrl);
    }),
  );
});
