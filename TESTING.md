# Manual Testing Checklist

Phased end-to-end verification for the learner-memory and daily-news-briefing features.
Run top to bottom; each section assumes the previous passed.

Production URL: `https://calling-language-web.vercel.app`

---

## 0. Environment

All required vars documented in `.env.example`. For local dev copy it to `apps/web/.env` (or the repo-root `.env` if that's where the process reads from) and fill in real values.

- [ ] `DATABASE_URL` — Postgres connection string
- [ ] `JWT_SECRET`
- [ ] `VAPI_API_KEY`, `VAPI_ASSISTANT_ID`, `VAPI_PHONE_NUMBER_ID`, `VAPI_WEBHOOK_SECRET`
- [ ] `ANTHROPIC_API_KEY`
- [ ] `TAVILY_API_KEY` *(new)*
- [ ] `CRON_SECRET`
- [ ] `ADMIN_EMAILS`

Deploy envs live in Vercel project settings — add `TAVILY_API_KEY` there before expecting briefings to generate in prod.

---

## 1. Build & schema

```bash
corepack pnpm install --filter @calling-language/web
apps/web/node_modules/.bin/tsc -p apps/web/tsconfig.json --noEmit
```

- [ ] Install succeeds.
- [ ] Type check passes apart from the pre-existing `trigger-calls/route.ts` TS7006 warning (unrelated to this work).
- [ ] Production build runs `prisma db push` automatically; confirm in Vercel build logs that `LearnerProfile` and `DailyBriefing` tables are created.

Check in Postgres:

```sql
\d "LearnerProfile"
\d "DailyBriefing"
```

---

## 2. Seed a baseline profile

Grab the target user's ID (e.g. Heeyoung):

```sql
SELECT id, name, "englishLevel" FROM "User" WHERE email = 'dud4020@gmail.com';
```

Run:

```bash
corepack pnpm --filter @calling-language/web exec tsx scripts/seed-profile.ts <userId>
```

- [ ] `[Seed] Profile seeded for <name> (<userId>).` appears.
- [ ] `SELECT * FROM "LearnerProfile" WHERE "userId" = '<userId>';` returns one row with empty arrays and skeleton values.

Optionally pre-fill `interests`, `recurring_topics`, `language_goals` by editing the row directly — the LLM will extend them on the next call.

---

## 3. Daily briefing cron

Locally (or against prod):

```bash
curl -sS -X POST https://calling-language-web.vercel.app/api/cron/daily-briefing \
  -H "Authorization: Bearer $CRON_SECRET" | jq
```

- [ ] 200 response `{"date":"YYYY-MM-DD","itemCount":5-7}` OR a documented 503 skip (missing API key, no Tavily results).
- [ ] Vercel logs show `[Briefing tokens] ...` and `[Briefing cron] Success ...`.
- [ ] Row in `DailyBriefing` with today's KST date, non-empty `items` JSON, `conversationStarters` length 2–3.
- [ ] Re-running the same command does NOT create a duplicate — the row's `generatedAt` updates.

**cron-job.org setup (production):**
- URL: `https://calling-language-web.vercel.app/api/cron/daily-briefing`
- Schedule: `0 21 * * *` UTC (= 06:00 KST)
- Header: `Authorization: Bearer <CRON_SECRET>`
- Method: GET or POST (both accepted)

---

## 4. Manual call trigger with injection

Get a JWT (log in via existing UI or API) and:

```bash
curl -sS -X POST https://calling-language-web.vercel.app/api/calls/trigger \
  -H "Authorization: Bearer $JWT" \
  -H "Content-Type: application/json" \
  -d '{}' | jq
```

- [ ] 200 `{ "ok": true, "sessionId": "...", "vapiCallId": "...", "callingNumber": "+82..." }`
- [ ] Vercel logs show a `[Vapi] Calling +82... sessionId=... systemPromptBytes=<large number> firstMessage=set` line — systemPromptBytes should be several thousand once the profile and briefing are present.
- [ ] Phone rings. Alex opens with personalization if `open_threads[0]` was set; otherwise the generic "Hi! It's Alex ..." opener.

---

## 5. End-of-call webhook → profile extraction

After the call ends, Vapi POSTs `end-of-call-report` to `/api/webhooks/vapi`.

- [ ] Vercel logs show BOTH `[Feedback] Generated for session ...` AND `[Profile tokens] session=... input=<n> output=<n>` (or `[Profile] Too short ...` if the call was <30 words).
- [ ] `LearnerProfile.updatedAt` advances.
- [ ] `sessionHistory` array length increased by 1 (capped at 10 — oldest drops when it hits 11).
- [ ] `openThreads` length ≤ 5.
- [ ] Feedback row also created (feature regression check — existing behavior must still work).

Simulate a webhook locally if needed (replace `<SECRET>` with `VAPI_WEBHOOK_SECRET` and compute the HMAC):

```bash
# pseudocode — use the existing webhook's verifyVapiWebhook signature scheme
```

---

## 6. Privacy spot check

After a real call where the learner discloses something privacy-sensitive (you can test on yourself by saying e.g. "I've been feeling anxious lately" or "I make 5000 dollars a month"):

- [ ] The `LearnerProfile` JSON does NOT contain that exact disclosure in any field.
- [ ] `excludedTopics` receives any topic the learner explicitly asked Alex to stop mentioning.
- [ ] General areas ("Seoul", "강남") DO appear in `location` if mentioned; specific addresses do not.

If any excluded category leaks into the profile, inspect the Haiku response logs and tighten `profile-extractor.ts` PRIVACY RULES.

---

## 7. Failure modes to exercise

- [ ] Unset `TAVILY_API_KEY` temporarily → daily-briefing cron returns 503 `{skipped: "no tavily results..."}` instead of crashing.
- [ ] Unset `ANTHROPIC_API_KEY` → feedback uses `[Feedback STUB]` path; profile extraction skips with `[Profile STUB]`; call still goes through (Vapi falls back to its own prompt because ALEX_BASE alone still renders).
- [ ] Bad `CRON_SECRET` in cron-job.org header → endpoint returns 401.
- [ ] Call a user who has NO `LearnerProfile` row and no briefing for today → call still works, first message uses the first-time-meeting default, system prompt = ALEX_BASE only.

---

## 8. Cost sanity (after a full day)

Skim Vercel logs and sum token counts from `[Profile tokens]` + `[Briefing tokens]`. Expected order of magnitude per day:
- 1 briefing run: ~3–6k input, ~1k output (Haiku).
- 1 call: ~2–4k input (transcript + prev profile), ~1k output (Haiku).

Multiply by Anthropic's Haiku pricing to eyeball daily cost. If a run's input tokens look wildly larger than this, something is dumping uncapped state into the prompt — investigate.
