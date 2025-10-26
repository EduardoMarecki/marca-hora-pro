import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileDown, FileSpreadsheet } from "lucide-react";
import jsPDF from "jspdf";
import * as XLSX from "xlsx";
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from "date-fns";
import { ptBR } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type Ponto = {
  id: string;
  tipo: string;
  horario: string;
  localizacao: string | null;
};

type RelatorioExportProps = {
  pontos: Ponto[];
  userName: string;
  userId: string;
};

export const RelatorioExport = ({ pontos, userName, userId }: RelatorioExportProps) => {
  const loadPontosForPeriod = async (startDate: Date, endDate: Date) => {
    try {
      const { data, error } = await supabase
        .from("pontos")
        .select("*")
        .eq("user_id", userId)
        .gte("horario", startDate.toISOString())
        .lte("horario", endDate.toISOString())
        .order("horario", { ascending: true });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error("Erro ao carregar pontos:", error);
      toast.error("Erro ao carregar dados para exportação");
      return [];
    }
  };

  const calculateTotals = async (startDate: Date, endDate: Date) => {
    const filteredPontos = await loadPontosForPeriod(startDate, endDate);

    // Agrupar por dia
    const pontosPorDia = filteredPontos.reduce((acc, ponto) => {
      const dia = format(new Date(ponto.horario), "yyyy-MM-dd");
      if (!acc[dia]) acc[dia] = [];
      acc[dia].push(ponto);
      return acc;
    }, {} as Record<string, Ponto[]>);

    const relatorio = Object.entries(pontosPorDia).map(([dia, registros]) => {
      const entrada = registros.find((p) => p.tipo === "entrada");
      const saida = registros.find((p) => p.tipo === "saida");
      
      let totalHoras = 0;
      let totalPausa = 0;

      if (entrada && saida) {
        const start = new Date(entrada.horario);
        const end = new Date(saida.horario);
        totalHoras = (end.getTime() - start.getTime()) / (1000 * 60 * 60);

        // Calcular pausas
        const pausas = registros.filter(
          (p) => p.tipo === "pausa_inicio" || p.tipo === "pausa_fim"
        );
        for (let i = 0; i < pausas.length; i += 2) {
          if (pausas[i] && pausas[i + 1]) {
            const pausaStart = new Date(pausas[i].horario);
            const pausaEnd = new Date(pausas[i + 1].horario);
            totalPausa += (pausaEnd.getTime() - pausaStart.getTime()) / (1000 * 60 * 60);
          }
        }
      }

      return {
        dia: format(new Date(dia), "dd/MM/yyyy", { locale: ptBR }),
        entrada: entrada ? format(new Date(entrada.horario), "HH:mm") : "-",
        saida: saida ? format(new Date(saida.horario), "HH:mm") : "-",
        totalHoras: (totalHoras - totalPausa).toFixed(2),
        totalPausa: totalPausa.toFixed(2),
      };
    });

    return relatorio;
  };

  const exportToPDF = async (periodo: "semana" | "mes") => {
    const today = new Date();
    const startDate = periodo === "semana" ? startOfWeek(today, { locale: ptBR }) : startOfMonth(today);
    const endDate = periodo === "semana" ? endOfWeek(today, { locale: ptBR }) : endOfMonth(today);
    
    const dados = await calculateTotals(startDate, endDate);
    
    if (dados.length === 0) {
      toast.error("Nenhum registro encontrado para o período selecionado");
      return;
    }
    
    const totalGeral = dados.reduce((sum, d) => sum + parseFloat(d.totalHoras), 0);

    const doc = new jsPDF();
    
    // Título
    doc.setFontSize(18);
    doc.text("Relatório de Ponto - PontoFácil", 20, 20);
    
    doc.setFontSize(12);
    doc.text(`Funcionário: ${userName}`, 20, 30);
    doc.text(`Período: ${format(startDate, "dd/MM/yyyy")} a ${format(endDate, "dd/MM/yyyy")}`, 20, 37);
    
    // Tabela
    let y = 50;
    doc.setFontSize(10);
    doc.text("Data", 20, y);
    doc.text("Entrada", 60, y);
    doc.text("Saída", 95, y);
    doc.text("Pausa (h)", 130, y);
    doc.text("Total (h)", 165, y);
    
    y += 7;
    doc.line(20, y, 190, y);
    y += 5;

    dados.forEach((linha) => {
      doc.text(linha.dia, 20, y);
      doc.text(linha.entrada, 60, y);
      doc.text(linha.saida, 95, y);
      doc.text(linha.totalPausa, 130, y);
      doc.text(linha.totalHoras, 165, y);
      y += 7;
    });

    y += 5;
    doc.line(20, y, 190, y);
    y += 7;
    doc.setFontSize(12);
    doc.text(`Total Geral: ${totalGeral.toFixed(2)} horas`, 20, y);

    doc.save(`relatorio_ponto_${periodo}_${format(today, "yyyy-MM-dd")}.pdf`);
  };

  const exportToExcel = async (periodo: "semana" | "mes") => {
    const today = new Date();
    const startDate = periodo === "semana" ? startOfWeek(today, { locale: ptBR }) : startOfMonth(today);
    const endDate = periodo === "semana" ? endOfWeek(today, { locale: ptBR }) : endOfMonth(today);
    
    const dados = await calculateTotals(startDate, endDate);
    
    if (dados.length === 0) {
      toast.error("Nenhum registro encontrado para o período selecionado");
      return;
    }
    
    const totalGeral = dados.reduce((sum, d) => sum + parseFloat(d.totalHoras), 0);

    const worksheet = XLSX.utils.json_to_sheet([
      { A: "Relatório de Ponto - PontoFácil" },
      { A: `Funcionário: ${userName}` },
      { A: `Período: ${format(startDate, "dd/MM/yyyy")} a ${format(endDate, "dd/MM/yyyy")}` },
      {},
      { A: "Data", B: "Entrada", C: "Saída", D: "Pausa (h)", E: "Total (h)" },
      ...dados.map((d) => ({
        A: d.dia,
        B: d.entrada,
        C: d.saida,
        D: d.totalPausa,
        E: d.totalHoras,
      })),
      {},
      { A: "Total Geral", E: totalGeral.toFixed(2) },
    ], { skipHeader: true });

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Relatório");
    XLSX.writeFile(workbook, `relatorio_ponto_${periodo}_${format(today, "yyyy-MM-dd")}.xlsx`);
  };

  return (
    <Card className="bg-gradient-card shadow-md">
      <CardHeader className="pb-3 sm:pb-6">
        <CardTitle className="text-base sm:text-lg">Exportar Relatório</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 sm:space-y-4">
        <div className="space-y-2">
          <p className="text-xs sm:text-sm text-muted-foreground">Relatório Semanal</p>
          <div className="flex gap-2">
            <Button
              onClick={() => exportToPDF("semana")}
              variant="outline"
              className="flex-1 h-9 sm:h-10 text-xs sm:text-sm"
            >
              <FileDown className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
              PDF
            </Button>
            <Button
              onClick={() => exportToExcel("semana")}
              variant="outline"
              className="flex-1 h-9 sm:h-10 text-xs sm:text-sm"
            >
              <FileSpreadsheet className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
              Excel
            </Button>
          </div>
        </div>
        
        <div className="space-y-2">
          <p className="text-xs sm:text-sm text-muted-foreground">Relatório Mensal</p>
          <div className="flex gap-2">
            <Button
              onClick={() => exportToPDF("mes")}
              variant="outline"
              className="flex-1 h-9 sm:h-10 text-xs sm:text-sm"
            >
              <FileDown className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
              PDF
            </Button>
            <Button
              onClick={() => exportToExcel("mes")}
              variant="outline"
              className="flex-1 h-9 sm:h-10 text-xs sm:text-sm"
            >
              <FileSpreadsheet className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
              Excel
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
