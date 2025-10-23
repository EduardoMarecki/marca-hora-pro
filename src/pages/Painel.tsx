import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Session, User } from "@supabase/supabase-js";
import { toast } from "sonner";
import { PontoActions } from "@/components/PontoActions";
import { StatusCard } from "@/components/StatusCard";
import { HistoricoCard } from "@/components/HistoricoCard";
import { Header } from "@/components/Header";

type Ponto = {
  id: string;
  tipo: string;
  horario: string;
  localizacao: string | null;
};

const Painel = () => {
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

  const handleRegistrarPonto = async (tipo: string) => {
    if (!user) return;

    try {
      const { error } = await supabase.from("pontos").insert({
        user_id: user.id,
        tipo,
        horario: new Date().toISOString(),
      });

      if (error) throw error;

      toast.success(`${tipo.replace("_", " ").toUpperCase()} registrado!`);
      loadPontos();
    } catch (error: any) {
      toast.error("Erro ao registrar ponto");
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
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

      <main className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 mb-8">
          <StatusCard pontos={pontos} />
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <PontoActions
            pontos={pontos}
            onRegistrar={handleRegistrarPonto}
          />
          <HistoricoCard pontos={pontos} />
        </div>
      </main>
    </div>
  );
};

export default Painel;
