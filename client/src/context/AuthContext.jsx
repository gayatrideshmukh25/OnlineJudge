import { createContext, useEffect, useState, useCallback } from "react";
import toast from "react-hot-toast";
import authService from "../services/authService";

export const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true); // initial "am I logged in?" check

  // On mount, ask the server who we are. The JWT lives in an HTTP-only
  // cookie so the browser sends it automatically — we never touch it.
  useEffect(() => {
    let mounted = true;

    authService
      .getCurrentUser()
      .then((data) => {
        if (mounted) {
          setUser(data.user ?? data);
        }
      })
      .catch(() => {
        if (mounted) {
          setUser(null);
        }
      })
      .finally(() => {
        if (mounted) {
          setLoading(false);
        }
      });

    return () => {
      mounted = false;
    };
  }, []);

  const login = useCallback(async (credentials) => {
    const data = await authService.login(credentials);
    setUser(data.user ?? data);
    return data;
  }, []);

  const register = useCallback(async (payload) => {
    const data = await authService.register(payload);
    setUser(data.user ?? data);
    return data;
  }, []);

  const logout = useCallback(async () => {
    try {
      await authService.logout();
    } finally {
      setUser(null);
      toast.success("Logged out successfully");
    }
  }, []);

  const normalizedRole = String(user?.role ?? "").toLowerCase();

  const value = {
    user,
    setUser,
    loading,
    isAuthenticated: !!user,
    isAdmin: normalizedRole === "admin",
    login,
    register,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
