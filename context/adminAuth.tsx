"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useRouter } from "next/navigation";

interface Admin {
  id: string;
  username: string;
  email?: string;
}

interface AdminAuthContextValue {
  admin: Admin | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
}

const AdminAuthContext = createContext<AdminAuthContextValue | undefined>(undefined);

const ADMIN_SESSION_KEY = "theraclick.admin.session";

export function AdminAuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [admin, setAdmin] = useState<Admin | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check for existing session
    try {
      const session = localStorage.getItem(ADMIN_SESSION_KEY);
      if (session) {
        setAdmin(JSON.parse(session));
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  const login = async (username: string, password: string) => {
    const res = await fetch("/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });

    const data = await res.json();
    if (!data.ok) {
      throw new Error(data.error || "Login failed");
    }

    setAdmin(data.admin);
    localStorage.setItem(ADMIN_SESSION_KEY, JSON.stringify(data.admin));
  };

  const logout = () => {
    setAdmin(null);
    localStorage.removeItem(ADMIN_SESSION_KEY);
    router.push("/admin/login");
  };

  return (
    <AdminAuthContext.Provider
      value={{
        admin,
        loading,
        login,
        logout,
        isAuthenticated: !!admin,
      }}
    >
      {children}
    </AdminAuthContext.Provider>
  );
}

export function useAdminAuth() {
  const context = useContext(AdminAuthContext);
  if (!context) {
    throw new Error("useAdminAuth must be used within AdminAuthProvider");
  }
  return context;
}
