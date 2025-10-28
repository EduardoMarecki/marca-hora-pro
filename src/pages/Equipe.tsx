import { useState, useEffect, lazy, Suspense } from "react";
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

const PDFImportLazy = lazy(() => import("@/components/PDFImport"));
import type { TimesheetRow } from "@/lib/pdfReader";
import { 
  Search, 
  Filter, 
  X, 
  ArrowUpDown, 
  Users, 
  UserCheck, 
  UserX, 
  Clock, 
  TrendingUp, 
  AlertTriangle,
  Calendar,
  BarChart3,
  Info,
  User as UserIcon,
  Mail,
  Building
} from "lucide-react";

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
  // Feature flag: controlar visibilidade/uso da criação de colaborador
  const SHOW_CREATE_COLABORADOR = false;
  const [user, setUser] = useState<User | null>(null);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [filteredProfiles, setFilteredProfiles] = useState<Profile[]>([]);
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
  const [pdfRows, setPdfRows] = useState<TimesheetRow[]>([]);

  // Estados para filtros e busca
  const [searchTerm, setSearchTerm] = useState("");
  const [filterCargo, setFilterCargo] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("nome");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");

  // Estado e handlers para Perfil Detalhado
  const [isDetailsOpen, setIsDetailsOpen] = useState<boolean>(false);
  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(null);

  const openDetails = (id: string) => {
    setSelectedProfileId(id);
    setIsDetailsOpen(true);
  };

  const closeDetails = () => {
    setIsDetailsOpen(false);
    setSelectedProfileId(null);
  };

  const selectedProfile = selectedProfileId
    ? profiles.find((p) => p.id === selectedProfileId) || null
    : null;

  // Utilitários para cálculo no Perfil Detalhado
  const getHorasHoje = (userId: string) => {
    const pontos = pontosHoje[userId] || [];
    const entrada = pontos.find((p) => p.tipo === "entrada");
    const saida = pontos.filter((p) => p.tipo === "saida").pop();
    if (!entrada || !saida) return 0;
    const diff =
      (new Date(saida.horario).getTime() - new Date(entrada.horario).getTime()) /
      (1000 * 60 * 60);
    return Math.max(0, diff);
  };

  const getPontualidadeDoPerfil = (profile: Profile) => {
    if (!profile.horario_entrada) return { adiantado: false, pontual: false };
    const pontos = pontosHoje[profile.id] || [];
    const primeiroEntrada = pontos.find((p) => p.tipo === "entrada");
    if (!primeiroEntrada) return { adiantado: false, pontual: false };
    const adiantado = chegouAdiantado(primeiroEntrada.horario, profile.horario_entrada);
    const pontual = !adiantado &&
      chegouPontual(
        primeiroEntrada.horario,
        profile.horario_entrada,
        pontualidadeTolerancia
      );
    return { adiantado, pontual };
  };

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

  // useEffect para aplicar filtros sempre que os dados ou filtros mudarem
  useEffect(() => {
    applyFilters();
  }, [profiles, searchTerm, filterCargo, filterStatus, sortBy, sortOrder, pontosHoje]);

  // Função para aplicar filtros e busca
  const applyFilters = () => {
    let filtered = [...profiles];

    // Aplicar busca por nome/email
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase().trim();
      filtered = filtered.filter(profile => 
        profile.nome.toLowerCase().includes(term) || 
        profile.email.toLowerCase().includes(term)
      );
    }

    // Aplicar filtro por cargo
    if (filterCargo !== "all") {
      filtered = filtered.filter(profile => {
        if (filterCargo === "sem-cargo") {
          return !profile.cargo || profile.cargo.trim() === "";
        }
        return profile.cargo === filterCargo;
      });
    }

    // Aplicar filtro por status
    if (filterStatus !== "all") {
      filtered = filtered.filter(profile => {
        const status = getStatusUsuario(profile.id);
        return status.label.toLowerCase() === filterStatus.toLowerCase();
      });
    }

    // Aplicar ordenação
    filtered.sort((a, b) => {
      let valueA: any, valueB: any;

      switch (sortBy) {
        case "nome":
          valueA = a.nome.toLowerCase();
          valueB = b.nome.toLowerCase();
          break;
        case "cargo":
          valueA = (a.cargo || "").toLowerCase();
          valueB = (b.cargo || "").toLowerCase();
          break;
        case "ultimo-registro":
          valueA = getUltimoPonto(a.id) || "00:00";
          valueB = getUltimoPonto(b.id) || "00:00";
          break;
        case "total-pontos":
          valueA = pontosHoje[a.id]?.length || 0;
          valueB = pontosHoje[b.id]?.length || 0;
          break;
        default:
          valueA = a.nome.toLowerCase();
          valueB = b.nome.toLowerCase();
      }

      if (valueA < valueB) return sortOrder === "asc" ? -1 : 1;
      if (valueA > valueB) return sortOrder === "asc" ? 1 : -1;
      return 0;
    });

    setFilteredProfiles(filtered);
  };

  // Função para limpar todos os filtros
  const clearFilters = () => {
    setSearchTerm("");
    setFilterCargo("all");
    setFilterStatus("all");
    setSortBy("nome");
    setSortOrder("asc");
  };

  // Função para obter lista única de cargos
  const getUniqueCargos = () => {
    const cargos = profiles
      .map(p => p.cargo)
      .filter(cargo => cargo && cargo.trim() !== "")
      .filter((cargo, index, arr) => arr.indexOf(cargo) === index)
      .sort();
    return cargos;
  };

  // Função para alternar ordenação
  const toggleSort = (field: string) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(field);
      setSortOrder("asc");
    }
  };

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
        .gte("horario", today.toISOString())
        .order("horario", { ascending: true });

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
      if (error) {
        // Extrair detalhe útil do erro do Edge Function
        const ctx: any = (error as any).context;
        const serverMsg = ctx?.error || ctx?.message || (error as any).message;
        const friendly =
          serverMsg === "Unauthorized" ? "Sessão expirada ou ausente. Faça login novamente." :
          serverMsg === "Forbidden" ? "Ação permitida apenas para administradores." :
          serverMsg || "Falha ao criar colaborador.";
        throw new Error(friendly);
      }
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
    
    if (
      ultimoPonto.tipo === "entrada" ||
      ultimoPonto.tipo === "volta_almoco" ||
      ultimoPonto.tipo === "pausa_fim"
    ) {
      return { label: "Trabalhando", variant: "default" as const };
    }
    if (ultimoPonto.tipo === "saida_almoco" || ultimoPonto.tipo === "pausa_inicio") {
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

  // Helpers de tempo para cálculo de pontualidade
  const timeToMinutes = (hhmm: string) => {
    const [h, m] = hhmm.split(":").map(Number);
    return h * 60 + m;
  };

  const dateStringToMinutesOfDay = (isoString: string) => {
    const d = new Date(isoString);
    return d.getHours() * 60 + d.getMinutes();
  };

  const chegouPontual = (entradaIso: string, horarioEntrada: string, toleranciaMin = 15) => {
    // Considera pontual quem chega até a tolerância após o horário ou antes do horário
    const entradaMin = dateStringToMinutesOfDay(entradaIso);
    const horarioMin = timeToMinutes(horarioEntrada);
    return entradaMin <= horarioMin + toleranciaMin;
  };

  const chegouAdiantado = (entradaIso: string, horarioEntrada: string) => {
    const entradaMin = dateStringToMinutesOfDay(entradaIso);
    const horarioMin = timeToMinutes(horarioEntrada);
    return entradaMin < horarioMin;
  };

  // Tolerância de pontualidade (ajustável)
  const [pontualidadeTolerancia, setPontualidadeTolerancia] = useState<number>(15);

  // Funções para calcular métricas do dashboard
  const calculateMetrics = () => {
    const totalColaboradores = profiles.length;
    let presentes = 0;
    let ausentes = 0;
    let emAlmoco = 0;
    let sairam = 0;
    let comHorario = 0;
    let adiantados = 0;
    let pontuais = 0;
    let totalHorasTrabalhadas = 0;

    profiles.forEach((profile) => {
      const status = getStatusUsuario(profile.id);
      
      switch (status.label) {
        case "Trabalhando":
          presentes++;
          break;
        case "Almoço":
          emAlmoco++;
          break;
        case "Saiu":
          sairam++;
          break;
        case "Ausente":
          ausentes++;
          break;
      }

      // Calcular pontualidade (se tem horário de entrada definido)
      if (profile.horario_entrada) {
        comHorario++;
        const pontos = pontosHoje[profile.id] || [];
        const primeiroEntrada = pontos.find(p => p.tipo === "entrada");
        
        if (primeiroEntrada) {
          if (chegouAdiantado(primeiroEntrada.horario, profile.horario_entrada)) {
            adiantados++;
          } else if (chegouPontual(primeiroEntrada.horario, profile.horario_entrada, pontualidadeTolerancia)) {
            pontuais++;
          }
        }
      }

      // Calcular horas trabalhadas aproximadas
      const pontos = pontosHoje[profile.id] || [];
      if (pontos.length >= 2) {
        const entrada = pontos.find(p => p.tipo === "entrada");
        const saida = pontos.filter(p => p.tipo === "saida").pop(); // Última saída
        
        if (entrada && saida) {
          const horasTrabalho = (new Date(saida.horario).getTime() - new Date(entrada.horario).getTime()) / (1000 * 60 * 60);
          totalHorasTrabalhadas += Math.max(0, horasTrabalho);
        }
      }
    });

    const basePontualidade = comHorario > 0 ? comHorario : 0;
    const percentualPontualidade = basePontualidade > 0 ? (pontuais / basePontualidade) * 100 : 0; // no horário
    const percentualAdiantados = basePontualidade > 0 ? (adiantados / basePontualidade) * 100 : 0;
    const percentualPontualidadeGeral = basePontualidade > 0 ? ((adiantados + pontuais) / basePontualidade) * 100 : 0;
    const mediaHorasTrabalhadas = totalColaboradores > 0 ? totalHorasTrabalhadas / totalColaboradores : 0;

    return {
      totalColaboradores,
      presentes,
      ausentes,
      emAlmoco,
      sairam,
      comHorario,
      adiantados,
      pontuais,
      percentualPontualidade, // no horário
      percentualAdiantados,
      percentualPontualidadeGeral,
      mediaHorasTrabalhadas,
      totalHorasTrabalhadas
    };
  };

  const metrics = calculateMetrics();

  // Estatísticas por cargo
  const getStatisticsByCargo = () => {
    const cargoStats: Record<string, {
      total: number;
      presentes: number;
      ausentes: number;
      comHorario: number;
      pontuais: number;
      adiantados: number;
      horasTrabalhadas: number;
    }> = {};

    profiles.forEach((profile) => {
      const cargo = profile.cargo || "Sem cargo";
      
      if (!cargoStats[cargo]) {
        cargoStats[cargo] = {
          total: 0,
          presentes: 0,
          ausentes: 0,
          comHorario: 0,
          pontuais: 0,
          adiantados: 0,
          horasTrabalhadas: 0
        };
      }

      cargoStats[cargo].total++;

      const status = getStatusUsuario(profile.id);
      if (status.label === "Trabalhando" || status.label === "Almoço") {
        cargoStats[cargo].presentes++;
      } else {
        cargoStats[cargo].ausentes++;
      }

      // Pontualidade
      if (profile.horario_entrada) {
        cargoStats[cargo].comHorario++;
        const pontos = pontosHoje[profile.id] || [];
        const primeiroEntrada = pontos.find(p => p.tipo === "entrada");
        
        if (primeiroEntrada) {
          if (chegouAdiantado(primeiroEntrada.horario, profile.horario_entrada)) {
            cargoStats[cargo].adiantados++;
          } else if (chegouPontual(primeiroEntrada.horario, profile.horario_entrada, pontualidadeTolerancia)) {
            cargoStats[cargo].pontuais++;
          }
        }
      }

      // Horas trabalhadas
      const pontos = pontosHoje[profile.id] || [];
      if (pontos.length >= 2) {
        const entrada = pontos.find(p => p.tipo === "entrada");
        const saida = pontos.filter(p => p.tipo === "saida").pop();
        
        if (entrada && saida) {
          const horasTrabalho = (new Date(saida.horario).getTime() - new Date(entrada.horario).getTime()) / (1000 * 60 * 60);
          cargoStats[cargo].horasTrabalhadas += Math.max(0, horasTrabalho);
        }
      }
    });

    return Object.entries(cargoStats).map(([cargo, stats]) => ({
      cargo,
      ...stats,
      percentualPresenca: stats.total > 0 ? (stats.presentes / stats.total) * 100 : 0,
      percentualPontualidade: stats.comHorario > 0 ? (stats.pontuais / stats.comHorario) * 100 : 0,
      percentualAdiantados: stats.comHorario > 0 ? (stats.adiantados / stats.comHorario) * 100 : 0,
      mediaHoras: stats.presentes > 0 ? stats.horasTrabalhadas / stats.presentes : 0
    })).sort((a, b) => b.total - a.total);
  };

  const cargoStatistics = getStatisticsByCargo();

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      // Não navegamos manualmente aqui para evitar abortar a requisição de logout.
      // O redirecionamento para /auth é tratado pelos listeners de auth acima.
    } catch (e: any) {
      if (e?.name !== "AbortError") {
        console.error("Erro ao sair:", e);
      }
    }
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
            {SHOW_CREATE_COLABORADOR && (
              <Button onClick={() => setCreateOpen(true)}>Adicionar colaborador</Button>
            )}
          </CardHeader>
          <CardContent>
            {/* Dashboard de Métricas */}
            <div className="mb-8">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-primary" />
                  <h3 className="text-lg font-semibold">Dashboard de Métricas</h3>
                </div>
                {/* Controle de Tolerância de Pontualidade */}
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Tolerância:</span>
                  <Select value={String(pontualidadeTolerancia)} onValueChange={(v) => setPontualidadeTolerancia(Number(v))}>
                    <SelectTrigger className="w-24 h-8">
                      <SelectValue placeholder={`${pontualidadeTolerancia} min`} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="5">5 min</SelectItem>
                      <SelectItem value="10">10 min</SelectItem>
                      <SelectItem value="15">15 min</SelectItem>
                      <SelectItem value="20">20 min</SelectItem>
                      <SelectItem value="30">30 min</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              {/* Cards de Métricas Principais */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
                {/* Total de Colaboradores */}
                <Card className="border-l-4 border-l-blue-500">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Total de Colaboradores</p>
                        <p className="text-2xl font-bold text-blue-600">{metrics.totalColaboradores}</p>
                      </div>
                      <Users className="h-8 w-8 text-blue-500" />
                    </div>
                  </CardContent>
                </Card>

                {/* Presentes Hoje */}
                <Card className="border-l-4 border-l-green-500">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Presentes Hoje</p>
                        <p className="text-2xl font-bold text-green-600">{metrics.presentes + metrics.emAlmoco}</p>
                        <p className="text-xs text-muted-foreground">
                          {metrics.presentes} trabalhando, {metrics.emAlmoco} almoço
                        </p>
                      </div>
                      <UserCheck className="h-8 w-8 text-green-500" />
                    </div>
                  </CardContent>
                </Card>

                {/* Ausentes */}
                <Card className="border-l-4 border-l-red-500">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Ausentes</p>
                        <p className="text-2xl font-bold text-red-600">{metrics.ausentes}</p>
                        <p className="text-xs text-muted-foreground">
                          {metrics.sairam} já saíram
                        </p>
                      </div>
                      <UserX className="h-8 w-8 text-red-500" />
                    </div>
                  </CardContent>
                </Card>

                {/* Pontualidade */}
                <Card className="border-l-4 border-l-orange-500">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Pontualidade</p>
                        <p className="text-2xl font-bold text-orange-600">
                          {metrics.percentualPontualidade.toFixed(0)}%
                        </p>
                        <p className="text-xs text-muted-foreground">
                          No horário
                        </p>
                      </div>
                      <Clock className="h-8 w-8 text-orange-500" />
                    </div>
                  </CardContent>
                </Card>

                {/* Adiantados */}
                <Card className="border-l-4 border-l-indigo-500">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Adiantados</p>
                        <p className="text-2xl font-bold text-indigo-600">
                          {metrics.percentualAdiantados.toFixed(0)}%
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Chegaram antes do horário
                        </p>
                      </div>
                      <TrendingUp className="h-8 w-8 text-indigo-500" />
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Cards de Métricas Secundárias */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                {/* Horas Trabalhadas Hoje */}
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Total de Horas Hoje</p>
                        <p className="text-xl font-bold">{metrics.totalHorasTrabalhadas.toFixed(1)}h</p>
                      </div>
                      <TrendingUp className="h-6 w-6 text-primary" />
                    </div>
                  </CardContent>
                </Card>

                {/* Média de Horas por Colaborador */}
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Média por Colaborador</p>
                        <p className="text-xl font-bold">{metrics.mediaHorasTrabalhadas.toFixed(1)}h</p>
                      </div>
                      <Calendar className="h-6 w-6 text-primary" />
                    </div>
                  </CardContent>
                </Card>

                {/* Status Geral */}
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Status Geral</p>
                        <p className="text-xl font-bold">
                          {metrics.ausentes > metrics.totalColaboradores * 0.3 ? (
                            <span className="text-red-600 flex items-center gap-1">
                              <AlertTriangle className="h-4 w-4" />
                              Atenção
                            </span>
                          ) : metrics.percentualPontualidade >= 80 ? (
                            <span className="text-green-600">Excelente</span>
                          ) : (
                            <span className="text-yellow-600">Bom</span>
                          )}
                        </p>
                      </div>
                      <div className={`h-6 w-6 rounded-full ${
                        metrics.ausentes > metrics.totalColaboradores * 0.3 
                          ? 'bg-red-500' 
                          : metrics.percentualPontualidade >= 80 
                            ? 'bg-green-500' 
                            : 'bg-yellow-500'
                      }`} />
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Distribuição por Status */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Distribuição da Equipe</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                        <span className="text-sm">Trabalhando</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">{metrics.presentes}</span>
                        <div className="w-20 bg-muted rounded-full h-2">
                          <div 
                            className="bg-green-500 h-2 rounded-full" 
                            style={{ width: `${metrics.totalColaboradores > 0 ? (metrics.presentes / metrics.totalColaboradores) * 100 : 0}%` }}
                          ></div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                        <span className="text-sm">Almoço</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">{metrics.emAlmoco}</span>
                        <div className="w-20 bg-muted rounded-full h-2">
                          <div 
                            className="bg-yellow-500 h-2 rounded-full" 
                            style={{ width: `${metrics.totalColaboradores > 0 ? (metrics.emAlmoco / metrics.totalColaboradores) * 100 : 0}%` }}
                          ></div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                        <span className="text-sm">Saíram</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">{metrics.sairam}</span>
                        <div className="w-20 bg-muted rounded-full h-2">
                          <div 
                            className="bg-blue-500 h-2 rounded-full" 
                            style={{ width: `${metrics.totalColaboradores > 0 ? (metrics.sairam / metrics.totalColaboradores) * 100 : 0}%` }}
                          ></div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                        <span className="text-sm">Ausentes</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">{metrics.ausentes}</span>
                        <div className="w-20 bg-muted rounded-full h-2">
                          <div 
                            className="bg-red-500 h-2 rounded-full" 
                            style={{ width: `${metrics.totalColaboradores > 0 ? (metrics.ausentes / metrics.totalColaboradores) * 100 : 0}%` }}
                          ></div>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Estatísticas por Cargo */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mt-6">
              <div className="flex items-center gap-2 mb-4">
                <BarChart3 className="h-5 w-5 text-blue-600" />
                <h3 className="text-lg font-semibold text-gray-900">Estatísticas por Cargo</h3>
              </div>
              
              <div className="space-y-4">
                {cargoStatistics.map((stat, index) => (
                  <div key={stat.cargo} className="border border-gray-100 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-medium text-gray-900">{stat.cargo}</h4>
                      <span className="text-sm text-gray-500">{stat.total} colaboradores</span>
                    </div>
                    
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-green-600">{stat.presentes}</div>
                        <div className="text-xs text-gray-500">Presentes</div>
                        <div className="text-xs text-green-600">{stat.percentualPresenca.toFixed(1)}%</div>
                      </div>
                      
                      <div className="text-center">
                        <div className="text-2xl font-bold text-red-600">{stat.ausentes}</div>
                        <div className="text-xs text-gray-500">Ausentes</div>
                        <div className="text-xs text-red-600">{(100 - stat.percentualPresenca).toFixed(1)}%</div>
                      </div>
                      
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-600">{stat.pontuais}</div>
                      <div className="text-xs text-gray-500">Pontuais</div>
                      <div className="text-xs text-blue-600">{stat.percentualPontualidade.toFixed(1)}%</div>
                    </div>

                    <div className="text-center">
                      <div className="text-2xl font-bold text-indigo-600">{stat.adiantados}</div>
                      <div className="text-xs text-gray-500">Adiantados</div>
                      <div className="text-xs text-indigo-600">{stat.percentualAdiantados.toFixed(1)}%</div>
                    </div>
                      
                      <div className="text-center">
                        <div className="text-2xl font-bold text-purple-600">{stat.mediaHoras.toFixed(1)}h</div>
                        <div className="text-xs text-gray-500">Média Horas</div>
                        <div className="text-xs text-purple-600">por pessoa</div>
                      </div>
                    </div>
                    
                    {/* Barra de progresso de presença */}
                    <div className="mt-3">
                      <div className="flex justify-between text-xs text-gray-500 mb-1">
                        <span>Presença</span>
                        <span>{stat.percentualPresenca.toFixed(1)}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-green-500 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${stat.percentualPresenca}%` }}
                        ></div>
                      </div>
                    </div>
                    
                  {/* Barra de progresso de pontualidade */}
                  <div className="mt-2">
                    <div className="flex justify-between text-xs text-gray-500 mb-1">
                      <span>Pontualidade</span>
                      <span>{stat.percentualPontualidade.toFixed(1)}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${stat.percentualPontualidade}%` }}
                      ></div>
                    </div>
                  </div>

                  {/* Barra de progresso de adiantados */}
                  <div className="mt-2">
                    <div className="flex justify-between text-xs text-gray-500 mb-1">
                      <span>Adiantados</span>
                      <span>{stat.percentualAdiantados.toFixed(1)}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-indigo-500 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${stat.percentualAdiantados}%` }}
                      ></div>
                    </div>
                  </div>
                  </div>
                ))}
                
                {cargoStatistics.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    <BarChart3 className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>Nenhuma estatística disponível</p>
                  </div>
                )}
              </div>
            </div>

            {/* Interface de Filtros e Busca */}
            <div className="space-y-4 mb-6">
              {/* Linha 1: Busca e Filtros */}
              <div className="flex flex-col sm:flex-row gap-4">
                {/* Campo de Busca */}
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                  <Input
                    placeholder="Buscar por nome ou email..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>

                {/* Filtro por Cargo */}
                <Select value={filterCargo} onValueChange={setFilterCargo}>
                  <SelectTrigger className="w-full sm:w-48">
                    <SelectValue placeholder="Filtrar por cargo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os cargos</SelectItem>
                    <SelectItem value="sem-cargo">Sem cargo</SelectItem>
                    {getUniqueCargos().map((cargo) => (
                      <SelectItem key={cargo} value={cargo}>{cargo}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {/* Filtro por Status */}
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger className="w-full sm:w-48">
                    <SelectValue placeholder="Filtrar por status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os status</SelectItem>
                    <SelectItem value="trabalhando">Trabalhando</SelectItem>
                    <SelectItem value="almoço">Almoço</SelectItem>
                    <SelectItem value="saiu">Saiu</SelectItem>
                    <SelectItem value="ausente">Ausente</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Linha 2: Ordenação e Ações */}
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                {/* Ordenação */}
                <div className="flex items-center gap-2">
                  <Filter className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Ordenar por:</span>
                  <Select value={sortBy} onValueChange={setSortBy}>
                    <SelectTrigger className="w-40">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="nome">Nome</SelectItem>
                      <SelectItem value="cargo">Cargo</SelectItem>
                      <SelectItem value="ultimo-registro">Último Registro</SelectItem>
                      <SelectItem value="total-pontos">Total de Pontos</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
                    className="px-2"
                  >
                    <ArrowUpDown className="h-4 w-4" />
                  </Button>
                </div>

                {/* Contador e Limpar Filtros */}
                <div className="flex items-center gap-4">
                  <span className="text-sm text-muted-foreground">
                    {filteredProfiles.length} de {profiles.length} colaboradores
                  </span>
                  {(searchTerm || filterCargo !== "all" || filterStatus !== "all" || sortBy !== "nome" || sortOrder !== "asc") && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={clearFilters}
                      className="flex items-center gap-2"
                    >
                      <X className="h-4 w-4" />
                      Limpar Filtros
                    </Button>
                  )}
                </div>
              </div>
            </div>

            {SHOW_CREATE_COLABORADOR && (
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
            )}

            {/* Importação de PDF - folha de ponto */}
            <div className="mt-6">
              <h3 className="text-base font-semibold mb-2">Importar folha de ponto (PDF)</h3>
              <p className="text-sm text-muted-foreground mb-3">
                Envie um PDF com texto (não escaneado) para extrair datas e horários automaticamente.
              </p>
              <Suspense
                fallback={
                  <div className="p-3 border rounded bg-card text-card-foreground">
                    <div className="h-5 w-32 mb-2 bg-muted rounded animate-pulse" />
                    <div className="h-24 bg-muted rounded animate-pulse" />
                  </div>
                }
              >
                <PDFImportLazy
                  enableTimesheetParsing
                  onExtract={(data) => {
                    setPdfRows(data.rows || []);
                    toast.success(`${data.rows?.length || 0} linhas identificadas no PDF.`);
                  }}
                />
              </Suspense>
            </div>

            <div className="rounded-md border mt-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead 
                      className="cursor-pointer hover:bg-muted/50 select-none"
                      onClick={() => toggleSort("nome")}
                    >
                      <div className="flex items-center gap-2">
                        Colaborador
                        {sortBy === "nome" && (
                          <ArrowUpDown className={`h-4 w-4 ${sortOrder === "desc" ? "rotate-180" : ""}`} />
                        )}
                      </div>
                    </TableHead>
                    <TableHead 
                      className="cursor-pointer hover:bg-muted/50 select-none"
                      onClick={() => toggleSort("cargo")}
                    >
                      <div className="flex items-center gap-2">
                        Cargo
                        {sortBy === "cargo" && (
                          <ArrowUpDown className={`h-4 w-4 ${sortOrder === "desc" ? "rotate-180" : ""}`} />
                        )}
                      </div>
                    </TableHead>
                    <TableHead>Jornada</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead 
                      className="cursor-pointer hover:bg-muted/50 select-none"
                      onClick={() => toggleSort("ultimo-registro")}
                    >
                      <div className="flex items-center gap-2">
                        Último Registro
                        {sortBy === "ultimo-registro" && (
                          <ArrowUpDown className={`h-4 w-4 ${sortOrder === "desc" ? "rotate-180" : ""}`} />
                        )}
                      </div>
                    </TableHead>
                    <TableHead 
                      className="cursor-pointer hover:bg-muted/50 select-none text-center"
                      onClick={() => toggleSort("total-pontos")}
                    >
                      <div className="flex items-center justify-center gap-2">
                        Total de Registros
                        {sortBy === "total-pontos" && (
                          <ArrowUpDown className={`h-4 w-4 ${sortOrder === "desc" ? "rotate-180" : ""}`} />
                        )}
                      </div>
                    </TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredProfiles.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                        {profiles.length === 0 
                          ? "Nenhum colaborador encontrado" 
                          : "Nenhum colaborador corresponde aos filtros aplicados"
                        }
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredProfiles.map((profile) => {
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
                          <TableCell className="space-x-2">
                            <Button variant="outline" size="sm" onClick={() => openDetails(profile.id)}>
                              <Info className="h-4 w-4 mr-1" /> Detalhes
                            </Button>
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

        {/* Dialog de Perfil Detalhado */}
        <Dialog open={isDetailsOpen} onOpenChange={(open) => !open && closeDetails()}>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>Perfil Detalhado</DialogTitle>
            </DialogHeader>
            {selectedProfile && (
              <div className="space-y-6">
                <div className="flex items-center gap-4">
                  <Avatar>
                    <AvatarImage src={selectedProfile.foto_url || undefined} />
                    <AvatarFallback>
                      {selectedProfile.nome.substring(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-semibold flex items-center gap-2">
                      <UserIcon className="h-4 w-4" /> {selectedProfile.nome}
                    </p>
                    <p className="text-sm text-muted-foreground flex items-center gap-2">
                      <Mail className="h-4 w-4" /> {selectedProfile.email}
                    </p>
                    <p className="text-sm text-muted-foreground flex items-center gap-2">
                      <Building className="h-4 w-4" /> {selectedProfile.cargo || "-"}
                    </p>
                  </div>
                </div>

                {/* Métricas do colaborador */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Status</p>
                    <Badge variant={getStatusUsuario(selectedProfile.id).variant}>
                      {getStatusUsuario(selectedProfile.id).label}
                    </Badge>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Último ponto</p>
                    <p className="text-sm">{getUltimoPonto(selectedProfile.id) || "-"}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Horas hoje</p>
                    <p className="text-sm">{getHorasHoje(selectedProfile.id).toFixed(2)} h</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Pontualidade</p>
                    {(() => {
                      const p = getPontualidadeDoPerfil(selectedProfile);
                      if (p.adiantado) return (
                        <Badge variant="secondary">Adiantado</Badge>
                      );
                      if (p.pontual) return (
                        <Badge variant="default">No horário</Badge>
                      );
                      return <Badge variant="outline">Atrasado ou sem entrada</Badge>;
                    })()}
                  </div>
                </div>

                {/* Timeline dos pontos de hoje */}
                <div className="space-y-2">
                  <p className="text-sm font-medium">Pontos de hoje</p>
                  <div className="space-y-2">
                    {(pontosHoje[selectedProfile.id] || []).length === 0 ? (
                      <p className="text-xs text-muted-foreground">Nenhum ponto registrado hoje</p>
                    ) : (
                      [...(pontosHoje[selectedProfile.id] || [])]
                        .sort((a, b) => new Date(a.horario).getTime() - new Date(b.horario).getTime())
                        .map((p, idx) => (
                        <div key={idx} className="flex items-center justify-between text-sm">
                          <span className="capitalize">{p.tipo}</span>
                          <span>{format(new Date(p.horario), "HH:mm", { locale: ptBR })}</span>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Ações rápidas */}
                <div className="flex justify-end gap-2">
                  <Button variant="secondary" onClick={() => navigate("/historico")}>Ver Histórico</Button>
                  <Button variant="outline" onClick={closeDetails}>Fechar</Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
};

export default Equipe;
