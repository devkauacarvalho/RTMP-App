import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import Hls from "hls.js";
import { Button } from "./ui/button";
import { Card, CardContent } from "./ui/card";
import { Badge } from "./ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "./ui/tabs";
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
  Loader2,
  VideoOff,
  Calendar,
  Dog,
  Cat,
  Camera,
  ImageIcon,
  MessageCircle,
  Phone,
  Mail,
  MapPin,
  Clock,
  ExternalLink,
  Sun,
  Moon,
  ZoomIn,
  ZoomOut,
  PictureInPicture2,
} from "lucide-react";
import { cn } from "./ui/utils";

interface UserData {
  id?: string;
  username: string;
  userType: "admin" | "tutor";
  name?: string;
  email?: string;
  phone?: string;
}

interface CameraFeed {
  id: string;
  name: string;
  status: "ativo" | "inativo" | "live" | "offline";
  icon: React.ElementType;
  playableUrl: string;
}

interface TutorDashboardProps {
  onLogout: () => void;
  userData: UserData;
  theme: "light" | "dark";
  onToggleTheme: () => void;
}

const getIconForService = (serviceName: string): React.ElementType => {
  if (serviceName.includes("Hospedagem")) return Hotel;
  if (serviceName.includes("Recreação")) return Sparkles;
  if (serviceName.includes("Banho e Tosa")) return Scissors;
  return Video;
};

const getIconForSpecies = (species: string): React.ElementType => {
  const s = species?.toLowerCase() || "";
  if (s.includes("cat") || s.includes("gato") || s.includes("felino")) return Cat;
  return Dog;
};

const formatDate = (dateString: string): string => {
  if (!dateString) return "—";
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
};

// ─── CameraView ──────────────────────────────────────────────────────────────
// Mantido fora do componente pai para evitar unmount desnecessário ao re-render.
const CameraView = React.memo(({ camera, isPlaying: initialIsPlaying = true }: {
  camera: CameraFeed;
  isPlaying?: boolean;
}) => {
  const Icon = camera.icon;
  const isLive = (camera.status === "live" || camera.status === "ativo") && camera.playableUrl;
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [errorCount, setErrorCount] = useState(0);
  const [reloadKey, setReloadKey] = useState(0);
  const [isMuted, setIsMuted] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isPlaying, setIsPlaying] = useState(initialIsPlaying);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [isPiP, setIsPiP] = useState(false);
  const onTogglePlay = useCallback(() => setIsPlaying(p => !p), []);

  // ── Zoom Digital ──
  const MIN_ZOOM = 1;
  const MAX_ZOOM = 3;
  const ZOOM_STEP = 0.5;

  const handleZoomIn = useCallback(() => {
    setZoomLevel(prev => Math.min(prev + ZOOM_STEP, MAX_ZOOM));
  }, []);

  const handleZoomOut = useCallback(() => {
    setZoomLevel(prev => Math.max(prev - ZOOM_STEP, MIN_ZOOM));
  }, []);

  const handleResetZoom = useCallback(() => {
    setZoomLevel(1);
  }, []);

  useEffect(() => {
    if (!isLive || !videoRef.current || !camera.playableUrl) return;

    const video = videoRef.current;
    console.log(`[HLS] Inicializando player para ${camera.name}. URL: ${camera.playableUrl}`);

    if (Hls.isSupported()) {
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
        setErrorCount(0);
        if (isPlaying) {
          video.play().catch(() => {
            console.log(`[HLS] Autoplay bloqueado em ${camera.name}.`);
          });
        }
      });

      hls.on(Hls.Events.ERROR, (_event, data) => {
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
            console.error("[HLS] Muitas falhas. Reiniciando instância...");
            hls.destroy();
            setReloadKey(prev => prev + 1);
            setErrorCount(0);
            return;
          }

          setErrorCount(prev => prev + 1);

          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              setTimeout(() => hls.startLoad(), 5000);
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              hls.recoverMediaError();
              break;
            default:
              hls.destroy();
              break;
          }
        }
      });
    } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
      // Safari/iOS — suporte nativo a HLS
      video.src = camera.playableUrl;
    }

    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [camera.playableUrl, isLive, reloadKey]);

  // Sincronizar estado play/pause com o player de vídeo
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

  // Listener para sincronizar saída do Picture-in-Picture
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const handleLeavePiP = () => setIsPiP(false);
    const handleEnterPiP = () => setIsPiP(true);
    video.addEventListener("leavepictureinpicture", handleLeavePiP);
    video.addEventListener("enterpictureinpicture", handleEnterPiP);
    return () => {
      video.removeEventListener("leavepictureinpicture", handleLeavePiP);
      video.removeEventListener("enterpictureinpicture", handleEnterPiP);
    };
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

  const handleTogglePiP = useCallback(async () => {
    const video = videoRef.current;
    if (!video) return;
    try {
      if (document.pictureInPictureElement === video) {
        await document.exitPictureInPicture();
      } else {
        await video.requestPictureInPicture();
      }
    } catch (err) {
      console.warn("[PiP] Erro ao alternar Picture-in-Picture:", err);
    }
  }, []);

  const handleTakeSnapshot = useCallback(() => {
    const video = videoRef.current;
    if (!video || video.readyState < 2) return;

    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth || video.clientWidth;
    canvas.height = video.videoHeight || video.clientHeight;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
    const filename = `${camera.name.replace(/\s+/g, "_")}_${timestamp}.png`;

    canvas.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = filename;
      anchor.click();
      URL.revokeObjectURL(url);
    }, "image/png");
  }, [camera.name]);

  return (
    <div
      ref={containerRef}
      className="relative bg-black rounded-xl overflow-hidden aspect-video group shadow-lg"
      key={reloadKey}
    >
      {isLive ? (
        <video
          ref={videoRef}
          className="w-full h-full object-contain transition-transform duration-300 ease-out"
          style={{ transform: `scale(${zoomLevel})` }}
          muted
          autoPlay
          playsInline
        />
      ) : (
        <div className="absolute inset-0 bg-gray-900 flex flex-col items-center justify-center text-white/40 gap-3">
          <VideoOff className="w-14 h-14" />
          <p className="text-sm font-medium">Stream Offline</p>
          <p className="text-xs text-center px-6 opacity-60">{camera.name}</p>
        </div>
      )}

      {/* Badge AO VIVO */}
      {isLive && (
        <div className="absolute top-3 left-3 flex items-center gap-1.5 bg-red-600 text-white px-2.5 py-1 rounded-full text-xs font-semibold shadow-md pointer-events-none">
          <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
          AO VIVO
        </div>
      )}

      {/* Badge do nome da câmera */}
      <div className="absolute top-3 right-3 pointer-events-none">
        <Badge className="bg-white/90 text-gray-900 flex items-center gap-1 text-xs shadow border-0 dark:bg-slate-800/90 dark:text-gray-100">
          <Icon className="w-3 h-3" />
          {camera.name}
        </Badge>
      </div>

      {/* Barra de controles customizada — glassmorphism overlay */}
      {isLive && (
        <div className="absolute bottom-0 left-0 right-0 flex items-center justify-between px-4 py-3 bg-black/40 backdrop-blur-md opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          {/* ── Esquerda: Play/Pause, Tirar Print ── */}
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

            {/* Tirar Print */}
            <button
              onClick={handleTakeSnapshot}
              className="text-white hover:bg-white/20 rounded-full p-2 transition-colors"
              title="Tirar print"
            >
              <Camera className="w-5 h-5" />
            </button>

            {/* Mute / Volume (Temporariamente desabilitado) */}
            {/*
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
            */}
          </div>

          {/* ── Centro: Controles de Zoom Digital ── */}
          <div className="flex items-center gap-1">
            <button
              onClick={handleZoomOut}
              disabled={zoomLevel <= MIN_ZOOM}
              className="text-white hover:bg-white/20 rounded-full p-2 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              title="Diminuir zoom"
            >
              <ZoomOut className="w-4 h-4" />
            </button>

            <button
              onClick={handleResetZoom}
              className="text-white text-xs font-mono min-w-[3rem] text-center hover:bg-white/20 rounded-md px-1.5 py-1 transition-colors"
              title="Resetar zoom"
            >
              {zoomLevel.toFixed(1)}x
            </button>

            <button
              onClick={handleZoomIn}
              disabled={zoomLevel >= MAX_ZOOM}
              className="text-white hover:bg-white/20 rounded-full p-2 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              title="Aumentar zoom"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
          </div>

          {/* ── Direita: PiP, Recarregar, Tela Cheia ── */}
          <div className="flex items-center gap-1">
            {/* Picture-in-Picture */}
            <button
              onClick={handleTogglePiP}
              className={cn(
                "text-white hover:bg-white/20 rounded-full p-2 transition-colors",
                isPiP && "bg-white/25"
              )}
              title={isPiP ? "Sair do Picture-in-Picture" : "Picture-in-Picture"}
            >
              <PictureInPicture2 className="w-4 h-4" />
            </button>

            {/* Recarregar sinal */}
            <button
              onClick={() => { setReloadKey(prev => prev + 1); setZoomLevel(1); }}
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

CameraView.displayName = "CameraView";

// ─── TutorDashboard ───────────────────────────────────────────────────────────
export function TutorDashboard({ onLogout, userData, theme, onToggleTheme }: TutorDashboardProps) {
  const [pets, setPets] = useState<any[]>([]);
  const [cameras, setCameras] = useState<CameraFeed[]>([]);
  const [loading, setLoading] = useState(true);

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
        const cameraData: CameraFeed[] = data.cameras.map((cam: any) => ({
          ...cam,
          icon: getIconForService(cam.name),
        }));

        setCameras(prev => {
          // Evita re-render desnecessário se status não mudou
          const hasChanged =
            JSON.stringify(prev.map(c => ({ id: c.id, s: c.status }))) !==
            JSON.stringify(cameraData.map(c => ({ id: c.id, s: c.status })));
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

  // Filtra câmeras cujo nome corresponde a um serviço contratado pelo pet do tutor
  const availableCameras = useMemo(() => {
    return cameras.filter(cam =>
      pets.some(pet => (pet.services as string[]).includes(cam.name))
    );
  }, [cameras, pets]);

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-indigo-100 via-purple-100 to-pink-100 dark:from-slate-950 dark:via-indigo-950 dark:to-slate-900">
      {/* Header — consistente com AdminDashboard */}
      <header className="bg-white/70 backdrop-blur-xl border-b border-white/30 shadow-lg shadow-indigo-500/5 sticky top-0 z-30 dark:bg-slate-900/70 dark:border-white/10">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-br from-blue-500 to-purple-600 p-2.5 rounded-xl shadow-lg shadow-purple-500/30">
              <PawPrint className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold">Hotel Pet Paradise</h1>
              <p className="text-xs text-muted-foreground">Portal do Tutor</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <p className="text-sm font-medium hidden sm:block">{userData.username}</p>
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
            <Button variant="outline" size="sm" onClick={onLogout}>
              <LogOut className="w-4 h-4 mr-2" /> Sair
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-4 sm:p-6">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-10 h-10 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <Tabs defaultValue="resumo" className="w-full">
            {/* ── Tab List ── */}
            <TabsList className="w-full grid grid-cols-4 mb-6 h-auto p-1.5 bg-white/50 backdrop-blur-lg border border-white/40 rounded-xl shadow-lg shadow-indigo-500/5 dark:bg-slate-800/40 dark:border-white/10">
              <TabsTrigger
                value="resumo"
                id="tab-resumo"
                className="flex items-center gap-1.5 py-2.5 text-sm font-medium"
              >
                <PawPrint className="w-4 h-4 shrink-0" />
                <span className="hidden sm:inline">Resumo & Pets</span>
              </TabsTrigger>
              <TabsTrigger
                value="cameras"
                id="tab-cameras"
                className="flex items-center gap-1.5 py-2.5 text-sm font-medium"
              >
                <Video className="w-4 h-4 shrink-0" />
                <span className="hidden sm:inline">Câmeras ao Vivo</span>
              </TabsTrigger>
              <TabsTrigger
                value="galeria"
                id="tab-galeria"
                className="flex items-center gap-1.5 py-2.5 text-sm font-medium"
              >
                <ImageIcon className="w-4 h-4 shrink-0" />
                <span className="hidden sm:inline">Galeria de Fotos</span>
              </TabsTrigger>
              <TabsTrigger
                value="suporte"
                id="tab-suporte"
                className="flex items-center gap-1.5 py-2.5 text-sm font-medium"
              >
                <MessageCircle className="w-4 h-4 shrink-0" />
                <span className="hidden sm:inline">Suporte & Contato</span>
              </TabsTrigger>
            </TabsList>

            {/* ── Aba 1: Resumo & Pets ── */}
            <TabsContent value="resumo" className="mt-0">
              {pets.length === 0 ? (
                <Card className="p-8 text-center text-muted-foreground bg-white/60 backdrop-blur-xl border border-white/30 shadow-xl shadow-indigo-500/5 dark:bg-slate-800/40 dark:border-white/10">
                  <PawPrint className="w-10 h-10 mx-auto mb-2 opacity-30" />
                  <p>Nenhum pet encontrado para este tutor.</p>
                </Card>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {pets.map(pet => {
                    const PetIcon = getIconForSpecies(pet.species || "");
                    return (
                      <Card key={pet.id} className="p-5 flex gap-4 items-start bg-white/60 backdrop-blur-xl border border-white/40 shadow-xl shadow-indigo-500/5 hover:shadow-2xl hover:shadow-purple-500/10 transition-all duration-300 dark:bg-slate-800/40 dark:border-white/10">
                        <div className="w-14 h-14 rounded-full bg-gradient-to-br from-blue-200 to-purple-200 flex items-center justify-center shrink-0 shadow-md shadow-purple-500/10 ring-2 ring-white/50 dark:from-blue-900/50 dark:to-purple-900/50">
                          <PetIcon className="w-7 h-7 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h2 className="text-lg font-bold leading-tight">{pet.name}</h2>
                          <p className="text-sm text-muted-foreground">{pet.breed} · {pet.species}</p>
                          {(pet.check_in || pet.checkIn) && (
                            <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                              <Calendar className="w-3 h-3" />
                              {formatDate(pet.check_in || pet.checkIn)} → {formatDate(pet.check_out || pet.checkOut)}
                            </p>
                          )}
                          {pet.services?.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-2">
                              {(pet.services as string[]).map(s => (
                                <Badge key={s} variant="secondary" className="text-[10px] h-4">{s}</Badge>
                              ))}
                            </div>
                          )}
                        </div>
                      </Card>
                    );
                  })}
                </div>
              )}
            </TabsContent>

            {/* ── Aba 2: Câmeras ao Vivo ── */}
            <TabsContent value="cameras" className="mt-0">
              <Card className="p-6 bg-white/60 backdrop-blur-xl border border-white/30 shadow-xl shadow-indigo-500/5 dark:bg-slate-800/40 dark:border-white/10">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold flex items-center gap-2">
                    <Video className="w-5 h-5" /> Câmeras ao Vivo
                  </h3>
                  <Badge variant="secondary">
                    {availableCameras.filter(c => c.status === 'ativo' || c.status === 'live').length} online
                  </Badge>
                </div>

                {availableCameras.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-muted-foreground gap-2">
                    <VideoOff className="w-10 h-10 opacity-30" />
                    <p className="text-sm">Nenhuma câmera disponível para os serviços contratados.</p>
                  </div>
                ) : (
                  <div className={cn(
                    "grid gap-6",
                    availableCameras.length === 1 ? "grid-cols-1 max-w-2xl mx-auto" : "grid-cols-1 md:grid-cols-2"
                  )}>
                    {availableCameras.map(cam => (
                      <div key={cam.id} className="space-y-2">
                        <div className="flex items-center gap-2">
                          <cam.icon className="w-4 h-4 text-muted-foreground" />
                          <p className="font-medium text-sm">{cam.name}</p>
                          <Badge
                            variant={cam.status === 'ativo' || cam.status === 'live' ? 'default' : 'secondary'}
                            className={cn("ml-auto text-[10px]", (cam.status === 'ativo' || cam.status === 'live') && 'bg-green-500')}
                          >
                            {cam.status === 'ativo' || cam.status === 'live' ? 'Online' : 'Offline'}
                          </Badge>
                        </div>
                        <CameraView
                          camera={cam}
                          isPlaying={true}
                        />
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            </TabsContent>

            {/* ── Aba 3: Galeria de Fotos ── */}
            <TabsContent value="galeria" className="mt-0">
              <Card className="p-12 bg-white/60 backdrop-blur-xl border border-white/30 shadow-xl shadow-indigo-500/5 dark:bg-slate-800/40 dark:border-white/10">
                <div className="flex flex-col items-center justify-center text-center gap-4 text-muted-foreground">
                  <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-200/80 to-purple-200/80 flex items-center justify-center shadow-lg shadow-purple-500/10 ring-2 ring-white/40">
                    <ImageIcon className="w-10 h-10 text-blue-400" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-lg font-semibold text-foreground">Galeria de Fotos</h3>
                    <p className="text-sm max-w-xs">
                      As fotos capturadas das câmeras ao vivo aparecerão aqui. Esta funcionalidade estará disponível em breve.
                    </p>
                  </div>
                  <Badge variant="secondary" className="text-xs">Em desenvolvimento</Badge>
                </div>
              </Card>
            </TabsContent>

            {/* ── Aba 4: Suporte & Contato ── */}
            <TabsContent value="suporte" className="mt-0">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Card — Contato */}
                <Card className="p-6 space-y-4 bg-white/60 backdrop-blur-xl border border-white/30 shadow-xl shadow-indigo-500/5 dark:bg-slate-800/40 dark:border-white/10">
                  <h3 className="text-lg font-bold flex items-center gap-2">
                    <MessageCircle className="w-5 h-5 text-blue-500" />
                    Fale Conosco
                  </h3>
                  <div className="space-y-3">
                    <a
                      href="https://wa.me/5511999999999"
                      target="_blank"
                      rel="noopener noreferrer"
                      id="whatsapp-link"
                      className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted transition-colors group"
                    >
                      <div className="w-9 h-9 rounded-full bg-green-100/80 flex items-center justify-center shrink-0 ring-1 ring-green-200/50">
                        <Phone className="w-4 h-4 text-green-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium">WhatsApp</p>
                        <p className="text-xs text-muted-foreground">(11) 99999-9999</p>
                      </div>
                      <ExternalLink className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                    </a>

                    <a
                      href="mailto:dev.kauacarvalho@gmail.com"
                      id="email-link"
                      className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted transition-colors group"
                    >
                      <div className="w-9 h-9 rounded-full bg-blue-100/80 flex items-center justify-center shrink-0 ring-1 ring-blue-200/50">
                        <Mail className="w-4 h-4 text-blue-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium">E-mail</p>
                        <p className="text-xs text-muted-foreground truncate">dev.kauacarvalho@gmail.com</p>
                      </div>
                      <ExternalLink className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                    </a>

                    <div className="flex items-center gap-3 p-3 rounded-lg bg-white/30 backdrop-blur-sm border border-white/20 dark:bg-slate-800/30 dark:border-white/10">
                      <div className="w-9 h-9 rounded-full bg-orange-100/80 flex items-center justify-center shrink-0 ring-1 ring-orange-200/50">
                        <MapPin className="w-4 h-4 text-orange-600" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">Endereço</p>
                        <p className="text-xs text-muted-foreground">Rua das Flores, 123 — São Paulo, SP</p>
                      </div>
                    </div>
                  </div>
                </Card>

                {/* Card — Horários */}
                <Card className="p-6 space-y-4 bg-white/60 backdrop-blur-xl border border-white/30 shadow-xl shadow-indigo-500/5">
                  <h3 className="text-lg font-bold flex items-center gap-2">
                    <Clock className="w-5 h-5 text-purple-500" />
                    Horário de Atendimento
                  </h3>
                  <div className="space-y-2">
                    {[
                      { dias: "Segunda a Sexta", horario: "08:00 – 19:00" },
                      { dias: "Sábado", horario: "08:00 – 17:00" },
                      { dias: "Domingo e Feriados", horario: "09:00 – 14:00" },
                    ].map(({ dias, horario }) => (
                      <div key={dias} className="flex items-center justify-between py-2 border-b last:border-0">
                        <span className="text-sm text-muted-foreground">{dias}</span>
                        <span className="text-sm font-medium">{horario}</span>
                      </div>
                    ))}
                  </div>
                  <div className="mt-4 p-3 rounded-lg bg-blue-50/70 backdrop-blur-sm border border-blue-200/40 dark:bg-blue-950/40 dark:border-blue-800/30">
                    <p className="text-xs text-blue-700 leading-relaxed dark:text-blue-300">
                      💬 Para emergências fora do horário de atendimento, envie uma mensagem no WhatsApp — nossa equipe responderá o mais rápido possível.
                    </p>
                  </div>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        )}
      </main>
    </div>
  );
}
