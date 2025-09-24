import { createContext, useContext, useEffect, useState } from "react";
import { useLocation } from "wouter";
import { apiRequest } from "@/lib/api";
import { User } from "@shared/schema";
import { queryClient } from "@/lib/queryClient";

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (userData: { name: string; email: string; password: string; role: string }) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [, setLocation] = useLocation();

  const refreshUser = async () => {
    try {
      const response = await apiRequest("GET", "/api/auth/me");
      const data = await response.json();
      setUser(data.user);
    } catch (error) {
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    refreshUser();
  }, []);

  const login = async (email: string, password: string) => {
    const response = await apiRequest("POST", "/api/auth/login", { email, password });
    const data = await response.json();
    setUser(data.user);
    
    // Redirect based on role
    switch (data.user.role) {
      case "admin":
        setLocation("/admin-dashboard");
        break;
      case "comercializadora":
        setLocation("/comercializadora-dashboard");
        break;
      default:
        setLocation("/dashboard");
    }
  };

  const register = async (userData: { name: string; email: string; password: string; role: string }) => {
    const response = await apiRequest("POST", "/api/auth/register", userData);
    const data = await response.json();
    setUser(data.user);
    
    // Redirect based on role
    switch (data.user.role) {
      case "admin":
        setLocation("/admin-dashboard");
        break;
      case "comercializadora":
        setLocation("/comercializadora-dashboard");
        break;
      default:
        setLocation("/dashboard");
    }
  };

  const logout = async () => {
    try {
      await apiRequest("POST", "/api/auth/logout");
    } catch (error) {
      // Even if logout request fails, clear local state
      console.error("Logout error:", error);
    } finally {
      // Always clear user state and cache
      setUser(null);
      queryClient.clear(); // Clear all cached data
      setLocation("/");
      // Force page reload to ensure clean state
      window.location.href = "/";
    }
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, login, register, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
