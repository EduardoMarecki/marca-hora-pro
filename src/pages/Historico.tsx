import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";
import { toast } from "sonner";
import { Header } from "@/components/Header";
import { useUserRole } from "@/hooks/useUserRole";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Switch } from "@/components/ui/switch";

type Ponto = {
  id: string;
  tipo: string;
  horario: string;
  localizacao: string | null;
  user_id: string;
  profiles?: {
    nome: string;
    email: string;
  };
};

const Historico = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [pontos, setPontos] = useState<Ponto[]>([]);
  const [filteredPontos, setFilteredPontos] = useState<Ponto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Filtros
  const [dataInicio, setDataInicio] = useState("");
  const [dataFim, setDataFim] = useState("");
  const [tipoFiltro, setTipoFiltro] = useState("todos");
  const [searchTerm, setSearchTerm] = useState("");
  const [mostrarTodos, setMostrarTodos] = useState(false);

  const { isAdmin } = useUserRole(user);

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
    if (user) {
      loadPontos();
    }
  }, [user, isAdmin, mostrarTodos]);

  useEffect(() => {
    applyFilters();
  }, [pontos, dataInicio, dataFim, tipoFiltro, searchTerm, mostrarTodos]);

  const loadPontos = async () => {
    if (!user) return;

    try {
      let query = supabase
        .from("pontos")
        .select(`
          *,
          profiles (
            nome,
            email
          )
        `)
        .order("horario", { ascending: false });

      // Por padrão, mesmo admin vê apenas os próprios registros.
      // Só quando "mostrarTodos" estiver ativo é que buscamos todos.
      if (!(isAdmin && mostrarTodos)) {
        query = query.eq("user_id", user.id);
      }

      const { data, error } = await query;

      if (error) throw error;
      setPontos(data || []);
    } catch (error: any) {
      toast.error("Erro ao carregar histórico");
      console.error(error);
    }
  };

  const applyFilters = () => {
    let filtered = [...pontos];

    // Filtro por data
    if (dataInicio) {
      filtered = filtered.filter(
        (p) => new Date(p.horario) >= new Date(dataInicio)
      );
    }
    if (dataFim) {
      const endDate = new Date(dataFim);
      endDate.setHours(23, 59, 59, 999);
      filtered = filtered.filter((p) => new Date(p.horario) <= endDate);
    }

    // Filtro por tipo
    if (tipoFiltro !== "todos") {
      filtered = filtered.filter((p) => p.tipo === tipoFiltro);
    }

    // Busca por nome/email (apenas quando mostrando todos)
    if (searchTerm && isAdmin && mostrarTodos) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (p) =>
          p.profiles?.nome?.toLowerCase().includes(term) ||
          p.profiles?.email?.toLowerCase().includes(term)
      );
    }

    setFilteredPontos(filtered);
  };

  const getTipoLabel = (tipo: string) => {
    const labels: Record<string, string> = {
      entrada: "Entrada",
      saida_almoco: "Saída Almoço",
      volta_almoco: "Volta Almoço",
      saida: "Saída",
    };
    return labels[tipo] || tipo;
  };

  const getTipoVariant = (tipo: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      entrada: "default",
      saida_almoco: "secondary",
      volta_almoco: "outline",
      saida: "destructive",
    };
    return variants[tipo] || "default";
  };

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

      <main className="container mx-auto px-4 py-8 max-w-7xl">
        <Card>
          <CardHeader>
            <CardTitle>Histórico de Registros</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5 mb-6">
              <div>
                <Label htmlFor="dataInicio">Data Início</Label>
                <Input
                  id="dataInicio"
                  type="date"
                  value={dataInicio}
                  onChange={(e) => setDataInicio(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="dataFim">Data Fim</Label>
                <Input
                  id="dataFim"
                  type="date"
                  value={dataFim}
                  onChange={(e) => setDataFim(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="tipo">Tipo de Registro</Label>
                <Select value={tipoFiltro} onValueChange={setTipoFiltro}>
                  <SelectTrigger id="tipo">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos</SelectItem>
                    <SelectItem value="entrada">Entrada</SelectItem>
                    <SelectItem value="saida_almoco">Saída Almoço</SelectItem>
                    <SelectItem value="volta_almoco">Volta Almoço</SelectItem>
                    <SelectItem value="saida">Saída</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {isAdmin && (
                <div className="flex items-center gap-3 pt-6">
                  <Switch
                    id="mostrarTodos"
                    checked={mostrarTodos}
                    onCheckedChange={(v) => {
                      setMostrarTodos(!!v);
                      if (!v) setSearchTerm("");
                    }}
                  />
                  <Label htmlFor="mostrarTodos" className="cursor-pointer">
                    Mostrar todos
                  </Label>
                </div>
              )}
              {isAdmin && mostrarTodos && (
                <div>
                  <Label htmlFor="search">Buscar Usuário</Label>
                  <Input
                    id="search"
                    type="text"
                    placeholder="Nome ou email..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
              )}
            </div>

            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data/Hora</TableHead>
                    <TableHead>Tipo</TableHead>
                    {isAdmin && <TableHead>Usuário</TableHead>}
                    <TableHead>Localização</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPontos.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={isAdmin ? 4 : 3}
                        className="text-center text-muted-foreground"
                      >
                        Nenhum registro encontrado
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredPontos.map((ponto) => (
                      <TableRow key={ponto.id}>
                        <TableCell>
                          {format(new Date(ponto.horario), "dd/MM/yyyy HH:mm", {
                            locale: ptBR,
                          })}
                        </TableCell>
                        <TableCell>
                          <Badge variant={getTipoVariant(ponto.tipo)}>
                            {getTipoLabel(ponto.tipo)}
                          </Badge>
                        </TableCell>
                        {isAdmin && (
                          <TableCell>
                            <div>
                              <p className="font-medium">{ponto.profiles?.nome}</p>
                              <p className="text-xs text-muted-foreground">
                                {ponto.profiles?.email}
                              </p>
                            </div>
                          </TableCell>
                        )}
                        <TableCell className="text-sm text-muted-foreground">
                          {ponto.localizacao || "Não disponível"}
                        </TableCell>
                      </TableRow>
                    ))
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

export default Historico;
