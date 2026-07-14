import { useState, useEffect, useCallback } from "react";
import { LoginScreen } from "../components/LoginScreen";
import { AdminDashboard } from "../components/AdminDashboard";
import { TutorDashboard } from "../components/TutorDashboard";

type Screen = "login" | "admin" | "tutor";
type UserType = "admin" | "tutor";
export type Theme = "light" | "dark";

interface UserData {
  id?: string;
  username: string;
  userType: UserType;
  isSuperAdmin?: boolean;
  name?: string;
  email?: string;
  phone?: string;
}

export default function App() {
  const [currentScreen, setCurrentScreen] = useState<Screen>("login");
  const [currentUser, setCurrentUser] = useState<UserData | null>(null);

  // ── Tema: persiste em localStorage, fallback para prefers-color-scheme ──────
  const [theme, setTheme] = useState<Theme>(() => {
    const stored = localStorage.getItem("petmonitor_theme");
    if (stored === "dark" || stored === "light") return stored;
    return window.matchMedia?.("(prefers-color-scheme: dark)")?.matches
      ? "dark"
      : "light";
  });

  // Aplica/remove classe `dark` no <html> para ativar o Tailwind dark variant
  useEffect(() => {
    if (theme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [theme]);

  const handleLogin = (userData: UserData) => {
    setCurrentUser(userData);
    setCurrentScreen(userData.userType);
  };

  const handleLogout = () => {
    localStorage.removeItem("petmonitor_token");
    setCurrentUser(null);
    setCurrentScreen("login");
  };

  const handleToggleTheme = useCallback(() => {
    setTheme((prev) => {
      const next = prev === "light" ? "dark" : "light";
      localStorage.setItem("petmonitor_theme", next);
      return next;
    });
  }, []);

  return (
    <div className="size-full">
      {currentScreen === "login" && (
        <LoginScreen
          onLogin={handleLogin}
          theme={theme}
          onToggleTheme={handleToggleTheme}
        />
      )}

      {currentScreen === "admin" && currentUser && (
        <AdminDashboard
          onLogout={handleLogout}
          username={currentUser.username}
          isSuperAdmin={currentUser.isSuperAdmin || false}
          theme={theme}
          onToggleTheme={handleToggleTheme}
        />
      )}

      {currentScreen === "tutor" && currentUser && (
        <TutorDashboard
          onLogout={handleLogout}
          userData={currentUser}
          theme={theme}
          onToggleTheme={handleToggleTheme}
        />
      )}
    </div>
  );
}