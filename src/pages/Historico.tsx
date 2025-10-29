import { useState, useEffect, useMemo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
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
import { format, startOfToday, subDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import jsPDF from "jspdf";

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
  const location = useLocation();
  const [targetUserId, setTargetUserId] = useState<string | null>(null);
  
  // Filtros
  const [dataInicio, setDataInicio] = useState("");
  const [dataFim, setDataFim] = useState("");
  const [tipoFiltro, setTipoFiltro] = useState("todos");
  const [searchTerm, setSearchTerm] = useState("");
  const [mostrarTodos, setMostrarTodos] = useState(false);
  const [sortBy, setSortBy] = useState<"horario" | "tipo" | "usuario">("horario");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  // Paginação server-side
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [totalCount, setTotalCount] = useState(0);

  // Debounce de busca
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchTerm), 300);
    return () => clearTimeout(t);
  }, [searchTerm]);

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

    // Capturar parâmetros de consulta (user_id e filtros)
    try {
      const params = new URLSearchParams(location.search);
      const uid = params.get("user_id");
      setTargetUserId(uid);

      const qsInicio = params.get("inicio");
      const qsFim = params.get("fim");
      const qsTipo = params.get("tipo");
      const qsTodos = params.get("todos");
      const qsBusca = params.get("q");
      const qsPage = params.get("page");
      const qsPageSize = params.get("pageSize");

      if (qsInicio) setDataInicio(isoToDMY(qsInicio));
      if (qsFim) setDataFim(isoToDMY(qsFim));
      if (qsTipo) setTipoFiltro(qsTipo);
      if (qsTodos) setMostrarTodos(qsTodos === "1");
      if (qsBusca) setSearchTerm(qsBusca);
      if (qsPage) setPage(Math.max(1, parseInt(qsPage, 10) || 1));
      if (qsPageSize) setPageSize(Math.max(5, parseInt(qsPageSize, 10) || 20));
    } catch {}

    return () => subscription.unsubscribe();
  }, [navigate, location.search]);

  useEffect(() => {
    if (user) {
      loadPontos();
    }
  }, [user, isAdmin, mostrarTodos, targetUserId, page, pageSize, sortBy, sortDir, dataInicio, dataFim, tipoFiltro]);

  useEffect(() => {
    applyFilters();
  }, [pontos, dataInicio, dataFim, tipoFiltro, debouncedSearch, mostrarTodos, sortBy, sortDir]);

  // Persistir filtros em localStorage e atualizar URL
  useEffect(() => {
    const payload = {
      inicio: dataInicio,
      fim: dataFim,
      tipo: tipoFiltro,
      todos: mostrarTodos ? "1" : "0",
      q: searchTerm,
    };
    try {
      localStorage.setItem("historico_filters", JSON.stringify(payload));
    } catch {}

    try {
      const params = new URLSearchParams(location.search);
      if (payload.inicio) params.set("inicio", payload.inicio); else params.delete("inicio");
      if (payload.fim) params.set("fim", payload.fim); else params.delete("fim");
      if (payload.tipo && payload.tipo !== "todos") params.set("tipo", payload.tipo); else params.delete("tipo");
      if (payload.todos === "1") params.set("todos", "1"); else params.delete("todos");
      if (payload.q) params.set("q", payload.q); else params.delete("q");
      params.set("page", String(page));
      params.set("pageSize", String(pageSize));
      const newSearch = params.toString();
      const path = newSearch ? `/historico?${newSearch}` : "/historico";
      window.history.replaceState(null, "", path);
    } catch {}
  }, [dataInicio, dataFim, tipoFiltro, mostrarTodos, searchTerm, location.search, page, pageSize]);

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
        `, { count: "exact" })
        .order(sortBy === "tipo" ? "tipo" : "horario", { ascending: sortDir === "asc" });

      // 1) Se admin e há targetUserId -> filtra por ele
      // 2) Senão, se admin e mostrarTodos -> sem filtro
      // 3) Caso contrário -> filtra pelo próprio usuário
      if (isAdmin && targetUserId) {
        query = query.eq("user_id", targetUserId);
      } else if (!(isAdmin && mostrarTodos)) {
        query = query.eq("user_id", user.id);
      }

      // Date filters server-side
      if (dataInicio) {
        const di = parseDMY(dataInicio);
        if (di) query = query.gte("horario", di.toISOString());
      }
      if (dataFim) {
        const df = parseDMY(dataFim);
        if (df) {
          df.setHours(23, 59, 59, 999);
          query = query.lte("horario", df.toISOString());
        }
      }

      // Tipo filter server-side
      if (tipoFiltro && tipoFiltro !== "todos") {
        query = query.eq("tipo", tipoFiltro);
      }

      // Range for pagination
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;
      query = query.range(from, to);

      const { data, count, error } = await query;

      if (error) throw error;
      setPontos(data || []);
      setTotalCount(count || 0);
    } catch (error: any) {
      toast.error("Erro ao carregar histórico");
      console.error(error);
    }
  };

  const applyFilters = () => {
    let filtered = [...pontos];

    // Filtro por data
    if (dataInicio) {
      const di = parseDMY(dataInicio);
      if (di) {
        filtered = filtered.filter(
          (p) => new Date(p.horario) >= di
        );
      }
    }
    if (dataFim) {
      const df = parseDMY(dataFim);
      if (df) {
        df.setHours(23, 59, 59, 999);
        filtered = filtered.filter((p) => new Date(p.horario) <= df);
      }
    }

    // Filtro por tipo
    if (tipoFiltro !== "todos") {
      filtered = filtered.filter((p) => p.tipo === tipoFiltro);
    }

    // Busca por nome/email (apenas quando mostrando todos)
    if (debouncedSearch && isAdmin && mostrarTodos) {
      const term = debouncedSearch.toLowerCase();
      filtered = filtered.filter(
        (p) =>
          p.profiles?.nome?.toLowerCase().includes(term) ||
          p.profiles?.email?.toLowerCase().includes(term) ||
          p.tipo?.toLowerCase().includes(term)
      );
    }

    // Ordenação
    filtered.sort((a, b) => {
      let va: string | number = "";
      let vb: string | number = "";
      if (sortBy === "horario") {
        va = new Date(a.horario).getTime();
        vb = new Date(b.horario).getTime();
      } else if (sortBy === "tipo") {
        va = a.tipo;
        vb = b.tipo;
      } else {
        va = (a.profiles?.nome || "");
        vb = (b.profiles?.nome || "");
      }
      const comp = va < vb ? -1 : va > vb ? 1 : 0;
      return sortDir === "asc" ? comp : -comp;
    });

    setFilteredPontos(filtered);
  };

  const getTipoLabel = (tipo: string) => {
    const labels: Record<string, string> = {
      entrada: "Entrada",
      pausa_inicio: "Pausa (início)",
      pausa_fim: "Pausa (fim)",
      saida: "Saída",
      // compatíveis com nomenclaturas antigas
      saida_almoco: "Pausa (início)",
      volta_almoco: "Pausa (fim)",
    };
    return labels[tipo] || tipo;
  };

  const getTipoVariant = (tipo: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      entrada: "default",
      pausa_inicio: "secondary",
      pausa_fim: "outline",
      saida: "destructive",
      // fallback antigo
      saida_almoco: "secondary",
      volta_almoco: "outline",
    };
    return variants[tipo] || "default";
  };

  // Helpers de data para presets
  // Conversão e parsing para dd-MM-yyyy
  const toDateInput = (d: Date) => format(d, "dd-MM-yyyy");
  const sanitizeDMY = (s: string) => s.trim().replace(/[\/.]/g, "-");
  const parseDMY = (s: string): Date | null => {
    const m = /^(\d{2})-(\d{2})-(\d{4})$/.exec(s);
    if (!m) return null;
    const dd = Number(m[1]);
    const mm = Number(m[2]) - 1;
    const yyyy = Number(m[3]);
    const d = new Date(yyyy, mm, dd);
    return isNaN(d.getTime()) ? null : d;
  };
  const isoToDMY = (s: string) => {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
    if (!m) return s;
    return `${m[3]}-${m[2]}-${m[1]}`;
  };
  const setPreset = (preset: "hoje" | "ontem" | "semana" | "mes" | "7d" | "30d") => {
    const today = startOfToday();
    if (preset === "hoje") {
      setDataInicio(toDateInput(today));
      setDataFim(toDateInput(today));
    } else if (preset === "ontem") {
      const d = subDays(today, 1);
      setDataInicio(toDateInput(d));
      setDataFim(toDateInput(d));
    } else if (preset === "semana") {
      setDataInicio(toDateInput(startOfWeek(today, { weekStartsOn: 1 })));
      setDataFim(toDateInput(endOfWeek(today, { weekStartsOn: 1 })));
    } else if (preset === "mes") {
      setDataInicio(toDateInput(startOfMonth(today)));
      setDataFim(toDateInput(endOfMonth(today)));
    } else if (preset === "7d") {
      setDataInicio(toDateInput(subDays(today, 6)));
      setDataFim(toDateInput(today));
    } else if (preset === "30d") {
      setDataInicio(toDateInput(subDays(today, 29)));
      setDataFim(toDateInput(today));
    }
  };

  // Restaurar filtros salvos ao montar
  useEffect(() => {
    try {
      const raw = localStorage.getItem("historico_filters");
      if (raw) {
        const f = JSON.parse(raw);
        if (f.inicio) setDataInicio(isoToDMY(f.inicio));
        if (f.fim) setDataFim(isoToDMY(f.fim));
        if (f.tipo) setTipoFiltro(f.tipo);
        if (typeof f.todos !== "undefined") setMostrarTodos(f.todos === "1");
        if (f.q) setSearchTerm(f.q);
      }
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Resumo (contagens e total de horas)
  const resumo = useMemo(() => {
    const counts: Record<string, number> = {
      entrada: 0,
      pausa_inicio: 0,
      pausa_fim: 0,
      saida: 0,
    };

    filteredPontos.forEach(p => { counts[p.tipo] = (counts[p.tipo] || 0) + 1; });

    // Calcula horas apenas quando não está mostrando todos (mistura usuários)
    let totalMs = 0;
    if (!mostrarTodos || (isAdmin && targetUserId)) {
      const sorted = [...filteredPontos].sort((a,b) => new Date(a.horario).getTime() - new Date(b.horario).getTime());
      let entradaTime: Date | null = null;
      let pausaInicio: Date | null = null;
      let pausaFim: Date | null = null;

      for (const p of sorted) {
        const t = new Date(p.horario);
        if (p.tipo === "entrada") {
          // inicia novo período
          entradaTime = t;
          pausaInicio = null;
          pausaFim = null;
        } else if (p.tipo === "pausa_inicio" || p.tipo === "saida_almoco") {
          pausaInicio = t;
        } else if (p.tipo === "pausa_fim" || p.tipo === "volta_almoco") {
          pausaFim = t;
        } else if (p.tipo === "saida" && entradaTime) {
          let dur = t.getTime() - entradaTime.getTime();
          if (pausaInicio && pausaFim && pausaFim > pausaInicio) {
            dur -= (pausaFim.getTime() - pausaInicio.getTime());
          }
          if (dur > 0) totalMs += dur;
          // reseta
          entradaTime = null;
          pausaInicio = null;
          pausaFim = null;
        }
      }
    }

    const totalHoras = totalMs / (1000 * 60 * 60);
    return { counts, totalHoras };
  }, [filteredPontos, mostrarTodos, isAdmin, targetUserId]);

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

  // Export helpers (CSV/PDF) com base nos filtros atuais
  const buildExportQuery = () => {
    let q = supabase
      .from("pontos")
      .select(`
        *,
        profiles (
          nome,
          email
        )
      `)
      .order(sortBy === "tipo" ? "tipo" : "horario", { ascending: sortDir === "asc" });

    if (isAdmin && targetUserId) {
      q = q.eq("user_id", targetUserId);
    } else if (!(isAdmin && mostrarTodos)) {
      if (user) q = q.eq("user_id", user.id);
    }
    if (dataInicio) {
      const di = parseDMY(dataInicio);
      if (di) q = q.gte("horario", di.toISOString());
    }
    if (dataFim) {
      const df = parseDMY(dataFim);
      if (df) {
        df.setHours(23, 59, 59, 999);
        q = q.lte("horario", df.toISOString());
      }
    }
    if (tipoFiltro && tipoFiltro !== "todos") {
      q = q.eq("tipo", tipoFiltro);
    }
    return q;
  };

  const exportCSV = async () => {
    try {
      const q = buildExportQuery();
      const { data, error } = await q;
      if (error) throw error;
      const rows = (data || []).map((p: any) => ({
        dataHora: format(new Date(p.horario), "dd/MM/yyyy HH:mm", { locale: ptBR }),
        tipo: getTipoLabel(p.tipo),
        usuario: p.profiles?.nome || "",
        email: p.profiles?.email || "",
        localizacao: p.localizacao || "",
      }));
      const header = ["Data/Hora", "Tipo", "Usuário", "Email", "Localização"];
      const csv = [header.join(","), ...rows.map(r => [r.dataHora, r.tipo, r.usuario, r.email, r.localizacao]
        .map(v => `"${String(v).replace(/"/g, '""')}"`).join(","))].join("\n");
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `historico_${format(new Date(), "yyyy-MM-dd")}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error(e);
      toast.error("Falha ao exportar CSV");
    }
  };

  const exportPDF = async () => {
    try {
      const q = buildExportQuery();
      const { data, error } = await q;
      if (error) throw error;
      const pontosData = data || [];
      const doc = new jsPDF();

      // Cabeçalho do relatório
      doc.setFontSize(16);
      doc.text("Histórico de Registros", 14, 16);
      doc.setFontSize(10);
      const periodParts: string[] = [];
      if (dataInicio) periodParts.push(`Início: ${dataInicio}`);
      if (dataFim) periodParts.push(`Fim: ${dataFim}`);
      if (periodParts.length) {
        doc.text(periodParts.join("  •  "), 14, 22);
      }

      // Definições da tabela padronizada
      const marginX = 14;
      const marginTop = 30;
      const tableWidth = 182; // 210 - 2*14
      const columnWidths = [36, 28, 40, 50, 28]; // Soma = 182
      const headers = ["Data/Hora", "Tipo", "Usuário", "Email", "Localização"];
      const colX: number[] = [];
      let acc = marginX;
      for (let i = 0; i < columnWidths.length; i++) {
        colX.push(acc);
        acc += columnWidths[i];
      }

      function drawHeader(y: number) {
        doc.setFillColor(245, 245, 245);
        doc.rect(marginX, y, tableWidth, 9, "F");
        doc.setTextColor(0);
        doc.setFontSize(10);
        for (let i = 0; i < headers.length; i++) {
          doc.text(headers[i], colX[i] + 2, y + 6);
        }
        // linhas verticais header
        doc.setLineWidth(0.1);
        for (let i = 1; i < colX.length; i++) {
          doc.line(colX[i], y, colX[i], y + 9);
        }
        // bordas horizontais
        doc.line(marginX, y, marginX + tableWidth, y);
        doc.line(marginX, y + 9, marginX + tableWidth, y + 9);
      }

      let y = marginTop;
      drawHeader(y);
      y += 11;

      // Linhas da tabela com quebra automática (ajuste dinâmico de fonte para linhas densas)
      for (let idx = 0; idx < pontosData.length; idx++) {
        const p: any = pontosData[idx];
        const cells = [
          format(new Date(p.horario), "dd/MM/yyyy HH:mm", { locale: ptBR }),
          getTipoLabel(p.tipo),
          p.profiles?.nome || "",
          p.profiles?.email || "",
          p.localizacao || "",
        ];

        const wrappedCells = cells.map((text, i) => doc.splitTextToSize(String(text), columnWidths[i] - 4));
        const maxLines = Math.max(...wrappedCells.map((arr) => arr.length));
        // Fonte menor para linhas mais densas
        const bodyFontSize = maxLines <= 2 ? 10 : maxLines <= 4 ? 9 : 8;
        const lineHeight = bodyFontSize >= 10 ? 5 : bodyFontSize === 9 ? 4.5 : 4;
        const rowHeight = Math.max(9, maxLines * lineHeight + 4);

        // Quebra de página se necessário
        if (y + rowHeight > 284) {
          doc.addPage();
          y = marginTop;
          drawHeader(y);
          y += 11;
        }

        // Bordas da linha
        doc.setLineWidth(0.1);
        doc.rect(marginX, y, tableWidth, rowHeight);
        for (let i = 1; i < colX.length; i++) {
          doc.line(colX[i], y, colX[i], y + rowHeight);
        }

        // Escrever conteúdo de cada coluna
        doc.setFontSize(bodyFontSize);
        for (let i = 0; i < wrappedCells.length; i++) {
          const lines = wrappedCells[i];
          for (let l = 0; l < lines.length; l++) {
            doc.text(lines[l], colX[i] + 2, y + 5 + l * lineHeight);
          }
        }

        y += rowHeight;
      }

      // Rodapé com paginação e data/hora de geração
      const totalPages = (doc as any).getNumberOfPages ? doc.getNumberOfPages() : 1;
      const generatedAt = format(new Date(), "dd/MM/yyyy HH:mm");
      for (let p = 1; p <= totalPages; p++) {
        doc.setPage(p);
        doc.setFontSize(9);
        doc.setTextColor(120);
        doc.text(`Página ${p} de ${totalPages}`, marginX, 292);
        // Alinha próximo à margem direita
        doc.text(`Gerado em ${generatedAt}`, marginX + tableWidth, 292, { align: "right" });
      }

      doc.save(`historico_${format(new Date(), "yyyy-MM-dd")}.pdf`);
    } catch (e) {
      console.error(e);
      toast.error("Falha ao exportar PDF");
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
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5 mb-4">
              <div>
                <Label htmlFor="dataInicio">Data Início</Label>
                <Input
                  id="dataInicio"
                  type="text"
                  inputMode="numeric"
                  placeholder="dd-MM-yyyy"
                  value={dataInicio}
                  onChange={(e) => setDataInicio(sanitizeDMY(e.target.value))}
                />
              </div>
              <div>
                <Label htmlFor="dataFim">Data Fim</Label>
                <Input
                  id="dataFim"
                  type="text"
                  inputMode="numeric"
                  placeholder="dd-MM-yyyy"
                  value={dataFim}
                  onChange={(e) => setDataFim(sanitizeDMY(e.target.value))}
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
                    <SelectItem value="pausa_inicio">Pausa (início)</SelectItem>
                    <SelectItem value="pausa_fim">Pausa (fim)</SelectItem>
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
                    placeholder="Nome, e-mail ou tipo..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
              )}
            </div>

            {/* Presets de data */}
            <div className="flex flex-wrap gap-2 mb-6">
              <Button variant="outline" size="sm" onClick={() => setPreset("hoje")}>Hoje</Button>
              <Button variant="outline" size="sm" onClick={() => setPreset("ontem")}>Ontem</Button>
              <Button variant="outline" size="sm" onClick={() => setPreset("semana")}>Esta semana</Button>
              <Button variant="outline" size="sm" onClick={() => setPreset("mes")}>Mês atual</Button>
              <Button variant="secondary" size="sm" onClick={() => setPreset("7d")}>Últimos 7 dias</Button>
              <Button variant="secondary" size="sm" onClick={() => setPreset("30d")}>Últimos 30 dias</Button>
              <Button variant="ghost" size="sm" onClick={() => { setDataInicio(""); setDataFim(""); }}>Limpar datas</Button>
              <div className="ml-0 sm:ml-auto flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                <Button className="w-full sm:w-auto" variant="outline" size="sm" onClick={exportCSV}>Exportar CSV</Button>
                <Button className="w-full sm:w-auto" variant="outline" size="sm" onClick={exportPDF}>Exportar PDF</Button>
              </div>
            </div>

            {/* Resumo do período filtrado */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 mb-6">
              <div className="rounded-md border p-3 text-center">
                <p className="text-xs text-muted-foreground">Entradas</p>
                <p className="text-lg font-semibold">{resumo.counts.entrada || 0}</p>
              </div>
              <div className="rounded-md border p-3 text-center">
                <p className="text-xs text-muted-foreground">Pausa (início)</p>
                <p className="text-lg font-semibold">{resumo.counts.pausa_inicio || 0}</p>
              </div>
              <div className="rounded-md border p-3 text-center">
                <p className="text-xs text-muted-foreground">Pausa (fim)</p>
                <p className="text-lg font-semibold">{resumo.counts.pausa_fim || 0}</p>
              </div>
              <div className="rounded-md border p-3 text-center">
                <p className="text-xs text-muted-foreground">Saídas</p>
                <p className="text-lg font-semibold">{resumo.counts.saida || 0}</p>
              </div>
              <div className="rounded-md border p-3 text-center">
                <p className="text-xs text-muted-foreground">Horas no período</p>
                <p className="text-lg font-semibold">
                  {(!mostrarTodos || (isAdmin && targetUserId)) ? `${resumo.totalHoras.toFixed(2)} h` : "—"}
                </p>
              </div>
            </div>

            <div className="rounded-md border overflow-x-auto">
              <Table className="min-w-[680px]">
                <TableHeader>
                  <TableRow>
                    <TableHead className="cursor-pointer" onClick={() => { setSortBy("horario"); setSortDir(sortDir === "asc" ? "desc" : "asc"); }}>
                      Data/Hora {sortBy === "horario" ? (sortDir === "asc" ? "▲" : "▼") : ""}
                    </TableHead>
                    <TableHead className="cursor-pointer" onClick={() => { setSortBy("tipo"); setSortDir(sortDir === "asc" ? "desc" : "asc"); }}>
                      Tipo {sortBy === "tipo" ? (sortDir === "asc" ? "▲" : "▼") : ""}
                    </TableHead>
                    {isAdmin && (
                      <TableHead className="cursor-pointer" onClick={() => { setSortBy("usuario"); setSortDir(sortDir === "asc" ? "desc" : "asc"); }}>
                        Usuário {sortBy === "usuario" ? (sortDir === "asc" ? "▲" : "▼") : ""}
                      </TableHead>
                    )}
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
                              <p className="font-medium truncate max-w-[160px] sm:max-w-none" title={ponto.profiles?.nome || ""}>{ponto.profiles?.nome}</p>
                              <p className="text-xs text-muted-foreground truncate max-w-[200px] sm:max-w-none" title={ponto.profiles?.email || ""}>
                                {ponto.profiles?.email}
                              </p>
                            </div>
                          </TableCell>
                        )}
                        <TableCell className="text-sm text-muted-foreground whitespace-nowrap overflow-hidden text-ellipsis truncate max-w-[200px] sm:max-w-none" title={ponto.localizacao || "Não disponível"}>
                          {ponto.localizacao || "Não disponível"}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>

            {/* Paginação */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mt-4">
              <div className="text-sm text-muted-foreground">
                Página {page} de {Math.max(1, Math.ceil(totalCount / pageSize))} • {totalCount} registros
              </div>
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <Button
                  className="w-full sm:w-auto"
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                >Anterior</Button>
                <Button
                  className="w-full sm:w-auto"
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => (p < Math.ceil(totalCount / pageSize) ? p + 1 : p))}
                  disabled={page >= Math.ceil(totalCount / pageSize) || totalCount === 0}
                >Próxima</Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default Historico;
