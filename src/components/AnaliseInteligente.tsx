import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Brain } from "lucide-react";
import { toast } from "sonner";

export const AnaliseInteligente = () => {
  const [analise, setAnalise] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [dias, setDias] = useState<number>(30);
  const [resumo, setResumo] = useState<any | null>(null);

  const infoHeader = useMemo(() => {
    if (!resumo) return null;
    return `Período: últimos ${resumo.periodoDias} dias • Registros: ${resumo.totalRegistros} • Dias com ponto: ${resumo.totalDias}`;
  }, [resumo]);

  const realizarAnalise = async () => {
    // Função de análise desativada
    toast.info("A Análise Inteligente foi desativada neste ambiente.");
  };

  return (
    <Card>
      <CardHeader className="pb-3 sm:pb-6">
        <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
          <Brain className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
          Análise Inteligente com IA
        </CardTitle>
        <CardDescription className="text-xs sm:text-sm">
          Recurso temporariamente desativado. Entre em contato com o administrador se precisar reativá-lo.
        </CardDescription>
        {infoHeader && (
          <div className="text-[11px] sm:text-xs text-muted-foreground mt-1">{infoHeader}</div>
        )}
      </CardHeader>
      <CardContent className="space-y-3 sm:space-y-4">
        <div className="flex items-center gap-2">
          <label className="text-xs sm:text-sm">Período</label>
          <select
            className="border rounded px-2 py-1 text-xs sm:text-sm"
            value={dias}
            onChange={(e) => setDias(Number(e.target.value))}
            disabled
          >
            <option value={7}>7 dias</option>
            <option value={30}>30 dias</option>
            <option value={90}>90 dias</option>
          </select>
        </div>
        <Button 
          onClick={realizarAnalise} 
          disabled
          className="w-full h-10 sm:h-11 text-sm sm:text-base"
        >
          <>
            <Brain className="mr-2 h-3 w-3 sm:h-4 sm:w-4" />
            Análise desativada
          </>
        </Button>
        {/* Área de resultados removida porque o recurso foi desativado */}
      </CardContent>
    </Card>
  );
};