import { useState, useEffect } from "react";
import { Button } from "./ui/button";
import { Card } from "./ui/card";
import { Badge } from "./ui/badge";
import { projectId, publicAnonKey } from "../utils/supabase/info";
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
  Loader2
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

interface CameraFeed {
  id: string;
  service: string;
  location: string;
  status: "live" | "offline";
  icon: any;
}

export function TutorDashboard({ onLogout, userData }: TutorDashboardProps) {
  const [pets, setPets] = useState<Pet[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCamera, setSelectedCamera] = useState<string | null>("cam1");
  const [isPlaying, setIsPlaying] = useState<{ [key: string]: boolean }>({
    cam1: true,
    cam2: true,
    cam3: true,
  });
  const [isMuted, setIsMuted] = useState<{ [key: string]: boolean }>({
    cam1: false,
    cam2: false,
    cam3: false,
  });

  useEffect(() => {
    loadPets();
  }, [userData.id]);

  const loadPets = async () => {
    if (!userData.id) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-9c20aedf/pets/tutor/${userData.id}`,
        {
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
          },
        }
      );

      const data = await response.json();

      if (response.ok) {
        setPets(data.pets || []);
      }
    } catch (err) {
      console.error('Error loading pets:', err);
    } finally {
      setLoading(false);
    }
  };

  const cameras: CameraFeed[] = [
    {
      id: "cam1",
      service: "Hospedagem",
      location: "Suíte Premium - Área de Descanso",
      status: "live",
      icon: Hotel,
    },
    {
      id: "cam2",
      service: "Recreação",
      location: "Parque de Brincadeiras",
      status: "live",
      icon: Sparkles,
    },
    {
      id: "cam3",
      service: "Banho e Tosa",
      location: "Sala de Estética",
      status: "live",
      icon: Scissors,
    },
  ];

  // Filter cameras by pet's services
  const availableCameras = pets.length > 0
    ? cameras.filter(camera => 
        pets.some(pet => pet.services.includes(camera.service))
      )
    : cameras;

  const togglePlay = (cameraId: string) => {
    setIsPlaying((prev) => ({ ...prev, [cameraId]: !prev[cameraId] }));
  };

  const toggleMute = (cameraId: string) => {
    setIsMuted((prev) => ({ ...prev, [cameraId]: !prev[cameraId] }));
  };

  const CameraView = ({ camera }: { camera: CameraFeed }) => {
    const Icon = camera.icon;
    return (
      <div className="relative bg-black rounded-lg overflow-hidden aspect-video group">
        {/* Simulated video feed */}
        <div className="absolute inset-0 bg-gradient-to-br from-gray-800 to-gray-900 flex items-center justify-center">
          <div className="text-center text-white/50">
            <Video className="w-16 h-16 mx-auto mb-2 animate-pulse" />
            <p>Stream RTMP Simulado</p>
            <p className="text-sm">{camera.location}</p>
          </div>
        </div>

        {/* Live indicator */}
        <div className="absolute top-4 left-4 flex items-center gap-2 bg-red-500 text-white px-3 py-1 rounded-full">
          <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
          <span className="text-sm">AO VIVO</span>
        </div>

        {/* Service badge */}
        <div className="absolute top-4 right-4">
          <Badge className="bg-white/90 text-black flex items-center gap-1">
            <Icon className="w-3 h-3" />
            {camera.service}
          </Badge>
        </div>

        {/* Controls */}
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4 opacity-0 group-hover:opacity-100 transition-opacity">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
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
            >
              <Maximize2 className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50">
      {/* Header */}
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
                  {pet.services.map(service => (
                    <Badge key={service} variant="secondary" className="flex items-center gap-1">
                      {service === "Hospedagem" && <Hotel className="w-3 h-3" />}
                      {service === "Recreação" && <Sparkles className="w-3 h-3" />}
                      {service === "Banho e Tosa" && <Scissors className="w-3 h-3" />}
                      <span className="hidden sm:inline">{service}</span>
                      <span className="sm:hidden">{service.slice(0, 3)}</span>
                    </Badge>
                  ))}
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
            {availableCameras.map((camera) => (
              <div key={camera.id} className="space-y-3">
                <div className="flex items-center gap-2">
                  <camera.icon className="w-5 h-5" />
                  <div>
                    <h3>{camera.service}</h3>
                    <p className="text-sm text-muted-foreground">
                      {camera.location}
                    </p>
                  </div>
                </div>
                <CameraView camera={camera} />
              </div>
            ))}
          </div>
        </Card>

        {/* Additional Info */}
        <Card className="p-4 sm:p-6 bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200">
          <div className="flex items-start gap-3">
            <Video className="w-5 h-5 mt-1 text-blue-600 shrink-0" />
            <div>
              <h3 className="text-blue-900">Transmissão em Tempo Real</h3>
              <p className="text-sm text-blue-700">
                As câmeras estão transmitindo com latência de menos
                de 2 segundos. Você pode acompanhar seu pet a qualquer momento durante a
                estadia no hotel.
              </p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}