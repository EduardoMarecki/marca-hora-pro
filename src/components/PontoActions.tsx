import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LogIn, LogOut, Coffee, PlayCircle } from "lucide-react";

type Ponto = {
  id: string;
  tipo: string;
  horario: string;
};

type PontoActionsProps = {
  pontos: Ponto[];
  onRegistrar: (tipo: string) => void;
};

export const PontoActions = ({ pontos, onRegistrar }: PontoActionsProps) => {
  const lastPonto = pontos[0];
  const hasEntrada = pontos.some(p => p.tipo === "entrada");
  const hasSaida = pontos.some(p => p.tipo === "saida");
  const isOnPause = lastPonto?.tipo === "pausa_inicio";

  const canRegisterEntrada = !hasEntrada;
  const canRegisterPauseStart = hasEntrada && !hasSaida && !isOnPause;
  const canRegisterPauseEnd = isOnPause;
  const canRegisterSaida = hasEntrada && !hasSaida && !isOnPause;

  return (
    <Card className="shadow-md">
      <CardHeader>
        <CardTitle>Registrar Ponto</CardTitle>
        <CardDescription>
          Clique nos botões para registrar seus horários
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <Button
          onClick={() => onRegistrar("entrada")}
          disabled={!canRegisterEntrada}
          className="w-full h-14 text-base bg-gradient-success hover:opacity-90 transition-opacity"
          size="lg"
        >
          <LogIn className="mr-2 h-5 w-5" />
          Registrar Entrada
        </Button>

        <div className="grid grid-cols-2 gap-3">
          <Button
            onClick={() => onRegistrar("pausa_inicio")}
            disabled={!canRegisterPauseStart}
            variant="outline"
            className="h-12"
          >
            <Coffee className="mr-2 h-4 w-4" />
            Iniciar Pausa
          </Button>
          <Button
            onClick={() => onRegistrar("pausa_fim")}
            disabled={!canRegisterPauseEnd}
            variant="outline"
            className="h-12"
          >
            <PlayCircle className="mr-2 h-4 w-4" />
            Fim da Pausa
          </Button>
        </div>

        <Button
          onClick={() => onRegistrar("saida")}
          disabled={!canRegisterSaida}
          variant="destructive"
          className="w-full h-14 text-base"
          size="lg"
        >
          <LogOut className="mr-2 h-5 w-5" />
          Registrar Saída
        </Button>
      </CardContent>
    </Card>
  );
};
