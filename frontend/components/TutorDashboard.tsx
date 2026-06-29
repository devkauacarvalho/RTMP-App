import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import Hls from "hls.js";
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
  Minimize2,
  Volume2,
  VolumeX,
  Hotel,
  Sparkles,
  Scissors,
  RefreshCw,
  VideoOff
} from "lucide-react";

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
const CameraView = React.memo(({ camera, isPlaying, onTogglePlay }: {
  camera: CameraFeed;
  isPlaying: boolean;
  onTogglePlay: () => void;
}) => {
  const Icon = camera.icon;
  const isLive = (camera.status === "live" || camera.status === "ativo") && camera.playableUrl;
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [errorCount, setErrorCount] = useState(0);
  const [key, setKey] = useState(0);
  const [isMuted, setIsMuted] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    if (!isLive || !videoRef.current || !camera.playableUrl) {
      console.log(`[HLS] Camera ${camera.name} não está live ou falta URL.`);
      return;
    }

    const video = videoRef.current;
    console.log(`[HLS] Inicializando player para ${camera.name}. URL: ${camera.playableUrl}`);

    // Prioridade 1: Usar hls.js (Melhor para Chrome, Edge, Firefox)
    if (Hls.isSupported()) {
      console.log(`[HLS] Usando hls.js para ${camera.name}`);
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: true,
        liveSyncDurationCount: 2,
        manifestLoadingMaxRetry: 10,
        manifestLoadingRetryDelay: 2000,
        maxBufferLength: 30,
        maxMaxBufferLength: 60,
        appendErrorMaxRetry: 20,
        nudgeMaxRetry: 10,
        nudgeOffset: 0.2,
      });
      hlsRef.current = hls;

      hls.loadSource(camera.playableUrl);
      hls.attachMedia(video);

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        console.log(`[HLS] Manifest carregado para ${camera.name}`);
        setErrorCount(0);
        if (isPlaying) {
          video.play().catch(() => {
            console.log(`[HLS] Autoplay bloqueado em ${camera.name}.`);
          });
        }
      });

      hls.on(Hls.Events.ERROR, (event, data) => {
        if (data.fatal) {
          console.warn(`[HLS] Erro fatal (${data.details}) em ${camera.name}. Tentativa ${errorCount + 1}`);

          // Tratamento específico para 404 (Sugerido no Checklist)
          if (data.response && data.response.code === 404) {
            console.warn(`[HLS] Stream não encontrado (404) para ${camera.name}. O DVR pode estar offline ou não autorizado.`);
            hls.destroy();
            hlsRef.current = null;
            return;
          }

          if (errorCount > 10) {
            console.error("[HLS] Muitas falhas. Reiniciando instância completa...");
            hls.destroy();
            setKey(prev => prev + 1);
            setErrorCount(0);
            return;
          }

          setErrorCount(prev => prev + 1);

          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              console.log("[HLS] Erro de rede. Recarregando fonte em 5s...");
              setTimeout(() => hls.startLoad(), 5000);
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              console.log("[HLS] Erro de mídia. Tentando recuperar buffer...");
              hls.recoverMediaError();
              break;
            default:
              hls.destroy();
              break;
          }
        }
      });
    }
    // Prioridade 2: Suporte nativo (Apenas se hls.js não funcionar - ex: Safari/iOS)
    else if (video.canPlayType("application/vnd.apple.mpegurl")) {
      console.log(`[HLS] Usando suporte nativo (Safari/iOS) para ${camera.name}`);
      video.src = camera.playableUrl;
    }

    return () => {
      if (hlsRef.current) {
        console.log(`[HLS] Destruindo instância para ${camera.name}`);
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [camera.playableUrl, isLive, key]);

  // Sincronizar estado isPlaying com o player
  useEffect(() => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.play().catch(() => { });
    } else {
      videoRef.current.pause();
    }
  }, [isPlaying]);

  // Listener para sincronizar saída do fullscreen (ex: tecla ESC)
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  const handleToggleMute = useCallback(() => {
    if (!videoRef.current) return;
    const next = !isMuted;
    videoRef.current.muted = next;
    setIsMuted(next);
  }, [isMuted]);

  const handleToggleFullscreen = useCallback(async () => {
    if (!containerRef.current) return;
    try {
      if (!document.fullscreenElement) {
        await containerRef.current.requestFullscreen();
      } else {
        await document.exitFullscreen();
      }
    } catch (err) {
      console.warn("[Fullscreen] Erro ao alternar tela cheia:", err);
    }
  }, []);

  return (
    <div
      ref={containerRef}
      className="relative bg-black rounded-lg overflow-hidden aspect-video group"
      key={key}
    >
      {isLive ? (
        <video
          ref={videoRef}
          className="w-full h-full object-contain"
          muted
          autoPlay
          playsInline
        />
      ) : (
        <div className="absolute inset-0 bg-gray-900 flex flex-col items-center justify-center text-white/50">
          <VideoOff className="w-16 h-16 mx-auto mb-2" />
          <p>Stream Offline</p>
          <p className="text-xs text-center px-4 mt-2 break-all opacity-50">
            {camera.name}
          </p>
        </div>
      )}

      {/* Badge AO VIVO */}
      {isLive && (
        <div className="absolute top-4 left-4 flex items-center gap-2 bg-red-500 text-white px-3 py-1 rounded-full text-xs shadow-lg pointer-events-none">
          <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
          <span>AO VIVO</span>
        </div>
      )}

      {/* Badge nome da câmera */}
      <div className="absolute top-4 right-4 pointer-events-none">
        <Badge className="bg-white/90 text-black flex items-center gap-1 text-xs shadow-md">
          <Icon className="w-3 h-3" />
          {camera.name}
        </Badge>
      </div>

      {/* Barra de controles customizada — glassmorphism overlay */}
      {isLive && (
        <div className="absolute bottom-0 left-0 right-0 flex items-center justify-between px-4 py-3 bg-black/40 backdrop-blur-md opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          <div className="flex items-center gap-1">
            {/* Play / Pause */}
            <button
              onClick={onTogglePlay}
              className="text-white hover:bg-white/20 rounded-full p-2 transition-colors"
              title={isPlaying ? "Pausar" : "Reproduzir"}
            >
              {isPlaying ? (
                <Pause className="w-5 h-5" />
              ) : (
                <Play className="w-5 h-5" />
              )}
            </button>

            {/* Mute / Volume */}
            <button
              onClick={handleToggleMute}
              className="text-white hover:bg-white/20 rounded-full p-2 transition-colors"
              title={isMuted ? "Ativar som" : "Silenciar"}
            >
              {isMuted ? (
                <VolumeX className="w-5 h-5" />
              ) : (
                <Volume2 className="w-5 h-5" />
              )}
            </button>
          </div>

          <div className="flex items-center gap-1">
            {/* Recarregar sinal */}
            <button
              onClick={() => setKey(prev => prev + 1)}
              className="text-white hover:bg-white/20 rounded-full p-2 transition-colors"
              title="Recarregar sinal"
            >
              <RefreshCw className="w-4 h-4" />
            </button>

            {/* Tela Cheia */}
            <button
              onClick={handleToggleFullscreen}
              className="text-white hover:bg-white/20 rounded-full p-2 transition-colors"
              title={isFullscreen ? "Sair da tela cheia" : "Tela cheia"}
            >
              {isFullscreen ? (
                <Minimize2 className="w-5 h-5" />
              ) : (
                <Maximize2 className="w-5 h-5" />
              )}
            </button>
          </div>
        </div>
      )}
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
          const hasChanged = JSON.stringify(prev.map(c => ({ id: c.id, s: c.status }))) !==
            JSON.stringify(cameraData.map((c: any) => ({ id: c.id, s: c.status })));
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
                  onTogglePlay={() => setIsPlaying(p => ({ ...p, [cam.id]: !p[cam.id] }))}
                />
              </div>
            ))}
          </div>
        </Card>
      </main>
    </div>
  );
}
