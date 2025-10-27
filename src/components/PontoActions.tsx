import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LogIn, LogOut, Coffee, PlayCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type Ponto = {
  id: string;
  tipo: string;
  horario: string;
};

type PontoActionsProps = {
  pontos: Ponto[];
  onRegistrar: (tipo: string, selfieUrl?: string) => void;
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

  const [loading, setLoading] = useState<string | null>(null);
  const [exigirSelfie, setExigirSelfie] = useState<boolean>(false);

  useEffect(() => {
    let active = true;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data, error } = await supabase
        .from('profiles')
        .select('exigir_selfie')
        .eq('id', user.id)
        .single();
      if (!active) return;
      if (error) {
        console.warn('Falha ao carregar exigir_selfie:', error);
        setExigirSelfie(false);
      } else {
        setExigirSelfie(!!(data as any)?.exigir_selfie);
      }
    })();
    return () => { active = false };
  }, []);

  const fileInputId = "ponto-selfie-input";

  const uploadSelfie = async (file: File): Promise<string | undefined> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return undefined;
      const ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
      const path = `${user.id}/${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from('selfies').upload(path, file, { upsert: false, contentType: file.type });
      if (upErr) throw upErr;
      const { data } = supabase.storage.from('selfies').getPublicUrl(path);
      return data.publicUrl;
    } catch (e: any) {
      console.error('Falha no upload da selfie:', e);
      toast.warning('Não foi possível salvar a selfie. O ponto será registrado sem foto.');
      return undefined;
    }
  };

  const handleRegistrar = async (tipo: string) => {
    setLoading(tipo);
    try {
      let selfieUrl: string | undefined;
      if (exigirSelfie) {
        const input = document.getElementById(fileInputId) as HTMLInputElement | null;
        if (!input) {
          toast.error('Não foi possível abrir a câmera');
        } else {
          await new Promise<void>((resolve) => {
            const onChange = async () => {
              input.removeEventListener('change', onChange);
              const file = input.files && input.files[0];
              input.value = '';
              if (file) {
                selfieUrl = await uploadSelfie(file);
              }
              resolve();
            };
            input.addEventListener('change', onChange, { once: true });
            input.click();
          });
        }
      }
      onRegistrar(tipo, selfieUrl);
    } finally {
      setLoading(null);
    }
  };

  return (
    <Card className="shadow-md">
      <CardHeader className="pb-3 sm:pb-6">
        <CardTitle className="text-base sm:text-lg">Registrar Ponto</CardTitle>
        <CardDescription className="text-xs sm:text-sm">
          Clique nos botões para registrar seus horários
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-2 sm:space-y-3">
        <input id={fileInputId} type="file" accept="image/*" capture="environment" className="hidden" />
        <Button
          onClick={() => handleRegistrar("entrada")}
          disabled={!canRegisterEntrada}
          className="w-full h-12 sm:h-14 text-sm sm:text-base bg-gradient-success hover:opacity-90 transition-opacity"
          size="lg"
        >
          <LogIn className="mr-2 h-4 w-4 sm:h-5 sm:w-5" />
          Registrar Entrada
        </Button>

        <div className="grid grid-cols-2 gap-2 sm:gap-3">
          <Button
            onClick={() => handleRegistrar("pausa_inicio")}
            disabled={!canRegisterPauseStart}
            variant="outline"
            className="h-10 sm:h-12 text-xs sm:text-sm"
          >
            <Coffee className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" />
            <span className="hidden xs:inline">Iniciar </span>Pausa
          </Button>
          <Button
            onClick={() => handleRegistrar("pausa_fim")}
            disabled={!canRegisterPauseEnd}
            variant="outline"
            className="h-10 sm:h-12 text-xs sm:text-sm"
          >
            <PlayCircle className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" />
            Fim<span className="hidden xs:inline"> da Pausa</span>
          </Button>
        </div>

        <Button
          onClick={() => handleRegistrar("saida")}
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
