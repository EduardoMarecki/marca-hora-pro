import { useState, useEffect, lazy, Suspense } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Session, User } from "@supabase/supabase-js";
import { toast } from "sonner";
import { PontoActions } from "@/components/PontoActions";
import { StatusCard } from "@/components/StatusCard";
import { HistoricoCard } from "@/components/HistoricoCard";
import { Header } from "@/components/Header";
import { RelatorioExport } from "@/components/RelatorioExport";
import { AlertasAutomaticos } from "@/components/AlertasAutomaticos";
import { AnaliseInteligente } from "@/components/AnaliseInteligente";
// Lazy load para reduzir o bundle inicial do Painel
const RelatoriosGraficos = lazy(() =>
  import("@/components/RelatoriosGraficos").then((m) => ({ default: m.RelatoriosGraficos }))
);

type Ponto = {
  id: string;
  tipo: string;
  horario: string;
  localizacao: string | null;
  selfie_url?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  accuracy?: number | null;
  location_source?: string | null;
};

const Painel = () => {
  // Feature flag: controlar visibilidade da seção de Análise Inteligente
  const SHOW_ANALISE_IA = false;
  const navigate = useNavigate();
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [pontos, setPontos] = useState<Ponto[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        if (!session) {
          navigate("/auth");
        }
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (!session) {
        navigate("/auth");
      } else {
        setIsLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  useEffect(() => {
    if (user) {
      loadPontos();
    }
  }, [user]);

  const loadPontos = async () => {
    if (!user) return;

    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const { data, error } = await supabase
        .from("pontos")
        .select("*")
        .eq("user_id", user.id)
        .gte("horario", today.toISOString())
        .order("horario", { ascending: false });

      if (error) throw error;
      setPontos(data || []);
    } catch (error: any) {
      toast.error("Erro ao carregar registros");
    }
  };

  const handleRegistrarPonto = async (tipo: string, selfieUrl?: string) => {
    if (!user) return;

    try {
      // Tentar obter geolocalização (básico)
      let latitude: number | null = null;
      let longitude: number | null = null;
      let accuracy: number | null = null;
      let location_source: string | null = null;

      const getPosition = () =>
        new Promise<GeolocationPosition>((resolve, reject) => {
          if (!("geolocation" in navigator)) {
            reject({ code: -1, message: "Geolocalização não suportada" });
            return;
          }
          navigator.geolocation.getCurrentPosition(
            (pos) => resolve(pos),
            (err) => reject(err),
            { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 }
          );
        });

      try {
        const pos = await getPosition();
        latitude = pos.coords.latitude;
        longitude = pos.coords.longitude;
        accuracy = Number.isFinite(pos.coords.accuracy) ? pos.coords.accuracy : null;
        location_source = "gps";
      } catch (geoErr: any) {
        // Mapear motivos comuns, mas não bloquear o registro do ponto
        if (typeof geoErr?.code === "number") {
          if (geoErr.code === 1) location_source = "denied"; // PERMISSION_DENIED
          else if (geoErr.code === 2) location_source = "unavailable"; // POSITION_UNAVAILABLE
          else if (geoErr.code === 3) location_source = "timeout"; // TIMEOUT
          else location_source = "error";
        } else {
          location_source = "error";
        }
      }

      const { error } = await supabase.from("pontos").insert({
        user_id: user.id,
        tipo,
        horario: new Date().toISOString(),
        selfie_url: selfieUrl || null,
        latitude,
        longitude,
        accuracy,
        location_source,
      });

      if (error) throw error;

      toast.success(`${tipo.replace("_", " ").toUpperCase()} registrado!`);
      loadPontos();
    } catch (error: any) {
      console.error("Erro ao registrar ponto:", error);
      toast.error(error?.message || "Erro ao registrar ponto");
    }
  };

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      // Não navegamos manualmente aqui para evitar abortar a requisição de logout.
      // O redirecionamento para /auth é tratado pelo onAuthStateChange acima.
    } catch (e: any) {
      if (e?.name !== "AbortError") {
        console.error("Erro ao sair:", e);
      }
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="h-12 w-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-secondary to-muted">
      <Header user={user} onLogout={handleLogout} />

      <main className="container mx-auto px-3 sm:px-4 py-4 sm:py-8 max-w-6xl">
        <div className="grid gap-4 sm:gap-6 lg:grid-cols-3 mb-4 sm:mb-8">
          <StatusCard pontos={pontos} />
          <AlertasAutomaticos pontos={pontos} />
        </div>

        <div className="grid gap-4 sm:gap-6 lg:grid-cols-2 mb-4 sm:mb-8">
          <div className="space-y-4 sm:space-y-6">
            <PontoActions
              pontos={pontos}
              onRegistrar={handleRegistrarPonto}
            />
            <RelatorioExport 
              pontos={pontos} 
              userName={user?.email || "Usuário"}
              userId={user?.id || ""}
            />
          </div>
          <HistoricoCard 
            pontos={pontos} 
            userEmail={user?.email || ""} 
            onUpdate={loadPontos}
          />
        </div>

        {SHOW_ANALISE_IA && <AnaliseInteligente />}

        <div className="mt-4 sm:mt-8">
          <Suspense
            fallback={
              <div className="p-4 border rounded-lg bg-card text-card-foreground">
                <div className="h-5 w-40 mb-3 bg-muted rounded animate-pulse" />
                <div className="grid grid-cols-2 gap-3">
                  <div className="h-24 bg-muted rounded animate-pulse" />
                  <div className="h-24 bg-muted rounded animate-pulse" />
                </div>
              </div>
            }
          >
            <RelatoriosGraficos userId={user?.id || ""} />
          </Suspense>
        </div>
      </main>
    </div>
  );
};

export default Painel;
