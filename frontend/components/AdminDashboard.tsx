import React, { useState, useEffect } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Card } from "./ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Badge } from "./ui/badge";
import { Checkbox } from "./ui/checkbox";
import { RegistrationConfirmation } from "./RegistrationConfirmation";
import { Toaster } from "./ui/sonner";
import { toast } from "sonner";
import { 
  LogOut, 
  UserPlus, 
  PawPrint, 
  Key, 
  Calendar,
  User,
  Phone,
  Video,
  Server,
  Copy,
  Loader2,
  Trash2,
  Users,
  Dog
} from "lucide-react";
import { cn } from "./ui/utils";

interface CameraConfig {
  id: string;
  name: string;
  streamKey: string;
  status: string;
  playableUrl: string; 
}

interface AdminDashboardProps {
  onLogout: () => void;
  username: string;
}

interface Pet {
  id: string;
  name: string;
  species: string;
  breed: string;
  age: string;
  tutorName: string;
  tutorId: string;
  services: string[];
  checkIn: string;
  checkOut: string;
}

interface Tutor {
  id: string;
  name: string;
  email: string;
  phone: string;
  username: string;
  password: string;
}

interface RegistrationData {
  tutor: Tutor;
  pet: Pet;
}

export function AdminDashboard({ onLogout, username }: AdminDashboardProps) {
  const [pets, setPets] = useState<Pet[]>([]);
  const [tutors, setTutors] = useState<Tutor[]>([]);
  const [loading, setLoading] = useState(true);

  // Form states
  const [tutorName, setTutorName] = useState("");
  const [tutorEmail, setTutorEmail] = useState("");
  const [tutorPhone, setTutorPhone] = useState("");
  const [generatedUsername, setGeneratedUsername] = useState("");
  const [generatedPassword, setGeneratedPassword] = useState("");
  
  const [petName, setPetName] = useState("");
  const [petSpecies, setPetSpecies] = useState("");
  const [petBreed, setPetBreed] = useState("");
  const [petAge, setPetAge] = useState("");
  const [checkInDate, setCheckInDate] = useState("");
  const [checkOutDate, setCheckOutDate] = useState("");
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  // Confirmation dialog
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [registrationData, setRegistrationData] = useState<RegistrationData | null>(null);

  const services = ["Hospedagem", "Recreação", "Banho e Tosa"];

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('petmonitor_token');
      const headers = {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
      };

      const [tutorsResponse, petsResponse] = await Promise.all([
        fetch(`${import.meta.env.VITE_API_URL}/api/tutors`, { headers }),
        fetch(`${import.meta.env.VITE_API_URL}/api/pets`, { headers }),
      ]);

      if (tutorsResponse.ok) {
        const tutorsData = await tutorsResponse.json();
        setTutors(tutorsData.tutors || []);
      }
      if (petsResponse.ok) {
        const petsData = await petsResponse.json();
        setPets(petsData.pets || []);
      }
    } catch (err) {
      console.error('Error loading data:', err);
      toast.error('Erro ao carregar dados. Verifique a conexão com o servidor.');
    } finally {
      setLoading(false);
    }
  };

  const handleServiceToggle = (service: string) => {
    setSelectedServices((prev) =>
      prev.includes(service)
        ? prev.filter((s) => s !== service)
        : [...prev, service]
    );
  };

  const generateCredentials = () => {
    if (!tutorName.trim()) {
      toast.warning('Preencha o nome do tutor antes de gerar as credenciais.');
      return;
    }
    const uname = tutorName.toLowerCase().replace(/\s+/g, ".");
    const password = "pet" + Math.floor(Math.random() * 10000);
    setGeneratedUsername(uname);
    setGeneratedPassword(password);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!generatedUsername || !generatedPassword) {
      toast.warning("Por favor, gere as credenciais de acesso antes de cadastrar.");
      return;
    }
    setSubmitting(true);
    try {
      const token = localStorage.getItem('petmonitor_token');
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/register`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { 'Authorization': `Bearer ${token}` } : {})
          },
          body: JSON.stringify({
            tutor: {
              name: tutorName,
              email: tutorEmail,
              phone: tutorPhone,
              username: generatedUsername,
              password: generatedPassword,
            },
            pet: {
              name: petName,
              species: petSpecies,
              breed: petBreed,
              age: petAge,
              services: selectedServices,
              checkIn: checkInDate,
              checkOut: checkOutDate,
            },
          }),
        }
      );

      const data = await response.json();
      if (!response.ok) {
        toast.error(`Erro ao cadastrar: ${data.error}`);
        return;
      }

      setTutors([...tutors, data.tutor]);
      setPets([...pets, data.pet]);
      setRegistrationData({ tutor: data.tutor, pet: data.pet });
      setShowConfirmation(true);
      toast.success('Tutor e pet cadastrados com sucesso!');

      // Reset
      setTutorName(""); setTutorEmail(""); setTutorPhone("");
      setGeneratedUsername(""); setGeneratedPassword("");
      setPetName(""); setPetSpecies(""); setPetBreed(""); setPetAge("");
      setCheckInDate(""); setCheckOutDate(""); setSelectedServices([]);
    } catch (error) {
      console.error('Registration error:', error);
      toast.error('Erro de conexão ao cadastrar. Tente novamente.');
    } finally {
      setSubmitting(false);
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return "—";
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return "—";
    return date.toLocaleDateString('pt-BR');
  };

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50">
      <Toaster richColors position="top-right" />
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-br from-blue-500 to-purple-600 p-2 rounded-lg">
              <PawPrint className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold">Hotel Pet Paradise</h1>
              <p className="text-xs text-muted-foreground">Painel Administrativo</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-sm font-medium">{username}</p>
            </div>
            <Button variant="outline" onClick={onLogout} size="sm">
              <LogOut className="w-4 h-4 mr-2" /> Sair
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-4 sm:p-6">
        <Tabs defaultValue="cadastro" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 max-w-md">
            <TabsTrigger value="cadastro">Cadastro</TabsTrigger>
            <TabsTrigger value="list">Listagem</TabsTrigger>
            <TabsTrigger value="rtmp">Câmeras</TabsTrigger>
          </TabsList>

          <TabsContent value="cadastro">
            <Card className="p-6">
              <h2 className="text-lg font-semibold mb-6 flex items-center gap-2">
                <UserPlus className="w-5 h-5" /> Cadastrar Tutor e Pet
              </h2>
              <form onSubmit={handleSubmit} className="space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <h3 className="font-medium flex items-center gap-2 border-b pb-2">
                      <User className="w-4 h-4 text-primary" /> Dados do Tutor
                    </h3>
                    <div className="space-y-2">
                      <Label>Nome</Label>
                      <Input value={tutorName} onChange={(e) => setTutorName(e.target.value)} required />
                    </div>
                    <div className="space-y-2">
                      <Label>E-mail</Label>
                      <Input type="email" value={tutorEmail} onChange={(e) => setTutorEmail(e.target.value)} required />
                    </div>
                    <div className="space-y-2">
                      <Label>Telefone</Label>
                      <Input value={tutorPhone} onChange={(e) => setTutorPhone(e.target.value)} required />
                    </div>
                    <div className="bg-blue-50 p-4 rounded-lg space-y-3">
                      <div className="flex justify-between items-center">
                        <Label className="text-xs font-bold uppercase">Acesso ao Sistema</Label>
                        <Button type="button" variant="outline" size="sm" onClick={generateCredentials}>
                          <Key className="w-3 h-3 mr-1" /> Gerar
                        </Button>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1">
                          <Label className="text-xs text-muted-foreground">Login (e-mail)</Label>
                          <Input value={tutorEmail || "—"} readOnly className="h-8 text-xs bg-white" />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs text-muted-foreground">Senha gerada</Label>
                          <Input value={generatedPassword} placeholder="Clique em Gerar" readOnly className="h-8 text-xs bg-white" />
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        O tutor fará login com o e-mail cadastrado acima.
                      </p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h3 className="font-medium flex items-center gap-2 border-b pb-2">
                      <PawPrint className="w-4 h-4 text-primary" /> Dados do Pet
                    </h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Nome do Pet</Label>
                        <Input value={petName} onChange={(e) => setPetName(e.target.value)} required />
                      </div>
                      <div className="space-y-2">
                        <Label>Espécie</Label>
                        <Input value={petSpecies} onChange={(e) => setPetSpecies(e.target.value)} placeholder="Cão, Gato..." required />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Raça</Label>
                        <Input value={petBreed} onChange={(e) => setPetBreed(e.target.value)} required />
                      </div>
                      <div className="space-y-2">
                        <Label>Idade</Label>
                        <Input value={petAge} onChange={(e) => setPetAge(e.target.value)} placeholder="Ex: 3 anos" required />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Check-in</Label>
                        <Input type="date" value={checkInDate} onChange={(e) => setCheckInDate(e.target.value)} required />
                      </div>
                      <div className="space-y-2">
                        <Label>Check-out</Label>
                        <Input type="date" value={checkOutDate} onChange={(e) => setCheckOutDate(e.target.value)} required />
                      </div>
                    </div>
                    <div className="space-y-3 pt-2">
                      <Label>Serviços Contratados</Label>
                      <div className="flex gap-4">
                        {services.map(s => (
                          <div key={s} className="flex items-center gap-2">
                            <Checkbox id={s} checked={selectedServices.includes(s)} onCheckedChange={() => handleServiceToggle(s)} />
                            <label htmlFor={s} className="text-sm cursor-pointer">{s}</label>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
                <Button type="submit" className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white" disabled={submitting}>
                  {submitting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Cadastrando...</> : "Finalizar Cadastro"}
                </Button>
              </form>
            </Card>
          </TabsContent>

          <TabsContent value="list">
            <Card className="p-6">
              <h2 className="text-lg font-semibold mb-6 flex items-center gap-2">
                <Users className="w-5 h-5" /> Hospedagens Ativas
                <Badge variant="secondary" className="ml-auto">{tutors.length} tutor(es)</Badge>
              </h2>

              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                </div>
              ) : tutors.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-3">
                  <Dog className="w-12 h-12 opacity-30" />
                  <p className="text-sm">Nenhum tutor cadastrado ainda.</p>
                  <p className="text-xs">Utilize a aba <strong>Cadastro</strong> para adicionar o primeiro.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {tutors.map(t => (
                    <div key={t.id} className="border rounded-lg p-4 bg-white shadow-sm">
                      <div className="flex justify-between items-start border-b pb-2 mb-3">
                        <div>
                          <p className="font-bold text-primary">{t.name}</p>
                          <p className="text-xs text-muted-foreground">{t.email} · {t.phone}</p>
                        </div>
                        <Badge variant="outline">Tutor</Badge>
                      </div>
                      <div className="space-y-2">
                        {pets.filter(p => p.tutorId === t.id).length === 0 ? (
                          <p className="text-xs text-muted-foreground italic">Nenhum pet associado.</p>
                        ) : (
                          pets.filter(p => p.tutorId === t.id).map(p => (
                            <div key={p.id} className="flex items-center justify-between text-sm bg-muted/30 p-2 rounded">
                              <div className="flex items-center gap-2">
                                <PawPrint className="w-3 h-3 text-muted-foreground" />
                                <span><strong>{p.name}</strong> ({p.breed})</span>
                                {p.checkIn && (
                                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                                    <Calendar className="w-3 h-3" />
                                    {formatDate(p.checkIn)} → {formatDate(p.checkOut)}
                                  </span>
                                )}
                              </div>
                              <div className="flex gap-1 flex-wrap">
                                {p.services.map(s => <Badge key={s} className="text-[10px] h-4">{s}</Badge>)}
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

          <TabsContent value="rtmp">
            <RTMPConfigPanel />
          </TabsContent>
        </Tabs>
      </main>

      <RegistrationConfirmation open={showConfirmation} onOpenChange={setShowConfirmation} data={registrationData} />
    </div>
  );
}

function RTMPConfigPanel() {
  const [rtmpServer, setRtmpServer] = useState("");
  const [cameras, setCameras] = useState<CameraConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadRTMP();
  }, []);

  const loadRTMP = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('petmonitor_token');
      const headers = { 'Authorization': `Bearer ${token}` };
      
      const [srvRes, camRes] = await Promise.all([
        fetch(`${import.meta.env.VITE_API_URL}/api/rtmp/config`, { headers }),
        fetch(`${import.meta.env.VITE_API_URL}/api/rtmp/cameras`, { headers })
      ]);
      
      if (srvRes.ok) {
        const d = await srvRes.json();
        setRtmpServer(d.config?.serverUrl || "");
      }
      if (camRes.ok) {
        const d = await camRes.json();
        setCameras(d.cameras || []);
      }
    } catch (e) {
      console.error(e);
      toast.error('Erro ao carregar configurações RTMP.');
    } finally {
      setLoading(false);
    }
  };

  const addCamera = () => {
    const id = `cam${Math.floor(Math.random() * 1000)}`;
    setCameras([...cameras, { id, name: "Nova Câmera", streamKey: "chave", status: "inativo", playableUrl: "" }]);
  };

  const removeCamera = (id: string) => {
    setCameras(cameras.filter(c => c.id !== id));
  };

  const updateCamera = (id: string, field: keyof CameraConfig, val: string) => {
    setCameras(cameras.map(c => c.id === id ? { ...c, [field]: val } : c));
  };

  const copyToClipboard = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(`${label} copiado para a área de transferência.`);
    } catch {
      toast.error('Não foi possível copiar. Tente manualmente.');
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const token = localStorage.getItem('petmonitor_token');
      const headers = { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` };
      
      await fetch(`${import.meta.env.VITE_API_URL}/api/rtmp/config`, {
        method: 'PUT', headers, body: JSON.stringify({ serverUrl: rtmpServer })
      });

      await Promise.all(cameras.map(c => 
        fetch(`${import.meta.env.VITE_API_URL}/api/rtmp/cameras/${c.id}`, {
          method: 'PUT', headers, body: JSON.stringify(c)
        })
      ));
      toast.success('Configurações salvas com sucesso!');
    } catch (e) {
      toast.error('Erro ao salvar configurações.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center p-16">
      <Loader2 className="animate-spin w-8 h-8 text-muted-foreground" />
    </div>
  );

  return (
    <Card className="p-6 space-y-6">
      <div className="space-y-4">
        <h3 className="font-bold flex items-center gap-2"><Server className="w-5 h-5" /> Configuração do Servidor RTMP</h3>
        <div className="flex gap-2">
          <Input value={rtmpServer} onChange={e => setRtmpServer(e.target.value)} placeholder="rtmp://seu-ip/live" className="font-mono text-sm" />
          <Button variant="outline" size="sm" onClick={() => copyToClipboard(rtmpServer, 'URL do servidor')}>
            <Copy className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex justify-between items-center border-b pb-2">
          <h3 className="font-bold flex items-center gap-2"><Video className="w-5 h-5" /> Câmeras</h3>
          <Button size="sm" onClick={addCamera}><UserPlus className="w-4 h-4 mr-2" /> Adicionar</Button>
        </div>

        <div className="grid grid-cols-1 gap-4">
          {cameras.length === 0 && (
            <div className="text-center py-8 text-muted-foreground text-sm">
              Nenhuma câmera configurada. Clique em "Adicionar" para começar.
            </div>
          )}
          {cameras.map(c => (
            <div key={c.id} className="border rounded-lg p-4 bg-muted/20 relative group">
              <button
                onClick={() => removeCamera(c.id)}
                className="absolute top-2 right-2 text-red-500 opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-red-50 rounded"
                title="Remover câmera"
              >
                <Trash2 className="w-4 h-4" />
              </button>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div className="space-y-1">
                  <Label className="text-[10px] uppercase font-bold">Nome do Serviço (deve coincidir exatamente)</Label>
                  <Input value={c.name} onChange={e => updateCamera(c.id, 'name', e.target.value)} className="h-8 bg-white" />
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px] uppercase font-bold">Status</Label>
                  <div className="flex items-center pt-1">
                    <Badge variant={c.status === 'ativo' ? 'default' : 'secondary'} className={cn(c.status === 'ativo' && 'bg-green-500')}>
                      {c.status === 'ativo' ? '● Ativo' : '○ Inativo'}
                    </Badge>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div className="space-y-1">
                  <Label className="text-[10px] uppercase font-bold">ID do Stream</Label>
                  <Input value={c.id} readOnly className="h-8 bg-gray-100 font-mono text-xs" />
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px] uppercase font-bold">Chave de Acesso (?key=)</Label>
                  <Input value={c.streamKey} onChange={e => updateCamera(c.id, 'streamKey', e.target.value)} className="h-8 bg-white font-mono text-xs" />
                </div>
              </div>

              <div className="space-y-1 mb-4">
                <Label className="text-[10px] uppercase font-bold">URL de Visualização HLS (.m3u8)</Label>
                <Input value={c.playableUrl} onChange={e => updateCamera(c.id, 'playableUrl', e.target.value)} placeholder="http://ip:8080/live/id.m3u8" className="h-8 bg-white font-mono text-xs" />
              </div>

              <div className="bg-blue-50 border border-blue-100 p-2 rounded text-[10px] font-mono break-all flex items-center justify-between gap-2">
                <span><strong>LINK DVR:</strong> {rtmpServer}/{c.id}?key={c.streamKey}</span>
                <button
                  onClick={() => copyToClipboard(`${rtmpServer}/${c.id}?key=${c.streamKey}`, 'Link do DVR')}
                  className="shrink-0 text-blue-600 hover:text-blue-800"
                  title="Copiar link"
                >
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
