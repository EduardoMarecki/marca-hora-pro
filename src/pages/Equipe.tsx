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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

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
  const [adminMap, setAdminMap] = useState<Record<string, boolean>>({});
  const [adminUpdating, setAdminUpdating] = useState<Record<string, boolean>>({});
  const [empresas, setEmpresas] = useState<{ id: string; nome: string }[]>([]);
  const [createOpen, setCreateOpen] = useState(false);
  const [novoNome, setNovoNome] = useState("");
  const [novoEmail, setNovoEmail] = useState("");
  const [novoCargo, setNovoCargo] = useState("");
  const [novaEmpresaId, setNovaEmpresaId] = useState<string>("");
  const [creating, setCreating] = useState(false);
  const [isAdminDb, setIsAdminDb] = useState<boolean>(false);

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
    const verifyAndLoad = async () => {
      if (!user || roleLoading) return;
      
      try {
        // Verificação direta no banco de dados
        const { data: roleData } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", user.id)
          .eq("role", "admin")
          .maybeSingle();
        
        const isUserAdmin = !!roleData;
        console.log("Verificação direta admin:", isUserAdmin);
        setIsAdminDb(isUserAdmin);
        
        if (!isUserAdmin) {
          toast.error("Acesso restrito a administradores");
          navigate("/painel");
          return;
        }
        
        await loadEquipe();
      } catch (error) {
        console.error("Erro na verificação:", error);
        toast.error("Erro ao verificar permissões");
        navigate("/painel");
      }
    };

    verifyAndLoad();
  }, [user, roleLoading, navigate]);

  const loadEquipe = async () => {
    try {
      // Carregar perfis
      const { data: profilesData, error: profilesError } = await supabase
        .from("profiles")
        .select("*")
        .order("nome");

      if (profilesError) throw profilesError;
      setProfiles(profilesData || []);

      // Carregar empresas (admins podem ver todas)
      const { data: empresasData, error: empresasError } = await supabase
        .from("empresas")
        .select("id, nome")
        .order("nome");
      if (!empresasError) {
        setEmpresas(empresasData || []);
      }

      // Carregar mapa de admins
      const { data: adminRoles, error: adminError } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "admin");
      if (adminError) throw adminError;
      const map: Record<string, boolean> = {};
      (adminRoles || []).forEach((r: { user_id: string }) => {
        map[r.user_id] = true;
      });
      setAdminMap(map);

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

  const handleCreateColaborador = async () => {
    if (!novoNome || !novoEmail || !novaEmpresaId) {
      toast.error("Preencha nome, e-mail e empresa.");
      return;
    }
    setCreating(true);
    try {
      const { data, error } = await supabase.functions.invoke("criar-colaborador", {
        body: { email: novoEmail, nome: novoNome, empresaId: novaEmpresaId, cargo: novoCargo },
      });
      if (error) throw error;
      toast.success("Colaborador criado e e-mail de confirmação enviado.");
      setCreateOpen(false);
      setNovoNome("");
      setNovoEmail("");
      setNovoCargo("");
      setNovaEmpresaId("");
      await loadEquipe();
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Falha ao criar colaborador.");
    } finally {
      setCreating(false);
    }
  };

  const updateAdminForUser = async (targetUserId: string, makeAdmin: boolean) => {
    setAdminUpdating((prev) => ({ ...prev, [targetUserId]: true }));
    try {
      const rpcName = makeAdmin ? "grant_admin" : "revoke_admin";
      const { error } = await supabase.rpc(rpcName as any, { target_user: targetUserId });
      if (error) throw error;

      setAdminMap((prev) => ({ ...prev, [targetUserId]: makeAdmin }));
      toast.success(
        makeAdmin
          ? "Permissão de administrador concedida."
          : "Permissão de administrador removida."
      );
    } catch (error) {
      console.error(error);
      toast.error("Não foi possível atualizar a permissão de administrador.");
    } finally {
      setAdminUpdating((prev) => ({ ...prev, [targetUserId]: false }));
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
          <CardHeader className="flex items-center justify-between">
            <CardTitle>Gestão de Equipe</CardTitle>
            <Button onClick={() => setCreateOpen(true)} disabled={!isAdminDb}>Adicionar colaborador</Button>
          </CardHeader>
          <CardContent>
            <Dialog open={createOpen} onOpenChange={setCreateOpen}>
              <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                  <DialogTitle>Novo colaborador</DialogTitle>
                </DialogHeader>
                <div className="grid gap-4 py-2">
                  <div className="grid gap-1">
                    <label className="text-sm">Nome</label>
                    <Input value={novoNome} onChange={(e) => setNovoNome(e.target.value)} placeholder="Nome completo" />
                  </div>
                  <div className="grid gap-1">
                    <label className="text-sm">E-mail</label>
                    <Input type="email" value={novoEmail} onChange={(e) => setNovoEmail(e.target.value)} placeholder="email@exemplo.com" />
                  </div>
                  <div className="grid gap-1">
                    <label className="text-sm">Empresa</label>
                    <Select value={novaEmpresaId} onValueChange={setNovaEmpresaId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione a empresa" />
                      </SelectTrigger>
                      <SelectContent>
                        {empresas.map((empresa) => (
                          <SelectItem key={empresa.id} value={empresa.id}>{empresa.nome}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-1">
                    <label className="text-sm">Cargo (opcional)</label>
                    <Input value={novoCargo} onChange={(e) => setNovoCargo(e.target.value)} placeholder="Cargo" />
                  </div>
                  <div className="text-xs text-muted-foreground">
                    A senha padrão será: <span className="font-medium">Ponto@2025</span>. Um e-mail de confirmação será enviado ao colaborador.
                  </div>
                  <div className="flex justify-end gap-2 pt-2">
                    <Button variant="outline" onClick={() => setCreateOpen(false)} disabled={creating}>Cancelar</Button>
                    <Button onClick={handleCreateColaborador} disabled={creating}>{creating ? "Criando..." : "Criar"}</Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>

            <div className="rounded-md border mt-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Colaborador</TableHead>
                    <TableHead>Cargo</TableHead>
                    <TableHead>Jornada</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Último Registro</TableHead>
                    <TableHead>Total de Registros</TableHead>
                    <TableHead>Admin</TableHead>
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
                          <TableCell>
                            <Button
                              variant={adminMap[profile.id] ? "destructive" : "default"}
                              size="sm"
                              disabled={adminUpdating[profile.id]}
                              onClick={() => updateAdminForUser(profile.id, !adminMap[profile.id])}
                            >
                              {adminUpdating[profile.id]
                                ? "Atualizando..."
                                : adminMap[profile.id]
                                  ? "Remover Admin"
                                  : "Tornar Admin"}
                            </Button>
                          </TableCell>
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
