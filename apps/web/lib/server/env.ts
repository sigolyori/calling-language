function req(key: string): string {
  const v = process.env[key];
  if (!v) throw new Error(`Missing env: ${key}`);
  return v;
}

export const env = {
  DATABASE_URL: req("DATABASE_URL"),
  JWT_SECRET: req("JWT_SECRET"),
  VAPI_API_KEY: process.env.VAPI_API_KEY ?? "",
  VAPI_ASSISTANT_ID: process.env.VAPI_ASSISTANT_ID ?? "",
  VAPI_PHONE_NUMBER_ID: process.env.VAPI_PHONE_NUMBER_ID ?? "",
  VAPI_WEBHOOK_SECRET: process.env.VAPI_WEBHOOK_SECRET ?? "",
  ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY ?? "",
  CRON_SECRET: process.env.CRON_SECRET ?? "",
};
