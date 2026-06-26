import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "./ui/dialog";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Loader2, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";

interface Tutor {
  id: string;
  name: string;
  email: string;
  phone: string;
}

interface EditTutorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tutor: Tutor | null;
  onSaved: (updated: Tutor) => void;
}

export function EditTutorDialog({ open, onOpenChange, tutor, onSaved }: EditTutorDialogProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (tutor) {
      setName(tutor.name);
      setEmail(tutor.email);
      setPhone(tutor.phone || "");
      setPassword("");
    }
  }, [tutor]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tutor) return;
    setSaving(true);
    try {
      const token = localStorage.getItem("petmonitor_token");
      const body: Record<string, string> = { name, email, phone };
      if (password.trim()) body.password = password;

      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/tutors/${tutor.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error || "Erro ao atualizar tutor."); return; }

      toast.success("Tutor atualizado com sucesso!");
      onSaved(data.tutor);
      onOpenChange(false);
    } catch {
      toast.error("Erro de conexão.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Editar Tutor</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          <div className="space-y-1">
            <Label htmlFor="edit-tutor-name">Nome</Label>
            <Input id="edit-tutor-name" value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div className="space-y-1">
            <Label htmlFor="edit-tutor-email">E-mail</Label>
            <Input id="edit-tutor-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <div className="space-y-1">
            <Label htmlFor="edit-tutor-phone">Telefone</Label>
            <Input id="edit-tutor-phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="edit-tutor-password">Nova senha <span className="text-muted-foreground text-xs">(deixe em branco para manter)</span></Label>
            <div className="relative">
              <Input
                id="edit-tutor-password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Nova senha (opcional)"
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                tabIndex={-1}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
              Cancelar
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Salvando...</> : "Salvar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
