let csrfTokenPromise: Promise<string> | null = null;

function readCsrfCookie() {
  const entry = document.cookie.split(";").find((cookie) => cookie.trim().startsWith("loveline_csrf="));
  return entry ? decodeURIComponent(entry.trim().slice("loveline_csrf=".length)) : null;
}

async function getCsrfToken() {
  const existingToken = readCsrfCookie();
  if (existingToken) return existingToken;

  csrfTokenPromise ??= fetch("/api/csrf-token", { credentials: "same-origin" })
    .then(async (response) => {
      if (!response.ok) throw new Error("Unable to initialize request protection.");
      const payload = (await response.json()) as { csrfToken?: string };
      if (!payload.csrfToken) throw new Error("Unable to initialize request protection.");
      return payload.csrfToken;
    })
    .finally(() => {
      csrfTokenPromise = null;
    });

  return csrfTokenPromise;
}

export async function apiFetch(input: RequestInfo | URL, init: RequestInit = {}) {
  const method = (init.method ?? "GET").toUpperCase();
  const headers = new Headers(init.headers);

  if (["POST", "PUT", "PATCH", "DELETE"].includes(method) && new URL(input.toString(), window.location.origin).origin === window.location.origin) {
    headers.set("x-csrf-token", await getCsrfToken());
  }

  return fetch(input, { ...init, headers, credentials: init.credentials ?? "same-origin" });
}