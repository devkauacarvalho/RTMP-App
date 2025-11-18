import React, { useState, useEffect } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Card } from "./ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Badge } from "./ui/badge";
import { Checkbox } from "./ui/checkbox";
import { RegistrationConfirmation } from "./RegistrationConfirmation";
import { projectId, publicAnonKey } from "../utils/supabase/info";
import { 
  LogOut, 
  UserPlus, 
  PawPrint, 
  Key, 
  Calendar,
  User,
  Phone,
  Mail,
  Video,
  Server,
  Link2,
  Copy,
  CheckCircle2,
  Loader2,
  AlertCircle
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
  const [error, setError] = useState("");

  // Combined form
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

  // Load data on mount
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [tutorsResponse, petsResponse] = await Promise.all([
        fetch(`https://${projectId}.supabase.co/functions/v1/make-server-9c20aedf/tutors`, {
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
          },
        }),
        fetch(`https://${projectId}.supabase.co/functions/v1/make-server-9c20aedf/pets`, {
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
          },
        }),
      ]);

      const tutorsData = await tutorsResponse.json();
      const petsData = await petsResponse.json();

      if (tutorsResponse.ok) {
        setTutors(tutorsData.tutors || []);
      }
      if (petsResponse.ok) {
        setPets(petsData.pets || []);
      }
    } catch (err) {
      console.error('Error loading data:', err);
      setError('Erro ao carregar dados');
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
    
    // Validate credentials generated
    if (!generatedUsername || !generatedPassword) {
      alert("Por favor, gere as credenciais de acesso antes de cadastrar");
      return;
    }

    // Validate services
    if (selectedServices.length === 0) {
      alert("Por favor, selecione pelo menos um serviço");
      return;
    }

    // Validate dates
    if (checkInDate && checkOutDate && new Date(checkOutDate) <= new Date(checkInDate)) {
      alert("A data de check-out deve ser posterior à data de check-in");
      return;
    }

    // Validate all required fields
    if (
      tutorName && tutorEmail && tutorPhone && 
      generatedUsername && generatedPassword &&
      petName && petSpecies && petBreed && petAge &&
      checkInDate && checkOutDate &&
      selectedServices.length > 0
    ) {
      setSubmitting(true);

      try {
        const response = await fetch(
          `https://${projectId}.supabase.co/functions/v1/make-server-9c20aedf/register`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${publicAnonKey}`,
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
          setSubmitting(false);
          return;
        }

        // Update lists with new data
        setTutors([...tutors, data.tutor]);
        setPets([...pets, data.pet]);

        // Show confirmation dialog
        setRegistrationData({ tutor: data.tutor, pet: data.pet });
        setShowConfirmation(true);

        // Reset form
        setTutorName("");
        setTutorEmail("");
        setTutorPhone("");
        setGeneratedUsername("");
        setGeneratedPassword("");
        setPetName("");
        setPetSpecies("");
        setPetBreed("");
        setPetAge("");
        setCheckInDate("");
        setCheckOutDate("");
        setSelectedServices([]);
      } catch (error) {
        console.error('Registration error:', error);
        alert('Erro de conexão ao cadastrar');
      } finally {
        setSubmitting(false);
      }
    }
  };

  const calculateStayDuration = (checkIn: string, checkOut: string) => {
    const start = new Date(checkIn);
    const end = new Date(checkOut);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR', { 
      day: '2-digit', 
      month: '2-digit', 
      year: 'numeric' 
    });
  };

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50" id="admin-dashboard">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-br from-blue-500 to-purple-600 p-2 rounded-lg">
              <PawPrint className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-primary">Hotel Pet Paradise</h1>
              <p className="text-sm text-muted-foreground">Painel Administrativo</p>
            </div>
          </div>
          <div className="flex items-center gap-4 w-full sm:w-auto">
            <div className="text-right flex-1 sm:flex-none">
              <p className="text-sm text-muted-foreground">Bem-vindo</p>
              <p className="text-primary">{username}</p>
            </div>
            <Button variant="outline" onClick={onLogout} size="sm">
              <LogOut className="w-4 h-4 sm:mr-2" />
              <span className="hidden sm:inline">Sair</span>
            </Button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto p-4 sm:p-6">
        <Tabs defaultValue="cadastro" className="space-y-6">
          <TabsList className="grid w-full max-w-2xl grid-cols-3">
            <TabsTrigger value="cadastro">Cadastro</TabsTrigger>
            <TabsTrigger value="list">Listagem</TabsTrigger>
            <TabsTrigger value="rtmp">RTMP</TabsTrigger>
          </TabsList>

          {/* Cadastro Combinado */}
          <TabsContent value="cadastro" className="space-y-4">
            <Card className="p-4 sm:p-6">
              <h2 className="mb-6 flex items-center gap-2">
                <UserPlus className="w-5 h-5 shrink-0" />
                <span>Cadastrar Tutor e Pet</span>
              </h2>
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Seção do Tutor */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 pb-2 border-b">
                    <User className="w-5 h-5 text-primary" />
                    <h3>Dados do Tutor</h3>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="tutorName">Nome Completo</Label>
                      <Input
                        id="tutorName"
                        placeholder="Ex: João Silva"
                        value={tutorName}
                        onChange={(e) => setTutorName(e.target.value)}
                        className="bg-input-background"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="tutorEmail">E-mail</Label>
                      <Input
                        id="tutorEmail"
                        type="email"
                        placeholder="Ex: joao@email.com"
                        value={tutorEmail}
                        onChange={(e) => setTutorEmail(e.target.value)}
                        className="bg-input-background"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="tutorPhone">Telefone</Label>
                      <Input
                        id="tutorPhone"
                        placeholder="(11) 98765-4321"
                        value={tutorPhone}
                        onChange={(e) => setTutorPhone(e.target.value)}
                        className="bg-input-background"
                        required
                      />
                    </div>
                  </div>

                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-4">
                    <div className="flex items-center justify-between">
                      <Label className="flex items-center gap-2">
                        <Key className="w-4 h-4" />
                        Credenciais de Acesso
                      </Label>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={generateCredentials}
                      >
                        Gerar Credenciais
                      </Button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="username">Usuário</Label>
                        <Input
                          id="username"
                          value={generatedUsername}
                          placeholder="Clique para gerar"
                          readOnly
                          className="bg-white"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="password">Senha</Label>
                        <Input
                          id="password"
                          value={generatedPassword}
                          placeholder="Clique para gerar"
                          readOnly
                          className="bg-white"
                        />
                      </div>
                    </div>
                    {!generatedUsername && !generatedPassword && (
                      <p className="text-sm text-blue-700">
                        ⚠️ Não esqueça de gerar as credenciais antes de cadastrar
                      </p>
                    )}
                  </div>
                </div>

                {/* Seção do Pet */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 pb-2 border-b">
                    <PawPrint className="w-5 h-5 text-primary" />
                    <h3>Dados do Pet</h3>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="petName">Nome do Pet</Label>
                      <Input
                        id="petName"
                        placeholder="Ex: Rex"
                        value={petName}
                        onChange={(e) => setPetName(e.target.value)}
                        className="bg-input-background"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="petSpecies">Espécie</Label>
                      <Input
                        id="petSpecies"
                        placeholder="Ex: Cachorro, Gato"
                        value={petSpecies}
                        onChange={(e) => setPetSpecies(e.target.value)}
                        className="bg-input-background"
                        required
                      />
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <Label htmlFor="petBreed">Raça</Label>
                      <Input
                        id="petBreed"
                        placeholder="Ex: Golden Retriever"
                        value={petBreed}
                        onChange={(e) => setPetBreed(e.target.value)}
                        className="bg-input-background"
                        required
                      />
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <Label htmlFor="petAge">Idade</Label>
                      <Input
                        id="petAge"
                        placeholder="Ex: 3 anos"
                        value={petAge}
                        onChange={(e) => setPetAge(e.target.value)}
                        className="bg-input-background"
                        required
                      />
                    </div>
                  </div>

                  <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 space-y-4">
                    <Label className="flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      Período de Estadia
                    </Label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="checkIn">Data de Check-in</Label>
                        <Input
                          id="checkIn"
                          type="date"
                          value={checkInDate}
                          onChange={(e) => setCheckInDate(e.target.value)}
                          className="bg-white"
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="checkOut">Data de Check-out</Label>
                        <Input
                          id="checkOut"
                          type="date"
                          value={checkOutDate}
                          onChange={(e) => setCheckOutDate(e.target.value)}
                          className="bg-white"
                          required
                        />
                      </div>
                    </div>
                    {checkInDate && checkOutDate && (
                      <p className="text-sm text-purple-700">
                        Duração da estadia: {calculateStayDuration(checkInDate, checkOutDate)} dia(s)
                      </p>
                    )}
                  </div>

                  <div className="space-y-3">
                    <Label>Serviços Contratados</Label>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      {services.map((service) => (
                        <div key={service} className="flex items-center space-x-2 bg-muted p-3 rounded-lg">
                          <Checkbox
                            id={service}
                            checked={selectedServices.includes(service)}
                            onCheckedChange={() => handleServiceToggle(service)}
                          />
                          <label
                            htmlFor={service}
                            className="cursor-pointer select-none flex-1"
                          >
                            {service}
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <Button type="submit" className="w-full md:w-auto">
                  <UserPlus className="w-4 h-4 mr-2" />
                  Cadastrar Tutor e Pet
                </Button>
              </form>
            </Card>
          </TabsContent>

          {/* Listagem */}
          <TabsContent value="list" className="space-y-4">
            <Card className="p-4 sm:p-6">
              <h2 className="mb-4">Tutores e seus Pets</h2>
              <div className="space-y-4">
                {tutors.map((tutor) => {
                  const tutorPets = pets.filter(pet => pet.tutorId === tutor.id);
                  return (
                    <div
                      key={tutor.id}
                      className="p-4 bg-muted rounded-lg space-y-3"
                    >
                      {/* Tutor Info */}
                      <div className="flex items-center justify-between gap-2 pb-3 border-b">
                        <div className="flex items-center gap-3">
                          <div className="bg-primary p-2 rounded-full shrink-0">
                            <User className="w-5 h-5 text-white" />
                          </div>
                          <div>
                            <p>{tutor.name}</p>
                            <p className="text-sm text-muted-foreground">{tutor.email}</p>
                          </div>
                        </div>
                        <Badge className="shrink-0">Ativo</Badge>
                      </div>

                      {/* Tutor Details */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                        <p className="flex items-center gap-2">
                          <Phone className="w-4 h-4 shrink-0 text-muted-foreground" />
                          <span className="text-muted-foreground">{tutor.phone}</span>
                        </p>
                        <p className="flex items-center gap-2">
                          <User className="w-4 h-4 shrink-0 text-muted-foreground" />
                          <span className="text-muted-foreground">Usuário: {tutor.username}</span>
                        </p>
                        <p className="flex items-center gap-2">
                          <Key className="w-4 h-4 shrink-0 text-muted-foreground" />
                          <span className="text-muted-foreground">Senha: {tutor.password}</span>
                        </p>
                      </div>

                      {/* Pets */}
                      {tutorPets.length > 0 && (
                        <div className="space-y-2 pt-2">
                          <p className="text-sm flex items-center gap-2">
                            <PawPrint className="w-4 h-4" />
                            Pets Cadastrados:
                          </p>
                          <div className="space-y-2 pl-6">
                            {tutorPets.map((pet) => (
                              <div
                                key={pet.id}
                                className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 p-3 bg-background rounded-lg"
                              >
                                <div className="min-w-0">
                                  <p className="truncate">{pet.name}</p>
                                  <p className="text-sm text-muted-foreground">
                                    {pet.species} • {pet.breed} • {pet.age}
                                  </p>
                                  <p className="text-sm text-muted-foreground">
                                    {formatDate(pet.checkIn)} - {formatDate(pet.checkOut)}
                                  </p>
                                </div>
                                <div className="flex flex-wrap gap-1">
                                  {pet.services.map((service) => (
                                    <Badge key={service} variant="secondary" className="text-xs">
                                      {service}
                                    </Badge>
                                  ))}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {tutorPets.length === 0 && (
                        <p className="text-sm text-muted-foreground italic pt-2">
                          Nenhum pet cadastrado para este tutor
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            </Card>
          </TabsContent>

          {/* RTMP Configuration */}
          <TabsContent value="rtmp" className="space-y-4">
            <Card className="p-4 sm:p-6">
              <div className="space-y-6">
                <div className="flex items-center gap-3 pb-4 border-b">
                  <div className="bg-gradient-to-br from-red-500 to-orange-600 p-3 rounded-lg">
                    <Server className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h2>Configurações do Servidor RTMP</h2>
                    <p className="text-sm text-muted-foreground">
                      Configure as transmissões de vídeo NGINX-RTMP
                    </p>
                  </div>
                </div>

                <RTMPConfigPanel />
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Confirmation Dialog */}
      <RegistrationConfirmation
        open={showConfirmation}
        onOpenChange={setShowConfirmation}
        data={registrationData}
      />
    </div>
  );
}

// RTMP Configuration Component
function RTMPConfigPanel() {
  const [rtmpServer, setRtmpServer] = useState("rtmp://servidor.example.com/live");
  // O 'useState' de câmeras agora usa a interface CameraConfig e começa vazio
  const [cameras, setCameras] = useState<CameraConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // useEffect para carregar os dados da API quando o componente montar
  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    setLoading(true);
    try {
      // 1. Carregar a URL do servidor
      const serverResponse = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-9c20aedf/rtmp/config`,
        {
          headers: { 'Authorization': `Bearer ${publicAnonKey}` },
        }
      );
      if (serverResponse.ok) {
        const data = await serverResponse.json();
        if (data.config) {
          setRtmpServer(data.config.serverUrl);
        }
      }

      // 2. Carregar as câmeras
      const camerasResponse = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-9c20aedf/rtmp/cameras`,
        {
          headers: { 'Authorization': `Bearer ${publicAnonKey}` },
        }
      );
      if (camerasResponse.ok) {
        const data = await camerasResponse.json();
        // Garantir que temos os campos padrão se eles não vierem do DB
        const camerasData = (data.cameras || []).map((cam: any) => ({
          id: cam.id || `cam${Math.random()}`,
          name: cam.name || "Nova Câmera",
          streamKey: cam.streamKey || "",
          status: cam.status || "inativo",
          playableUrl: cam.playableUrl || "", // Campo novo
        }));
        setCameras(camerasData);
      }
    } catch (err) {
      console.error("Erro ao carregar configuração RTMP:", err);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(id);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  // Função para atualizar o estado da câmera localmente
  const handleCameraChange = (id: string, field: keyof CameraConfig, value: string) => {
    setCameras((prevCameras) =>
      prevCameras.map((cam) =>
        cam.id === id ? { ...cam, [field]: value } : cam
      )
    );
  };

  // Função para salvar TUDO
  const handleSave = async () => {
    setSaving(true);
    try {
      // 1. Salvar URL do Servidor
      await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-9c20aedf/rtmp/config`,
        {
          method: 'PUT',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${publicAnonKey}` 
          },
          body: JSON.stringify({ serverUrl: rtmpServer }),
        }
      );

      // 2. Salvar cada câmera
      // O Promise.all permite salvar todas em paralelo
      await Promise.all(
        cameras.map((camera) =>
          fetch(
            `https://myyapfwmvlmszopboijh.supabase.co/functions/v1/make-server-9c20aedf/rtmp/cameras/${camera.id}`,
            {
              method: 'PUT',
              headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${publicAnonKey}` 
              },
              // O backend (index.tsx) já aceita o body completo
              body: JSON.stringify(camera), 
            }
          )
        )
      );
      
      alert("Configurações salvas com sucesso!");
    } catch (err) {
      console.error("Erro ao salvar configurações:", err);
      alert("Erro ao salvar. Verifique o console.");
    } finally {
      setSaving(false);
    }
  };
  
  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="w-8 h-8 animate-spin" />
        <p className="ml-2">Carregando configurações RTMP...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Server Configuration */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 pb-2 border-b">
          <Server className="w-5 h-5 text-primary" />
          <h3>Servidor NGINX-RTMP (Input)</h3>
        </div>
        
        <div className="space-y-3">
          <div className="space-y-2">
            <Label htmlFor="rtmpServer">URL do Servidor RTMP (para onde as câmeras enviam)</Label>
            <div className="flex gap-2">
              <Input
                id="rtmpServer"
                placeholder="rtmp://seu-servidor.com/live"
                value={rtmpServer}
                onChange={(e) => setRtmpServer(e.target.value)}
                className="bg-input-background font-mono text-sm"
              />
              <Button
                variant="outline"
                size="sm"
                onClick={() => copyToClipboard(rtmpServer, "server")}
              >
                {copiedKey === "server" ? (
                  <CheckCircle2 className="w-4 h-4" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Camera Streams */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 pb-2 border-b">
          <Video className="w-5 h-5 text-primary" />
          <h3>Streams de Câmeras</h3>
        </div>

        <div className="space-y-3">
          {cameras.map((camera) => (
            <div
              key={camera.id}
              className="p-4 bg-muted rounded-lg space-y-3"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="bg-primary p-2 rounded-full">
                    <Video className="w-4 h-4 text-white" />
                  </div>
                  {/* Torna o nome editável */}
                  <Input
                    value={camera.name}
                    onChange={(e) => handleCameraChange(camera.id, 'name', e.target.value)}
                    className="bg-white font-semibold"
                  />
                </div>
                <Badge 
                  variant={camera.status === "ativo" ? "default" : "secondary"}
                  className="shrink-0"
                >
                  {/* Status ainda está hardcoded, podemos mudar depois */}
                  {camera.status === "ativo" ? "Ativo" : "Inativo"}
                </Badge>
              </div>

              {/* Chave de Stream (Input) */}
              <div className="space-y-2">
                <Label htmlFor={`stream-${camera.id}`} className="text-xs">
                  Stream Key (Input)
                </Label>
                <div className="flex gap-2">
                  <Input
                    id={`stream-${camera.id}`}
                    value={camera.streamKey}
                    onChange={(e) => handleCameraChange(camera.id, 'streamKey', e.target.value)}
                    className="bg-white font-mono text-sm"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => copyToClipboard(camera.streamKey, camera.id)}
                  >
                    {copiedKey === camera.id ? (
                      <CheckCircle2 className="w-4 h-4" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </Button>
                </div>
              </div>

              {/* *** NOSSO NOVO CAMPO *** */}
              <div className="space-y-2">
                <Label htmlFor={`playable-${camera.id}`} className="text-xs">
                  URL de Visualização (Output - ex: HLS .m3u8)
                </Label>
                <Input
                  id={`playable-${camera.id}`}
                  value={camera.playableUrl}
                  onChange={(e) => handleCameraChange(camera.id, 'playableUrl', e.target.value)}
                  placeholder="http://seu-servidor.com/live/stream.m3u8"
                  className="bg-white font-mono text-sm"
                />
              </div>

              <div className="bg-background rounded-lg p-3 space-y-1">
                <p className="text-xs flex items-center gap-2">
                  <Link2 className="w-3 h-3" />
                  URL Completa (Input):
                </p>
                <p className="text-xs font-mono text-muted-foreground break-all">
                  {rtmpServer}/{camera.streamKey}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex gap-3">
        <Button onClick={handleSave} className="w-full sm:w-auto" disabled={saving}>
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Salvar Configurações"}
        </Button>
      </div>
    </div>
  );
}