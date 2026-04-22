/**
 * Base system prompt for the Vapi voice assistant (registered on the Vapi
 * platform as "Riley").
 *
 * TODO (required before deploying this file): paste the real prompt here.
 *
 * The Vapi MCP `get_assistant` tool returns only a summary, so the full
 * prompt cannot be fetched through Claude Code. Retrieve it one of two
 * ways:
 *
 *   1) Vapi dashboard → Assistants → Riley → System Prompt → copy.
 *   2) curl -s "https://api.vapi.ai/assistant/$VAPI_ASSISTANT_ID" \
 *         -H "Authorization: Bearer $VAPI_API_KEY" \
 *         | jq -r '.model.messages[0].content'
 *
 * Paste the exact string between the backticks of ALEX_BASE below. Keep
 * the template-literal form — no further escaping needed beyond
 * replacing any backticks (\`) or \${...} sequences if the source
 * contains them.
 *
 * Until this is filled in, buildSystemPrompt() falls back to sending
 * only the dynamic memory + briefing sections, and Vapi uses whatever
 * system prompt is stored on its side.
 */
export const ALEX_BASE = ``;
