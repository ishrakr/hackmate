import { createContext, useContext, useEffect, useState } from "react";
import {
  isSupabaseConfigured,
  supabase,
} from "../../lib/supabase/client.js";
import { listCurrentUserRoles } from "../admin/admin-service.js";

const oauthFlowStorageKey = "hackmate.oauth.flow";

export const adminOAuthIntentKey = "hackmate.admin.oauth.intent";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [status, setStatus] = useState(
    isSupabaseConfigured ? "loading" : "ready",
  );
  const [error, setError] = useState("");
  const [resolvedRoles, setResolvedRoles] = useState([]);
  const [rolesStatus, setRolesStatus] = useState("idle");

  useEffect(() => {
    if (!supabase) {
      setStatus("ready");
      return undefined;
    }

    let isMounted = true;

    supabase.auth.getSession().then(({ data, error: sessionError }) => {
      if (!isMounted) return;

      if (sessionError) {
        setError(sessionError.message);
      }

      setSession(data.session);
      setStatus("ready");
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setError("");
      setStatus("ready");
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!supabase || !session?.user?.id) {
      setResolvedRoles([]);
      setRolesStatus("idle");
      return undefined;
    }

    let isMounted = true;

    async function loadRoles() {
      setRolesStatus("loading");
      const { data, error: rolesError } = await listCurrentUserRoles(session.user.id);

      if (!isMounted) return;

      if (rolesError) {
        setError((current) => current || rolesError.message);
        setResolvedRoles([]);
        setRolesStatus("ready");
        return;
      }

      setResolvedRoles([...new Set(data)]);
      setRolesStatus("ready");
    }

    loadRoles();

    return () => {
      isMounted = false;
    };
  }, [session?.user?.id]);

  async function signInWithProvider(provider, nextPath = "/onboarding", optionsOverride = {}) {
    if (!supabase) {
      const configError = new Error(
        "Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.",
      );
      setError(configError.message);
      return { error: configError };
    }

    setError("");

    const callbackOrigin = optionsOverride.callbackOrigin || window.location.origin;
    const callbackPath = optionsOverride.callbackPath || "/auth/callback";
    const callbackUrl = new URL(callbackPath, callbackOrigin);
    callbackUrl.searchParams.set("next", nextPath);

    const flow = {
      callbackPath,
      nextPath,
      mode: optionsOverride.mode || "participant",
      redirectTo: callbackUrl.toString(),
      startedAt: Date.now(),
    };

    window.sessionStorage.setItem(oauthFlowStorageKey, JSON.stringify(flow));

    const options = { redirectTo: callbackUrl.toString() };

    if (provider === "github") {
      options.scopes = "read:user user:email";
    }

    const { error: signInError } = await supabase.auth.signInWithOAuth({
      provider,
      options,
    });

    if (signInError) {
      setError(signInError.message);
    }

    return { error: signInError };
  }

  async function signOut() {
    if (!supabase) return { error: null };

    const { error: signOutError } = await supabase.auth.signOut();
    if (signOutError) {
      setError(signOutError.message);
    }

    return { error: signOutError };
  }

  const roles = [...new Set([...getUserRoles(session?.user), ...resolvedRoles])];
  const value = {
    error,
    isAuthenticated: Boolean(session),
    isLoading: status === "loading",
    isSupabaseConfigured,
    isResolvingRoles: rolesStatus === "loading",
    role: roles[0] ?? (session ? "participant" : null),
    roles,
    session,
    signInWithProvider,
    signOut,
    status,
    user: session?.user ?? null,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function consumeOAuthFlow() {
  const raw = window.sessionStorage.getItem(oauthFlowStorageKey);
  if (!raw) return null;

  window.sessionStorage.removeItem(oauthFlowStorageKey);

  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function peekOAuthFlow() {
  const raw = window.sessionStorage.getItem(oauthFlowStorageKey);
  if (!raw) return null;

  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function markAdminOAuthIntent(nextPath = "/admin") {
  window.localStorage.setItem(
    adminOAuthIntentKey,
    JSON.stringify({ nextPath, startedAt: Date.now() }),
  );
}

export function consumeAdminOAuthIntent() {
  const raw = window.localStorage.getItem(adminOAuthIntentKey);
  if (!raw) return null;

  window.localStorage.removeItem(adminOAuthIntentKey);

  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function peekAdminOAuthIntent() {
  const raw = window.localStorage.getItem(adminOAuthIntentKey);
  if (!raw) return null;

  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider");
  }

  return context;
}

function getUserRoles(user) {
  if (!user) return [];

  const roleValues = [
    user.app_metadata?.role,
    user.user_metadata?.role,
    ...(Array.isArray(user.app_metadata?.roles) ? user.app_metadata.roles : []),
    ...(Array.isArray(user.user_metadata?.roles) ? user.user_metadata.roles : []),
  ];

  return [...new Set(roleValues.filter(Boolean))];
}
