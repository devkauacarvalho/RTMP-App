import React, { useState, useEffect, useMemo, useRef } from "react";
import Hls from "hls.js"; 
import { Button } from "./ui/button";
import { Card } from "./ui/card";
import { Badge } from "./ui/badge";
import { 
  LogOut, 
  PawPrint, 
  Video,
  Hotel,
  Sparkles,
  Scissors,
  Loader2,
  VideoOff,
  Calendar,
  Dog,
  Cat
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
const CameraView = React.memo(({ camera, isPlaying }: { 
  camera: CameraFeed; 
  isPlaying: boolean;
}) => {
  const Icon = camera.icon;
  const isLive = (camera.status === "live" || camera.status === "ativo") && camera.playableUrl;
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const [errorCount, setErrorCount] = useState(0);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    if (!isLive || !videoRef.current || !camera.playableUrl) return;

    const video = videoRef.current;
    console.log(`[HLS] Inicializando player para ${camera.name}. URL: ${camera.playableUrl}`);

    if (Hls.isSupported()) {
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: false,
        manifestLoadingMaxRetry: 10,
        manifestLoadingRetryDelay: 2000,
        maxBufferLength: 30,
        maxMaxBufferLength: 60,
        appendErrorMaxRetry: 20,
        nudgeMaxRetries: 10,
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
      videoRef.current.play().catch(() => {});
    } else {
      videoRef.current.pause();
    }
  }, [isPlaying]);

  return (
    <div className="relative bg-black rounded-xl overflow-hidden aspect-video group shadow-lg" key={reloadKey}>
      {isLive ? (
        <>
          <video
            ref={videoRef}
            className="w-full h-full object-contain"
            controls
            muted
            autoPlay
            playsInline
          />
          {/* Botão de recarga manual do stream */}
          <button 
            onClick={() => setReloadKey(prev => prev + 1)}
            className="absolute bottom-14 right-3 bg-black/40 hover:bg-black/70 text-white p-2 rounded-full backdrop-blur-sm transition-all opacity-0 group-hover:opacity-100"
            title="Recarregar sinal"
          >
            <Loader2 className="w-4 h-4" />
          </button>
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
        <Badge className="bg-white/90 text-gray-900 flex items-center gap-1 text-xs shadow border-0">
          <Icon className="w-3 h-3" />
          {camera.name}
        </Badge>
      </div>
    </div>
  );
});

CameraView.displayName = "CameraView";

// ─── TutorDashboard ───────────────────────────────────────────────────────────
export function TutorDashboard({ onLogout, userData }: TutorDashboardProps) {
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
    <div className="min-h-screen w-full bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50">
      {/* Header — consistente com AdminDashboard */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-br from-blue-500 to-purple-600 p-2 rounded-lg">
              <PawPrint className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold">Hotel Pet Paradise</h1>
              <p className="text-xs text-muted-foreground">Portal do Tutor</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <p className="text-sm font-medium hidden sm:block">{userData.username}</p>
            <Button variant="outline" size="sm" onClick={onLogout}>
              <LogOut className="w-4 h-4 mr-2" /> Sair
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-4 sm:p-6 space-y-6">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-10 h-10 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            {/* Cards dos pets */}
            {pets.length === 0 ? (
              <Card className="p-8 text-center text-muted-foreground">
                <PawPrint className="w-10 h-10 mx-auto mb-2 opacity-30" />
                <p>Nenhum pet encontrado para este tutor.</p>
              </Card>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {pets.map(pet => {
                  const PetIcon = getIconForSpecies(pet.species || "");
                  return (
                    <Card key={pet.id} className="p-5 flex gap-4 items-start">
                      <div className="w-14 h-14 rounded-full bg-gradient-to-br from-blue-100 to-purple-100 flex items-center justify-center shrink-0">
                        <PetIcon className="w-7 h-7 text-blue-600" />
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

            {/* Câmeras disponíveis */}
            <Card className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold flex items-center gap-2">
                  <Video className="w-5 h-5" /> Câmeras ao Vivo
                </h3>
                <Badge variant="secondary">{availableCameras.filter(c => c.status === 'ativo' || c.status === 'live').length} online</Badge>
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
          </>
        )}
      </main>
    </div>
  );
}
