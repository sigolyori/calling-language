export interface VapiPublicConfig {
  publicKey: string;
  assistantId: string;
}

export function getVapiPublicConfig(): VapiPublicConfig | null {
  const publicKey = process.env.NEXT_PUBLIC_VAPI_PUBLIC_KEY ?? "";
  const assistantId = process.env.NEXT_PUBLIC_VAPI_ASSISTANT_ID ?? "";
  if (!publicKey || !assistantId) return null;
  return { publicKey, assistantId };
}
