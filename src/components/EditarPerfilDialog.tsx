import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { User } from "@supabase/supabase-js";

type EditarPerfilDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: User | null;
};

export const EditarPerfilDialog = ({ open, onOpenChange, user }: EditarPerfilDialogProps) => {
  const [loading, setLoading] = useState(false);
  const [nome, setNome] = useState("");
  const [cargo, setCargo] = useState("");
  const [tipoJornada, setTipoJornada] = useState("5x2");
  const [horarioEntrada, setHorarioEntrada] = useState("08:00");
  const [horarioSaidaAlmoco, setHorarioSaidaAlmoco] = useState("12:00");
  const [horarioVoltaAlmoco, setHorarioVoltaAlmoco] = useState("13:00");
  const [horarioSaidaFinal, setHorarioSaidaFinal] = useState("17:00");

  useEffect(() => {
    if (open && user) {
      loadProfile();
    }
  }, [open, user]);

  const loadProfile = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setNome(data.nome || "");
        setCargo(data.cargo || "");
        setTipoJornada(data.tipo_jornada || "5x2");
        setHorarioEntrada(data.horario_entrada || "08:00");
        setHorarioSaidaAlmoco(data.horario_saida_almoco || "12:00");
        setHorarioVoltaAlmoco(data.horario_volta_almoco || "13:00");
        setHorarioSaidaFinal(data.horario_saida_final || "17:00");
      }
    } catch (error: any) {
      toast.error("Erro ao carregar perfil");
    }
  };

  const handleSave = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          nome,
          cargo,
          tipo_jornada: tipoJornada,
          horario_entrada: horarioEntrada,
          horario_saida_almoco: horarioSaidaAlmoco,
          horario_volta_almoco: horarioVoltaAlmoco,
          horario_saida_final: horarioSaidaFinal,
        })
        .eq("id", user.id);

      if (error) throw error;

      toast.success("Perfil atualizado com sucesso!");
      onOpenChange(false);
    } catch (error: any) {
      toast.error("Erro ao atualizar perfil");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar Perfil</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="nome">Nome</Label>
            <Input
              id="nome"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Seu nome completo"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="cargo">Cargo</Label>
            <Input
              id="cargo"
              value={cargo}
              onChange={(e) => setCargo(e.target.value)}
              placeholder="Seu cargo na empresa"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="tipoJornada">Tipo de Jornada</Label>
            <select
              id="tipoJornada"
              value={tipoJornada}
              onChange={(e) => setTipoJornada(e.target.value)}
              className="w-full h-10 px-3 rounded-md border border-input bg-background"
            >
              <option value="5x2">5x2 (Segunda a Sexta)</option>
              <option value="6x1">6x1 (6 dias trabalhados, 1 folga)</option>
              <option value="12x36">12x36 (12h trabalhadas, 36h folga)</option>
            </select>
          </div>

          <div className="border-t pt-4">
            <h3 className="font-semibold mb-4">Horários de Trabalho</h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="horarioEntrada">Entrada</Label>
                <Input
                  id="horarioEntrada"
                  type="time"
                  value={horarioEntrada}
                  onChange={(e) => setHorarioEntrada(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="horarioSaidaAlmoco">Saída para Almoço</Label>
                <Input
                  id="horarioSaidaAlmoco"
                  type="time"
                  value={horarioSaidaAlmoco}
                  onChange={(e) => setHorarioSaidaAlmoco(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="horarioVoltaAlmoco">Volta do Almoço</Label>
                <Input
                  id="horarioVoltaAlmoco"
                  type="time"
                  value={horarioVoltaAlmoco}
                  onChange={(e) => setHorarioVoltaAlmoco(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="horarioSaidaFinal">Saída Final</Label>
                <Input
                  id="horarioSaidaFinal"
                  type="time"
                  value={horarioSaidaFinal}
                  onChange={(e) => setHorarioSaidaFinal(e.target.value)}
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={loading}>
              {loading ? "Salvando..." : "Salvar"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
