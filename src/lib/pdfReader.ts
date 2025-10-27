// Utility to extract text from a PDF file in the browser using pdfjs-dist
// Works with text-based PDFs. For scanned/image PDFs, consider OCR (e.g., Tesseract.js).
import { getDocument, GlobalWorkerOptions, type PDFDocumentProxy } from "pdfjs-dist";
// Carrega o Worker da mesma versão instalada do pdfjs-dist usando o mecanismo de bundling do Vite (?worker)
// Isso garante que API e Worker estejam sincronizados e evita o erro de versão incompatível.
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore - Vite retorna um construtor de Worker
import PdfJsWorker from "pdfjs-dist/build/pdf.worker.min.mjs?worker";
// Inicializa explicitamente o Worker para o PDF.js
GlobalWorkerOptions.workerPort = new PdfJsWorker();

export async function extractPdfText(file: File): Promise<{
  pages: string[];
  fullText: string;
}> {
  const arrayBuffer = await file.arrayBuffer();

  const loadingTask = getDocument({ data: arrayBuffer });
  const pdf: PDFDocumentProxy = await loadingTask.promise;

  const pagesText: string[] = [];

  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const textContent = await page.getTextContent();
    const pageText = textContent.items
      .map((item: any) => (typeof item.str === "string" ? item.str : ""))
      .join(" ")
      .replace(/\s+\n/g, " ")
      .replace(/\s{2,}/g, " ")
      .trim();
    pagesText.push(pageText);
  }

  return { pages: pagesText, fullText: pagesText.join("\n\n") };
}

// Simple parser tailored for timesheet-like PDFs (Portuguese)
// Attempts to extract date and up to two entries/exits per day.
export type TimesheetRow = {
  data: string; // dd/mm/yyyy
  entrada?: string; // 1a E.
  pausa_inicio?: string; // 1a S.
  pausa_fim?: string; // 2a E.
  saida?: string; // 2a S.
};

export function parseTimesheetText(fullText: string): TimesheetRow[] {
  const text = fullText.replace(/\s{2,}/g, " ").trim();
  const rows: TimesheetRow[] = [];

  const dateRegexG = /(\d{2}\/\d{2}\/\d{4})/g;
  const timeRegexG = /\b(\d{1,2}[:.]\d{2})\b/g; // captura 8:00, 08.00
  const ignoreKeywords = /(feri|féri|nao\s*trabalh|não\s*trabalh|padroeira|folga|abon|aus[êe]n|domingo|sabado|sábado)/i;

  function normTime(t?: string): string | undefined {
    if (!t) return undefined;
    const tt = t.replace(".", ":");
    const m = tt.match(/^(\d{1,2}):(\d{2})$/);
    if (!m) return undefined;
    const hh = m[1].padStart(2, "0");
    return `${hh}:${m[2]}`;
  }

  // Encontrar todos os índices de datas e segmentar o texto por elas
  const dateMatches: Array<{ date: string; index: number }> = [];
  for (const m of text.matchAll(dateRegexG)) {
    dateMatches.push({ date: m[1], index: m.index ?? 0 });
  }

  for (let i = 0; i < dateMatches.length; i++) {
    const { date: data, index: start } = dateMatches[i];
    const end = i + 1 < dateMatches.length ? dateMatches[i + 1].index : text.length;
    const segment = text.slice(start, end);

    const afterDate = segment.slice(segment.indexOf(data) + data.length).trim();
    if (ignoreKeywords.test(afterDate)) continue;

    const times: string[] = [];
    for (const tm of afterDate.matchAll(timeRegexG)) {
      const t = normTime(tm[1]);
      if (t) times.push(t);
    }

    if (times.length === 0) continue; // sem batidas

    const entrada = times[0];
    const pausa_inicio = times[1];
    const pausa_fim = times[2];
    const saida = times[3];

    rows.push({ data, entrada, pausa_inicio, pausa_fim, saida });
  }

  return rows;
}