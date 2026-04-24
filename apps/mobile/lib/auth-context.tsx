import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import {
  ApiError,
  clearToken,
  getMe,
  login as apiLogin,
  setToken,
  signup as apiSignup,
  type User,
} from "./api";

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (data: SignUpData) => Promise<void>;
  signOut: () => Promise<void>;
}

interface SignUpData {
  email: string;
  password: string;
  name: string;
  phoneNumber: string;
  englishLevel: "beginner" | "intermediate";
  timezone: string;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const bootstrap = useCallback(async () => {
    try {
      const me = await getMe();
      setUser(me);
    } catch (err) {
      if (err instanceof ApiError && err.kind === "unauthorized") {
        setUser(null);
      } else if (err instanceof ApiError && err.kind === "network") {
        setUser(null);
      } else {
        setUser(null);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    bootstrap();
  }, [bootstrap]);

  const signIn = useCallback(async (email: string, password: string) => {
    const { token, user: u } = await apiLogin({ email, password });
    await setToken(token);
    setUser(u);
  }, []);

  const signUp = useCallback(async (data: SignUpData) => {
    const { token, user: u } = await apiSignup(data);
    await setToken(token);
    setUser(u);
  }, []);

  const signOut = useCallback(async () => {
    await clearToken();
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
