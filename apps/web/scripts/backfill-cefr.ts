/**
 * Backfill cefrLevel / cefrRationale for legacy Feedback rows.
 *
 * - Idempotent: only updates rows where cefrLevel IS NULL.
 * - cefrLevel comes from mapOpicToCefr(opicLevel).
 * - cefrRationale is seeded from the legacy opicRationale verbatim
 *   (rewriting under the new evaluator happens in a later phase).
 * - --dry-run prints the planned changes without writing.
 *
 * Usage (run from apps/web with DATABASE_URL set):
 *   npx tsx scripts/backfill-cefr.ts --dry-run
 *   npx tsx scripts/backfill-cefr.ts
 */

import { mapOpicToCefr } from "../lib/server/cefr/concordance";
import { prisma } from "../lib/server/prisma";

const DRY_RUN = process.argv.includes("--dry-run");

async function main() {
  console.log(`[backfill-cefr] mode=${DRY_RUN ? "dry-run" : "write"}`);

  const candidates = await prisma.feedback.findMany({
    where: { cefrLevel: null },
    select: { id: true, sessionId: true, opicLevel: true, opicRationale: true },
    orderBy: { createdAt: "asc" },
  });

  console.log(`[backfill-cefr] found ${candidates.length} feedback row(s) with cefrLevel=null`);
  if (candidates.length === 0) {
    return;
  }

  const tally: Record<string, number> = {};
  let unmapped = 0;
  let updated = 0;

  for (const row of candidates) {
    const cefr = mapOpicToCefr(row.opicLevel);
    if (!cefr) {
      unmapped += 1;
      console.warn(
        `[backfill-cefr] SKIP id=${row.id} sessionId=${row.sessionId} opicLevel="${row.opicLevel}" — no mapping`,
      );
      continue;
    }
    tally[cefr] = (tally[cefr] ?? 0) + 1;

    if (DRY_RUN) {
      console.log(
        `[backfill-cefr] DRY id=${row.id} ${row.opicLevel} -> ${cefr} (rationale ${row.opicRationale.length} chars)`,
      );
      continue;
    }

    await prisma.feedback.update({
      where: { id: row.id },
      data: {
        cefrLevel: cefr,
        cefrRationale: row.opicRationale,
      },
    });
    updated += 1;
    if (updated % 25 === 0) {
      console.log(`[backfill-cefr] progress ${updated}/${candidates.length}`);
    }
  }

  console.log(`[backfill-cefr] done. ${DRY_RUN ? "would update" : "updated"}=${DRY_RUN ? candidates.length - unmapped : updated} unmapped=${unmapped}`);
  console.log(`[backfill-cefr] tally by CEFR level:`, tally);
}

main()
  .catch((err) => {
    console.error("[backfill-cefr] FAILED:", err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
