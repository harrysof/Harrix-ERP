import { api } from "./api";

/**
 * Typed client for /api/auth and /api/users, plus the one place the token is
 * stored and read. Nothing else in the app touches localStorage for auth.
 */

export const TOKEN_STORAGE_KEY = "harrix.auth-token.v1";

/** Mirrors backend/src/auth/permissions.ts. Keep the two in step. */
export type Permission =
  | "stock:read"
  | "stock:write"
  | "stock:manage"
  | "production:read"
  | "production:write"
  | "suppliers:read"
  | "suppliers:write"
  | "purchasing:read"
  | "purchasing:write"
  | "purchasing:approve"
  | "orders:read"
  | "orders:write"
  | "hr:read"
  | "hr:write"
  | "users:manage"
  | "audit:read";

export interface AuthUser {
  id: string;
  login: string;
  fullName: string;
  role: { key: string; label: string };
  permissions: Permission[];
}

export interface ApiRole {
  id: string;
  key: string;
  label: string;
  description: string;
  permissions: Permission[];
  isProtected: boolean;
  sortOrder: number;
  userCount: number;
}

export interface ApiUser {
  id: string;
  login: string;
  fullName: string;
  active: boolean;
  lastLoginAt: string | null;
  createdAt: string;
  role: { id: string; key: string; label: string };
  permissions: Permission[];
}

export interface PermissionGroup {
  label: string;
  permissions: Array<{ key: Permission; label: string }>;
}

export interface AuditEntry {
  id: string;
  userId: string | null;
  userLogin: string;
  action: string;
  entity: string;
  entityId: string | null;
  changes: string | null;
  method: string;
  path: string;
  createdAt: string;
  user: { id: string; fullName: string; login: string } | null;
}

export function readToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_STORAGE_KEY);
  } catch {
    return null;
  }
}

export function writeToken(token: string | null) {
  try {
    if (token) localStorage.setItem(TOKEN_STORAGE_KEY, token);
    else localStorage.removeItem(TOKEN_STORAGE_KEY);
  } catch {
    // A browser with storage disabled still works, it just won't stay logged
    // in across a refresh. Better than crashing on load.
  }
}

export function login(credentials: { login: string; password: string }) {
  return api.post<{ accessToken: string; user: AuthUser }>("/auth/login", credentials);
}

export function fetchMe() {
  return api.get<AuthUser>("/auth/me");
}

export function changeOwnPassword(input: { currentPassword: string; newPassword: string }) {
  return api.post<{ changed: boolean }>("/auth/change-password", input);
}

// ------------------------------------------------------------------- admin

export function fetchUsers(includeInactive = true) {
  return api.get<ApiUser[]>(`/users${includeInactive ? "?includeInactive=true" : ""}`);
}

export function createUser(input: { login: string; fullName: string; password: string; roleId: string }) {
  return api.post<ApiUser>("/users", input);
}

export function updateUser(id: string, input: { login?: string; fullName?: string; roleId?: string }) {
  return api.patch<ApiUser>(`/users/${id}`, input);
}

export function setUserActive(id: string, active: boolean) {
  return api.patch<ApiUser>(`/users/${id}/${active ? "activate" : "deactivate"}`, {});
}

export function resetUserPassword(id: string, newPassword: string) {
  return api.patch<{ id: string; passwordReset: boolean }>(`/users/${id}/password`, { newPassword });
}

export function fetchRoles() {
  return api.get<ApiRole[]>("/users/roles");
}

export function fetchPermissionGroups() {
  return api.get<PermissionGroup[]>("/users/permissions");
}

export function createRole(input: { key: string; label: string; description?: string; permissions: string[]; sortOrder?: number }) {
  return api.post<ApiRole>("/users/roles", input);
}

export function updateRole(id: string, input: { label?: string; description?: string; permissions?: string[] }) {
  return api.patch<ApiRole>(`/users/roles/${id}`, input);
}

export function deleteRole(id: string) {
  return api.del<{ id: string; deleted: boolean }>(`/users/roles/${id}`);
}

// ------------------------------------------------------------------- audit

export interface AuditFilters {
  userId?: string;
  entity?: string;
  action?: string;
  from?: string;
  to?: string;
  limit?: string;
}

export function fetchAudit(filters: AuditFilters = {}) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) if (value) params.set(key, value);
  const query = params.toString();
  return api.get<AuditEntry[]>(`/audit${query ? `?${query}` : ""}`);
}

export function fetchAuditFilterOptions() {
  return api.get<{ entities: string[]; actions: string[] }>("/audit/filter-options");
}
