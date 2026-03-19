/**
 * Script de ingesta: PDFs en ./documentos_precisar → chunks → embeddings (OpenAI) → Firestore embeddings_onda.
 *
 * Uso: npx ts-node --compiler-options '{"module":"CommonJS"}' scripts/ingestToFirestore.ts
 * Requiere: .env con FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY, OPENAI_API_KEY.
 */

import * as fs from "fs";
import * as path from "path";
import { FieldValue } from "@google-cloud/firestore";
import OpenAI from "openai";
import { getFirestoreForVector } from "../lib/firebaseConfig";

require("dotenv").config();

const COLLECTION = "embeddings_onda";
const VECTOR_FIELD = "vector";
const EMBEDDING_MODEL = "text-embedding-3-small";
const CHUNK_SIZE = 600;
const CHUNK_OVERLAP = 100;

const documentosDir = path.resolve(process.cwd(), "documentos_precisar");

function extractTextFromPdf(buffer: Buffer): Promise<string> {
  return new Promise((resolve, reject) => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const pdfParse = require("pdf-parse");
    pdfParse(buffer)
      .then((data: { text: string }) => resolve(data.text || ""))
      .catch(reject);
  });
}

function chunkText(text: string): string[] {
  const chunks: string[] = [];
  const normalized = text.replace(/\r\n/g, "\n").trim();
  if (!normalized) return chunks;
  let start = 0;
  while (start < normalized.length) {
    let end = start + CHUNK_SIZE;
    if (end < normalized.length) {
      const nextBreak = normalized.indexOf("\n\n", end - 80);
      if (nextBreak !== -1 && nextBreak < end + 150) end = nextBreak + 2;
      else {
        const space = normalized.lastIndexOf(" ", end);
        if (space > start) end = space + 1;
      }
    }
    const chunk = normalized.slice(start, end).trim();
    if (chunk) chunks.push(chunk);
    start = end - CHUNK_OVERLAP;
    if (start <= chunks[chunks.length - 1]?.length) start = end;
  }
  return chunks;
}

async function getEmbedding(openai: OpenAI, text: string): Promise<number[]> {
  const res = await openai.embeddings.create({
    model: EMBEDDING_MODEL,
    input: text.slice(0, 8000),
    encoding_format: "float",
  });
  const vec = res.data?.[0]?.embedding;
  if (!vec || !Array.isArray(vec)) throw new Error("Empty embedding");
  return vec as number[];
}

async function main() {
  if (!fs.existsSync(documentosDir)) {
    console.error("Carpeta no encontrada:", documentosDir);
    console.error("Crea la carpeta y coloca ahí los PDFs de Precisar.");
    process.exit(1);
  }

  const db = getFirestoreForVector();
  if (!db) {
    console.error("Firebase no configurado. Revisa FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY.");
    process.exit(1);
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.error("Falta OPENAI_API_KEY en .env");
    process.exit(1);
  }

  const openai = new OpenAI({ apiKey });
  const coll = db.collection(COLLECTION);

  const files = fs.readdirSync(documentosDir).filter((f) => f.toLowerCase().endsWith(".pdf"));
  if (files.length === 0) {
    console.error("No hay archivos .pdf en", documentosDir);
    process.exit(1);
  }

  console.log("PDFs encontrados:", files.length);

  for (const file of files) {
    const filePath = path.join(documentosDir, file);
    const buffer = fs.readFileSync(filePath);
    console.log("Procesando:", file);
    let text: string;
    try {
      text = await extractTextFromPdf(buffer);
    } catch (e) {
      console.error("  Error extrayendo texto:", e);
      continue;
    }
    const chunks = chunkText(text);
    console.log("  Chunks:", chunks.length);
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      try {
        const embedding = await getEmbedding(openai, chunk);
        await coll.add({
          text: chunk,
          [VECTOR_FIELD]: FieldValue.vector(embedding),
          source: file,
          index: i,
          createdAt: FieldValue.serverTimestamp(),
        });
      } catch (e) {
        console.error("  Error chunk", i, ":", e);
      }
    }
  }

  console.log("Ingesta terminada. Crea el índice vectorial en la consola de Firebase (ver docs/FIREBASE-VECTOR-INDEX.md).");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
