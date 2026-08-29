import mammoth from 'mammoth';
import * as pdfjsLib from 'pdfjs-dist';

// Configurar o worker do PDF.js para processamento cliente
try {
  if (typeof window !== 'undefined') {
    // Usar worker minificado compatível com a versão instalada do pdfjs-dist
    pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version || '3.11.174'}/pdf.worker.min.js`;
  }
} catch (e) {
  console.warn('[documentExtractor] Aviso ao configurar PDF.js worker:', e);
}

export interface ExtractionProgress {
  current: number;
  total: number;
  percent: number;
  stage: string;
}

/**
 * Extrai texto completo de ficheiros PDF utilizando pdfjs-dist no cliente.
 */
export async function extrairTextoPDF(
  file: File,
  onProgress?: (prog: ExtractionProgress) => void
): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer) });
  const pdf = await loadingTask.promise;
  const numPages = pdf.numPages;

  let fullText = '';

  for (let i = 1; i <= numPages; i++) {
    if (onProgress) {
      onProgress({
        current: i,
        total: numPages,
        percent: Math.round((i / numPages) * 100),
        stage: `A extrair texto da página ${i} de ${numPages}...`
      });
    }

    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    const pageStrings = textContent.items
      // @ts-ignore
      .map((item: any) => item.str || '')
      .filter(Boolean);

    fullText += `\n[Página ${i}]\n` + pageStrings.join(' ') + '\n';
  }

  return fullText.trim();
}

/**
 * Extrai texto completo de ficheiros DOCX utilizando mammoth no cliente.
 */
export async function extrairTextoDOCX(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const result = await mammoth.extractRawText({ arrayBuffer });
  return result.value.trim();
}

/**
 * Extrai texto de ficheiro (PDF, DOCX ou TXT/MD/CSV) com validação de tamanho (máx 20MB).
 */
export async function extrairTextoDocumento(
  file: File,
  onProgress?: (prog: ExtractionProgress) => void
): Promise<{ texto: string; nome: string; tamanhoBytes: number; tipo: string }> {
  const MAX_SIZE = 20 * 1024 * 1024; // 20 MB
  if (file.size > MAX_SIZE) {
    throw new Error(`O ficheiro excede o limite máximo permitido de 20 MB (${(file.size / (1024 * 1024)).toFixed(1)} MB).`);
  }

  const ext = file.name.split('.').pop()?.toLowerCase() || '';
  let texto = '';

  if (ext === 'pdf') {
    texto = await extrairTextoPDF(file, onProgress);
  } else if (ext === 'docx') {
    if (onProgress) {
      onProgress({ current: 1, total: 1, percent: 50, stage: 'A extrair texto do documento Word (.docx)...' });
    }
    texto = await extrairTextoDOCX(file);
    if (onProgress) {
      onProgress({ current: 1, total: 1, percent: 100, stage: 'Extração concluída com sucesso!' });
    }
  } else {
    // TXT, MD, CSV, JSON
    if (onProgress) {
      onProgress({ current: 1, total: 1, percent: 50, stage: 'A ler ficheiro de texto...' });
    }
    texto = await file.text();
    if (onProgress) {
      onProgress({ current: 1, total: 1, percent: 100, stage: 'Leitura concluída!' });
    }
  }

  if (!texto || texto.trim().length < 20) {
    throw new Error('Não foi possível extrair texto suficiente do documento fornecido. Verifique se o ficheiro não está vazio ou protegido por palavra-passe.');
  }

  return {
    texto: texto.trim(),
    nome: file.name,
    tamanhoBytes: file.size,
    tipo: ext.toUpperCase()
  };
}

/**
 * Divide textos extensos (>40.000 caracteres) em blocos de ~12.000 caracteres com 500 de sobreposição.
 */
export function dividirEmChunks(
  texto: string,
  chunkSize: number = 12000,
  overlap: number = 500
): string[] {
  if (!texto || texto.length <= chunkSize) {
    return [texto];
  }

  const chunks: string[] = [];
  let startIndex = 0;

  while (startIndex < texto.length) {
    const endIndex = Math.min(startIndex + chunkSize, texto.length);
    const chunk = texto.slice(startIndex, endIndex).trim();
    if (chunk) {
      chunks.push(chunk);
    }
    if (endIndex >= texto.length) break;
    startIndex += chunkSize - overlap;
  }

  return chunks;
}
