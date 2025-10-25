import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";
import { toast } from "sonner";
import { Header } from "@/components/Header";
import { useUserRole } from "@/hooks/useUserRole";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

type Profile = {
  id: string;
  nome: string;
  email: string;
  cargo: string | null;
  foto_url: string | null;
  horario_entrada: string | null;
  horario_saida_final: string | null;
};

type PontoHoje = {
  tipo: string;
  horario: string;
};

const Equipe = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [pontosHoje, setPontosHoje] = useState<Record<string, PontoHoje[]>>({});
  const [isLoading, setIsLoading] = useState(true);

  const { isAdmin, isLoading: roleLoading } = useUserRole(user);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (!session) {
        navigate("/auth");
      } else {
        setIsLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      setUser(session?.user ?? null);
      if (!session) {
        navigate("/auth");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  useEffect(() => {
    if (user && !roleLoading) {
      if (!isAdmin) {
        toast.error("Acesso restrito a administradores");
        navigate("/painel");
      } else {
        loadEquipe();
      }
    }
  }, [user, isAdmin, roleLoading, navigate]);

  const loadEquipe = async () => {
    try {
      // Carregar perfis
      const { data: profilesData, error: profilesError } = await supabase
        .from("profiles")
        .select("*")
        .order("nome");

      if (profilesError) throw profilesError;
      setProfiles(profilesData || []);

      // Carregar pontos de hoje
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const { data: pontosData, error: pontosError } = await supabase
        .from("pontos")
        .select("user_id, tipo, horario")
        .gte("horario", today.toISOString());

      if (pontosError) throw pontosError;

      // Agrupar pontos por usuário
      const pontosPorUsuario: Record<string, PontoHoje[]> = {};
      pontosData?.forEach((ponto) => {
        if (!pontosPorUsuario[ponto.user_id]) {
          pontosPorUsuario[ponto.user_id] = [];
        }
        pontosPorUsuario[ponto.user_id].push({
          tipo: ponto.tipo,
          horario: ponto.horario,
        });
      });

      setPontosHoje(pontosPorUsuario);
    } catch (error: any) {
      toast.error("Erro ao carregar equipe");
      console.error(error);
    }
  };

  const getStatusUsuario = (userId: string) => {
    const pontos = pontosHoje[userId] || [];
    if (pontos.length === 0) return { label: "Ausente", variant: "destructive" as const };
    
    const ultimoPonto = pontos[pontos.length - 1];
    
    if (ultimoPonto.tipo === "entrada" || ultimoPonto.tipo === "volta_almoco") {
      return { label: "Trabalhando", variant: "default" as const };
    }
    if (ultimoPonto.tipo === "saida_almoco") {
      return { label: "Almoço", variant: "secondary" as const };
    }
    if (ultimoPonto.tipo === "saida") {
      return { label: "Saiu", variant: "outline" as const };
    }
    
    return { label: "Ausente", variant: "destructive" as const };
  };

  const getUltimoPonto = (userId: string) => {
    const pontos = pontosHoje[userId] || [];
    if (pontos.length === 0) return null;
    
    const ultimo = pontos[pontos.length - 1];
    return format(new Date(ultimo.horario), "HH:mm", { locale: ptBR });
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
  };

  if (isLoading || roleLoading) {
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

      <main className="container mx-auto px-4 py-8 max-w-7xl">
        <Card>
          <CardHeader>
            <CardTitle>Gestão de Equipe</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Colaborador</TableHead>
                    <TableHead>Cargo</TableHead>
                    <TableHead>Jornada</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Último Registro</TableHead>
                    <TableHead>Total de Registros</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {profiles.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground">
                        Nenhum colaborador encontrado
                      </TableCell>
                    </TableRow>
                  ) : (
                    profiles.map((profile) => {
                      const status = getStatusUsuario(profile.id);
                      const ultimoPonto = getUltimoPonto(profile.id);
                      const totalPontos = pontosHoje[profile.id]?.length || 0;

                      return (
                        <TableRow key={profile.id}>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <Avatar>
                                <AvatarImage src={profile.foto_url || undefined} />
                                <AvatarFallback>
                                  {profile.nome.substring(0, 2).toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <p className="font-medium">{profile.nome}</p>
                                <p className="text-xs text-muted-foreground">
                                  {profile.email}
                                </p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>{profile.cargo || "-"}</TableCell>
                          <TableCell className="text-sm">
                            {profile.horario_entrada && profile.horario_saida_final
                              ? `${profile.horario_entrada.substring(0, 5)} - ${profile.horario_saida_final.substring(0, 5)}`
                              : "-"}
                          </TableCell>
                          <TableCell>
                            <Badge variant={status.variant}>{status.label}</Badge>
                          </TableCell>
                          <TableCell>{ultimoPonto || "-"}</TableCell>
                          <TableCell className="text-center">{totalPontos}</TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default Equipe;
