"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import axios from "axios";
import type { User } from "@/lib/types";
import { tokenManager } from "@/lib/api-client";

type Role = User["role"];

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: User["role"];
  department?: string;
  designation?: string;
  isInVerificationPanel?: boolean;
}

interface AuthContextValue {
  user: AuthUser | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (payload: {
    userId?: string;
    email?: string;
    password: string
  }) => Promise<{
    ok: boolean;
    error?: string;
    user?: AuthUser;
    rolePath?: string;
  }>;
  logout: () => void;
  syncUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export default function AuthProvider({
  preToken,
  initialUser,
  children,
}: {
  preToken: string | null;
  initialUser: AuthUser | null;
  children: React.ReactNode;
}) {
  const [user, setUser] = useState<AuthUser | null>(initialUser);
  const [token, setToken] = useState<string | null>(preToken);
  const [isLoading, setIsLoading] = useState(false);

  // Sync token with tokenManager on mount and when token changes
  useEffect(() => {
    if (token) {
      tokenManager.setToken(token);
    } else {
      tokenManager.clearToken();
    }
  }, [token]);

  const syncUser = useCallback(async () => {
    if (!token) return;
    try {
      const { data } = await axios.get("/api/auth/me", {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (data.success && data.user) {
        const u = data.user;
        setUser({
          id: u.userId || u.id || "",
          email: u.email,
          name: u.name,
          role: u.role as Role,
          isInVerificationPanel: !!u.isInVerificationPanel,
        });
      }
    } catch (e) {
      console.error("Failed to sync user state:", e);
    }
  }, [token]);

  useEffect(() => {
    if (token && !user?.isInVerificationPanel) {
      syncUser();
    }
  }, [token, syncUser]);


  const normalizeRolePath = useCallback((r?: string | null) => {
    if (!r) return undefined;
    const s = String(r).toLowerCase();
    // Map role values to route paths
    if (s === "associate_dean") return "associate_dean";
    if (s === "director") return "director";
    if (s === "hod") return "hod";
    if (s === "dean") return "dean";
    if (s === "admin") return "admin";
    if (s === "faculty") return "faculty";
    return s;
  }, []);

  const login = useCallback<AuthContextValue["login"]>(
    async ({ userId, email, password }) => {
      setIsLoading(true);
      try {
        // Backend expects userId, but support email as fallback
        const loginPayload = userId
          ? { userId, password }
          : { userId: email, password };

        const { data, status } = await axios.post(`/api/login`, loginPayload, {
          headers: { "Content-Type": "application/json" },
          withCredentials: true,
          validateStatus: () => true,
        });

        if (status < 200 || status >= 300) {
          return { ok: false, error: data?.message || "Invalid credentials" };
        }

        const receivedToken = data.data.token;
        // console.log("Login response data:", data);
        const receivedUser = data.data.user;
        if (!receivedToken || !receivedUser?.email) {
          return { ok: false, error: "Malformed login response" };
        }

        const nextUser: AuthUser = {
          id: receivedUser.id || "",
          email: receivedUser.email,
          name: receivedUser.name || receivedUser.email.split("@")[0],
          role: receivedUser.role as Role,
          isInVerificationPanel: !!receivedUser.isInVerificationPanel,
        };
        //clear everything related to auth in localStorage to prevent stale data issues
        localStorage.clear();

        // Store token in memory via tokenManager
        setUser(nextUser);
        setToken(receivedToken);
        tokenManager.setToken(receivedToken);

        const rolePath = normalizeRolePath(nextUser.role);
        return { ok: true, user: nextUser, rolePath };
      } catch (e) {
        return { ok: false, error: "Network error" };
      } finally {
        setIsLoading(false);
      }
    },
    [normalizeRolePath]
  );

  const logout = useCallback(async () => {
    try {
      setIsLoading(true);
      await axios.post("/api/logout", {}, {
        headers: { Authorization: `Bearer ${token}` },
        withCredentials: true,
      });
      localStorage.clear();
      // Clear token from memory
      setUser(null);
      setToken(null);
      tokenManager.clearToken();

      window.location.href = "/";
    } finally {
      setIsLoading(false);
    }
  }, [token]);



  const value = useMemo(
    () => ({
      user,
      token,
      isLoading,
      isAuthenticated: !!token,
      login,
      logout,
      syncUser,
    }),
    [user, token, isLoading, login, logout, syncUser]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
