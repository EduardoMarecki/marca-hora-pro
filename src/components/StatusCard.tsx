import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, PlayCircle, PauseCircle, CheckCircle } from "lucide-react";
import { useEffect, useState } from "react";

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

      const entrada = pontos.find(p => p.tipo === "entrada");
      const saida = pontos.find(p => p.tipo === "saida");

      if (entrada && !saida) {
        const start = new Date(entrada.horario);
        const now = new Date();
        const diff = Math.floor((now.getTime() - start.getTime()) / 1000);

        // Subtract pause time (including lunch breaks)
        const pausas = pontos.filter(p => p.tipo === "pausa_inicio" || p.tipo === "pausa_fim");
        let pauseTime = 0;
        
        for (let i = 0; i < pausas.length; i += 2) {
          if (pausas[i] && pausas[i].tipo === "pausa_inicio") {
            const pauseStart = new Date(pausas[i].horario);
            const pauseEnd = pausas[i + 1] ? new Date(pausas[i + 1].horario) : now;
            pauseTime += Math.floor((pauseEnd.getTime() - pauseStart.getTime()) / 1000);
          }
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
        const pausas = pontos.filter(p => p.tipo === "pausa_inicio" || p.tipo === "pausa_fim");
        let pauseTime = 0;
        
        for (let i = 0; i < pausas.length; i += 2) {
          if (pausas[i] && pausas[i + 1] && pausas[i].tipo === "pausa_inicio" && pausas[i + 1].tipo === "pausa_fim") {
            const pauseStart = new Date(pausas[i].horario);
            const pauseEnd = new Date(pausas[i + 1].horario);
            pauseTime += Math.floor((pauseEnd.getTime() - pauseStart.getTime()) / 1000);
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
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
