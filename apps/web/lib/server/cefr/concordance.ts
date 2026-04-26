/**
 * CEFR concordance table and helpers.
 *
 * Single source of truth for:
 *   - The 6 CEFR levels we surface (A1..C2)
 *   - The mapping from legacy OPIc level strings to CEFR
 *   - A normalising mapper used by the backfill script and the API layer
 *
 * Note: this is an internal estimate aligned with CEFR levels. Do not advertise
 * it as an official CEFR certification, and never reproduce text from the
 * Council of Europe Companion Volume verbatim.
 */

export const CEFR_LEVELS = ["A1", "A2", "B1", "B2", "C1", "C2"] as const;
export type CefrLevel = (typeof CEFR_LEVELS)[number];

export const OPIC_TO_CEFR: Record<string, CefrLevel> = {
  NL: "A1",
  NM: "A1",
  NH: "A2",
  IL: "A2",
  IM1: "B1",
  IM2: "B1",
  IM3: "B1",
  IH: "B2",
  AL: "B2",
  AM: "C1",
  AH: "C1",
  SUPERIOR: "C2",
};

export function isCefrLevel(value: unknown): value is CefrLevel {
  return typeof value === "string" && (CEFR_LEVELS as readonly string[]).includes(value);
}

/**
 * Map a legacy OPIc level string to a CEFR level.
 * Tolerates whitespace and casing differences ("im2", " IM2 ", "Superior").
 * Returns null if the input is empty/null/unknown.
 */
export function mapOpicToCefr(opicLevel: string | null | undefined): CefrLevel | null {
  if (!opicLevel) return null;
  const key = opicLevel.trim().toUpperCase();
  return OPIC_TO_CEFR[key] ?? null;
}

/** Short Korean label shown alongside the level badge. */
export const CEFR_LABELS_KO: Record<CefrLevel, string> = {
  A1: "기초",
  A2: "초급",
  B1: "중급",
  B2: "중상급",
  C1: "고급",
  C2: "원어민 수준",
};
