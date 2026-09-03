import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { configureAuth } from "../lib/api";
import { formatLanguage } from "../lib/format";
import { translate } from "../lib/i18n";
import { fetchMe, login as loginRequest, readToken, writeToken, type AuthUser, type Permission } from "../lib/authApi";

interface AuthContextValue {
  user: AuthUser | null;
  /** True while the stored token is being exchanged for a profile on startup. */
  loading: boolean;
  login: (login: string, password: string) => Promise<void>;
  logout: () => void;
  /** The one function every screen uses to decide what to show. */
  can: (permission: Permission) => boolean;
  canAny: (...permissions: Permission[]) => boolean;
  /** Set when a session ended by itself (expired, or the account was deactivated). */
  sessionEndedMessage: string | null;
  clearSessionEndedMessage: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

/**
 * The live token, and the wiring that lets api.ts reach it.
 *
 * Both live at module scope rather than inside the provider, for two reasons:
 * api.ts must have a token getter before the very first request (an effect
 * would run too late for the /auth/me call on startup), and the token is not
 * render state — changing it should not re-render anything.
 *
 * `onSessionCleared` is filled in by the provider on mount; until then a 401
 * simply clears the token, which is the correct behaviour anyway.
 */
let currentToken: string | null = readToken();
let onSessionCleared: ((message: string) => void) | null = null;

configureAuth({
  getToken: () => currentToken,
  onUnauthenticated: () => {
    // Only meaningful if we thought we were logged in; a 401 while already
    // logged out is just the login screen doing its job.
    if (!currentToken) return;
    currentToken = null;
    writeToken(null);
    onSessionCleared?.(translate(formatLanguage(), "session.expired"));
  },
});

function setToken(token: string | null) {
  currentToken = token;
  writeToken(token);
}

/**
 * Holds the session. A stored token is only a claim — on startup it is
 * exchanged for a real profile via /auth/me, so a token belonging to a
 * since-deactivated account never produces a usable session.
 *
 * Permission checks here decide what the UI *shows*. They are a convenience,
 * never the security boundary: the backend enforces the same rules again on
 * every request (build plan Phase 2).
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [sessionEndedMessage, setSessionEndedMessage] = useState<string | null>(null);

  // Lets the module-level 401 handler drop this provider's session.
  useEffect(() => {
    onSessionCleared = (message) => {
      setUser(null);
      setSessionEndedMessage(message);
    };
    return () => {
      onSessionCleared = null;
    };
  }, []);

  useEffect(() => {
    if (!currentToken) {
      setLoading(false);
      return;
    }
    fetchMe()
      .then(setUser)
      .catch(() => {
        // The 401 path already cleared the token; this also covers a backend
        // that is simply down at startup.
        setToken(null);
        setUser(null);
      })
      .finally(() => setLoading(false));
  }, []);

  const login = useCallback(async (loginName: string, password: string) => {
    const result = await loginRequest({ login: loginName, password });
    setToken(result.accessToken);
    setSessionEndedMessage(null);
    setUser(result.user);
  }, []);

  const logout = useCallback(() => {
    setToken(null);
    setUser(null);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      loading,
      login,
      logout,
      can: (permission) => Boolean(user?.permissions.includes(permission)),
      canAny: (...permissions) => Boolean(user && permissions.some((p) => user.permissions.includes(p))),
      sessionEndedMessage,
      clearSessionEndedMessage: () => setSessionEndedMessage(null),
    }),
    [user, loading, login, logout, sessionEndedMessage],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside <AuthProvider>");
  return context;
}
