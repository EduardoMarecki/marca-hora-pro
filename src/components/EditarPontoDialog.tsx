import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";

type EditarPontoDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ponto: {
    id: string;
    tipo: string;
    horario: string;
    localizacao: string | null;
  };
  userEmail: string;
  onSuccess: () => void;
};

export const EditarPontoDialog = ({
  open,
  onOpenChange,
  ponto,
  userEmail,
  onSuccess,
}: EditarPontoDialogProps) => {
  const [senha, setSenha] = useState("");
  const [justificativa, setJustificativa] = useState("");
  const [novoHorario, setNovoHorario] = useState(
    format(new Date(ponto.horario), "yyyy-MM-dd'T'HH:mm")
  );
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!senha || !justificativa) {
      toast.error("Senha e justificativa são obrigatórias");
      return;
    }

    setIsLoading(true);

    try {
      // Validar senha
      const { error: authError } = await supabase.auth.signInWithPassword({
        email: userEmail,
        password: senha,
      });

      if (authError) {
        toast.error("Senha incorreta");
        setIsLoading(false);
        return;
      }

      // Atualizar registro
      const { error: updateError } = await supabase
        .from("pontos")
        .update({
          horario: new Date(novoHorario).toISOString(),
          justificativa_ajuste: justificativa,
        })
        .eq("id", ponto.id);

      if (updateError) throw updateError;

      toast.success("Registro atualizado com sucesso!");
      setSenha("");
      setJustificativa("");
      onOpenChange(false);
      onSuccess();
    } catch (error: any) {
      toast.error("Erro ao atualizar registro");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Editar Registro de Ponto</DialogTitle>
          <DialogDescription>
            Altere o horário do registro. É necessário informar sua senha e uma justificativa.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="tipo">Tipo de Registro</Label>
              <Input
                id="tipo"
                value={ponto.tipo.replace("_", " ").toUpperCase()}
                disabled
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="horario">Novo Horário</Label>
              <Input
                id="horario"
                type="datetime-local"
                value={novoHorario}
                onChange={(e) => setNovoHorario(e.target.value)}
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="senha">Senha</Label>
              <Input
                id="senha"
                type="password"
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                placeholder="Digite sua senha"
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="justificativa">Justificativa do Ajuste</Label>
              <Textarea
                id="justificativa"
                value={justificativa}
                onChange={(e) => setJustificativa(e.target.value)}
                placeholder="Explique o motivo do ajuste..."
                required
                className="min-h-[100px]"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Salvando..." : "Salvar Alterações"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
