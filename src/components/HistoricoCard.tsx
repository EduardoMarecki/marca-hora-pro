import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Clock, Pencil } from "lucide-react";
import { EditarPontoDialog } from "@/components/EditarPontoDialog";

type Ponto = {
  id: string;
  tipo: string;
  horario: string;
  localizacao: string | null;
};

type HistoricoCardProps = {
  pontos: Ponto[];
  userEmail: string;
  onUpdate: () => void;
};

export const HistoricoCard = ({ pontos, userEmail, onUpdate }: HistoricoCardProps) => {
  const [editingPonto, setEditingPonto] = useState<Ponto | null>(null);
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
    <>
      <Card className="shadow-md">
        <CardHeader className="pb-3 sm:pb-6">
          <CardTitle className="text-base sm:text-lg">Histórico do Dia</CardTitle>
          <CardDescription className="text-xs sm:text-sm">
            Seus registros de ponto de hoje
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[250px] sm:h-[300px] pr-2 sm:pr-4">
            {pontos.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center py-6 sm:py-8">
                <Clock className="h-10 w-10 sm:h-12 sm:w-12 text-muted-foreground mb-2 sm:mb-3 opacity-50" />
                <p className="text-xs sm:text-sm text-muted-foreground">
                  Nenhum registro hoje
                </p>
              </div>
            ) : (
              <div className="space-y-2 sm:space-y-3">
                {pontos.map((ponto) => (
                  <div
                    key={ponto.id}
                    className="flex items-center justify-between p-2 sm:p-3 rounded-lg border bg-card hover:bg-accent/5 transition-colors"
                  >
                    <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                      <div className="flex flex-col min-w-0">
                        <span className="text-xs sm:text-sm font-medium truncate">
                          {getTipoLabel(ponto.tipo)}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(ponto.horario), "HH:mm:ss", { locale: ptBR })}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
                      <Badge variant={getTipoVariant(ponto.tipo) as any} className="text-xs">
                        {format(new Date(ponto.horario), "HH:mm", { locale: ptBR })}
                      </Badge>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => setEditingPonto(ponto)}
                        className="h-7 w-7 sm:h-8 sm:w-8"
                      >
                        <Pencil className="h-3 w-3 sm:h-4 sm:w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>

      {editingPonto && (
        <EditarPontoDialog
          open={!!editingPonto}
          onOpenChange={(open) => !open && setEditingPonto(null)}
          ponto={editingPonto}
          userEmail={userEmail}
          onSuccess={() => {
            setEditingPonto(null);
            onUpdate();
          }}
        />
      )}
    </>
  );
};
