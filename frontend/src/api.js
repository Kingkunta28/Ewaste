// In development Vite proxies /api to Django. Keeping browser requests same-origin
// makes session and CSRF cookies reliable on both localhost and 127.0.0.1.
const defaultApiBase = "/api";
const configuredApiBase = import.meta.env.VITE_API_BASE_URL || defaultApiBase;
const API_BASE = configuredApiBase.replace(/\/+$/, "");
let csrfInitPromise = null;

function getCookie(name) {
  if (typeof document === "undefined") return "";
  const escapedName = name.replace(/[-[\]/{}()*+?.\\^$|]/g, "\\$&");
  const match = document.cookie.match(new RegExp(`(?:^|; )${escapedName}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : "";
}

async function ensureCsrfCookie() {
  if (getCookie("csrftoken")) return;
  if (!csrfInitPromise) {
    csrfInitPromise = fetch(`${API_BASE}/auth/csrf/`, {
      method: "GET",
      credentials: "include"
    }).then((response) => {
      if (!response.ok) {
        const error = new Error("Could not initialize a secure session. Is the backend running?");
        error.status = response.status;
        throw error;
      }
      return response;
    }).finally(() => {
      csrfInitPromise = null;
    });
  }
  await csrfInitPromise;
}

async function call(path, options = {}) {
  const method = (options.method || "GET").toUpperCase();
  const unsafeMethod = !["GET", "HEAD", "OPTIONS", "TRACE"].includes(method);
  if (unsafeMethod) {
    await ensureCsrfCookie();
  }
  const csrfToken = unsafeMethod ? getCookie("csrftoken") : "";

  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(csrfToken ? { "X-CSRFToken": csrfToken } : {}),
      ...(options.headers || {})
    },
    credentials: "include"
  });

  const contentType = response.headers.get("content-type") || "";
  const data = contentType.includes("application/json")
    ? await response.json()
    : null;

  if (!response.ok) {
    const message = data?.error || `Request failed (${response.status})`;
    const error = new Error(message);
    error.status = response.status;
    throw error;
  }
  return data;
}

export const api = {
  register: (payload) => call("/auth/register/", { method: "POST", body: JSON.stringify(payload) }),
  login: (payload) => call("/auth/login/", { method: "POST", body: JSON.stringify(payload) }),
  forgotPassword: (payload) => call("/auth/forgot-password/", { method: "POST", body: JSON.stringify(payload) }),
  logout: () => call("/auth/logout/", { method: "POST", body: JSON.stringify({}) }),
  me: () => call("/me/"),
  getProfile: () => call("/profile/"),
  updateProfile: (payload) => call("/profile/", { method: "PATCH", body: JSON.stringify(payload) }),
  listRequests: () => call("/requests/"),
  createRequest: (payload) => call("/requests/", { method: "POST", body: JSON.stringify(payload) }),
  updateRequest: (id, payload) => call(`/requests/${id}/`, { method: "PATCH", body: JSON.stringify(payload) }),
  listCollectors: () => call("/collectors/"),
  listUsers: () => call("/users/"),
  registerCollector: (payload) => call("/collectors/register/", { method: "POST", body: JSON.stringify(payload) }),
  assignCollector: (requestId, collectorId) =>
    call(`/requests/${requestId}/assign/`, {
      method: "POST",
      body: JSON.stringify({ collector_id: collectorId })
    }),
  updateStatus: (requestId, status) =>
    call(`/requests/${requestId}/status/`, {
      method: "POST",
      body: JSON.stringify({ status })
    }),
  dashboardStats: () => call("/dashboard/stats/"),
  monthlyReportUrl: (month) => `${API_BASE}/reports/monthly-pdf/?month=${encodeURIComponent(month)}`,
  exportMonthlyReportPdf: async (month) => {
    const response = await fetch(`${API_BASE}/reports/monthly-pdf/?month=${encodeURIComponent(month)}`, {
      method: "GET",
      credentials: "include"
    });

    if (!response.ok) {
      let message = "Failed to export report";
      try {
        const data = await response.json();
        message = data?.error || message;
      } catch {
        // ignore parse failure
      }
      const error = new Error(message);
      error.status = response.status;
      throw error;
    }

    return response.blob();
  }
};
