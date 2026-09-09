import { createWorker, type Worker } from "tesseract.js";
import type { OcrResult } from "../types/index.js";

// ── OCR Worker Management ──────────────────────────────────────────────────
// Per-request worker pattern to avoid "worker busy" errors on concurrent uploads.
// Each extraction gets its own worker, terminated after use.

const createOcrWorker = async (): Promise<Worker> => {
  return await createWorker("eng", 1, {
    logger: (m) => {
      if (m.status === "recognizing text") {
        console.log(`OCR progress: ${Math.round(m.progress * 100)}%`);
      }
    },
  });
};

// ── Field extraction heuristics ────────────────────────────────────────────
// These regex patterns detect common compliance form fields from OCR text.
// Tuned for Indian coal mine inspection forms (English).

const extractFormType = (text: string): string | null => {
  const lowerText = text.toLowerCase();
  if (lowerText.includes("safety") && lowerText.includes("inspection")) return "safety";
  if (lowerText.includes("environmental")) return "environmental";
  if (lowerText.includes("production")) return "production";
  if (lowerText.includes("labour") || lowerText.includes("labor")) return "labour";
  return null;
};

const extractDate = (text: string): string | null => {
  // Match ISO format (YYYY-MM-DD) or Indian format (DD-MM-YYYY or DD/MM/YYYY)
  const isoMatch = text.match(/\b\d{4}-\d{2}-\d{2}\b/);
  if (isoMatch) return isoMatch[0];

  const indianMatch = text.match(/\b\d{1,2}[-/]\d{1,2}[-/]\d{4}\b/);
  if (indianMatch) {
    // Convert DD-MM-YYYY to YYYY-MM-DD for consistent storage
    const parts = indianMatch[0].split(/[-/]/);
    if (parts.length === 3) {
      const day = parts[0];
      const month = parts[1];
      const year = parts[2];
      if (day && month && year) {
        return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
      }
    }
  }

  return null;
};

const extractInspectorName = (text: string): string | null => {
  // Look for "Inspector:" or "Officer:" followed by a name
  const inspectorMatch = text.match(/(?:Inspector|Officer):\s*([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/i);
  if (inspectorMatch && inspectorMatch[1]) return inspectorMatch[1].trim();

  // Look for "By:" followed by a name
  const byMatch = text.match(/By:\s*([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/i);
  if (byMatch && byMatch[1]) return byMatch[1].trim();

  return null;
};

const extractChecklistItems = (text: string): Array<{ item: string; result: string | null }> => {
  const items: Array<{ item: string; result: string | null }> = [];
  const lines = text.split("\n");

  for (const line of lines) {
    // Match lines with bullet points or numbers followed by pass/fail/na indicators
    const bulletMatch = line.match(/^[\s•\-\d.]+(.+?)\s*(pass|fail|na|yes|no)/i);
    if (bulletMatch && bulletMatch[1] && bulletMatch[2]) {
      items.push({
        item: bulletMatch[1].trim(),
        result: bulletMatch[2].toLowerCase() === "yes" ? "pass" : bulletMatch[2].toLowerCase(),
      });
    }
  }

  return items;
};

const extractRemarks = (text: string): string | null => {
  // Look for "Remarks:" or "Notes:" section — capture everything after it
  const remarksMatch = text.match(/(?:Remarks|Notes|Comments):\s*(.+?)(?:\n\n|\n[A-Z]|$)/is);
  if (remarksMatch && remarksMatch[1]) {
    return remarksMatch[1].trim().substring(0, 500); // limit to 500 chars
  }
  return null;
};

// ── Main OCR extraction function ───────────────────────────────────────────

export const extractFormFields = async (imageUrl: string): Promise<OcrResult> => {
  let worker: Worker | null = null;
  try {
    worker = await createOcrWorker();

    // Recognize text from the image URL (Tesseract can fetch from URL directly)
    const { data } = await worker.recognize(imageUrl);

    // Calculate average confidence from word-level confidence scores
    const words = (data as { words?: Array<{ confidence: number }> }).words || [];
    const avgConfidence =
      words.length > 0
        ? words.reduce((sum: number, w: { confidence: number }) => sum + w.confidence, 0) / (words.length * 100)
        : 0;

    const rawText = data.text;

    // Extract structured fields using heuristics
    const extractedFields: Record<string, unknown> = {
      formType: extractFormType(rawText),
      date: extractDate(rawText),
      inspectorName: extractInspectorName(rawText),
      checklistItems: extractChecklistItems(rawText),
      remarks: extractRemarks(rawText),
    };

    // Remove null fields for cleaner output
    Object.keys(extractedFields).forEach((key) => {
      if (extractedFields[key] === null) {
        delete extractedFields[key];
      }
    });

    return {
      rawText,
      confidence: Math.min(Math.max(avgConfidence, 0), 1), // clamp to [0, 1]
      extractedFields,
    };
  } catch (err) {
    console.error("OCR extraction error:", err);
    throw new Error("Failed to extract text from image.");
  } finally {
    // Terminate worker after each use to free resources
    if (worker) {
      await worker.terminate();
    }
  }
};

// ── Cleanup (no longer needed — workers are per-request) ───────────────────

export const terminateOcrWorker = async (): Promise<void> => {
  // No-op: workers are terminated after each extraction
};
