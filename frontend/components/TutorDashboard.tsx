import React, { useState, useEffect } from "react";
import ReactPlayer from "react-player"; 
import { Button } from "./ui/button";
import { Card } from "./ui/card";
import { Badge } from "./ui/badge";
import { 
  LogOut, 
  PawPrint, 
  Video,
  Play,
  Pause,
  Maximize2,
  Volume2,
  VolumeX,
  Hotel,
  Sparkles,
  Scissors,
  Loader2,
  VideoOff // Ícone novo
} from "lucide-react";
import { ImageWithFallback } from "./figma/ImageWithFallback";

interface TutorDashboardProps {
  onLogout: () => void;
  userData: {
    id?: string;
    username: string;
    name?: string;
    email?: string;
    phone?: string;
  };
}

interface Pet {
  id: string;
  name: string;
  species: string;
  breed: string;
  age: string;
  services: string[];
  checkIn: string;
  checkOut: string;
}

// INTERFACE ATUALIZADA
interface CameraFeed {
  id: string;
  name: string; // Trocado de 'service' para 'name' para bater com o admin
  location: string;
  status: "live" | "offline";
  icon: any;
  playableUrl: string; // A URL que vamos tocar!
}

export function TutorDashboard({ onLogout, userData }: TutorDashboardProps) {
  const [pets, setPets] = useState<Pet[]>([]);
  // NOVO STATE PARA CÂMERAS
  const [cameras, setCameras] = useState<CameraFeed[]>([]);
  const [loading, setLoading] = useState(true);
  
  // States de controle do player (agora globais)
  const [isPlaying, setIsPlaying] = useState<{ [key: string]: boolean }>({});
  const [isMuted, setIsMuted] = useState<{ [key: string]: boolean }>({});

  useEffect(() => {
    // Renomeado de loadPets para loadData
    loadData(); 
  }, [userData.id]);

  // LÓGICA DE FETCH ATUALIZADA
  const loadData = async () => {
    if (!userData.id) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      
      const token = localStorage.getItem('petmonitor_token');
      const headers = {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
      };

      // Usamos Promise.all para buscar pets e câmeras em paralelo
      const [petsResponse, camerasResponse] = await Promise.all([
        // 1. Buscar os pets do tutor
        fetch(
          `${import.meta.env.VITE_API_URL}/api/pets`,
          { headers }
        ),
        // 2. Buscar TODAS as câmeras
        fetch(
          `${import.meta.env.VITE_API_URL}/api/rtmp/cameras`,
          { headers }
        )
      ]);

      // Processar pets
      if (petsResponse.ok) {
        const data = await petsResponse.json();
        setPets(data.pets || []);
      }

      // Processar câmeras
      if (camerasResponse.ok) {
        const data = await camerasResponse.json();
        // Mapear os ícones para os nomes das câmeras (que são os serviços)
        const cameraData = (data.cameras || []).map((cam: any) => ({
          ...cam,
          icon: getIconForService(cam.name),
          location: cam.location || `Área de ${cam.name}` // Fallback
        }));
        setCameras(cameraData);
        
        // Inicializar o estado de play/pause para todas as câmeras
        const initialPlayingState: { [key: string]: boolean } = {};
        for (const cam of cameraData) {
          initialPlayingState[cam.id] = true; // Começa tocando
        }
        setIsPlaying(initialPlayingState);
      }

    } catch (err) {
      console.error('Error loading data:', err);
    } finally {
      setLoading(false);
    }
  };

  const getIconForService = (serviceName: string) => {
    if (serviceName.includes("Hospedagem")) return Hotel;
    if (serviceName.includes("Recreação")) return Sparkles;
    if (serviceName.includes("Banho e Tosa")) return Scissors;
    return Video; // Padrão
  };

  // LÓGICA DE FILTRO ATUALIZADA
  // Filtra as câmeras (do DB) com base nos serviços do pet (do DB)
  const availableCameras = pets.length > 0
    ? cameras.filter(camera => 
        pets.some(pet => pet.services.includes(camera.name))
      )
    : []; // Se não tiver pet, não mostra nenhuma câmera

  const togglePlay = (cameraId: string) => {
    setIsPlaying((prev) => ({ ...prev, [cameraId]: !prev[cameraId] }));
  };

  const toggleMute = (cameraId: string) => {
    setIsMuted((prev) => ({ ...prev, [cameraId]: !prev[cameraId] }));
  };

  // COMPONENTE DE VÍDEO REAL
  const CameraView = ({ camera }: { camera: CameraFeed }) => {
    const Icon = camera.icon;
    const isLive = camera.status === "live" && camera.playableUrl;

    return (
      <div className="relative bg-black rounded-lg overflow-hidden aspect-video group">
        {isLive ? (
          <ReactPlayer
            url={camera.playableUrl}
            playing={isPlaying[camera.id]}
            muted={isMuted[camera.id]}
            controls={false} // Usamos nossos próprios controles
            width="100%"
            height="100%"
            config={{
              file: {
                forceHLS: true, // Força o HLS player
              },
            }}
          />
        ) : (
          <div className="absolute inset-0 bg-gray-900 flex flex-col items-center justify-center text-white/50">
            <VideoOff className="w-16 h-16 mx-auto mb-2" />
            <p>Stream Offline</p>
            <p className="text-sm">{camera.location}</p>
          </div>
        )}

        {/* Live indicator */}
        {isLive && (
          <div className="absolute top-4 left-4 flex items-center gap-2 bg-red-500 text-white px-3 py-1 rounded-full text-xs">
            <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
            <span>AO VIVO</span>
          </div>
        )}

        {/* Service badge */}
        <div className="absolute top-4 right-4">
          <Badge className="bg-white/90 text-black flex items-center gap-1 text-xs">
            <Icon className="w-3 h-3" />
            {camera.name}
          </Badge>
        </div>

        {/* Controls */}
        {isLive && (
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1">
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-white hover:bg-white/20"
                  onClick={() => togglePlay(camera.id)}
                >
                  {isPlaying[camera.id] ? (
                    <Pause className="w-4 h-4" />
                  ) : (
                    <Play className="w-4 h-4" />
                  )}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-white hover:bg-white/20"
                  onClick={() => toggleMute(camera.id)}
                >
                  {isMuted[camera.id] ? (
                    <VolumeX className="w-4 h-4" />
                  ) : (
                    <Volume2 className="w-4 h-4" />
                  )}
                </Button>
              </div>
              <Button
                size="sm"
                variant="ghost"
                className="text-white hover:bg-white/20"
                onClick={() => {
                  // Lógica de fullscreen (simples)
                  const player = document.querySelector(`[data-cam-id="${camera.id}"] video`);
                  if (player && player.requestFullscreen) {
                    player.requestFullscreen();
                  }
                }}
              >
                <Maximize2 className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50">
      {/* Header (sem alterações) */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-br from-blue-500 to-purple-600 p-2 rounded-lg">
              <PawPrint className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-primary">Hotel Pet Paradise</h1>
              <p className="text-sm text-muted-foreground">Portal do Tutor</p>
            </div>
          </div>
          <div className="flex items-center gap-4 w-full sm:w-auto">
            <div className="text-right flex-1 sm:flex-none">
              <p className="text-sm text-muted-foreground">Bem-vindo</p>
              <p className="text-primary">{userData.username}</p>
            </div>
            <Button variant="outline" onClick={onLogout} size="sm">
              <LogOut className="w-4 h-4 sm:mr-2" />
              <span className="hidden sm:inline">Sair</span>
            </Button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto p-4 sm:p-6 space-y-6">
        {/* Pet Info Card */}
        {loading ? (
          <Card className="p-4 sm:p-6">
            <div className="flex items-center justify-center">
              <Loader2 className="w-10 h-10 animate-spin" />
            </div>
          </Card>
        ) : (
          pets.map(pet => (
            <Card key={pet.id} className="p-4 sm:p-6">
              {/* (Sem alterações aqui, busca dinâmica de foto fica para depois) */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full overflow-hidden bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center shrink-0">
                    <ImageWithFallback
                      src="https://images.unsplash.com/photo-1719384102559-708d244e84af?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxoYXBweSUyMGRvZyUyMHBldHxlbnwxfHx8fDE3NTkyMzAxNzB8MA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral"
                      alt="Pet"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="min-w-0">
                    <h2>{pet.name}</h2>
                    <p className="text-muted-foreground">{pet.breed}</p>
                    <p className="text-sm text-muted-foreground">Check-in: {pet.checkIn} às 10:00</p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {pet.services.map(service => {
                    const Icon = getIconForService(service);
                    return (
                      <Badge key={service} variant="secondary" className="flex items-center gap-1">
                        <Icon className="w-3 h-3" />
                        <span className="hidden sm:inline">{service}</span>
                        <span className="sm:hidden">{service.slice(0, 3)}</span>
                      </Badge>
                    );
                  })}
                </div>
              </div>
            </Card>
          ))
        )}

        {/* Live Camera Feeds */}
        <Card className="p-4 sm:p-6">
          <h2 className="mb-6 flex items-center gap-2">
            <Video className="w-5 h-5 shrink-0" />
            <span>Visualização ao Vivo</span>
          </h2>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {availableCameras.length > 0 ? (
              availableCameras.map((camera) => {
                const Icon = camera.icon;
                return (
                  <div key={camera.id} className="space-y-3" data-cam-id={camera.id}>
                    <div className="flex items-center gap-2">
                      <Icon className="w-5 h-5" />
                      <div>
                        <h3>{camera.name}</h3>
                        <p className="text-sm text-muted-foreground">
                          {camera.location}
                        </p>
                      </div>
                    </div>
                    <CameraView camera={camera} />
                  </div>
                );
              })
            ) : (
              <p className="text-muted-foreground">
                {loading ? "Carregando câmeras..." : "Nenhuma câmera disponível para os serviços contratados."}
              </p>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}