import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Brain, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const AnaliseInteligente = () => {
  const [analise, setAnalise] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const realizarAnalise = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("analisar-pontos");

      if (error) {
        console.error("Erro ao invocar função:", error);
        throw error;
      }

      if (data.error) {
        throw new Error(data.error);
      }

      setAnalise(data.analise);
      toast.success("Análise concluída!");
    } catch (error: any) {
      console.error("Erro na análise:", error);
      toast.error(error.message || "Erro ao realizar análise");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3 sm:pb-6">
        <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
          <Brain className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
          Análise Inteligente com IA
        </CardTitle>
        <CardDescription className="text-xs sm:text-sm">
          Obtenha insights sobre seus padrões de trabalho e sugestões personalizadas
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3 sm:space-y-4">
        <Button 
          onClick={realizarAnalise} 
          disabled={isLoading}
          className="w-full h-10 sm:h-11 text-sm sm:text-base"
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-3 w-3 sm:h-4 sm:w-4 animate-spin" />
              Analisando...
            </>
          ) : (
            <>
              <Brain className="mr-2 h-3 w-3 sm:h-4 sm:w-4" />
              Realizar Análise
            </>
          )}
        </Button>

        {analise && (
          <div className="rounded-lg bg-muted p-3 sm:p-4 space-y-2">
            <h4 className="font-semibold text-xs sm:text-sm">Resultado da Análise:</h4>
            <div className="text-xs sm:text-sm whitespace-pre-wrap">{analise}</div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};