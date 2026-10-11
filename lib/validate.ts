import { DIFFICULTIES, LANGUAGES, type Challenge, type Difficulty, type Language } from "./types";

export type ChallengeInput = Omit<Challenge, "id" | "number" | "codeTemplates" | "createdAt"> & {
  codeTemplates?: Partial<Record<Language, string>>;
};

export function validateChallengeInput(body: Record<string, unknown>): { value: ChallengeInput } | { error: string } {
  const title = String(body.title ?? "").trim();
  const category = String(body.category ?? "").trim();
  const difficulty = String(body.difficulty ?? "") as Difficulty;
  const desc = String(body.desc ?? "").trim();
  const sampleOutput = String(body.sampleOutput ?? "").replace(/\r\n/g, "\n").replace(/\s+$/, "");

  const rawPattern = Number(body.patternPoints);
  const rawCode = Number(body.codePoints);
  const legacyTotal = Number(body.points);
  const hasSplit = Number.isFinite(rawPattern) && Number.isFinite(rawCode);
  const patternPoints = hasSplit ? rawPattern : 0;
  const codePoints = hasSplit ? rawCode : legacyTotal;
  const points = patternPoints + codePoints;

  if (!title || title.length > 80) return { error: "Title is required (max 80 characters)." };
  if (!category || category.length > 40) return { error: "Category is required (max 40 characters)." };
  if (!DIFFICULTIES.includes(difficulty)) return { error: "Invalid difficulty." };
  if (!Number.isFinite(points)) return { error: "Points are required." };
  if (!Number.isInteger(patternPoints) || patternPoints < 0 || patternPoints > 10000) {
    return { error: "Stage 1 (pattern) points must be a whole number between 0 and 10000." };
  }
  if (!Number.isInteger(codePoints) || codePoints < 0 || codePoints > 10000) {
    return { error: "Stage 2 (code) points must be a whole number between 0 and 10000." };
  }
  if (points < 10 || points > 10000) {
    return { error: "Total points (stage 1 + stage 2) must be between 10 and 10000." };
  }
  if (!desc || desc.length > 2000) return { error: "Description is required (max 2000 characters)." };
  if (!sampleOutput) return { error: "Target verification pattern output is required." };

  const codeTemplates: Partial<Record<Language, string>> = {};
  const rawTemplates = body.codeTemplates;
  if (rawTemplates && typeof rawTemplates === "object") {
    for (const lang of LANGUAGES) {
      const value = (rawTemplates as Record<string, unknown>)[lang];
      if (typeof value === "string" && value.trim()) codeTemplates[lang] = value;
    }
  }

  return {
    value: { title, category, difficulty, points, patternPoints, codePoints, desc, sampleOutput, codeTemplates },
  };
}
