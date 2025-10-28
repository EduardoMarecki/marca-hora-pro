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
  const [pauseDefaultSeconds, setPauseDefaultSeconds] = useState<number>(90 * 60); // pausa padrão 1h30
  const [lunchStartStr, setLunchStartStr] = useState<string>("12:00");
  const [lunchEndStr, setLunchEndStr] = useState<string>("13:30");

  // Carregar jornada do perfil (horario_entrada, jornada_padrao) e derivar jornada líquida
  useEffect(() => {
    const loadProfileConfig = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user?.id) return;

        const { data: profile, error } = await supabase
          .from("profiles")
          .select("horario_entrada, horario_saida_final, horario_saida_almoco, horario_volta_almoco, jornada_padrao")
          .eq("id", user.id)
          .single();

        if (error) return; // manter padrões em caso de erro

        // Usar os campos explícitos do perfil para calcular jornada líquida e pausa obrigatória
        const entradaStr: string = (profile?.horario_entrada as string) || "08:30";
        const saidaFinalStr: string = (profile?.horario_saida_final as string) || "18:00";
        const almocoIniStr: string = (profile?.horario_saida_almoco as string) || "12:00";
        const almocoFimStr: string = (profile?.horario_volta_almoco as string) || "13:30";

        setLunchStartStr(almocoIniStr);
        setLunchEndStr(almocoFimStr);

        const toSec = (s: string) => { const [h, m] = s.split(":").map(Number); return h * 3600 + m * 60; };
        const entradaSec = toSec(entradaStr);
        const saidaSec = toSec(saidaFinalStr);
        const almocoIniSec = toSec(almocoIniStr);
        const almocoFimSec = toSec(almocoFimStr);

        let gross = saidaSec - entradaSec;
        if (gross <= 0) gross += 24 * 3600; // atravessar meia-noite
        const lunchDur = Math.max(0, almocoFimSec - almocoIniSec);
        const net = Math.max(0, gross - lunchDur);
        setDailyNetSeconds(net);
        setPauseDefaultSeconds(lunchDur > 0 ? lunchDur : 90 * 60);

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

    // Se está em pausa agora, estimar fim da pausa corrente
    let predictedPauseEnd: Date | null = null;
    let remainingPauseSeconds = 0;
    if (status === "pausa" && lastPauseStart) {
      predictedPauseEnd = new Date(lastPauseStart.getTime() + pauseDefaultSeconds * 1000);
      const elapsedPause = Math.max(0, Math.floor((now.getTime() - lastPauseStart.getTime()) / 1000));
      remainingPauseSeconds = Math.max(0, pauseDefaultSeconds - elapsedPause);
    }

    // Jornada alvo (derivada do profile ou 8h padrão)
    const remainingWorkSeconds = Math.max(0, dailyNetSeconds - workedSeconds);

    // Pausa obrigatória (almoço): considerar janela fixa 12:00-13:30 e incluir o que ainda falta da pausa mesmo que não tenha ocorrido.
    const pad = (n: number) => String(n).padStart(2, "0");
    const buildTodayAt = (h: number, m: number) => { const d = new Date(); d.setHours(h, m, 0, 0); return d; };
    const [lsH, lsM] = lunchStartStr.split(":").map(Number);
    const [leH, leM] = lunchEndStr.split(":").map(Number);
    const lunchStart = buildTodayAt(lsH || 12, lsM || 0);
    const lunchEnd = buildTodayAt(leH || 13, leM || 30);

    let takenPauseSeconds = 0;
    let startPauseRun: Date | null = null;
    for (const p of orderedPauses) {
      if (p.tipo === "pausa_inicio") {
        startPauseRun = new Date(p.horario);
      } else if (p.tipo === "pausa_fim" && startPauseRun) {
        takenPauseSeconds += Math.max(0, Math.floor((new Date(p.horario).getTime() - startPauseRun.getTime()) / 1000));
        startPauseRun = null;
      }
    }
    if (startPauseRun) {
      takenPauseSeconds += Math.max(0, Math.floor((now.getTime() - startPauseRun.getTime()) / 1000));
    }
    const remainingMandatoryPause = Math.max(0, pauseDefaultSeconds - takenPauseSeconds);

    // Ajustar a previsão de fim da pausa para refletir a janela fixa do almoço quando aplicável
    if (remainingMandatoryPause > 0 && now <= lunchEnd) {
      predictedPauseEnd = lunchEnd;
    }

    // Previsão de saída: jornada líquida que falta + pausa obrigatória remanescente (se ainda não cumprida até 13:30)
    const totalRemaining = remainingWorkSeconds + (now <= lunchEnd ? remainingMandatoryPause : 0);
    const predictedExit = totalRemaining > 0 ? new Date(now.getTime() + totalRemaining * 1000) : now;

    return { predictedPauseEnd, predictedExit, remainingWorkSeconds };
  }, [entrada, saida, pausas, status, dailyNetSeconds, pauseDefaultSeconds, lunchStartStr, lunchEndStr]);

  // Formato HH:mm (digital, compacto)
  const formatHHmm = (date: Date | null) => {
    if (!date) return "-";
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
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
                    <span className="font-medium text-foreground">{formatHHmm(predictedPauseEnd)}</span>
                  </div>
                )}
                <div className="flex items-center justify-center">
                  <Separator className="w-32" />
                </div>
                <div className="text-xs sm:text-sm text-muted-foreground flex items-center justify-center gap-2">
                  <Clock className="h-4 w-4" />
                  <span>Previsão de saída:</span>
                  <span className="font-medium text-foreground">{formatHHmm(predictedExit)}</span>
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
