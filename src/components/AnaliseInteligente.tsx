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
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Brain className="h-5 w-5 text-primary" />
          Análise Inteligente com IA
        </CardTitle>
        <CardDescription>
          Obtenha insights sobre seus padrões de trabalho e sugestões personalizadas
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button 
          onClick={realizarAnalise} 
          disabled={isLoading}
          className="w-full"
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Analisando...
            </>
          ) : (
            <>
              <Brain className="mr-2 h-4 w-4" />
              Realizar Análise
            </>
          )}
        </Button>

        {analise && (
          <div className="rounded-lg bg-muted p-4 space-y-2">
            <h4 className="font-semibold text-sm">Resultado da Análise:</h4>
            <div className="text-sm whitespace-pre-wrap">{analise}</div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};