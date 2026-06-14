import React, { useState, useEffect, useMemo } from "react";
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
  VideoOff
} from "lucide-react";
import { ImageWithFallback } from "./figma/ImageWithFallback";

interface CameraFeed {
  id: string;
  name: string;
  location: string;
  status: "ativo" | "inativo" | "live" | "offline";
  icon: any;
  playableUrl: string;
}

const getIconForService = (serviceName: string) => {
  if (serviceName.includes("Hospedagem")) return Hotel;
  if (serviceName.includes("Recreação")) return Sparkles;
  if (serviceName.includes("Banho e Tosa")) return Scissors;
  return Video;
};

// COMPONENTE MOVIDO PARA FORA PARA EVITAR UNMOUNT
const CameraView = React.memo(({ camera, isPlaying, onTogglePlay, onToggleMute }: { 
  camera: CameraFeed; 
  isPlaying: boolean;
  onTogglePlay: () => void;
  onToggleMute: () => void;
}) => {
  const Icon = camera.icon;
  const isLive = (camera.status === "live" || camera.status === "ativo") && camera.playableUrl;
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    console.log(`[Diagnostic] CameraView montado para: ${camera.name}`);
    const timer = setTimeout(() => setIsMounted(true), 1500);
    return () => {
      console.log(`[Diagnostic] CameraView DESMONTADO para: ${camera.name} (Causa provável do AbortError)`);
      clearTimeout(timer);
    };
  }, [camera.id]);

  return (
    <div className="relative bg-black rounded-lg overflow-hidden aspect-video group">
      {isLive && isMounted ? (
        <ReactPlayer
          key={camera.playableUrl}
          url={camera.playableUrl}
          playing={isPlaying}
          muted={true}
          playsinline={true}
          controls={true}
          width="100%"
          height="100%"
          onStart={() => console.log(`[Diagnostic] Playback iniciado: ${camera.name}`)}
          onBuffer={() => console.log(`[Diagnostic] Bufferizando: ${camera.name}`)}
          onError={(e, data) => console.error(`[Diagnostic] Erro no player (${camera.name}):`, e, data)}
          config={{
            file: {
              forceHLS: true,
              hlsOptions: {
                enableWorker: true,
                lowLatencyMode: true,
                backOffStrategy: true,
              },
              attributes: { 
                autoPlay: true, 
                muted: true, 
                playsInline: true,
                controlsList: 'nodownload'
              }
            },
          }}
        />
      ) : (
        <div className="absolute inset-0 bg-gray-900 flex flex-col items-center justify-center text-white/50">
          {!isLive ? (
            <>
              <VideoOff className="w-16 h-16 mx-auto mb-2" />
              <p>Stream Offline</p>
              <p className="text-sm">{camera.location}</p>
            </>
          ) : (
            <div className="text-center">
              <Loader2 className="w-10 h-10 animate-spin mx-auto mb-2" />
              <p className="text-xs">Sincronizando sinal...</p>
            </div>
          )}
        </div>
      )}

      {isLive && (
        <div className="absolute top-4 left-4 flex items-center gap-2 bg-red-500 text-white px-3 py-1 rounded-full text-xs">
          <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
          <span>AO VIVO</span>
        </div>
      )}

      <div className="absolute top-4 right-4">
        <Badge className="bg-white/90 text-black flex items-center gap-1 text-xs">
          <Icon className="w-3 h-3" />
          {camera.name}
        </Badge>
      </div>
    </div>
  );
});

export function TutorDashboard({ onLogout, userData }: any) {
  const [pets, setPets] = useState<any[]>([]);
  const [cameras, setCameras] = useState<CameraFeed[]>([]);
  const [loading, setLoading] = useState(true);
  const [isPlaying, setIsPlaying] = useState<{ [key: string]: boolean }>({});

  const loadData = async (isSilent = false) => {
    try {
      const token = localStorage.getItem('petmonitor_token');
      const headers = { 'Authorization': `Bearer ${token}` };

      const [petsRes, camsRes] = await Promise.all([
        fetch(`${import.meta.env.VITE_API_URL}/api/pets/my`, { headers }),
        fetch(`${import.meta.env.VITE_API_URL}/api/rtmp/cameras`, { headers })
      ]);

      if (petsRes.ok) {
        const data = await petsRes.json();
        setPets(data.pets || []);
      }

      if (camsRes.ok) {
        const data = await camsRes.json();
        const cameraData = data.cameras.map((cam: any) => ({
          ...cam,
          icon: getIconForService(cam.name),
        }));

        setCameras(prev => {
          // Comparação profunda simples para evitar re-render se nada mudou
          const hasChanged = JSON.stringify(prev.map(c => ({id:c.id, s:c.status}))) !== 
                             JSON.stringify(cameraData.map((c:any) => ({id:c.id, s:c.status})));
          return hasChanged ? cameraData : prev;
        });
      }
    } catch (err) {
      console.error('Fetch error:', err);
    } finally {
      if (!isSilent) setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(() => loadData(true), 15000);
    return () => clearInterval(interval);
  }, []);

  const availableCameras = useMemo(() => {
    return cameras.filter(cam => pets.some(pet => pet.services.includes(cam.name)));
  }, [cameras, pets]);

  return (
    <div className="min-h-screen w-full bg-slate-50">
      <header className="bg-white border-b p-4 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <PawPrint className="text-blue-600" />
          <h1 className="font-bold">Pet Paradise</h1>
        </div>
        <Button variant="ghost" onClick={onLogout}><LogOut className="w-4 h-4 mr-2" /> Sair</Button>
      </header>

      <main className="max-w-7xl mx-auto p-6 space-y-6">
        {pets.map(pet => (
          <Card key={pet.id} className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center"><Video className="text-blue-600" /></div>
              <div>
                <h2 className="text-xl font-bold">{pet.name}</h2>
                <p className="text-muted-foreground">{pet.breed}</p>
              </div>
            </div>
          </Card>
        ))}

        <Card className="p-6">
          <h3 className="text-lg font-bold mb-4">Câmeras Disponíveis</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {availableCameras.map(cam => (
              <div key={cam.id} className="space-y-2">
                <p className="font-medium">{cam.name}</p>
                <CameraView 
                  camera={cam} 
                  isPlaying={isPlaying[cam.id] ?? true}
                  onTogglePlay={() => setIsPlaying(p => ({...p, [cam.id]: !p[cam.id]}))}
                  onToggleMute={() => {}}
                />
              </div>
            ))}
          </div>
        </Card>
      </main>
    </div>
  );
}
