import React, { useState, useEffect } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Card } from "./ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Badge } from "./ui/badge";
import { Checkbox } from "./ui/checkbox";
import { RegistrationConfirmation } from "./RegistrationConfirmation";
import { DeleteConfirmDialog } from "./DeleteConfirmDialog";
import { EditTutorDialog } from "./EditTutorDialog";
import { EditPetDialog } from "./EditPetDialog";
import { AuditLogTable } from "./AuditLogTable";
import { Toaster } from "./ui/sonner";
import { toast } from "sonner";
import {
  LogOut, UserPlus, PawPrint, Key, Calendar, User,
  Video, Server, Copy, Loader2, Trash2, Users, Dog, Pencil,
  ShieldCheck, ClipboardList, Eye, EyeOff, Sun, Moon, Plus, X,
} from "lucide-react";
import { cn } from "./ui/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

interface CameraConfig { id: string; name: string; streamKey: string; status: string; playableUrl: string; }

interface AdminDashboardProps { onLogout: () => void; username: string; isSuperAdmin: boolean; theme: "light" | "dark"; onToggleTheme: () => void; }

interface Pet {
  id: string; name: string; species: string; breed: string; age: string;
  tutorName: string; tutor_id: string; services: string[]; check_in: string; check_out: string;
}

interface Tutor { id: string; name: string; email: string; phone: string; username?: string; password?: string; }

interface Admin { id: string; name: string; email: string; phone: string; is_super_admin: boolean; }

interface PetFormEntry {
  name: string; species: string; breed: string; age: string;
  services: string[]; checkIn: string; checkOut: string;
}

interface RegistrationData { tutor: Tutor & { username: string; password: string }; pets: (Pet & { checkIn: string; checkOut: string })[]; }

// ─── AdminDashboard ───────────────────────────────────────────────────────────

export function AdminDashboard({ onLogout, username, isSuperAdmin, theme, onToggleTheme }: AdminDashboardProps) {
  const [pets, setPets] = useState<Pet[]>([]);
  const [tutors, setTutors] = useState<Tutor[]>([]);
  const [loading, setLoading] = useState(true);

  // Registration form
  const [tutorName, setTutorName] = useState("");
  const [tutorEmail, setTutorEmail] = useState("");
  const [tutorPhone, setTutorPhone] = useState("");
  const [generatedPassword, setGeneratedPassword] = useState("");
  const [petEntries, setPetEntries] = useState<PetFormEntry[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [registrationData, setRegistrationData] = useState<RegistrationData | null>(null);

  // Edit/Delete tutor
  const [editTutor, setEditTutor] = useState<Tutor | null>(null);
  const [deleteTutorTarget, setDeleteTutorTarget] = useState<Tutor | null>(null);
  const [deletingTutor, setDeletingTutor] = useState(false);

  // Edit/Delete pet
  const [editPet, setEditPet] = useState<Pet | null>(null);
  const [deletePetTarget, setDeletePetTarget] = useState<Pet | null>(null);
  const [deletingPet, setDeletingPet] = useState(false);

  const services = ["Hospedagem", "Recreação", "Banho e Tosa"];

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("petmonitor_token");
      const headers = { "Content-Type": "application/json", Authorization: `Bearer ${token}` };
      const [tutorsRes, petsRes] = await Promise.all([
        fetch(`${import.meta.env.VITE_API_URL}/api/tutors`, { headers }),
        fetch(`${import.meta.env.VITE_API_URL}/api/pets`, { headers }),
      ]);
      if (tutorsRes.ok) { const d = await tutorsRes.json(); setTutors(d.tutors || []); }
      if (petsRes.ok) { const d = await petsRes.json(); setPets(d.pets || []); }
    } catch { toast.error("Erro ao carregar dados."); }
    finally { setLoading(false); }
  };

  const emptyPet = (): PetFormEntry => ({ name: "", species: "", breed: "", age: "", services: [], checkIn: "", checkOut: "" });

  const handleAddPet = () => setPetEntries((prev) => [...prev, emptyPet()]);
  const handleRemovePet = (index: number) => setPetEntries((prev) => prev.filter((_, i) => i !== index));

  const handlePetFieldChange = (index: number, field: keyof PetFormEntry, value: string) => {
    setPetEntries((prev) => prev.map((p, i) => i === index ? { ...p, [field]: value } : p));
  };

  const handlePetServiceToggle = (index: number, service: string) => {
    setPetEntries((prev) => prev.map((p, i) => {
      if (i !== index) return p;
      const has = p.services.includes(service);
      return { ...p, services: has ? p.services.filter((s) => s !== service) : [...p.services, service] };
    }));
  };

  const generateCredentials = () => {
    if (!tutorName.trim()) { toast.warning("Preencha o Nome do tutor primeiro."); return; }
    
    let currentLogin = tutorEmail.trim();
    if (!currentLogin) {
      const baseName = tutorName.trim().split(" ")[0].toLowerCase().replace(/[^a-z0-9]/g, "");
      const randomDigits = Math.floor(1000 + Math.random() * 9000); // 4 digits
      currentLogin = `${baseName}${randomDigits}`;
      setTutorEmail(currentLogin); // preenche o campo de e-mail/login
    }
    
    setGeneratedPassword("pet" + Math.floor(Math.random() * 10000));
  };

  const handleSubmitRegistration = async (e: React.FormEvent) => {
    e.preventDefault();
    const hasPets = petEntries.length > 0;
    
    // Validar pets
    if (hasPets) {
      for (const pet of petEntries) {
        if (!pet.name.trim() || !pet.checkIn) {
          toast.warning("Nome e Check-in são obrigatórios para os pets.");
          return;
        }
        if (pet.services.length === 0) {
          toast.warning(`Selecione pelo menos um serviço para o pet: ${pet.name}`);
          return;
        }
      }
    }

    let finalPassword = generatedPassword;
    let finalLogin = tutorEmail.trim();

    if (hasPets && !finalPassword) { 
      toast.warning("Gere as credenciais de acesso para o tutor (seção de pets)."); 
      return; 
    }
    
    if (!hasPets) {
      // Se não houver pets, gerar senha e login ocultos para satisfazer o banco
      finalPassword = "nopet_" + Math.random().toString(36).substring(2, 10);
      if (!finalLogin) finalLogin = "nopet_" + Math.random().toString(36).substring(2, 10);
    }

    setSubmitting(true);
    try {
      const token = localStorage.getItem("petmonitor_token");
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          tutor: { name: tutorName, email: finalLogin, phone: tutorPhone, password: finalPassword },
          pets: petEntries,
        }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(`Erro: ${data.error}`); return; }
      setTutors((prev) => [...prev, data.tutor]);
      if (data.pets?.length) setPets((prev) => [...prev, ...data.pets]);
      setRegistrationData({ 
        tutor: { ...data.tutor, username: finalLogin, password: finalPassword }, 
        pets: (data.pets || []).map((p: any) => ({...p, checkIn: p.checkIn || p.check_in, checkOut: p.checkOut || p.check_out})) 
      });
      setShowConfirmation(true);
      const msg = petEntries.length > 0 ? `Tutor e ${petEntries.length} pet(s) cadastrados!` : "Tutor cadastrado com sucesso!";
      toast.success(msg);
      setTutorName(""); setTutorEmail(""); setTutorPhone(""); setGeneratedPassword("");
      setPetEntries([]);
    } catch { toast.error("Erro de conexão."); }
    finally { setSubmitting(false); }
  };

  const handleDeleteTutor = async () => {
    if (!deleteTutorTarget) return;
    setDeletingTutor(true);
    try {
      const token = localStorage.getItem("petmonitor_token");
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/tutors/${deleteTutorTarget.id}`, {
        method: "DELETE", headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) { const d = await res.json(); toast.error(d.error || "Erro ao desativar."); return; }
      setTutors((prev) => prev.filter((t) => t.id !== deleteTutorTarget.id));
      setPets((prev) => prev.filter((p) => p.tutor_id !== deleteTutorTarget.id));
      toast.success(`Tutor "${deleteTutorTarget.name}" desativado.`);
      setDeleteTutorTarget(null);
    } catch { toast.error("Erro de conexão."); }
    finally { setDeletingTutor(false); }
  };

  const handleDeletePet = async () => {
    if (!deletePetTarget) return;
    setDeletingPet(true);
    try {
      const token = localStorage.getItem("petmonitor_token");
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/pets/${deletePetTarget.id}`, {
        method: "DELETE", headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) { const d = await res.json(); toast.error(d.error || "Erro ao desativar."); return; }
      setPets((prev) => prev.filter((p) => p.id !== deletePetTarget.id));
      toast.success(`Pet "${deletePetTarget.name}" desativado.`);
      setDeletePetTarget(null);
    } catch { toast.error("Erro de conexão."); }
    finally { setDeletingPet(false); }
  };

  const formatDate = (d: string) => {
    if (!d) return "—";
    const dt = new Date(d);
    return isNaN(dt.getTime()) ? "—" : dt.toLocaleDateString("pt-BR");
  };

  const tabCount = isSuperAdmin ? 5 : 4;
  const gridClass = tabCount === 5 ? "grid-cols-5" : "grid-cols-4";

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-teal-50 via-cyan-50 to-emerald-50 dark:from-slate-950 dark:via-teal-950 dark:to-slate-900">
      <Toaster richColors position="top-right" />

      <header className="bg-white shadow-sm border-b dark:bg-slate-900/90 dark:border-slate-700/50 dark:shadow-slate-900">
        <div className="max-w-7xl mx-auto px-4 py-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10">
              <img src="/logo.png" alt="Pet La Belle Logo" className="w-full h-full object-contain" />
            </div>
            <div>
              <h1 className="text-xl font-bold">Pet La Belle</h1>
              <p className="text-xs text-muted-foreground">Painel Administrativo{isSuperAdmin && " · Super Admin"}</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <p className="text-sm font-medium">{username}</p>
            {/* ── Theme Toggle ── */}
            <button
              id="theme-toggle"
              onClick={onToggleTheme}
              className="relative w-9 h-9 flex items-center justify-center rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition-colors duration-200"
              title={theme === "dark" ? "Mudar para modo claro" : "Mudar para modo escuro"}
              aria-label="Alternar tema"
            >
              <Sun className={cn(
                "w-4 h-4 absolute text-amber-500 transition-all duration-500",
                theme === "dark" ? "scale-100 rotate-0 opacity-100" : "scale-0 rotate-90 opacity-0"
              )} />
              <Moon className={cn(
                "w-4 h-4 absolute text-indigo-400 transition-all duration-500",
                theme === "light" ? "scale-100 rotate-0 opacity-100" : "scale-0 -rotate-90 opacity-0"
              )} />
            </button>
            <Button variant="outline" onClick={onLogout} size="sm">
              <LogOut className="w-4 h-4 mr-2" /> Sair
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-4 sm:p-6">
        <Tabs defaultValue="cadastro" className="space-y-6">
          <TabsList className={cn("grid w-full", gridClass, "max-w-2xl")}>
            <TabsTrigger value="cadastro">Cadastro</TabsTrigger>
            <TabsTrigger value="list">Listagem</TabsTrigger>
            <TabsTrigger value="rtmp">Câmeras</TabsTrigger>
            <TabsTrigger value="logs"><ClipboardList className="w-3 h-3 mr-1" />Logs</TabsTrigger>
            {isSuperAdmin && (
              <TabsTrigger value="admins"><ShieldCheck className="w-3 h-3 mr-1" />Admins</TabsTrigger>
            )}
          </TabsList>

          {/* ── Cadastro ──────────────────────────────────────────────────────── */}
          <TabsContent value="cadastro">
            <Card className="p-6">
              <h2 className="text-lg font-semibold mb-6 flex items-center gap-2">
                <UserPlus className="w-5 h-5" /> Cadastrar Tutor
              </h2>
              <form onSubmit={handleSubmitRegistration} className="space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <h3 className="font-medium flex items-center gap-2 border-b pb-2">
                      <User className="w-4 h-4 text-primary" /> Dados do Tutor
                    </h3>
                    <div className="space-y-2"><Label>Nome</Label><Input value={tutorName} onChange={(e) => setTutorName(e.target.value)} required /></div>
                    <div className="space-y-2"><Label>E-mail / Login</Label><Input type="text" value={tutorEmail} onChange={(e) => setTutorEmail(e.target.value)} placeholder="Deixe em branco para gerar" /></div>
                    <div className="space-y-2"><Label>Telefone</Label><Input value={tutorPhone} onChange={(e) => setTutorPhone(e.target.value)} /></div>

                  </div>

                </div>

                {/* ── Seção Pets (dinâmica) ── */}
                <div className="space-y-4 mt-2">
                  <div className="flex items-center justify-between border-b pb-2">
                    <h3 className="font-medium flex items-center gap-2">
                      <PawPrint className="w-4 h-4 text-primary" /> Pets
                      <Badge variant="secondary" className="ml-1 text-xs">{petEntries.length}</Badge>
                    </h3>
                    <Button type="button" variant="outline" size="sm" onClick={handleAddPet}>
                      <Plus className="w-3.5 h-3.5 mr-1" /> Adicionar Pet
                    </Button>
                  </div>

                  {petEntries.length === 0 && (
                    <div className="text-center py-6 text-muted-foreground border border-dashed rounded-lg">
                      <PawPrint className="w-8 h-8 mx-auto mb-2 opacity-30" />
                      <p className="text-sm">Nenhum pet adicionado. Clique em "Adicionar Pet" acima.</p>
                      <p className="text-xs mt-1 opacity-60">O cadastro do tutor pode ser feito sem pets.</p>
                    </div>
                  )}

                  {petEntries.map((pet, idx) => (
                    <div key={idx} className="border rounded-lg p-4 space-y-3 bg-muted/20 relative group">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-semibold text-primary">Pet {idx + 1}</p>
                        <Button type="button" variant="ghost" size="icon" className="h-7 w-7 text-red-500 hover:text-red-700 opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => handleRemovePet(idx)} title="Remover pet">
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2"><Label>Nome do Pet</Label><Input value={pet.name} onChange={(e) => handlePetFieldChange(idx, "name", e.target.value)} required /></div>
                        <div className="space-y-2"><Label>Espécie</Label><Input value={pet.species} onChange={(e) => handlePetFieldChange(idx, "species", e.target.value)} placeholder="Cão, Gato..." required /></div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2"><Label>Raça</Label><Input value={pet.breed} onChange={(e) => handlePetFieldChange(idx, "breed", e.target.value)} /></div>
                        <div className="space-y-2"><Label>Idade</Label><Input value={pet.age} onChange={(e) => handlePetFieldChange(idx, "age", e.target.value)} placeholder="Ex: 3 anos" /></div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2"><Label>Check-in</Label><Input type="date" value={pet.checkIn} onChange={(e) => handlePetFieldChange(idx, "checkIn", e.target.value)} required /></div>
                        <div className="space-y-2"><Label>Check-out</Label><Input type="date" value={pet.checkOut} onChange={(e) => handlePetFieldChange(idx, "checkOut", e.target.value)} required /></div>
                      </div>
                      <div className="space-y-2 pt-1">
                        <Label>Serviços Contratados</Label>
                        <div className="flex gap-4">
                          {services.map((s) => (
                            <div key={s} className="flex items-center gap-2">
                              <Checkbox id={`${s}-${idx}`} checked={pet.services.includes(s)} onCheckedChange={() => handlePetServiceToggle(idx, s)} />
                              <label htmlFor={`${s}-${idx}`} className="text-sm cursor-pointer">{s}</label>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}

                  {petEntries.length > 0 && (
                    <div className="bg-blue-50 p-4 rounded-lg space-y-3 dark:bg-indigo-950/50 mt-4 border border-blue-100 dark:border-indigo-900/40">
                      <div className="flex justify-between items-center">
                        <Label className="text-xs font-bold uppercase text-blue-800 dark:text-blue-300 flex items-center gap-2">
                          <Key className="w-4 h-4" /> Acesso ao Sistema (Tutor)
                        </Label>
                        <Button type="button" variant="outline" size="sm" onClick={generateCredentials} className="border-blue-300 dark:border-indigo-700 hover:bg-blue-100 dark:hover:bg-indigo-900">
                          Gerar Credenciais
                        </Button>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1">
                          <Label className="text-xs text-muted-foreground">Login (e-mail)</Label>
                          <Input value={tutorEmail || "—"} readOnly className="h-8 text-xs bg-white dark:bg-slate-800" />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs text-muted-foreground">Senha gerada</Label>
                          <Input value={generatedPassword} placeholder="Clique em Gerar" readOnly className="h-8 text-xs bg-white dark:bg-slate-800" />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
                <Button type="submit" className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white" disabled={submitting}>
                  {submitting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Cadastrando...</> : "Finalizar Cadastro"}
                </Button>
              </form>
            </Card>
          </TabsContent>

          {/* ── Listagem ──────────────────────────────────────────────────────── */}
          <TabsContent value="list">
            <Card className="p-6">
              <div className="flex items-center mb-6">
                <h2 className="text-lg font-semibold flex items-center gap-2">
                  <Users className="w-5 h-5" /> Hospedagens Ativas
                </h2>
                <Badge variant="secondary" className="ml-auto">{tutors.length} tutor(es)</Badge>
              </div>

              {loading ? (
                <div className="flex items-center justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-muted-foreground" /></div>
              ) : tutors.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-3">
                  <Dog className="w-12 h-12 opacity-30" />
                  <p className="text-sm">Nenhum tutor cadastrado.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {tutors.map((t) => (
                    <div key={t.id} className="border rounded-lg p-4 bg-white shadow-sm dark:bg-slate-800/50 dark:border-slate-700/50">
                      <div className="flex justify-between items-start border-b pb-2 mb-3">
                        <div>
                          <p className="font-bold text-primary">{t.name}</p>
                          <p className="text-xs text-muted-foreground">{t.email} · {t.phone}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">Tutor</Badge>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-blue-500 hover:text-blue-700" onClick={() => setEditTutor(t)} title="Editar tutor">
                            <Pencil className="w-3.5 h-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-red-500 hover:text-red-700" onClick={() => setDeleteTutorTarget(t)} title="Desativar tutor">
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </div>

                      <div className="space-y-2">
                        {pets.filter((p) => p.tutor_id === t.id).length === 0 ? (
                          <p className="text-xs text-muted-foreground italic">Nenhum pet associado.</p>
                        ) : (
                          pets.filter((p) => p.tutor_id === t.id).map((p) => (
                            <div key={p.id} className="flex items-center justify-between text-sm bg-muted/30 p-2 rounded">
                              <div className="flex items-center gap-2 min-w-0">
                                <PawPrint className="w-3 h-3 text-muted-foreground shrink-0" />
                                <span className="truncate"><strong>{p.name}</strong> ({p.breed})</span>
                                {p.check_in && (
                                  <span className="text-xs text-muted-foreground flex items-center gap-1 shrink-0">
                                    <Calendar className="w-3 h-3" />{formatDate(p.check_in)} → {formatDate(p.check_out)}
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-1 ml-2 shrink-0">
                                {p.services?.map((s) => <Badge key={s} className="text-[10px] h-4">{s}</Badge>)}
                                <Button variant="ghost" size="icon" className="h-6 w-6 text-blue-500 hover:text-blue-700" onClick={() => setEditPet(p)} title="Editar pet">
                                  <Pencil className="w-3 h-3" />
                                </Button>
                                <Button variant="ghost" size="icon" className="h-6 w-6 text-red-500 hover:text-red-700" onClick={() => setDeletePetTarget(p)} title="Desativar pet">
                                  <Trash2 className="w-3 h-3" />
                                </Button>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </TabsContent>

          {/* ── Câmeras ───────────────────────────────────────────────────────── */}
          <TabsContent value="rtmp">
            <RTMPConfigPanel />
          </TabsContent>

          {/* ── Logs ──────────────────────────────────────────────────────────── */}
          <TabsContent value="logs">
            <Card className="p-6">
              <h2 className="text-lg font-semibold mb-6 flex items-center gap-2">
                <ClipboardList className="w-5 h-5" /> Logs de Auditoria
              </h2>
              <AuditLogTable />
            </Card>
          </TabsContent>

          {/* ── Admins (super admin) ──────────────────────────────────────────── */}
          {isSuperAdmin && (
            <TabsContent value="admins">
              <AdminsPanel />
            </TabsContent>
          )}
        </Tabs>
      </main>

      <RegistrationConfirmation open={showConfirmation} onOpenChange={setShowConfirmation} data={registrationData} />

      <EditTutorDialog
        open={!!editTutor} onOpenChange={(o) => { if (!o) setEditTutor(null); }}
        tutor={editTutor}
        onSaved={(updated) => setTutors((prev) => prev.map((t) => (t.id === updated.id ? { ...t, ...updated } : t)))}
      />

      <EditPetDialog
        open={!!editPet} onOpenChange={(o) => { if (!o) setEditPet(null); }}
        pet={editPet}
        onSaved={(updated) => setPets((prev) => prev.map((p) => (p.id === updated.id ? { ...p, ...updated } : p)))}
      />

      <DeleteConfirmDialog
        open={!!deleteTutorTarget}
        onOpenChange={(o) => { if (!o) setDeleteTutorTarget(null); }}
        title={`Desativar tutor "${deleteTutorTarget?.name}"?`}
        description="O tutor e todos os seus pets serão marcados como inativos e não aparecerão mais no sistema. Essa ação pode ser revertida manualmente no banco de dados."
        loading={deletingTutor}
        onConfirm={handleDeleteTutor}
      />

      <DeleteConfirmDialog
        open={!!deletePetTarget}
        onOpenChange={(o) => { if (!o) setDeletePetTarget(null); }}
        title={`Desativar pet "${deletePetTarget?.name}"?`}
        description="O pet será marcado como inativo e não aparecerá mais no sistema."
        loading={deletingPet}
        onConfirm={handleDeletePet}
      />
    </div>
  );
}

// ─── AdminsPanel ──────────────────────────────────────────────────────────────

function AdminsPanel() {
  const [admins, setAdmins] = useState<Admin[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [editTarget, setEditTarget] = useState<Admin | null>(null);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [showPwd, setShowPwd] = useState(false);

  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editPassword, setEditPassword] = useState("");
  const [showEditPwd, setShowEditPwd] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);

  const headers = () => {
    const token = localStorage.getItem("petmonitor_token");
    return { "Content-Type": "application/json", Authorization: `Bearer ${token}` };
  };

  useEffect(() => { loadAdmins(); }, []);

  const loadAdmins = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/admins`, { headers: headers() });
      if (res.ok) { const d = await res.json(); setAdmins(d.admins || []); }
    } finally { setLoading(false); }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/admins`, {
        method: "POST", headers: headers(), body: JSON.stringify({ name, email, phone, password }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error || "Erro ao criar admin."); return; }
      setAdmins((prev) => [...prev, data.admin]);
      toast.success(`Admin "${name}" criado!`);
      setName(""); setEmail(""); setPhone(""); setPassword("");
    } catch { toast.error("Erro de conexão."); }
    finally { setSubmitting(false); }
  };

  const openEdit = (a: Admin) => {
    setEditTarget(a); setEditName(a.name); setEditEmail(a.email);
    setEditPhone(a.phone || ""); setEditPassword("");
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editTarget) return;
    setSavingEdit(true);
    try {
      const body: Record<string, string> = { name: editName, email: editEmail, phone: editPhone };
      if (editPassword.trim()) body.password = editPassword;
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/admins/${editTarget.id}`, {
        method: "PUT", headers: headers(), body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error || "Erro ao atualizar admin."); return; }
      setAdmins((prev) => prev.map((a) => (a.id === editTarget.id ? { ...a, ...data.admin } : a)));
      toast.success("Admin atualizado!");
      setEditTarget(null);
    } catch { toast.error("Erro de conexão."); }
    finally { setSavingEdit(false); }
  };

  const handleDelete = async (admin: Admin) => {
    setDeletingId(admin.id);
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/admins/${admin.id}`, {
        method: "DELETE", headers: headers(),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error || "Erro ao desativar."); return; }
      setAdmins((prev) => prev.filter((a) => a.id !== admin.id));
      toast.success(`Admin "${admin.name}" desativado.`);
    } catch { toast.error("Erro de conexão."); }
    finally { setDeletingId(null); }
  };

  return (
    <div className="space-y-6">
      {/* Criar novo admin */}
      <Card className="p-6">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <UserPlus className="w-5 h-5" /> Novo Administrador
        </h2>
        <form onSubmit={handleCreate} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1"><Label htmlFor="admin-name">Nome</Label><Input id="admin-name" value={name} onChange={(e) => setName(e.target.value)} required /></div>
          <div className="space-y-1"><Label htmlFor="admin-email">E-mail</Label><Input id="admin-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required /></div>
          <div className="space-y-1"><Label htmlFor="admin-phone">Telefone</Label><Input id="admin-phone" value={phone} onChange={(e) => setPhone(e.target.value)} /></div>
          <div className="space-y-1">
            <Label htmlFor="admin-password">Senha</Label>
            <div className="relative">
              <Input id="admin-password" type={showPwd ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} required className="pr-10" />
              <button type="button" onClick={() => setShowPwd((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" tabIndex={-1}>
                {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
          <div className="sm:col-span-2">
            <Button type="submit" className="bg-gradient-to-r from-blue-500 to-purple-600 text-white" disabled={submitting}>
              {submitting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Criando...</> : "Criar Admin"}
            </Button>
          </div>
        </form>
      </Card>

      {/* Lista de admins */}
      <Card className="p-6">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <ShieldCheck className="w-5 h-5" /> Administradores Ativos
          <Badge variant="secondary" className="ml-auto">{admins.length}</Badge>
        </h2>

        {loading ? (
          <div className="flex justify-center py-8"><Loader2 className="w-8 h-8 animate-spin text-muted-foreground" /></div>
        ) : admins.length === 0 ? (
          <p className="text-center text-sm text-muted-foreground py-8">Nenhum admin cadastrado.</p>
        ) : editTarget ? (
          /* Formulário de edição inline */
          <form onSubmit={handleEdit} className="space-y-4">
            <p className="text-sm font-medium text-muted-foreground">Editando: <strong>{editTarget.name}</strong></p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1"><Label>Nome</Label><Input value={editName} onChange={(e) => setEditName(e.target.value)} required /></div>
              <div className="space-y-1"><Label>E-mail</Label><Input type="email" value={editEmail} onChange={(e) => setEditEmail(e.target.value)} required /></div>
              <div className="space-y-1"><Label>Telefone</Label><Input value={editPhone} onChange={(e) => setEditPhone(e.target.value)} /></div>
              <div className="space-y-1">
                <Label>Nova senha <span className="text-xs text-muted-foreground">(opcional)</span></Label>
                <div className="relative">
                  <Input type={showEditPwd ? "text" : "password"} value={editPassword} onChange={(e) => setEditPassword(e.target.value)} placeholder="Deixe vazio para manter" className="pr-10" />
                  <button type="button" onClick={() => setShowEditPwd((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" tabIndex={-1}>
                    {showEditPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              <Button type="submit" disabled={savingEdit}>{savingEdit ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Salvando...</> : "Salvar"}</Button>
              <Button type="button" variant="outline" onClick={() => setEditTarget(null)}>Cancelar</Button>
            </div>
          </form>
        ) : (
          <div className="space-y-2">
            {admins.map((a) => (
              <div key={a.id} className="border rounded-lg p-3 flex items-center gap-3 bg-white dark:bg-slate-800/50 dark:border-slate-700/50">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
                  {a.name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{a.name}</p>
                  <p className="text-xs text-muted-foreground truncate">{a.email}</p>
                </div>
                {a.is_super_admin && <Badge className="text-[10px] bg-purple-100 text-purple-700 border-purple-200 shrink-0 dark:bg-purple-900/40 dark:text-purple-300 dark:border-purple-700/40">Super Admin</Badge>}
                <div className="flex gap-1 shrink-0">
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-blue-500 hover:text-blue-700" onClick={() => openEdit(a)}>
                    <Pencil className="w-3.5 h-3.5" />
                  </Button>
                  <Button
                    variant="ghost" size="icon" className="h-7 w-7 text-red-500 hover:text-red-700"
                    onClick={() => handleDelete(a)} disabled={deletingId === a.id}
                  >
                    {deletingId === a.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

// ─── RTMPConfigPanel ──────────────────────────────────────────────────────────

function RTMPConfigPanel() {
  const [rtmpServer, setRtmpServer] = useState("");
  const [cameras, setCameras] = useState<CameraConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => { loadRTMP(); }, []);

  const loadRTMP = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("petmonitor_token");
      const headers = { Authorization: `Bearer ${token}` };
      const [srvRes, camRes] = await Promise.all([
        fetch(`${import.meta.env.VITE_API_URL}/api/rtmp/config`, { headers }),
        fetch(`${import.meta.env.VITE_API_URL}/api/rtmp/cameras`, { headers }),
      ]);
      if (srvRes.ok) { const d = await srvRes.json(); setRtmpServer(d.config?.serverUrl || ""); }
      if (camRes.ok) { const d = await camRes.json(); setCameras(d.cameras || []); }
    } catch { toast.error("Erro ao carregar configurações RTMP."); }
    finally { setLoading(false); }
  };

  const addCamera = () => {
    const id = `cam${Math.floor(Math.random() * 1000)}`;
    setCameras([...cameras, { id, name: "Nova Câmera", streamKey: "chave", status: "inativo", playableUrl: "" }]);
  };

  const removeCamera = (id: string) => setCameras(cameras.filter((c) => c.id !== id));
  const updateCamera = (id: string, field: keyof CameraConfig, val: string) =>
    setCameras(cameras.map((c) => (c.id === id ? { ...c, [field]: val } : c)));

  const copyToClipboard = async (text: string, label: string) => {
    try { await navigator.clipboard.writeText(text); toast.success(`${label} copiado!`); }
    catch { toast.error("Não foi possível copiar."); }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const token = localStorage.getItem("petmonitor_token");
      const headers = { "Content-Type": "application/json", Authorization: `Bearer ${token}` };
      await fetch(`${import.meta.env.VITE_API_URL}/api/rtmp/config`, {
        method: "PUT", headers, body: JSON.stringify({ serverUrl: rtmpServer }),
      });
      await Promise.all(cameras.map((c) =>
        fetch(`${import.meta.env.VITE_API_URL}/api/rtmp/cameras/${c.id}`, {
          method: "PUT", headers, body: JSON.stringify(c),
        })
      ));
      toast.success("Configurações salvas!");
    } catch { toast.error("Erro ao salvar."); }
    finally { setSaving(false); }
  };

  if (loading) return <div className="flex items-center justify-center p-16"><Loader2 className="animate-spin w-8 h-8 text-muted-foreground" /></div>;

  return (
    <Card className="p-6 space-y-6">
      <div className="space-y-4">
        <h3 className="font-bold flex items-center gap-2"><Server className="w-5 h-5" /> Configuração do Servidor RTMP</h3>
        <div className="flex gap-2">
          <Input value={rtmpServer} onChange={(e) => setRtmpServer(e.target.value)} placeholder="rtmp://seu-ip/live" className="font-mono text-sm" />
          <Button variant="outline" size="sm" onClick={() => copyToClipboard(rtmpServer, "URL do servidor")}><Copy className="w-4 h-4" /></Button>
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex justify-between items-center border-b pb-2">
          <h3 className="font-bold flex items-center gap-2"><Video className="w-5 h-5" /> Câmeras</h3>
          <Button size="sm" onClick={addCamera}><UserPlus className="w-4 h-4 mr-2" /> Adicionar</Button>
        </div>
        <div className="grid grid-cols-1 gap-4">
          {cameras.length === 0 && <div className="text-center py-8 text-muted-foreground text-sm">Nenhuma câmera configurada.</div>}
          {cameras.map((c) => (
            <div key={c.id} className="border rounded-lg p-4 bg-muted/20 relative group">
              <button onClick={() => removeCamera(c.id)} className="absolute top-2 right-2 text-red-500 opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-red-50 rounded">
                <Trash2 className="w-4 h-4" />
              </button>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div className="space-y-1">
                  <Label className="text-[10px] uppercase font-bold">Nome do Serviço</Label>
                  <Input value={c.name} onChange={(e) => updateCamera(c.id, "name", e.target.value)} className="h-8 bg-white dark:bg-slate-800" />
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px] uppercase font-bold">Status</Label>
                  <div className="flex items-center pt-1">
                    <Badge variant={c.status === "ativo" ? "default" : "secondary"} className={cn(c.status === "ativo" && "bg-green-500")}>
                      {c.status === "ativo" ? "● Ativo" : "○ Inativo"}
                    </Badge>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div className="space-y-1">
                  <Label className="text-[10px] uppercase font-bold">ID do Stream</Label>
                  <Input value={c.id} readOnly className="h-8 bg-gray-100 font-mono text-xs dark:bg-slate-700" />
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px] uppercase font-bold">Chave de Acesso (?key=)</Label>
                  <Input value={c.streamKey} onChange={(e) => updateCamera(c.id, "streamKey", e.target.value)} className="h-8 bg-white font-mono text-xs dark:bg-slate-800" />
                </div>
              </div>
              <div className="space-y-1 mb-4">
                <Label className="text-[10px] uppercase font-bold">URL de Visualização HLS (.m3u8)</Label>
                <Input value={c.playableUrl} onChange={(e) => updateCamera(c.id, "playableUrl", e.target.value)} placeholder="http://ip:8080/live/id.m3u8" className="h-8 bg-white font-mono text-xs dark:bg-slate-800" />
              </div>
              <div className="bg-blue-50 border border-blue-100 p-2 rounded text-[10px] font-mono break-all flex items-center justify-between gap-2 dark:bg-indigo-950/50 dark:border-indigo-800/30">
                <span><strong>LINK DVR:</strong> {rtmpServer}/{c.id}?key={c.streamKey}</span>
                <button onClick={() => copyToClipboard(`${rtmpServer}/${c.id}?key=${c.streamKey}`, "Link do DVR")} className="shrink-0 text-blue-600 hover:text-blue-800">
                  <Copy className="w-3 h-3" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <Button className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white" onClick={handleSave} disabled={saving}>
        {saving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Salvando...</> : "Salvar Configurações"}
      </Button>
    </Card>
  );
}
