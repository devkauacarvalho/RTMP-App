import React, { useState, useEffect } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Card } from "./ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Badge } from "./ui/badge";
import { Checkbox } from "./ui/checkbox";
import { RegistrationConfirmation } from "./RegistrationConfirmation";
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
  Link2,
  Copy,
  CheckCircle2,
  Loader2,
  Trash2
} from "lucide-react";

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
    const username = tutorName.toLowerCase().replace(/\s+/g, ".");
    const password = "pet" + Math.floor(Math.random() * 10000);
    setGeneratedUsername(username);
    setGeneratedPassword(password);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!generatedUsername || !generatedPassword) {
      alert("Por favor, gere as credenciais de acesso antes de cadastrar");
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
        alert(`Erro ao cadastrar: ${data.error}`);
        return;
      }

      setTutors([...tutors, data.tutor]);
      setPets([...pets, data.pet]);
      setRegistrationData({ tutor: data.tutor, pet: data.pet });
      setShowConfirmation(true);

      // Reset
      setTutorName(""); setTutorEmail(""); setTutorPhone("");
      setGeneratedUsername(""); setGeneratedPassword("");
      setPetName(""); setPetSpecies(""); setPetBreed(""); setPetAge("");
      setCheckInDate(""); setCheckOutDate(""); setSelectedServices([]);
    } catch (error) {
      console.error('Registration error:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50">
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
                        <Label className="text-xs font-bold uppercase">Acesso</Label>
                        <Button type="button" variant="outline" size="xs" onClick={generateCredentials}>Gerar</Button>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <Input value={generatedUsername} placeholder="Usuário" readOnly className="h-8 text-xs bg-white" />
                        <Input value={generatedPassword} placeholder="Senha" readOnly className="h-8 text-xs bg-white" />
                      </div>
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
                        <Input value={petSpecies} onChange={(e) => setPetSpecies(e.target.value)} required />
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
                      <Label>Serviços</Label>
                      <div className="flex gap-4">
                        {services.map(s => (
                          <div key={s} className="flex items-center gap-2">
                            <Checkbox id={s} checked={selectedServices.includes(s)} onCheckedChange={() => handleServiceToggle(s)} />
                            <label htmlFor={s} className="text-sm">{s}</label>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
                <Button type="submit" className="w-full" disabled={submitting}>
                  {submitting ? "Cadastrando..." : "Finalizar Cadastro"}
                </Button>
              </form>
            </Card>
          </TabsContent>

          <TabsContent value="list">
             <Card className="p-6">
                <h2 className="text-lg font-semibold mb-6">Listagem de Hospedagens</h2>
                <div className="space-y-4">
                  {tutors.map(t => (
                    <div key={t.id} className="border rounded-lg p-4 bg-white shadow-sm">
                      <div className="flex justify-between items-start border-b pb-2 mb-2">
                        <div>
                          <p className="font-bold text-primary">{t.name}</p>
                          <p className="text-xs text-muted-foreground">{t.email} | {t.phone}</p>
                        </div>
                        <Badge variant="outline">Tutor</Badge>
                      </div>
                      <div className="space-y-2">
                        {pets.filter(p => p.tutorId === t.id).map(p => (
                          <div key={p.id} className="flex items-center justify-between text-sm bg-muted/30 p-2 rounded">
                            <span>🐾 <strong>{p.name}</strong> ({p.breed})</span>
                            <div className="flex gap-1">
                              {p.services.map(s => <Badge key={s} className="text-[10px] h-4">{s}</Badge>)}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
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
      alert("Salvo com sucesso!");
    } catch (e) {
      alert("Erro ao salvar");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="p-8 text-center"><Loader2 className="animate-spin mx-auto" /></div>;

  return (
    <Card className="p-6 space-y-6">
      <div className="space-y-4">
        <h3 className="font-bold flex items-center gap-2"><Server className="w-5 h-5" /> Configuração do Servidor</h3>
        <div className="flex gap-2">
          <Input value={rtmpServer} onChange={e => setRtmpServer(e.target.value)} placeholder="rtmp://seu-ip/live" className="font-mono text-sm" />
          <Button variant="outline" size="sm" onClick={() => { navigator.clipboard.writeText(rtmpServer); alert("Copiado!"); }}><Copy className="w-4 h-4" /></Button>
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex justify-between items-center border-b pb-2">
          <h3 className="font-bold flex items-center gap-2"><Video className="w-5 h-5" /> Câmeras</h3>
          <Button size="sm" onClick={addCamera}><UserPlus className="w-4 h-4 mr-2" /> Adicionar</Button>
        </div>

        <div className="grid grid-cols-1 gap-4">
          {cameras.map(c => (
            <div key={c.id} className="border rounded-lg p-4 bg-muted/20 relative group">
              <button onClick={() => removeCamera(c.id)} className="absolute top-2 right-2 text-red-500 opacity-0 group-hover:opacity-100"><Trash2 className="w-4 h-4" /></button>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div className="space-y-1">
                  <Label className="text-[10px] uppercase font-bold">Nome do Serviço (Ex: Recreação)</Label>
                  <Input value={c.name} onChange={e => updateCamera(c.id, 'name', e.target.value)} className="h-8 bg-white" />
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px] uppercase font-bold">Status</Label>
                  <div className="flex items-center pt-1"><Badge variant={c.status === 'ativo' ? 'default' : 'secondary'}>{c.status}</Badge></div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div className="space-y-1">
                  <Label className="text-[10px] uppercase font-bold">ID do Stream (Para o link)</Label>
                  <Input value={c.id} readOnly className="h-8 bg-gray-100 font-mono text-xs" />
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px] uppercase font-bold">Chave de Acesso (?key=)</Label>
                  <Input value={c.streamKey} onChange={e => updateCamera(c.id, 'streamKey', e.target.value)} className="h-8 bg-white font-mono text-xs" />
                </div>
              </div>

              <div className="space-y-1 mb-4">
                <Label className="text-[10px] uppercase font-bold">URL de Visualização (HLS .m3u8)</Label>
                <Input value={c.playableUrl} onChange={e => updateCamera(c.id, 'playableUrl', e.target.value)} placeholder="http://ip:8080/live/id.m3u8" className="h-8 bg-white font-mono text-xs" />
              </div>

              <div className="bg-blue-50 p-2 rounded text-[10px] font-mono break-all">
                <strong>LINK PARA O DVR:</strong> {rtmpServer}/{c.id}?key={c.streamKey}
              </div>
            </div>
          ))}
        </div>
      </div>

      <Button className="w-full" onClick={handleSave} disabled={saving}>
        {saving ? "Salvando..." : "Salvar Configurações"}
      </Button>
    </Card>
  );
}
