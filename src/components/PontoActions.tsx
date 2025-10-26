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
      <CardHeader className="pb-3 sm:pb-6">
        <CardTitle className="text-base sm:text-lg">Registrar Ponto</CardTitle>
        <CardDescription className="text-xs sm:text-sm">
          Clique nos botões para registrar seus horários
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-2 sm:space-y-3">
        <Button
          onClick={() => onRegistrar("entrada")}
          disabled={!canRegisterEntrada}
          className="w-full h-12 sm:h-14 text-sm sm:text-base bg-gradient-success hover:opacity-90 transition-opacity"
          size="lg"
        >
          <LogIn className="mr-2 h-4 w-4 sm:h-5 sm:w-5" />
          Registrar Entrada
        </Button>

        <div className="grid grid-cols-2 gap-2 sm:gap-3">
          <Button
            onClick={() => onRegistrar("pausa_inicio")}
            disabled={!canRegisterPauseStart}
            variant="outline"
            className="h-10 sm:h-12 text-xs sm:text-sm"
          >
            <Coffee className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" />
            <span className="hidden xs:inline">Iniciar </span>Pausa
          </Button>
          <Button
            onClick={() => onRegistrar("pausa_fim")}
            disabled={!canRegisterPauseEnd}
            variant="outline"
            className="h-10 sm:h-12 text-xs sm:text-sm"
          >
            <PlayCircle className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" />
            Fim<span className="hidden xs:inline"> da Pausa</span>
          </Button>
        </div>

        <Button
          onClick={() => onRegistrar("saida")}
          disabled={!canRegisterSaida}
          variant="destructive"
          className="w-full h-12 sm:h-14 text-sm sm:text-base"
          size="lg"
        >
          <LogOut className="mr-2 h-4 w-4 sm:h-5 sm:w-5" />
          Registrar Saída
        </Button>
      </CardContent>
    </Card>
  );
};
