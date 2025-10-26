import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { TrendingUp, Clock, Award, Zap } from "lucide-react";
import { startOfWeek, endOfWeek, format, subWeeks, differenceInMinutes } from "date-fns";
import { ptBR } from "date-fns/locale";

type Ponto = {
  id: string;
  tipo: string;
  horario: string;
  user_id: string;
};

type RelatoriosGraficosProps = {
  userId: string;
};

export const RelatoriosGraficos = ({ userId }: RelatoriosGraficosProps) => {
  const [weeklyData, setWeeklyData] = useState<any[]>([]);
  const [pontualidadeData, setPontualidadeData] = useState<any[]>([]);
  const [horasExtras, setHorasExtras] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadRelatorios();
  }, [userId]);

  const calcularHorasTrabalhadas = (pontos: Ponto[]) => {
    const entrada = pontos.find(p => p.tipo === "entrada");
    const saida = pontos.find(p => p.tipo === "saida");

    if (!entrada || !saida) return 0;

    const start = new Date(entrada.horario);
    const end = new Date(saida.horario);
    let totalMinutes = differenceInMinutes(end, start);

    // Descontar pausas (incluindo almoço)
    const pausas = pontos.filter(p => p.tipo === "pausa_inicio" || p.tipo === "pausa_fim");
    for (let i = 0; i < pausas.length; i += 2) {
      if (pausas[i] && pausas[i + 1]) {
        const pauseStart = new Date(pausas[i].horario);
        const pauseEnd = new Date(pausas[i + 1].horario);
        totalMinutes -= differenceInMinutes(pauseEnd, pauseStart);
      }
    }

    return totalMinutes / 60; // Retornar em horas
  };

  const loadRelatorios = async () => {
    try {
      setIsLoading(true);

      // Buscar dados das últimas 4 semanas
      const dataLimite = subWeeks(new Date(), 4);

      const { data: pontos, error } = await supabase
        .from("pontos")
        .select("*")
        .eq("user_id", userId)
        .gte("horario", dataLimite.toISOString())
        .order("horario", { ascending: true });

      if (error) throw error;

      // Processar dados semanais
      const semanas: { [key: string]: { pontos: Ponto[], dias: Set<string> } } = {};
      const diasComPonto: { [key: string]: Ponto[] } = {};

      pontos?.forEach((ponto) => {
        const data = new Date(ponto.horario);
        const inicioSemana = startOfWeek(data, { locale: ptBR });
        const semanaKey = format(inicioSemana, "dd/MM", { locale: ptBR });
        const diaKey = format(data, "yyyy-MM-dd");

        if (!semanas[semanaKey]) {
          semanas[semanaKey] = { pontos: [], dias: new Set() };
        }
        semanas[semanaKey].pontos.push(ponto);
        semanas[semanaKey].dias.add(diaKey);

        if (!diasComPonto[diaKey]) {
          diasComPonto[diaKey] = [];
        }
        diasComPonto[diaKey].push(ponto);
      });

      // Calcular média de horas por semana
      const dadosSemanais = Object.entries(semanas).map(([semana, dados]) => {
        const diasTrabalhados = Array.from(dados.dias);
        let totalHoras = 0;
        let diasCompletos = 0;

        diasTrabalhados.forEach(dia => {
          const pontosDia = diasComPonto[dia];
          const horas = calcularHorasTrabalhadas(pontosDia);
          if (horas > 0) {
            totalHoras += horas;
            diasCompletos++;
          }
        });

        const media = diasCompletos > 0 ? totalHoras / diasCompletos : 0;

        return {
          semana,
          horas: parseFloat(media.toFixed(2)),
          dias: diasCompletos,
        };
      });

      setWeeklyData(dadosSemanais.slice(-4));

      // Calcular pontualidade (chegadas antes das 8:15)
      const { data: profile } = await supabase
        .from("profiles")
        .select("horario_entrada")
        .eq("id", userId)
        .single();

      const horarioEntradaPadrao = profile?.horario_entrada || "08:00:00";
      const [hora, minuto] = horarioEntradaPadrao.split(":").map(Number);
      
      let noPrazo = 0;
      let atrasado = 0;

      Object.values(diasComPonto).forEach((pontosDia) => {
        const entrada = pontosDia.find(p => p.tipo === "entrada");
        if (entrada) {
          const horaEntrada = new Date(entrada.horario);
          const horaLimite = new Date(horaEntrada);
          horaLimite.setHours(hora, minuto + 15, 0, 0);

          if (horaEntrada <= horaLimite) {
            noPrazo++;
          } else {
            atrasado++;
          }
        }
      });

      setPontualidadeData([
        { name: "No Prazo", value: noPrazo, color: "hsl(var(--accent))" },
        { name: "Atrasado", value: atrasado, color: "hsl(var(--destructive))" },
      ]);

      // Calcular horas extras (acima de 8h/dia)
      let totalHorasExtras = 0;
      Object.values(diasComPonto).forEach((pontosDia) => {
        const horas = calcularHorasTrabalhadas(pontosDia);
        if (horas > 8) {
          totalHorasExtras += horas - 8;
        }
      });

      setHorasExtras(parseFloat(totalHorasExtras.toFixed(2)));
    } catch (error: any) {
      console.error("Erro ao carregar relatórios:", error);
      toast.error("Erro ao carregar relatórios");
    } finally {
      setIsLoading(false);
    }
  };

  const calcularTaxaPontualidade = () => {
    const total = pontualidadeData.reduce((sum, item) => sum + item.value, 0);
    const noPrazo = pontualidadeData.find(item => item.name === "No Prazo")?.value || 0;
    return total > 0 ? ((noPrazo / total) * 100).toFixed(1) : "0";
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="flex items-center justify-center">
            <div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Cards de Métricas */}
      <div className="grid gap-3 sm:gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2 sm:pb-3">
            <CardTitle className="text-sm sm:text-base flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" />
              Média Semanal
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl sm:text-3xl font-bold text-primary">
              {weeklyData.length > 0
                ? (weeklyData.reduce((sum, d) => sum + d.horas, 0) / weeklyData.length).toFixed(1)
                : "0"}h
            </div>
            <p className="text-xs text-muted-foreground mt-1">Por dia trabalhado</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2 sm:pb-3">
            <CardTitle className="text-sm sm:text-base flex items-center gap-2">
              <Award className="h-4 w-4 text-accent" />
              Pontualidade
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl sm:text-3xl font-bold text-accent">
              {calcularTaxaPontualidade()}%
            </div>
            <p className="text-xs text-muted-foreground mt-1">Taxa de chegadas no prazo</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2 sm:pb-3">
            <CardTitle className="text-sm sm:text-base flex items-center gap-2">
              <Zap className="h-4 w-4 text-warning" />
              Horas Extras
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl sm:text-3xl font-bold text-warning">
              {horasExtras}h
            </div>
            <p className="text-xs text-muted-foreground mt-1">Últimas 4 semanas</p>
          </CardContent>
        </Card>
      </div>

      {/* Gráficos */}
      <Card>
        <CardHeader className="pb-3 sm:pb-6">
          <CardTitle className="text-base sm:text-lg flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Relatórios e Análises
          </CardTitle>
          <CardDescription className="text-xs sm:text-sm">
            Visualize seus padrões de trabalho das últimas 4 semanas
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="horas" className="space-y-4">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="horas" className="text-xs sm:text-sm">Horas Trabalhadas</TabsTrigger>
              <TabsTrigger value="pontualidade" className="text-xs sm:text-sm">Pontualidade</TabsTrigger>
            </TabsList>

            <TabsContent value="horas" className="space-y-4">
              <div className="h-[250px] sm:h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={weeklyData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis 
                      dataKey="semana" 
                      className="text-xs" 
                      tick={{ fill: 'hsl(var(--muted-foreground))' }}
                    />
                    <YAxis 
                      className="text-xs"
                      tick={{ fill: 'hsl(var(--muted-foreground))' }}
                    />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '0.5rem'
                      }}
                    />
                    <Legend wrapperStyle={{ fontSize: '0.875rem' }} />
                    <Bar 
                      dataKey="horas" 
                      name="Horas/Dia" 
                      fill="hsl(var(--primary))" 
                      radius={[8, 8, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </TabsContent>

            <TabsContent value="pontualidade" className="space-y-4">
              <div className="h-[250px] sm:h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pontualidadeData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {pontualidadeData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '0.5rem'
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};
