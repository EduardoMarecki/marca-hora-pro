import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Clock, PlayCircle, PauseCircle, CheckCircle, Timer } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

type Ponto = {
  id: string;
  tipo: string;
  horario: string;
};

type StatusCardProps = {
  pontos: Ponto[];
};

export const StatusCard = ({ pontos }: StatusCardProps) => {
  const [elapsedTime, setElapsedTime] = useState<string>("00:00:00");
  const [status, setStatus] = useState<"aguardando" | "trabalhando" | "pausa" | "finalizado">("aguardando");
  const [dailyNetSeconds, setDailyNetSeconds] = useState<number>(8 * 60 * 60); // padrão 8h
  const [pauseDefaultSeconds, setPauseDefaultSeconds] = useState<number>(60 * 60); // padrão 1h

  // Carregar jornada do perfil (horario_entrada, jornada_padrao) e derivar jornada líquida
  useEffect(() => {
    const loadProfileConfig = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user?.id) return;

        const { data: profile, error } = await supabase
          .from("profiles")
          .select("horario_entrada, horario_saida_final, jornada_padrao")
          .eq("id", user.id)
          .single();

        if (error) return; // manter padrões em caso de erro

        // jornada_padrao esperado no formato HH:mm-HH:mm (ex.: 08:00-17:00)
        const jp = (profile?.jornada_padrao as string | null) || null;
        if (jp && jp.includes("-")) {
          const [ini, fim] = jp.split("-");
          const [ih, im] = ini.split(":").map(Number);
          const [fh, fm] = fim.split(":").map(Number);
          const startSec = ih * 3600 + im * 60;
          const endSec = fh * 3600 + fm * 60;
          let gross = endSec - startSec;
          if (gross <= 0) gross += 24 * 3600; // atravessando meia-noite
          // Assumir 1h de pausa padrão se nada definido explicitamente
          const assumedPause = 60 * 60;
          const net = Math.max(0, gross - assumedPause);
          setDailyNetSeconds(net);
          setPauseDefaultSeconds(assumedPause);
        } else {
          // fallback para 8h e 1h de pausa
          setDailyNetSeconds(8 * 3600);
          setPauseDefaultSeconds(60 * 60);
        }

      } catch {
        // manter padrões em caso de falha
      }
    };

    loadProfileConfig();
  }, []);

  const { entrada, saida, pausas } = useMemo(() => {
    // Encontrar eventos do dia e ordenar por horário ASC para cálculos corretos
    const ordered = [...pontos].sort((a, b) => new Date(a.horario).getTime() - new Date(b.horario).getTime());
    const entrada = ordered.find((p) => p.tipo === "entrada");
    const saida = ordered.find((p) => p.tipo === "saida");
    const pausas = ordered.filter((p) => p.tipo === "pausa_inicio" || p.tipo === "pausa_fim");
    return { entrada, saida, pausas };
  }, [pontos]);

  useEffect(() => {
    const calculateStatus = () => {
      if (!pontos.length) {
        setStatus("aguardando");
        return;
      }

      const lastPonto = pontos[0];
      
      if (lastPonto.tipo === "entrada") {
        setStatus("trabalhando");
      } else if (lastPonto.tipo === "pausa_inicio") {
        setStatus("pausa");
      } else if (lastPonto.tipo === "pausa_fim") {
        setStatus("trabalhando");
      } else if (lastPonto.tipo === "saida") {
        setStatus("finalizado");
      }
    };

    calculateStatus();

    const interval = setInterval(() => {
      if (!pontos.length) {
        setElapsedTime("00:00:00");
        return;
      }
      
      // Usar a ordenação ASC para garantir pareamento correto das pausas
      const ordered = [...pontos].sort((a, b) => new Date(a.horario).getTime() - new Date(b.horario).getTime());
      const entrada = ordered.find(p => p.tipo === "entrada");
      const saida = ordered.find(p => p.tipo === "saida");

      if (entrada && !saida) {
        const start = new Date(entrada.horario);
        const now = new Date();
        const diff = Math.floor((now.getTime() - start.getTime()) / 1000);

        // Subtract pause time (including lunch breaks)
        const pausas = ordered.filter(p => p.tipo === "pausa_inicio" || p.tipo === "pausa_fim");
        let pauseTime = 0;
        let currentStart: Date | null = null;
        for (const p of pausas) {
          if (p.tipo === "pausa_inicio") {
            currentStart = new Date(p.horario);
          } else if (p.tipo === "pausa_fim" && currentStart) {
            const end = new Date(p.horario);
            pauseTime += Math.floor((end.getTime() - currentStart.getTime()) / 1000);
            currentStart = null;
          }
        }
        // Se a pausa está em andamento, considerar até o momento atual
        if (currentStart) {
          pauseTime += Math.floor((now.getTime() - currentStart.getTime()) / 1000);
        }

        const totalSeconds = Math.max(0, diff - pauseTime);
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = totalSeconds % 60;

        setElapsedTime(
          `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`
        );
      } else if (entrada && saida) {
        const start = new Date(entrada.horario);
        const end = new Date(saida.horario);
        const diff = Math.floor((end.getTime() - start.getTime()) / 1000);

        // Subtract pause time from completed day
        const pausas = ordered.filter(p => p.tipo === "pausa_inicio" || p.tipo === "pausa_fim");
        let pauseTime = 0;
        let currentStart: Date | null = null;
        for (const p of pausas) {
          if (p.tipo === "pausa_inicio") {
            currentStart = new Date(p.horario);
          } else if (p.tipo === "pausa_fim" && currentStart) {
            const end = new Date(p.horario);
            pauseTime += Math.floor((end.getTime() - currentStart.getTime()) / 1000);
            currentStart = null;
          }
        }

        const totalSeconds = Math.max(0, diff - pauseTime);
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = totalSeconds % 60;

        setElapsedTime(
          `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`
        );
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [pontos]);

  // Cálculo de previsão de fim da pausa e de saída
  const {
    predictedPauseEnd,
    predictedExit,
    remainingWorkSeconds,
  } = useMemo(() => {
    if (!entrada || saida) return { predictedPauseEnd: null as Date | null, predictedExit: null as Date | null, remainingWorkSeconds: 0 };

    const now = new Date();
    const entradaDate = new Date(entrada.horario);

    // Tempo total trabalhado até agora (descontando pausas)
    let workedSeconds = Math.floor((now.getTime() - entradaDate.getTime()) / 1000);
    let lastPauseStart: Date | null = null;
    // Garantir pareamento correto com ordenação ASC
    const orderedPauses = [...pausas].sort((a, b) => new Date(a.horario).getTime() - new Date(b.horario).getTime());
    for (const p of orderedPauses) {
      if (p.tipo === "pausa_inicio") {
        lastPauseStart = new Date(p.horario);
      } else if (p.tipo === "pausa_fim" && lastPauseStart) {
        workedSeconds -= Math.floor((new Date(p.horario).getTime() - lastPauseStart.getTime()) / 1000);
        lastPauseStart = null;
      }
    }
    if (lastPauseStart) {
      workedSeconds -= Math.floor((now.getTime() - lastPauseStart.getTime()) / 1000);
    }

    // Se está em pausa agora, estimar fim da pausa com 1h padrão
    let predictedPauseEnd: Date | null = null;
    let remainingPauseSeconds = 0;
    if (status === "pausa" && lastPauseStart) {
      predictedPauseEnd = new Date(lastPauseStart.getTime() + pauseDefaultSeconds * 1000);
      const elapsedPause = Math.max(0, Math.floor((now.getTime() - lastPauseStart.getTime()) / 1000));
      remainingPauseSeconds = Math.max(0, pauseDefaultSeconds - elapsedPause);
    }

    // Jornada alvo (derivada do profile ou 8h padrão)
    const remainingWorkSeconds = Math.max(0, dailyNetSeconds - workedSeconds);

    // Previsão de saída com base na jornada líquida (derivada de jornada_padrao) e tempo já trabalhado.
    // Agora + restante de trabalho + (restante da pausa, se estiver em pausa)
    const totalRemaining = remainingWorkSeconds + (status === "pausa" ? remainingPauseSeconds : 0);
    const predictedExit = totalRemaining > 0 ? new Date(now.getTime() + totalRemaining * 1000) : now;

    return { predictedPauseEnd, predictedExit, remainingWorkSeconds };
  }, [entrada, saida, pausas, status, dailyNetSeconds, pauseDefaultSeconds]);

  // Formato digital internacional (ISO 8601) em horário local: YYYY-MM-DDTHH:mm±hh:mm
  const formatISO = (date: Date | null) => {
    if (!date) return "-";
    const pad = (n: number) => String(n).padStart(2, "0");
    const year = date.getFullYear();
    const month = pad(date.getMonth() + 1);
    const day = pad(date.getDate());
    const hours = pad(date.getHours());
    const minutes = pad(date.getMinutes());
    const tz = -date.getTimezoneOffset(); // minutes east of UTC
    const sign = tz >= 0 ? "+" : "-";
    const tzAbs = Math.abs(tz);
    const tzH = pad(Math.floor(tzAbs / 60));
    const tzM = pad(tzAbs % 60);
    return `${year}-${month}-${day}T${hours}:${minutes}${sign}${tzH}:${tzM}`;
  };

  const getStatusBadge = () => {
    switch (status) {
      case "trabalhando":
        return (
          <Badge className="bg-accent text-accent-foreground">
            <PlayCircle className="h-3 w-3 mr-1" />
            Trabalhando
          </Badge>
        );
      case "pausa":
        return (
          <Badge className="bg-warning text-warning-foreground">
            <PauseCircle className="h-3 w-3 mr-1" />
            Em Pausa
          </Badge>
        );
      case "finalizado":
        return (
          <Badge className="bg-muted text-muted-foreground">
            <CheckCircle className="h-3 w-3 mr-1" />
            Finalizado
          </Badge>
        );
      default:
        return (
          <Badge variant="outline">
            <Clock className="h-3 w-3 mr-1" />
            Aguardando
          </Badge>
        );
    }
  };

  return (
    <Card className="lg:col-span-2 bg-gradient-card shadow-md">
      <CardHeader className="pb-2 sm:pb-3">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-base sm:text-lg">Status Atual</CardTitle>
          {getStatusBadge()}
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-center py-4 sm:py-8">
          <div className="text-center">
            <p className="text-xs sm:text-sm text-muted-foreground mb-2">Tempo Trabalhado Hoje</p>
            <p className="text-3xl sm:text-4xl md:text-5xl font-bold tabular-nums tracking-tight text-primary">
              {elapsedTime}
            </p>
            {(status === "pausa" || status === "trabalhando") && (
              <div className="mt-4 space-y-2">
                {status === "pausa" && (
                  <div className="text-xs sm:text-sm text-muted-foreground flex items-center justify-center gap-2">
                    <Timer className="h-4 w-4" />
                    <span>Previsão fim da pausa:</span>
                    <span className="font-medium text-foreground">{formatISO(predictedPauseEnd)}</span>
                  </div>
                )}
                <div className="flex items-center justify-center">
                  <Separator className="w-32" />
                </div>
                <div className="text-xs sm:text-sm text-muted-foreground flex items-center justify-center gap-2">
                  <Clock className="h-4 w-4" />
                  <span>Previsão de saída:</span>
                  <span className="font-medium text-foreground">{formatISO(predictedExit)}</span>
                </div>
                {remainingWorkSeconds === 0 && (
                  <div className="text-[11px] sm:text-xs text-accent-foreground bg-accent/20 inline-block px-2 py-1 rounded-md mt-1">
                    Jornada completa — você já pode encerrar quando desejar
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
