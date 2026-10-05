const API_URL = import.meta.env['VITE_API_URL'] || "http://localhost:5000/api/v1";

async function fetchWithAuth(endpoint: string, options: RequestInit = {}) {
  let token: string | null = null;
  if (typeof window !== "undefined") {
    try {
      token = localStorage.getItem("auth_token");
    } catch {
      // Ignore
    }
  }

  const headers = new Headers(options.headers);
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }
  headers.set("Content-Type", "application/json");

  let response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (response.status === 401) {
    if (typeof window !== "undefined") {
      try {
        const refreshToken = localStorage.getItem("refresh_token");
        if (refreshToken) {
          // Attempt to refresh the token
          const refreshRes = await fetch(`${API_URL}/auth/refresh-token`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ refreshToken }),
          });

          if (refreshRes.ok) {
            const data = await refreshRes.json();
            localStorage.setItem("auth_token", data.token);
            localStorage.setItem("refresh_token", data.refreshToken);
            
            // Retry the original request with the new token
            headers.set("Authorization", `Bearer ${data.token}`);
            response = await fetch(`${API_URL}${endpoint}`, {
              ...options,
              headers,
            });
          } else {
            // Refresh failed, log out
            localStorage.removeItem("auth_token");
            localStorage.removeItem("refresh_token");
            window.location.href = "/login";
          }
        } else {
          // No refresh token, log out
          localStorage.removeItem("auth_token");
          window.location.href = "/login";
        }
      } catch {
        localStorage.removeItem("auth_token");
        localStorage.removeItem("refresh_token");
        window.location.href = "/login";
      }
    }
  }

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.error || "Une erreur est survenue lors de la requête API.");
  }

  return response.json();
}

export const api = {
  get: (endpoint: string) => fetchWithAuth(endpoint),
  post: (endpoint: string, body: any) => fetchWithAuth(endpoint, { method: "POST", body: JSON.stringify(body) }),
  put: (endpoint: string, body: any) => fetchWithAuth(endpoint, { method: "PUT", body: JSON.stringify(body) }),
  patch: (endpoint: string, body: any) => fetchWithAuth(endpoint, { method: "PATCH", body: JSON.stringify(body) }),
  delete: (endpoint: string) => fetchWithAuth(endpoint, { method: "DELETE" }),
};
