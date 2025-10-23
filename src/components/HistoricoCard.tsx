import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Clock } from "lucide-react";

type Ponto = {
  id: string;
  tipo: string;
  horario: string;
  localizacao: string | null;
};

type HistoricoCardProps = {
  pontos: Ponto[];
};

export const HistoricoCard = ({ pontos }: HistoricoCardProps) => {
  const getTipoLabel = (tipo: string) => {
    switch (tipo) {
      case "entrada":
        return "Entrada";
      case "pausa_inicio":
        return "Início da Pausa";
      case "pausa_fim":
        return "Fim da Pausa";
      case "saida":
        return "Saída";
      default:
        return tipo;
    }
  };

  const getTipoVariant = (tipo: string) => {
    switch (tipo) {
      case "entrada":
        return "default";
      case "pausa_inicio":
        return "secondary";
      case "pausa_fim":
        return "secondary";
      case "saida":
        return "destructive";
      default:
        return "outline";
    }
  };

  return (
    <Card className="shadow-md">
      <CardHeader>
        <CardTitle>Histórico do Dia</CardTitle>
        <CardDescription>
          Seus registros de ponto de hoje
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[300px] pr-4">
          {pontos.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center py-8">
              <Clock className="h-12 w-12 text-muted-foreground mb-3 opacity-50" />
              <p className="text-sm text-muted-foreground">
                Nenhum registro hoje
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {pontos.map((ponto) => (
                <div
                  key={ponto.id}
                  className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/5 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex flex-col">
                      <span className="text-sm font-medium">
                        {getTipoLabel(ponto.tipo)}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(ponto.horario), "HH:mm:ss", { locale: ptBR })}
                      </span>
                    </div>
                  </div>
                  <Badge variant={getTipoVariant(ponto.tipo) as any}>
                    {format(new Date(ponto.horario), "HH:mm", { locale: ptBR })}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
};
