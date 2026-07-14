import { useState } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Card } from "./ui/card";
import { cn } from "./ui/utils";
import { PawPrint, AlertCircle, Loader2, Sun, Moon } from "lucide-react";

interface UserData {
  id?: string;
  username: string;
  userType: "admin" | "tutor";
  isSuperAdmin?: boolean;
  name?: string;
  email?: string;
  phone?: string;
}

interface LoginScreenProps {
  onLogin: (userData: UserData) => void;
  theme: "light" | "dark";
  onToggleTheme: () => void;
}

export function LoginScreen({ onLogin, theme, onToggleTheme }: LoginScreenProps) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [userType, setUserType] = useState<"admin" | "tutor">("tutor");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!username || !password) {
      setError("Por favor, preencha todos os campos");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password, userType }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Credenciais inválidas');
        setLoading(false);
        return;
      }

      if (data.success && data.user) {
        if (data.token) {
          localStorage.setItem('petmonitor_token', data.token);
        }
        onLogin(data.user);
      } else {
        setError('Erro ao iniciar sessão');
      }
    } catch (err) {
      console.error('Login error:', err);
      setError('Erro de ligação ao servidor local');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 flex items-center justify-center p-4 dark:from-slate-950 dark:via-indigo-950 dark:to-slate-900 relative">
      {/* ── Theme Toggle — flutuante canto superior direito ── */}
      <button
        id="theme-toggle-login"
        onClick={onToggleTheme}
        className="absolute top-4 right-4 relative w-10 h-10 flex items-center justify-center rounded-full bg-white/70 backdrop-blur-sm shadow-md hover:bg-white dark:bg-slate-800/70 dark:hover:bg-slate-700 transition-all duration-200 border border-white/40 dark:border-white/10"
        title={theme === "dark" ? "Mudar para modo claro" : "Mudar para modo escuro"}
        aria-label="Alternar tema"
      >
        <Sun className={cn(
          "w-4 h-4 absolute text-amber-500 transition-all duration-500",
          theme === "dark" ? "scale-100 rotate-0 opacity-100" : "scale-0 rotate-90 opacity-0"
        )} />
        <Moon className={cn(
          "w-4 h-4 absolute text-indigo-500 transition-all duration-500",
          theme === "light" ? "scale-100 rotate-0 opacity-100" : "scale-0 -rotate-90 opacity-0"
        )} />
      </button>
      <Card className="w-full max-w-md p-8 shadow-xl">
        <div className="flex flex-col items-center mb-8">
          <div className="bg-gradient-to-br from-blue-500 to-purple-600 p-4 rounded-full mb-4">
            <PawPrint className="w-12 h-12 text-white" />
          </div>
          <h1 className="text-center text-primary">Hotel Pet Paradise</h1>
          <p className="text-muted-foreground text-center">
            Bem-vindo ao sistema de acompanhamento
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="flex gap-2 p-1 bg-muted rounded-lg mb-6">
            <button
              type="button"
              onClick={() => setUserType("tutor")}
              className={cn(
                "flex-1 py-2 px-4 rounded-md transition-all text-sm font-medium",
                userType === "tutor"
                  ? "bg-white shadow-sm text-foreground dark:bg-slate-700 dark:shadow-none"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              Tutor
            </button>
            <button
              type="button"
              onClick={() => setUserType("admin")}
              className={cn(
                "flex-1 py-2 px-4 rounded-md transition-all text-sm font-medium",
                userType === "admin"
                  ? "bg-white shadow-sm text-foreground dark:bg-slate-700 dark:shadow-none"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              Gerência
            </button>
          </div>

          <div className="space-y-2">
            <Label htmlFor="username">Utilizador / E-mail</Label>
            <Input
              id="username"
              type="text"
              placeholder={userType === "admin" ? "admin@pethotel.com" : "seu@email.com"}
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Palavra-passe</Label>
            <Input
              id="password"
              type="password"
              placeholder="Digite a sua palavra-passe"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <Button type="submit" className="w-full bg-gradient-to-r from-blue-500 to-purple-600">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Entrar"}
          </Button>
        </form>

        {error && (
          <div className="mt-4 flex items-center gap-2 text-red-500 text-sm justify-center">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <p>{error}</p>
          </div>
        )}

        <div className="mt-6 text-center">
          <p className="text-muted-foreground text-sm">
            Esqueceu a sua palavra-passe? Entre em contacto com a administração.
          </p>
        </div>
      </Card>
    </div>
  );
}