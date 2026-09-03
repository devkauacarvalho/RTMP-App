import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import Hls from "hls.js";
import { Button } from "./ui/button";
import { Card } from "./ui/card";
import { Badge } from "./ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "./ui/tabs";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { Dialog, DialogContent } from "./ui/dialog";
import {
  LogOut,
  PawPrint,
  Video,
  Play,
  Pause,
  Maximize2,
  Minimize2,
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
  Download,
  Trash2,
} from "lucide-react";
import { cn } from "./ui/utils";
import { toast } from "sonner";

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

interface GalleryPhoto {
  id: string;
  image: string;
  date: string;
  frame: string;
  cameraName: string;
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

// Preload as imagens das molduras para captura instantânea
const preloadedFrames: Record<string, HTMLImageElement> = {};
if (typeof window !== "undefined") {
  ["patas", "estrela", "paradise"].forEach(id => {
    const img = new Image();
    img.src = `/frames/${id}.svg`;
    preloadedFrames[id] = img;
  });
}

// ─── CameraView ──────────────────────────────────────────────────────────────
// Mantido fora do componente pai para evitar unmount desnecessário ao re-render.
const CameraView = React.memo(({ camera, isPlaying: initialIsPlaying = true }: {
  camera: CameraFeed;
  isPlaying?: boolean;
}) => {
  const Icon = camera.icon;
  const isLive = camera.status === "live" || camera.status === "ativo";
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
  const [isBuffering, setIsBuffering] = useState(true);
  const onTogglePlay = useCallback(() => setIsPlaying(p => !p), []);

  // Normalização da URL do stream para evitar problemas de Mixed Content (HTTP em HTTPS) ou porta 8080 direta
  const playableUrl = useMemo(() => {
    let url = camera.playableUrl || `/live/${camera.id}.m3u8`;
    if (url.includes(':8080/live/')) {
      url = '/live/' + url.split(':8080/live/')[1];
    }
    return url;
  }, [camera.playableUrl, camera.id]);

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
    if (!isLive || !videoRef.current || !playableUrl) return;

    const video = videoRef.current;
    video.muted = true;
    setIsBuffering(true);
    console.log(`[HLS] Inicializando player para ${camera.name}. URL: ${playableUrl}`);

    if (Hls.isSupported()) {
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: true,
        liveSyncDurationCount: 2,
        manifestLoadingMaxRetry: 20,
        manifestLoadingRetryDelay: 1500,
        maxBufferLength: 30,
        maxMaxBufferLength: 60,
        appendErrorMaxRetry: 20,
        nudgeMaxRetry: 10,
        nudgeOffset: 0.2,
      });
      hlsRef.current = hls;

      hls.loadSource(playableUrl);
      hls.attachMedia(video);

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        setErrorCount(0);
        setIsBuffering(false);
        if (isPlaying) {
          video.play().catch((err) => {
            console.log(`[HLS] Autoplay pendente em ${camera.name}:`, err);
          });
        }
      });

      hls.on(Hls.Events.FRAG_BUFFERED, () => {
        setIsBuffering(false);
      });

      hls.on(Hls.Events.ERROR, (_event, data) => {
        if (data.fatal) {
          console.warn(`[HLS] Erro fatal (${data.details}) em ${camera.name}. Tentativa ${errorCount + 1}`);

          // Quando o stream acabou de iniciar, o SRS pode levar 2-4s para gerar o primeiro .m3u8 (404 temporário)
          if (data.response && data.response.code === 404) {
            console.warn(`[HLS] Stream ainda gerando arquivos (404) para ${camera.name}. Tentando novamente em 2s...`);
            setTimeout(() => {
              if (hlsRef.current) {
                hls.loadSource(playableUrl);
                hls.startLoad();
              }
            }, 2000);
            return;
          }

          if (errorCount > 10) {
            console.error("[HLS] Muitas falhas. Reiniciando instância...");
            hls.destroy();
            setTimeout(() => setReloadKey(prev => prev + 1), 3000);
            setErrorCount(0);
            return;
          }

          setErrorCount(prev => prev + 1);

          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              setTimeout(() => {
                if (hlsRef.current) hls.startLoad();
              }, 2500);
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              hls.recoverMediaError();
              break;
            default:
              hls.destroy();
              setTimeout(() => setReloadKey(prev => prev + 1), 3000);
              break;
          }
        }
      });
    } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
      // Safari/iOS — suporte nativo a HLS
      video.src = playableUrl;
      video.addEventListener("loadedmetadata", () => {
        setIsBuffering(false);
        if (isPlaying) video.play().catch(() => {});
      });
    }

    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [playableUrl, isLive, reloadKey]);

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

  const handleTakeSnapshot = useCallback((frameId: string) => {
    const video = videoRef.current;
    if (!video || video.readyState < 2) return;

    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth || video.clientWidth;
    canvas.height = video.videoHeight || video.clientHeight;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Desenha o frame original do vídeo
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Aplica a moldura selecionada
    if (frameId !== "original" && preloadedFrames[frameId]) {
      // Desenha a moldura SVG por cima, esticando/encolhendo para caber no canvas
      ctx.drawImage(preloadedFrames[frameId], 0, 0, canvas.width, canvas.height);
    }

    // Pega a imagem final em base64
    const base64Image = canvas.toDataURL("image/jpeg", 0.85);

    // Salva no localStorage (Galeria)
    const newPhoto = {
      id: Date.now().toString(),
      image: base64Image,
      date: new Date().toISOString(),
      frame: frameId,
      cameraName: camera.name
    };

    const existingGallery = JSON.parse(localStorage.getItem("petmonitor_gallery") || "[]");
    localStorage.setItem("petmonitor_gallery", JSON.stringify([newPhoto, ...existingGallery]));
    window.dispatchEvent(new Event("gallery-updated"));

    toast.success("Foto salva na galeria!");
  }, [camera.name]);

  return (
    <div
      ref={containerRef}
      className="relative bg-black rounded-xl overflow-hidden aspect-video group shadow-lg"
      key={reloadKey}
    >
      {isLive ? (
        <>
          <video
            ref={videoRef}
            className="w-full h-full object-contain transition-transform duration-300 ease-out"
            style={{ transform: `scale(${zoomLevel})` }}
            muted
            autoPlay
            playsInline
          />
          {isBuffering && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/40 backdrop-blur-xs gap-2 pointer-events-none">
              <Loader2 className="w-8 h-8 text-white animate-spin" />
              <p className="text-xs text-white/80 font-medium">Carregando transmissão...</p>
            </div>
          )}
        </>
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
              className="text-white hover:bg-white/20 rounded-full p-2 transition-all duration-300 hover:scale-110 active:scale-95"
              title={isPlaying ? "Pausar" : "Reproduzir"}
            >
              {isPlaying ? (
                <Pause className="w-5 h-5" />
              ) : (
                <Play className="w-5 h-5" />
              )}
            </button>

            {/* Tirar Print com Popover */}
            <Popover>
              <PopoverTrigger asChild>
                <button
                  className="text-white hover:bg-white/20 rounded-full p-2 transition-all duration-300 hover:scale-110 active:scale-95"
                  title="Tirar print"
                >
                  <Camera className="w-5 h-5" />
                </button>
              </PopoverTrigger>
              <PopoverContent side="top" align="start" className="w-64 p-2 bg-white/80 backdrop-blur-xl border-white/40 shadow-xl dark:bg-slate-900/80 dark:border-white/10">
                <div className="space-y-1">
                  <p className="text-xs font-semibold text-muted-foreground px-2 pt-1 pb-2">Escolha uma moldura:</p>
                  <button onClick={() => handleTakeSnapshot("patas")} className="w-full flex items-center gap-3 px-2 py-2 rounded-md hover:bg-indigo-100/50 dark:hover:bg-indigo-900/50 transition-colors">
                    <img src="/frames/patas.svg" alt="Patas de Amor" className="w-10 h-6 object-cover bg-black/5 rounded-sm ring-1 ring-black/10" />
                    <span className="text-sm font-medium">Patas de Amor</span>
                  </button>
                  <button onClick={() => handleTakeSnapshot("estrela")} className="w-full flex items-center gap-3 px-2 py-2 rounded-md hover:bg-indigo-100/50 dark:hover:bg-indigo-900/50 transition-colors">
                    <img src="/frames/estrela.svg" alt="Estrela Pet" className="w-10 h-6 object-cover bg-black/5 rounded-sm ring-1 ring-black/10" />
                    <span className="text-sm font-medium">Estrela Pet</span>
                  </button>
                  <button onClick={() => handleTakeSnapshot("paradise")} className="w-full flex items-center gap-3 px-2 py-2 rounded-md hover:bg-indigo-100/50 dark:hover:bg-indigo-900/50 transition-colors">
                    <img src="/frames/paradise.svg" alt="Hotel Paradise" className="w-10 h-6 object-cover bg-black/5 rounded-sm ring-1 ring-black/10" />
                    <span className="text-sm font-medium">Hotel Paradise</span>
                  </button>
                  <div className="h-px bg-border my-1" />
                  <button onClick={() => handleTakeSnapshot("original")} className="w-full text-left px-2 py-2 rounded-md text-sm hover:bg-red-50 dark:hover:bg-red-950/30 text-red-600 dark:text-red-400 transition-colors">
                    🚫 Original (sem moldura)
                  </button>
                </div>
              </PopoverContent>
            </Popover>

            {/* Mute / Volume (Temporariamente desabilitado) */}
            {/*
            <button
              onClick={handleToggleMute}
              className="text-white hover:bg-white/20 rounded-full p-2 transition-all duration-300 hover:scale-110 active:scale-95"
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
              className="text-white hover:bg-white/20 rounded-full p-2 transition-all duration-300 hover:scale-110 active:scale-95"
              title="Recarregar sinal"
            >
              <RefreshCw className="w-4 h-4" />
            </button>

            {/* Tela Cheia */}
            <button
              onClick={handleToggleFullscreen}
              className="text-white hover:bg-white/20 rounded-full p-2 transition-all duration-300 hover:scale-110 active:scale-95"
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
  const [gallery, setGallery] = useState<GalleryPhoto[]>([]);
  const [selectedPhoto, setSelectedPhoto] = useState<GalleryPhoto | null>(null);
  const [loading, setLoading] = useState(true);

  const loadGallery = useCallback(() => {
    try {
      const stored = JSON.parse(localStorage.getItem("petmonitor_gallery") || "[]");
      setGallery(stored);
    } catch (err) {
      console.error(err);
    }
  }, []);

  const handleDownloadPhoto = (photo: GalleryPhoto) => {
    const timestamp = new Date(photo.date).toISOString().replace(/[:.]/g, "-").slice(0, 19);
    const filename = `${photo.cameraName.replace(/\s+/g, "_")}_${timestamp}.png`;
    const anchor = document.createElement("a");
    anchor.href = photo.image;
    anchor.download = filename;
    anchor.click();
  };

  const handleDeletePhoto = (photoId: string) => {
    const newGallery = gallery.filter(p => p.id !== photoId);
    setGallery(newGallery);
    localStorage.setItem("petmonitor_gallery", JSON.stringify(newGallery));
    setSelectedPhoto(null);
    toast.success("Foto excluída da galeria.");
  };

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
    loadGallery();
    const interval = setInterval(() => loadData(true), 15000);
    
    window.addEventListener("gallery-updated", loadGallery);
    return () => {
      clearInterval(interval);
      window.removeEventListener("gallery-updated", loadGallery);
    };
  }, [loadGallery]);

  // Filtra câmeras cujo nome corresponde a um serviço contratado pelo pet do tutor
  const availableCameras = useMemo(() => {
    return cameras.filter(cam =>
      pets.some(pet => (pet.services as string[]).includes(cam.name))
    );
  }, [cameras, pets]);

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-teal-50 via-cyan-50 to-emerald-50 dark:from-slate-950 dark:via-teal-950 dark:to-slate-900">
      {/* Header — consistente com AdminDashboard */}
      <header className="bg-white/70 backdrop-blur-xl border-b border-white/30 shadow-lg shadow-indigo-500/5 sticky top-0 z-30 dark:bg-slate-900/70 dark:border-white/10">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10">
              <img src="/logo.png" alt="Pet La Belle Logo" className="w-full h-full object-contain drop-shadow-md" />
            </div>
            <div>
              <h1 className="text-xl font-bold">Pet La Belle</h1>
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
              <TabsTrigger value="resumo" className="gap-2 px-6 py-2.5 rounded-full data-[state=active]:bg-white data-[state=active]:text-indigo-900 data-[state=active]:shadow-lg hover:bg-white/50 transition-all duration-300 dark:data-[state=active]:bg-indigo-600 dark:data-[state=active]:text-white">
                <PawPrint className="w-4 h-4" /> Resumo & Pets
              </TabsTrigger>
              <TabsTrigger value="cameras" className="gap-2 px-6 py-2.5 rounded-full data-[state=active]:bg-white data-[state=active]:text-indigo-900 data-[state=active]:shadow-lg hover:bg-white/50 transition-all duration-300 dark:data-[state=active]:bg-indigo-600 dark:data-[state=active]:text-white">
                <Video className="w-4 h-4" /> Câmeras ao Vivo
              </TabsTrigger>
              <TabsTrigger value="galeria" className="gap-2 px-6 py-2.5 rounded-full data-[state=active]:bg-white data-[state=active]:text-indigo-900 data-[state=active]:shadow-lg hover:bg-white/50 transition-all duration-300 dark:data-[state=active]:bg-indigo-600 dark:data-[state=active]:text-white">
                <ImageIcon className="w-4 h-4" /> Galeria de Fotos
              </TabsTrigger>
              <TabsTrigger value="suporte" className="gap-2 px-6 py-2.5 rounded-full data-[state=active]:bg-white data-[state=active]:text-indigo-900 data-[state=active]:shadow-lg hover:bg-white/50 transition-all duration-300 dark:data-[state=active]:bg-indigo-600 dark:data-[state=active]:text-white">
                <Phone className="w-4 h-4" /> Suporte & Contato
              </TabsTrigger>
            </TabsList>

            {/* ── Aba 1: Resumo & Pets ── */}
            <TabsContent value="resumo" className="mt-0 animate-in fade-in slide-in-from-bottom-4 duration-500">
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
                      <Card key={pet.id} className="p-5 flex gap-4 items-start bg-white/60 backdrop-blur-xl border border-white/40 shadow-xl shadow-indigo-500/5 hover:shadow-2xl hover:shadow-purple-500/20 hover:-translate-y-1 transition-all duration-500 dark:bg-slate-800/40 dark:border-white/10 group">
                        <div className="w-14 h-14 rounded-full bg-gradient-to-br from-teal-200 to-cyan-200 flex items-center justify-center shrink-0 shadow-md shadow-teal-500/10 ring-2 ring-white/50 group-hover:scale-110 transition-transform duration-500 dark:from-teal-900/50 dark:to-cyan-900/50">
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
            <TabsContent value="cameras" className="mt-0 animate-in fade-in slide-in-from-bottom-4 duration-500">
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
            <TabsContent value="galeria" className="mt-0 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <Card className="p-6 sm:p-8 bg-white/60 backdrop-blur-xl border border-white/30 shadow-xl shadow-indigo-500/5 dark:bg-slate-800/40 dark:border-white/10">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-bold flex items-center gap-2">
                    <ImageIcon className="w-5 h-5 text-purple-500" /> Galeria de Fotos
                  </h3>
                  <Badge variant="secondary">{gallery.length} fotos</Badge>
                </div>

                {gallery.length === 0 ? (
                  <div className="flex flex-col items-center justify-center text-center py-12 gap-4 text-muted-foreground">
                    <div className="w-20 h-20 rounded-full bg-gradient-to-br from-teal-200/50 to-cyan-200/50 flex items-center justify-center shadow-inner">
                      <ImageIcon className="w-10 h-10 opacity-50" />
                    </div>
                    <p className="text-sm max-w-xs">Você ainda não salvou nenhuma foto.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {gallery.map(photo => (
                      <div 
                        key={photo.id} 
                        onClick={() => setSelectedPhoto(photo)}
                        className="relative group rounded-xl overflow-hidden shadow-md ring-1 ring-black/5 dark:ring-white/10 aspect-video bg-black/5 cursor-pointer"
                      >
                        <img 
                          src={photo.image} 
                          alt={`Foto de ${photo.cameraName}`} 
                          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-3">
                          <p className="text-white font-medium text-sm truncate">{photo.cameraName}</p>
                          <p className="text-white/80 text-[10px]">{formatDate(photo.date)} às {new Date(photo.date).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </Card>

              {/* Lightbox Dialog */}
              <Dialog open={!!selectedPhoto} onOpenChange={(open) => !open && setSelectedPhoto(null)}>
                <DialogContent className="max-w-4xl p-0 overflow-hidden bg-black border-white/20">
                  {selectedPhoto && (
                    <div className="relative group">
                      <img 
                        src={selectedPhoto.image} 
                        alt="Foto em tamanho cheio" 
                        className="w-full h-auto max-h-[85vh] object-contain"
                      />
                      <div className="absolute top-0 left-0 right-0 p-4 bg-gradient-to-b from-black/80 to-transparent flex items-center justify-between opacity-0 group-hover:opacity-100 transition-opacity">
                        <div className="text-white">
                          <p className="font-semibold text-lg">{selectedPhoto.cameraName}</p>
                          <p className="text-xs text-white/70">{formatDate(selectedPhoto.date)} às {new Date(selectedPhoto.date).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</p>
                        </div>
                        <div className="flex gap-2">
                          <Button size="sm" variant="secondary" onClick={() => handleDownloadPhoto(selectedPhoto)} className="bg-white/20 hover:bg-white/30 text-white border-0">
                            <Download className="w-4 h-4 mr-2" /> Baixar
                          </Button>
                          <Button size="sm" variant="destructive" onClick={() => handleDeletePhoto(selectedPhoto.id)} className="bg-red-500/80 hover:bg-red-500">
                            <Trash2 className="w-4 h-4 mr-2" /> Excluir
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}
                </DialogContent>
              </Dialog>
            </TabsContent>

            {/* ── Aba 4: Suporte & Contato ── */}
            <TabsContent value="suporte" className="mt-0 animate-in fade-in slide-in-from-bottom-4 duration-500">
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
