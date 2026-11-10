import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { api, setUnauthorizedHandler, tokenStore } from "./api";
import type { User } from "./types";

interface AuthState {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<User>;
  register: (input: Record<string, unknown>) => Promise<User>;
  logout: () => void;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(() => Boolean(tokenStore.get()));
  const queryClient = useQueryClient();

  const logout = useCallback(() => {
    tokenStore.set(null);
    setUser(null);
    queryClient.clear();
  }, [queryClient]);

  const refresh = useCallback(async () => {
    if (!tokenStore.get()) return;
    try {
      setUser((await api.me()).user);
    } catch {
      tokenStore.set(null);
      setUser(null);
    }
  }, []);

  useEffect(() => {
    setUnauthorizedHandler(logout);
    if (tokenStore.get()) refresh().finally(() => setLoading(false));
    return () => setUnauthorizedHandler(null);
  }, [logout, refresh]);

  const value = useMemo<AuthState>(
    () => ({
      user,
      loading,
      logout,
      refresh,
      login: async (email, password) => {
        const res = await api.login(email, password);
        tokenStore.set(res.token);
        queryClient.clear();
        setUser(res.user);
        return res.user;
      },
      register: async (input) => {
        const res = await api.register(input);
        tokenStore.set(res.token);
        queryClient.clear();
        setUser(res.user);
        return res.user;
      },
    }),
    [user, loading, logout, refresh, queryClient],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}

export const homeFor = (user: User | null) => (user?.role === "employer" ? "/employer" : user?.role === "seeker" ? "/for-you" : "/jobs");
