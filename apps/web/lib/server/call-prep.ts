import { loadProfile } from "./profiles";
import { loadTodayBriefing, kstDateString } from "./briefings";
import { buildAssistantOverrides, type AssistantOverrides } from "./prompts/injection-builder";

export async function prepareAssistantOverrides(
  userId: string,
  sessionId: string,
): Promise<AssistantOverrides> {
  const [profile, briefing] = await Promise.all([loadProfile(userId), loadTodayBriefing()]);
  const kstDate = kstDateString();
  return buildAssistantOverrides({ sessionId, profile, briefing, kstDate });
}
