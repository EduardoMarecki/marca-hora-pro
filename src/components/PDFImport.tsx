import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { extractPdfText, parseTimesheetText, type TimesheetRow } from "@/lib/pdfReader";
import { supabase } from "@/integrations/supabase/client";

type Props = {
  onExtract?: (data: { fullText: string; pages: string[]; rows?: TimesheetRow[] }) => void;
  enableTimesheetParsing?: boolean;
};

export default function PDFImport({ onExtract, enableTimesheetParsing = true }: Props) {
  const [status, setStatus] = useState<string>("");
  const [fullText, setFullText] = useState<string>("");
  const [rows, setRows] = useState<TimesheetRow[]>([]);
  const [saving, setSaving] = useState<boolean>(false);
  const [selected, setSelected] = useState<boolean[]>([]);
  const { toast } = useToast();

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== "application/pdf") {
      toast({ title: "Arquivo inválido", description: "Selecione um PDF.", variant: "destructive" });
      return;
    }

    try {
      setStatus("Lendo PDF...");
      const { fullText, pages } = await extractPdfText(file);
      setFullText(fullText);
      setStatus(`PDF lido com sucesso (${pages.length} páginas).`);

      let parsed: TimesheetRow[] | undefined = undefined;
      if (enableTimesheetParsing) {
        parsed = parseTimesheetText(fullText);
        setRows(parsed);
        setSelected(Array(parsed.length).fill(true));
      }

      onExtract?.({ fullText, pages, rows: parsed });
      toast({ title: "PDF importado", description: "Texto extraído com sucesso." });
    } catch (err: any) {
      console.error(err);
      setStatus("Falha ao ler PDF.");
      toast({ title: "Erro ao ler PDF", description: err?.message || String(err), variant: "destructive" });
    }
  }

  function toIso(date: string, time?: string): string | undefined {
    if (!time) return undefined;
    // date: dd/mm/yyyy, time: HH:mm
    const dm = date.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    const tm = time.match(/^(\d{2}):(\d{2})$/);
    if (!dm || !tm) return undefined;
    const [_, dd, mm, yyyy] = dm;
    const [__, hh, min] = tm;
    // Incluir offset de timezone para evitar deslocamento (ex.: -03:00 no Brasil)
    const offset = new Date().getTimezoneOffset(); // minutos (UTC - local)
    const sign = offset > 0 ? "-" : "+"; // se local está atrás do UTC (ex.: 180), sinal é '-'
    const offH = String(Math.floor(Math.abs(offset) / 60)).padStart(2, "0");
    const offM = String(Math.abs(offset) % 60).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}T${hh}:${min}:00${sign}${offH}:${offM}`;
  }

  async function handleSave() {
    try {
      const selectedRows = rows.filter((_, i) => selected[i]);
      if (selectedRows.length === 0) {
        toast({ title: "Nada para salvar", description: "Importe um PDF com batidas.", variant: "destructive" });
        return;
      }
      setSaving(true);
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError || !userData?.user?.id) {
        toast({ title: "Sessão ausente", description: "Faça login para salvar.", variant: "destructive" });
        setSaving(false);
        return;
      }
      const userId = userData.user.id;

      // Garantir que exista um perfil para o usuário atual (FK exige presença em profiles)
      const { data: profileCheck, error: profileErr } = await supabase
        .from("profiles")
        .select("id, email, nome")
        .eq("id", userId)
        .limit(1);
      const profile = profileCheck?.[0];
      if (!profile) {
        const nomeMeta = (userData.user.user_metadata as any)?.nome || (userData.user.user_metadata as any)?.full_name;
        const nome = nomeMeta || userData.user.email?.split("@")[0] || "Usuário";
        const email = userData.user.email || `${userId}@example.local`;
        const { error: insertProfileErr } = await supabase.from("profiles").insert({ id: userId, nome, email });
        if (insertProfileErr) {
          throw new Error(`Não foi possível criar o perfil do usuário: ${insertProfileErr.message}`);
        }
      }

      const inserts: Array<{ tipo: string; horario: string; user_id: string; localizacao?: string | null }> = [];
      for (const r of selectedRows) {
        const entradaIso = toIso(r.data, r.entrada);
        const pausaInicioIso = toIso(r.data, r.pausa_inicio);
        const pausaFimIso = toIso(r.data, r.pausa_fim);
        const saidaIso = toIso(r.data, r.saida);

        if (entradaIso) inserts.push({ tipo: "entrada", horario: entradaIso, user_id: userId, localizacao: null });
        if (pausaInicioIso) inserts.push({ tipo: "pausa_inicio", horario: pausaInicioIso, user_id: userId, localizacao: null });
        if (pausaFimIso) inserts.push({ tipo: "pausa_fim", horario: pausaFimIso, user_id: userId, localizacao: null });
        if (saidaIso) inserts.push({ tipo: "saida", horario: saidaIso, user_id: userId, localizacao: null });
      }

      if (inserts.length === 0) {
        toast({ title: "Nenhuma batida válida", description: "Verifique os horários extraídos.", variant: "destructive" });
        setSaving(false);
        return;
      }

      // Inserir na tabela principal "pontos" (evita FKs com "public_profiles")
      const { error } = await supabase.from("pontos").insert(inserts);
      if (error) throw error;

      toast({ title: "Batidas salvas", description: `${inserts.length} registros inseridos.` });
    } catch (err: any) {
      console.error(err);
      toast({ title: "Erro ao salvar", description: err?.message || String(err), variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }

  const selectedCount = selected.filter(Boolean).length;
  const allSelected = selected.length > 0 && selected.every(Boolean);
  function toggleAll() {
    if (selected.length === 0) return;
    setSelected(Array(selected.length).fill(!allSelected));
  }
  function toggleRow(index: number) {
    setSelected((prev) => prev.map((v, i) => (i === index ? !v : v)));
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Input type="file" accept="application/pdf" onChange={handleFileChange} />
        <Button variant="secondary" onClick={() => { setFullText(""); setRows([]); setStatus(""); }}>Limpar</Button>
        <Button onClick={handleSave} disabled={saving || rows.length === 0}>
          {saving ? "Salvando..." : "Salvar no Supabase"}
        </Button>
      </div>
      {status && <p className="text-sm text-muted-foreground">{status}</p>}
      {rows.length > 0 && (
        <div className="rounded-md border p-3">
          <div className="flex items-center justify-between mb-2">
            <p className="font-medium">Registros extraídos (Data, 1ª Entrada, 1ª Saída, 2ª Entrada, 2ª Saída)</p>
            <div className="flex items-center gap-3 text-sm">
              <button className="underline" onClick={toggleAll} type="button">
                {allSelected ? "Desmarcar todos" : "Selecionar todos"}
              </button>
              <span className="text-muted-foreground">Selecionados: {selectedCount}/{rows.length}</span>
            </div>
          </div>
          <div className="text-sm overflow-auto max-h-64">
            {rows.map((r, i) => (
              <div key={i} className="grid grid-cols-6 gap-2 py-1 border-b last:border-b-0 items-center">
                <input
                  type="checkbox"
                  className="h-4 w-4"
                  checked={!!selected[i]}
                  onChange={() => toggleRow(i)}
                />
                <span>{r.data}</span>
                <span>{r.entrada || "-"}</span>
                <span>{r.pausa_inicio || "-"}</span>
                <span>{r.pausa_fim || "-"}</span>
                <span>{r.saida || "-"}</span>
              </div>
            ))}
          </div>
        </div>
      )}
      {fullText && (
        <details className="rounded-md border p-3">
          <summary className="cursor-pointer">Texto completo extraído</summary>
          <pre className="mt-2 whitespace-pre-wrap break-words text-sm max-h-64 overflow-auto">{fullText}</pre>
        </details>
      )}
    </div>
  );
}