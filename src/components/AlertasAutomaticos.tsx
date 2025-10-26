import { useEffect, useState } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, CheckCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type Ponto = {
  id: string;
  tipo: string;
  horario: string;
};

type AlertasAutomaticosProps = {
  pontos: Ponto[];
};

export const AlertasAutomaticos = ({ pontos }: AlertasAutomaticosProps) => {
  const [alertas, setAlertas] = useState<string[]>([]);

  useEffect(() => {
    verificarAlertas();
  }, [pontos]);

  const verificarAlertas = () => {
    const novosAlertas: string[] = [];
    
    // Verificar ontem
    const ontem = new Date();
    ontem.setDate(ontem.getDate() - 1);
    ontem.setHours(0, 0, 0, 0);
    
    const finalOntem = new Date(ontem);
    finalOntem.setHours(23, 59, 59, 999);

    const pontosOntem = pontos.filter(p => {
      const data = new Date(p.horario);
      return data >= ontem && data <= finalOntem;
    });

    // Verificar se tem entrada sem saída
    const temEntrada = pontosOntem.some(p => p.tipo === "entrada");
    const temSaida = pontosOntem.some(p => p.tipo === "saida");

    if (temEntrada && !temSaida) {
      novosAlertas.push("Você esqueceu de registrar a saída ontem!");
    }

    // Verificar hoje
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    const pontosHoje = pontos.filter(p => {
      const data = new Date(p.horario);
      return data >= hoje;
    });

    // Verificar se está em pausa há muito tempo (mais de 2 horas)
    const ultimoPonto = pontosHoje[0];
    if (ultimoPonto && ultimoPonto.tipo === "pausa_inicio") {
      const tempoEmPausa = Date.now() - new Date(ultimoPonto.horario).getTime();
      const horasEmPausa = tempoEmPausa / (1000 * 60 * 60);
      
      if (horasEmPausa > 2) {
        novosAlertas.push("Você está em pausa há mais de 2 horas. Não esqueça de registrar o retorno!");
      }
    }

    // Verificar se trabalhou mais de 6h sem pausa hoje
    const temEntradaHoje = pontosHoje.some(p => p.tipo === "entrada");
    const temPausaHoje = pontosHoje.some(p => p.tipo === "pausa_inicio");
    
    if (temEntradaHoje && !temPausaHoje) {
      const entrada = pontosHoje.find(p => p.tipo === "entrada");
      if (entrada) {
        const tempoTrabalhado = Date.now() - new Date(entrada.horario).getTime();
        const horasTrabalhadas = tempoTrabalhado / (1000 * 60 * 60);
        
        if (horasTrabalhadas > 6) {
          novosAlertas.push("Você trabalhou mais de 6 horas sem pausa. Considere fazer uma pausa!");
        }
      }
    }

    setAlertas(novosAlertas);
  };

  if (alertas.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-3 sm:pb-6">
          <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
            <CheckCircle className="h-4 w-4 sm:h-5 sm:w-5 text-green-500" />
            Alertas
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-xs sm:text-sm text-muted-foreground">Tudo certo! Sem alertas no momento.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3 sm:pb-6">
        <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
          <AlertCircle className="h-4 w-4 sm:h-5 sm:w-5 text-orange-500" />
          Alertas
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 sm:space-y-3">
        {alertas.map((alerta, index) => (
          <Alert key={index} variant="destructive" className="py-2 sm:py-3">
            <AlertCircle className="h-3 w-3 sm:h-4 sm:w-4" />
            <AlertTitle className="text-xs sm:text-sm">Atenção</AlertTitle>
            <AlertDescription className="text-xs sm:text-sm">{alerta}</AlertDescription>
          </Alert>
        ))}
      </CardContent>
    </Card>
  );
};