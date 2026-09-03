import { formatLanguage } from "./format";
import { translate } from "./i18n";

const BASE_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3000/api";

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

/**
 * How the fetch wrapper gets the current token, and how it reports that the
 * session died. Set once by AuthContext at startup.
 *
 * This indirection exists so `api.ts` stays free of React and of
 * `authApi.ts` — otherwise the two would import each other in a circle.
 */
let getToken: () => string | null = () => null;
let onUnauthenticated: (() => void) | null = null;

export function configureAuth(options: { getToken: () => string | null; onUnauthenticated: () => void }) {
  getToken = options.getToken;
  onUnauthenticated = options.onUnauthenticated;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const token = getToken();

  let response: Response;
  try {
    response = await fetch(`${BASE_URL}${path}`, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        "Accept-Language": formatLanguage(),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...init?.headers,
      },
    });
  } catch {
    throw new ApiError(0, translate(formatLanguage(), "error.serverUnreachable"));
  }

  if (!response.ok) {
    const body = await response.json().catch(() => null);
    const message = Array.isArray(body?.message) ? body.message.join(" ") : body?.message;

    // 401 means the token is gone, expired, or the account was deactivated —
    // handled in one place so every screen reacts the same way instead of
    // each one inventing its own "you were logged out" behaviour. Login
    // itself is excluded: a wrong password there is a form error, not an
    // expired session.
    if (response.status === 401 && !path.startsWith("/auth/login")) {
      onUnauthenticated?.();
    }

    throw new ApiError(response.status, message || `Erreur ${response.status}`);
  }

  if (response.status === 204) return undefined as T;

  // A controller that returns `null` makes Nest send an empty body (Content-
  // Length: 0), not the literal "null" — response.json() throws on that, so
  // read as text first and treat "nothing there" as null rather than a parse error.
  const text = await response.text();
  return (text ? JSON.parse(text) : null) as T;
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body?: unknown) => request<T>(path, { method: "POST", body: body ? JSON.stringify(body) : undefined }),
  patch: <T>(path: string, body?: unknown) => request<T>(path, { method: "PATCH", body: body ? JSON.stringify(body) : undefined }),
  del: <T>(path: string) => request<T>(path, { method: "DELETE" }),
};
