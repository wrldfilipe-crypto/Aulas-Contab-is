import mammoth from 'mammoth';
import * as pdfjsLib from 'pdfjs-dist';
import * as XLSX from 'xlsx';

// Configurar o worker local do PDF.js a partir de assets locais próprios (/pdf.worker.min.mjs)
// Evita carregamentos remotos de CDNs não autorizadas ou erros de importação dinâmica em workers
try {
  if (typeof window !== 'undefined') {
    pdfjsLib.GlobalWorkerOptions.workerSrc = window.location.origin + '/pdf.worker.min.mjs';
  }
} catch (e) {
  console.warn('[documentExtractor] Aviso ao configurar PDF.js worker local:', e);
}

export interface ExtractionProgress {
  current: number;
  total: number;
  percent: number;
  stage: string;
}

export interface ExtractedDocumentResult {
  texto: string;
  nome: string;
  tamanhoBytes: number;
  tipo: 'PDF' | 'DOCX' | 'EXCEL' | 'TEXT' | 'IMAGE';
  hasImagesOnly?: boolean;
}

export interface ExtractedImageResult {
  base64Data: string;
  mimeType: string;
  nome: string;
  tamanhoBytes: number;
}

/**
 * Lê uma imagem e converte para base64 limpo para inlineData da API Gemini.
 * Limite de 10 MB por imagem. Formatos: PNG, JPG/JPEG, WEBP.
 */
export async function lerImagemBase64(file: File): Promise<ExtractedImageResult> {
  const MAX_SIZE = 10 * 1024 * 1024; // 10 MB
  if (file.size > MAX_SIZE) {
    throw new Error(`A imagem "${file.name}" excede o tamanho máximo de 10 MB (${(file.size / (1024 * 1024)).toFixed(1)} MB).`);
  }

  const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
  const fileType = file.type?.toLowerCase() || '';
  if (!allowedTypes.includes(fileType)) {
    throw new Error(`Formato de imagem não suportado (${file.name}). Utilize ficheiros PNG, JPG ou WebP.`);
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const base64Data = result.includes(',') ? result.split(',')[1] : result;
      resolve({
        base64Data,
        mimeType: file.type || 'image/png',
        nome: file.name,
        tamanhoBytes: file.size
      });
    };
    reader.onerror = () => reject(new Error(`Erro ao ler o ficheiro de imagem "${file.name}".`));
    reader.readAsDataURL(file);
  });
}

/**
 * Extrai texto completo de ficheiros PDF página a página com pdfjs-dist.
 * Se páginas forem puramente digitalizadas sem texto, emite aviso claro sobre necessidade de OCR.
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
  let paginasVazias = 0;

  for (let i = 1; i <= numPages; i++) {
    if (onProgress) {
      onProgress({
        current: i,
        total: numPages,
        percent: Math.round((i / numPages) * 100),
        stage: `A extrair texto da página ${i} de ${numPages}...`
      });
    }

    try {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const pageStrings = textContent.items
        // @ts-ignore
        .map((item: any) => item.str || '')
        .filter(Boolean);

      const pageText = pageStrings.join(' ').trim();
      if (!pageText) {
        paginasVazias++;
        fullText += `\n[Página ${i}]: (Página digitalizada ou sem texto vetorial selecionável — necessita de OCR)\n`;
      } else {
        fullText += `\n[Página ${i}]\n${pageText}\n`;
      }
    } catch (pageErr) {
      fullText += `\n[Página ${i}]: (Erro na extração dos caracteres desta página)\n`;
    }
  }

  const textoReal = fullText.replace(/\[Página \d+\]: \(.*?\)/g, '').trim();
  if (!textoReal || textoReal.length < 15) {
    if (paginasVazias > 0) {
      throw new Error(
        `O documento PDF "${file.name}" parece ser composto por imagens digitalizadas sem camada de texto selecionável. ` +
        `Para analisar este documento com o Yohan, anexe diretamente as imagens da página (PNG/JPG) ou converta o PDF com ferramenta OCR.`
      );
    }
    throw new Error(`Não foi possível extrair texto do documento PDF "${file.name}". Verifique se o ficheiro está protegido por palavra-passe.`);
  }

  return fullText.trim();
}

/**
 * Extrai texto completo de ficheiros DOCX utilizando mammoth no cliente.
 */
export async function extrairTextoDOCX(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const result = await mammoth.extractRawText({ arrayBuffer });
  const text = result.value.trim();
  if (!text || text.length < 10) {
    throw new Error(`Não foi possível extrair texto do documento "${file.name}". O ficheiro pode estar vazio ou protegido.`);
  }
  return text;
}

/**
 * Extrai dados estruturados de planilhas Excel (.xlsx, .xls, .csv) com SheetJS (xlsx).
 * Lê até 5 folhas de cálculo. Por folha, cabeçalhos + até 100 linhas em formato de tabela de texto.
 */
export async function extrairTextoExcel(
  file: File,
  onProgress?: (prog: ExtractionProgress) => void
): Promise<string> {
  if (onProgress) {
    onProgress({ current: 1, total: 3, percent: 30, stage: `A ler folhas de cálculo de ${file.name}...` });
  }

  const arrayBuffer = await file.arrayBuffer();
  const workbook = XLSX.read(arrayBuffer, { type: 'array' });
  const sheetNames = workbook.SheetNames.slice(0, 5); // até 5 folhas

  if (sheetNames.length === 0) {
    throw new Error(`O ficheiro de folha de cálculo "${file.name}" não contém folhas legíveis.`);
  }

  let textResult = `=== FOLHA DE CÁLCULO: ${file.name} (Total de Folhas: ${workbook.SheetNames.length}) ===\n\n`;

  sheetNames.forEach((sheetName, index) => {
    if (onProgress) {
      onProgress({ 
        current: index + 1, 
        total: sheetNames.length, 
        percent: Math.round(((index + 1) / sheetNames.length) * 100), 
        stage: `A processar folha "${sheetName}"...` 
      });
    }

    const sheet = workbook.Sheets[sheetName];
    if (!sheet) return;

    const rawRows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' }) as any[][];
    if (!rawRows || rawRows.length === 0) {
      textResult += `--- Folha: "${sheetName}" (Vazia) ---\n\n`;
      return;
    }

    const totalRows = rawRows.length;
    const maxCols = Math.max(...rawRows.slice(0, 20).map(r => r.length), 1);

    textResult += `--- Folha: "${sheetName}" (${totalRows} linhas, ${maxCols} colunas) ---\n`;

    // Processar cabeçalhos e até 100 linhas de dados
    const sampleRows = rawRows.slice(0, 100);
    const tableLines = sampleRows.map((row, rIdx) => {
      const rowClean = row.map(cell => String(cell ?? '').trim().replace(/\|/g, '/')).join(' | ');
      return `L${rIdx + 1}: ${rowClean}`;
    });

    textResult += tableLines.join('\n');

    if (totalRows > 100) {
      textResult += `\n[Nota: A folha "${sheetName}" contém ${totalRows} linhas no total. Foram incluídas as primeiras 100 linhas para análise da IA].\n`;
    }
    textResult += '\n\n';
  });

  return textResult.trim();
}

/**
 * Extrai texto de ficheiro (PDF, DOCX, XLSX/CSV ou TXT/MD) com validação de tamanho (máx 20MB).
 */
export async function extrairTextoDocumento(
  file: File,
  onProgress?: (prog: ExtractionProgress) => void
): Promise<ExtractedDocumentResult> {
  const MAX_SIZE = 20 * 1024 * 1024; // 20 MB
  if (file.size > MAX_SIZE) {
    throw new Error(`O ficheiro "${file.name}" excede o limite máximo permitido de 20 MB (${(file.size / (1024 * 1024)).toFixed(1)} MB).`);
  }

  const ext = file.name.split('.').pop()?.toLowerCase() || '';

  // Bloqueio do formato binário antigo do Word (.doc)
  if (ext === 'doc') {
    throw new Error('O formato antigo Word (.doc binário) não é suportado. Por favor guarde o ficheiro como .docx ou PDF antes de o anexar.');
  }

  let texto = '';
  let docTipo: 'PDF' | 'DOCX' | 'EXCEL' | 'TEXT' | 'IMAGE' = 'TEXT';

  if (ext === 'pdf') {
    docTipo = 'PDF';
    texto = await extrairTextoPDF(file, onProgress);
  } else if (ext === 'docx') {
    docTipo = 'DOCX';
    if (onProgress) {
      onProgress({ current: 1, total: 1, percent: 50, stage: 'A extrair texto do documento Word (.docx)...' });
    }
    texto = await extrairTextoDOCX(file);
    if (onProgress) {
      onProgress({ current: 1, total: 1, percent: 100, stage: 'Extração concluída com sucesso!' });
    }
  } else if (ext === 'xlsx' || ext === 'xls' || ext === 'csv') {
    docTipo = 'EXCEL';
    texto = await extrairTextoExcel(file, onProgress);
  } else {
    // TXT, MD, JSON
    docTipo = 'TEXT';
    if (onProgress) {
      onProgress({ current: 1, total: 1, percent: 50, stage: 'A ler ficheiro de texto...' });
    }
    const rawText = await file.text();
    // Limite de 100.000 caracteres para ficheiros de texto direto
    if (rawText.length > 100000) {
      texto = rawText.slice(0, 100000) + '\n\n[Nota: Conteúdo do ficheiro truncado aos primeiros 100.000 caracteres para otimização do contexto].';
    } else {
      texto = rawText;
    }
    if (onProgress) {
      onProgress({ current: 1, total: 1, percent: 100, stage: 'Leitura concluída!' });
    }
  }

  if (!texto || texto.trim().length < 5) {
    throw new Error(`Não foi possível extrair texto utilizável do ficheiro "${file.name}". Verifique se o conteúdo não está vazio.`);
  }

  return {
    texto: texto.trim(),
    nome: file.name,
    tamanhoBytes: file.size,
    tipo: docTipo
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
