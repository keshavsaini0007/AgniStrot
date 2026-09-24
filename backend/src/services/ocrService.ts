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
  // Dedicated hazard forms declare themselves ("HAZARD REGISTER / REPORT / FORM
  // / CARD / LOG"); a bare "hazard" mention (e.g. a "hazard identification"
  // checklist line on a safety sheet) is NOT enough on its own. A statement
  // that pairs the word with a severity reading also qualifies — severity is
  // the field that unlocks deterministic auto-capture drivers.
  if (
    /hazard\s*(register|report|form|card|log)/i.test(lowerText) ||
    (lowerText.includes("hazard") && /\b(critical|high|major|medium|moderate)\b/.test(lowerText))
  ) {
    return "hazard";
  }
  if (lowerText.includes("safety") && lowerText.includes("inspection")) return "safety";
  if (lowerText.includes("environmental")) return "environmental";
  if (lowerText.includes("production")) return "production";
  if (lowerText.includes("labour") || lowerText.includes("labor")) return "labour";
  return null;
};

const SEVERITY_WORDS = /\b(critical|high|major|medium|moderate|low|minor)\b/;

const extractSeverity = (text: string): string | null => {
  const m = text.toLowerCase().match(SEVERITY_WORDS);
  if (m && m[1]) return m[1];
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

export const extractFormFields = async (
  imageSource: string | Buffer
): Promise<OcrResult> => {
  let worker: Worker | null = null;
  try {
    worker = await createOcrWorker();

    // Recognize text from the image. When passed a URL, Tesseract fetches it
    // (production path); when passed a Buffer, it reads it directly — used by
    // the self-contained mode that skips Cloudinary (CLOUDINARY_ENABLED=false).
    const { data } = await worker.recognize(imageSource as string);

    // Confidence estimate: Tesseract.js exposes an overall OCR confidence on
    // the recognize data (0-100). Current versions do not populate the
    // word-level array, so average it only when it is actually present — the
    // old code always yielded 0, which broke every confidence-driven gate.
    const overallConfidence = (data as { confidence?: number }).confidence;
    const words = (data as { words?: Array<{ confidence: number }> }).words || [];
    const avgConfidence =
      typeof overallConfidence === "number" && overallConfidence > 0
        ? overallConfidence / 100
        : words.length > 0
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
    const severity = extractSeverity(rawText);
    if (severity) {
      extractedFields.severity = severity;
    }

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

// ── Hazard-form → register-row derivation (deterministic boundary) ───────────
// OCR text itself is non-deterministic — this is the seam. Everything BELOW
// this line is pure rule: a severity keyword maps to fixed likelihood ×
// consequence drivers (else a documented baseline), the first hazard-statement
// line becomes the title, Remarks/Notes become the description, and the whole
// registration is SKIPPED when the evidence is too thin (low confidence, or
// nothing beyond the form header). Exported so the battery can assert both the
// register and skip branches deterministically, independent of OCR quality.

const SEVERITY_DRIVERS: Record<string, { likelihood: number; consequence: number }> = {
  critical: { likelihood: 4, consequence: 5 },
  high: { likelihood: 3, consequence: 4 },
  major: { likelihood: 3, consequence: 4 },
  medium: { likelihood: 3, consequence: 3 },
  moderate: { likelihood: 3, consequence: 3 },
  low: { likelihood: 2, consequence: 2 },
  minor: { likelihood: 2, consequence: 2 },
};

const BASELINE_DRIVERS = { likelihood: 2, consequence: 2 };

export type HazardOcrDerivation = {
  title: string;
  description: string;
  likelihood: number;
  consequence: number;
};

export function deriveHazardFromOcr(
  rawText: string,
  extractedFields: Record<string, unknown>,
  confidence: number
): HazardOcrDerivation | null {
  // Low-confidence scans are routed to manual review, never auto-registered.
  if (confidence < 0.3) return null;

  const severity =
    typeof extractedFields.severity === "string"
      ? extractedFields.severity.toLowerCase().trim()
      : "";
  const drivers = severity ? (SEVERITY_DRIVERS[severity] ?? BASELINE_DRIVERS) : BASELINE_DRIVERS;

  const remarks =
    typeof extractedFields.remarks === "string" ? extractedFields.remarks.trim() : "";
  const checklistItems = Array.isArray(extractedFields.checklistItems)
    ? (extractedFields.checklistItems as unknown[])
    : [];

  // Too thin = nothing beyond the form header (no severity, no remarks, no
  // checklist findings). Auto-registering that would just mint noise.
  const hasSpecifics = Boolean(severity) || remarks.length >= 5 || checklistItems.length > 0;
  if (!hasSpecifics) return null;

  // Title: the first line that reads like a hazard statement, else a stable
  // fallback that satisfies the schema's 3-char minimum.
  const lines = rawText
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
  const titleLine =
    lines.find((l) =>
      /hazard|unsafe|danger|missing|damaged|exposure|leak|spill|no\s+guard|blocked|trip|fall|fire/i.test(l)
    ) ?? null;
  const title = (titleLine ?? "OCR-extracted hazard").slice(0, 200).trim();
  if (title.length < 3) return null;

  // Description: Remarks/Notes when present (schema min 5 chars), else an echo
  // of the hazard line with provenance so a human reviewer has context.
  const description =
    remarks.length >= 5
      ? remarks.slice(0, 2000)
      : (
          titleLine
            ? `Auto-captured from a scanned form: ${titleLine}`
            : "Auto-captured from an OCR-scanned hazard form."
        ).slice(0, 2000);
  if (description.trim().length < 5) return null;

  return {
    title,
    description: description.trim(),
    likelihood: drivers.likelihood,
    consequence: drivers.consequence,
  };
}

// ── Cleanup (no longer needed — workers are per-request) ───────────────────

export const terminateOcrWorker = async (): Promise<void> => {
  // No-op: workers are terminated after each extraction
};
