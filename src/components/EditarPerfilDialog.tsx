import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { User } from "@supabase/supabase-js";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { applyTheme } from "@/lib/theme";
import { Switch } from "@/components/ui/switch";

type Empresa = {
  id: string;
  nome: string;
};

type EditarPerfilDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: User | null;
};

export const EditarPerfilDialog = ({ open, onOpenChange, user }: EditarPerfilDialogProps) => {
  const [loading, setLoading] = useState(false);
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [nome, setNome] = useState("");
  const [cargo, setCargo] = useState("");
  const [empresaId, setEmpresaId] = useState("");
  const [tipoJornada, setTipoJornada] = useState("5x2");
  const [horarioEntrada, setHorarioEntrada] = useState("08:30");
  const [horarioSaidaAlmoco, setHorarioSaidaAlmoco] = useState("12:00");
  const [horarioVoltaAlmoco, setHorarioVoltaAlmoco] = useState("13:30");
  const [horarioSaidaFinal, setHorarioSaidaFinal] = useState("18:00");
  const [themePreference, setThemePreference] = useState<'system'|'light'|'dark'>("system");
  const [exigirSelfie, setExigirSelfie] = useState<boolean>(false);

  // Validação em formato 24h HH:mm e coerência entre campos
  const isValidHHmm = (v: string) => /^([01]\d|2[0-3]):[0-5]\d$/.test(v);
  const ensureValidTimes = () => {
    if (!isValidHHmm(horarioEntrada) || !isValidHHmm(horarioSaidaAlmoco) || !isValidHHmm(horarioVoltaAlmoco) || !isValidHHmm(horarioSaidaFinal)) {
      toast.error("Use o formato 24h HH:mm em todos os campos (ex.: 08:30, 12:00, 13:30, 18:00)");
      return false;
    }
    const toSec = (s: string) => { const [h,m] = s.split(":").map(Number); return h*3600+m*60; };
    const entradaSec = toSec(horarioEntrada);
    const almocoIniSec = toSec(horarioSaidaAlmoco);
    const almocoFimSec = toSec(horarioVoltaAlmoco);
    const saidaSec = toSec(horarioSaidaFinal);
    if (almocoFimSec <= almocoIniSec) { toast.error("A volta do almoço deve ser após a saída para almoço"); return false; }
    // Aceitar jornada que cruza meia-noite (ex.: entrada 22:00, saída 06:00)
    const gross = (saidaSec - entradaSec + 24*3600) % (24*3600);
    if (gross <= 0) { toast.error("Saída Final deve ser após a Entrada (considerando 24h)"); return false; }
    return true;
  };

  useEffect(() => {
    if (open && user) {
      loadProfile();
      loadEmpresas();
    }
  }, [open, user]);

  const loadEmpresas = async () => {
    try {
      const { data, error } = await supabase
        .from("empresas")
        .select("id, nome")
        .order("nome");
      
      if (error) throw error;
      setEmpresas(data || []);
    } catch (error) {
      console.error("Erro ao carregar empresas:", error);
    }
  };

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
        setEmpresaId(data.empresa_id || "");
        setTipoJornada(data.tipo_jornada || "5x2");
        setHorarioEntrada(data.horario_entrada || "08:30");
        setHorarioSaidaAlmoco(data.horario_saida_almoco || "12:00");
        setHorarioVoltaAlmoco(data.horario_volta_almoco || "13:30");
        setHorarioSaidaFinal(data.horario_saida_final || "18:00");
        setThemePreference((data as any).theme_preference || 'system');
        setExigirSelfie(!!(data as any).exigir_selfie);
      }
    } catch (error: any) {
      toast.error("Erro ao carregar perfil");
    }
  };

  const handleSave = async () => {
    if (!user) return;

    setLoading(true);
    try {
      if (!ensureValidTimes()) { setLoading(false); return; }
      // Primeira tentativa: atualizar com theme_preference (ambiente com migration aplicada)
      let { error } = await supabase
        .from("profiles")
        .update({
          nome,
          cargo,
          empresa_id: empresaId || null,
          tipo_jornada: tipoJornada,
          horario_entrada: horarioEntrada,
          horario_saida_almoco: horarioSaidaAlmoco,
          horario_volta_almoco: horarioVoltaAlmoco,
          horario_saida_final: horarioSaidaFinal,
          theme_preference: themePreference,
          exigir_selfie: exigirSelfie,
        })
        .eq("id", user.id);

      // Fallback #1: se a coluna de preferências não existir no ambiente (erro 42703/column does not exist), tenta sem theme_preference/exigir_selfie
      if (error && (error.code === '42703' || error.message?.toLowerCase().includes('theme_preference') || error.message?.toLowerCase().includes('exigir_selfie'))) {
        const retry = await supabase
          .from("profiles")
          .update({
            nome,
            cargo,
            empresa_id: empresaId || null,
            tipo_jornada: tipoJornada,
            horario_entrada: horarioEntrada,
            horario_saida_almoco: horarioSaidaAlmoco,
            horario_volta_almoco: horarioVoltaAlmoco,
            horario_saida_final: horarioSaidaFinal,
          })
          .eq("id", user.id);
        error = retry.error;
        if (!retry.error) {
          toast.warning("Algumas preferências (tema/selfie) não foram salvas (execute as migrations em produção). Perfil atualizado mesmo assim.");
        }
      }

      // Fallback #2: se o ambiente não tiver colunas de almoço ainda, tenta salvar sem 'horario_saida_almoco' e 'horario_volta_almoco'
      if (error && (error.code === '42703' || error.message?.toLowerCase().includes('horario_saida_almoco') || error.message?.toLowerCase().includes('horario_volta_almoco'))) {
        const retry2 = await supabase
          .from("profiles")
          .update({
            nome,
            cargo,
            empresa_id: empresaId || null,
            tipo_jornada: tipoJornada,
            horario_entrada: horarioEntrada,
            horario_saida_final: horarioSaidaFinal,
          })
          .eq("id", user.id);
        error = retry2.error;
        if (!retry2.error) {
          toast.warning("Campos de almoço não existem na base atual. Salvei Entrada e Saída Final. Aplique as migrations para salvar os de almoço.");
        }
      }

      if (error) throw error;

      // Aplica imediatamente o tema escolhido
      applyTheme(themePreference);
      toast.success("Perfil atualizado com sucesso!");
      onOpenChange(false);
    } catch (error: any) {
      console.error("Erro ao atualizar perfil:", error);
      toast.error(error?.message || "Erro ao atualizar perfil");
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
            <Label htmlFor="empresa">Empresa</Label>
            <Select value={empresaId} onValueChange={setEmpresaId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione sua empresa" />
              </SelectTrigger>
              <SelectContent>
                {empresas.map((empresa) => (
                  <SelectItem key={empresa.id} value={empresa.id}>
                    {empresa.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
                  type="text"
                  inputMode="numeric"
                  pattern="^([01]\\d|2[0-3]):[0-5]\\d$"
                  placeholder="HH:mm"
                  title="Formato 24h HH:mm"
                  value={horarioEntrada}
                  onChange={(e) => setHorarioEntrada(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="horarioSaidaAlmoco">Saída para Almoço</Label>
                <Input
                  id="horarioSaidaAlmoco"
                  type="text"
                  inputMode="numeric"
                  pattern="^([01]\\d|2[0-3]):[0-5]\\d$"
                  placeholder="HH:mm"
                  title="Formato 24h HH:mm"
                  value={horarioSaidaAlmoco}
                  onChange={(e) => setHorarioSaidaAlmoco(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="horarioVoltaAlmoco">Volta do Almoço</Label>
                <Input
                  id="horarioVoltaAlmoco"
                  type="text"
                  inputMode="numeric"
                  pattern="^([01]\\d|2[0-3]):[0-5]\\d$"
                  placeholder="HH:mm"
                  title="Formato 24h HH:mm"
                  value={horarioVoltaAlmoco}
                  onChange={(e) => setHorarioVoltaAlmoco(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="horarioSaidaFinal">Saída Final</Label>
                <Input
                  id="horarioSaidaFinal"
                  type="text"
                  inputMode="numeric"
                  pattern="^([01]\\d|2[0-3]):[0-5]\\d$"
                  placeholder="HH:mm"
                  title="Formato 24h HH:mm"
                  value={horarioSaidaFinal}
                  onChange={(e) => setHorarioSaidaFinal(e.target.value)}
                />
              </div>
            </div>
          </div>

          <div className="border-t pt-4">
            <h3 className="font-semibold mb-4">Aparência</h3>
            <div className="space-y-2">
              <Label htmlFor="themePreference">Tema</Label>
              <Select value={themePreference} onValueChange={(v) => setThemePreference(v as any)}>
                <SelectTrigger>
                  <SelectValue placeholder="Preferência de tema" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="system">Sistema</SelectItem>
                  <SelectItem value="light">Claro</SelectItem>
                  <SelectItem value="dark">Escuro</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="border-t pt-4">
            <h3 className="font-semibold mb-4">Compliance</h3>
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="exigirSelfie">Exigir selfie ao bater ponto</Label>
                <p className="text-xs text-muted-foreground">Quando ativado, solicitará uma foto antes de registrar o ponto.</p>
              </div>
              <Switch id="exigirSelfie" checked={exigirSelfie} onCheckedChange={setExigirSelfie} />
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
