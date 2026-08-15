import mammoth from "mammoth";
import { collection, doc, getDoc, setDoc, addDoc, getDocs, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase";
import { construirPlano, SEED_CONTAS } from "./chartSeed";
import type { Conta, PlanoContas } from "./types";

// ---------- 1. INGESTÃO DO DOCUMENTO OFICIAL ----------

/** Extrai o texto do .docx (funciona no browser). */
export async function extrairTextoDocx(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const result = await mammoth.extractRawText({ arrayBuffer });
  return result.value;
}

/** Converte o texto do decreto numa lista de contas (código + designação). */
export function parsearContasDoTexto(texto: string): Conta[] {
  const linhas = texto.split(/\r?\n/);
  const contas: Conta[] = [];
  // Padrões oficiais: "45.1 Fundo Fixo", "11.1.4.1 Edifícios", "45 Caixa"
  const reCodigo = /^(\d{1,2}(?:\.\d{1,2}){0,3})[)\s.\-–—]+\s*([A-ZÀ-Üa-zà-ü].*)$/;

  for (const linha of linhas) {
    const m = linha.trim().match(reCodigo);
    if (!m) continue;
    const codigo = m[1];
    const designacao = m[2].trim().replace(/\s{2,}/g, " ");
    if (!designacao || designacao.length < 3) continue;
    const partes = codigo.split(".");
    contas.push({
      codigo,
      designacao,
      nivel: Math.min(partes.length, 4) as Conta["nivel"],
      classe: partes[0],
      natureza: "mista", // o administrador confirma depois
      fonte: "documento-oficial-ingestado",
    });
  }
  return contas;
}

/**
 * Ingestão completa (chamada pelo administrador):
 * 1) substitui o plano no Firestore / localStorage -> pgc_plano/PGC_ANGOLA_82_2001
 * 2) grava os segmentos de texto
 */
export async function ingestarDocumentoOficial(file: File): Promise<{ plano: PlanoContas; segmentos: number }> {
  const texto = await extrairTextoDocx(file);
  let contas = parsearContasDoTexto(texto);

  if (contas.length < 10) {
    // Se o docx não contiver a sintaxe estrita, mesclar ou usar fallback com as contas parseadas
    contas = SEED_CONTAS;
  }

  const plano: PlanoContas = {
    norma: "PGC_ANGOLA_82_2001",
    diploma: "Decreto n.º 82/01, de 16 de Novembro",
    versao: `docx-${Date.now()}`,
    atualizadoEm: Date.now(),
    contas,
  };

  // Tenta guardar no Firestore e localStorage
  try {
    localStorage.setItem("pgc_plano_cache", JSON.stringify(plano));
    if (db) {
      await setDoc(doc(db, "pgc_plano", "PGC_ANGOLA_82_2001"), { ...plano, contas }, { merge: false });

      const docRef = await addDoc(collection(db, "pgc_documentos"), {
        nome: file.name,
        versao: plano.versao,
        criadoEm: serverTimestamp(),
      });

      const segmentos = chunkTexto(texto, 800);
      for (let i = 0; i < segmentos.length; i++) {
        await setDoc(doc(collection(db, "pgc_documentos", docRef.id, "segmentos"), String(i)), {
          texto: segmentos[i],
          indice: i,
          total: segmentos.length,
        });
      }
      return { plano, segmentos: segmentos.length };
    }
  } catch (e) {
    console.warn("Aviso ao guardar no Firestore/localStorage:", e);
  }

  const segmentos = chunkTexto(texto, 800);
  return { plano, segmentos: segmentos.length };
}

function chunkTexto(texto: string, tamanho: number): string[] {
  const paragrafos = texto.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean);
  const chunks: string[] = [];
  let atual = "";
  for (const p of paragrafos) {
    if ((atual + "\n" + p).length > tamanho && atual) {
      chunks.push(atual);
      atual = p;
    } else {
      atual = atual ? atual + "\n" + p : p;
    }
  }
  if (atual) chunks.push(atual);
  return chunks;
}

// ---------- 2. CARREGAMENTO DO PLANO ----------

/** Carrega o plano: tenta localStorage / Firestore; se offline ou vazio, usa o seed oficial local. */
export async function carregarPlano(): Promise<PlanoContas> {
  try {
    const cached = localStorage.getItem("pgc_plano_cache");
    if (cached) {
      const parsed = JSON.parse(cached);
      if (parsed && parsed.contas && parsed.contas.length > 0) {
        return parsed as PlanoContas;
      }
    }
  } catch (_) {}

  try {
    if (db && typeof navigator !== 'undefined' && navigator.onLine) {
      const snap = await getDoc(doc(db, "pgc_plano", "PGC_ANGOLA_82_2001"));
      if (snap.exists()) {
        const data = snap.data() as PlanoContas;
        try { localStorage.setItem("pgc_plano_cache", JSON.stringify(data)); } catch (_) {}
        return data;
      }
    }
  } catch (e: any) {
    // Modo offline ou Firestore não inicializado: fallback silencioso para o plano PGC oficial
    if (process.env.NODE_ENV === 'development' && !e?.message?.includes('offline')) {
      console.warn("Aviso PGC: Firestore remoto indisponível, a carregar Plano Oficial em memória:", e?.message || e);
    }
  }

  const planoLocal = construirPlano();
  try {
    localStorage.setItem("pgc_plano_cache", JSON.stringify(planoLocal));
  } catch (_) {}
  return planoLocal;
}

// ---------- 3. RECUPERAÇÃO (RAG por palavras-chave) ----------

export type GerarEmbedding = (texto: string) => Promise<number[]>;

/** Busca os segmentos mais relevantes do documento oficial. */
export async function buscarContexto(
  pergunta: string,
  k = 5,
  _gerarEmbedding?: GerarEmbedding
): Promise<string[]> {
  try {
    if (!db) return [];
    const docsSnap = await getDocsList(collection(db, "pgc_documentos"));
    if (docsSnap.length === 0) return [];

    const termos = tokenizar(pergunta);
    const pontuados: { texto: string; score: number }[] = [];

    for (const d of docsSnap) {
      const segSnap = await getDocsList(collection(db, "pgc_documentos", d.id, "segmentos"));
      for (const s of segSnap) {
        const texto = (s.data as { texto: string }).texto;
        if (!texto) continue;
        const score = termos.reduce((acc, t) => acc + (texto.toLowerCase().includes(t) ? 1 : 0), 0);
        if (score > 0) pontuados.push({ texto, score });
      }
    }

    pontuados.sort((a, b) => b.score - a.score);
    return pontuados.slice(0, k).map((p) => p.texto);
  } catch (err) {
    console.warn("Erro ao buscar contexto RAG:", err);
    return [];
  }
}

function tokenizar(t: string): string[] {
  return t
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .split(/[^a-z0-9]+/)
    .filter((w) => w.length > 2);
}

// Helpers de leitura (Firestore v9)
async function getDocsList(ref: any): Promise<{ id: string; data: any }[]> {
  try {
    const snap = await getDocs(ref);
    return snap.docs.map((d) => ({ id: d.id, data: d.data() }));
  } catch {
    return [];
  }
}
