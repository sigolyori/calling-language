function requireEnv(key: string): string {
  const val = process.env[key];
  if (!val) throw new Error(`Missing required env var: ${key}`);
  return val;
}

export const env = {
  DATABASE_URL: requireEnv("DATABASE_URL"),
  REDIS_URL: process.env.REDIS_URL ?? "redis://localhost:6379",
  JWT_SECRET: requireEnv("JWT_SECRET"),
  VAPI_API_KEY: process.env.VAPI_API_KEY ?? "",
  VAPI_ASSISTANT_ID: process.env.VAPI_ASSISTANT_ID ?? "",
  VAPI_PHONE_NUMBER_ID: process.env.VAPI_PHONE_NUMBER_ID ?? "",
  VAPI_WEBHOOK_SECRET: process.env.VAPI_WEBHOOK_SECRET ?? "",
  ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY ?? "",
  PORT: Number(process.env.API_PORT ?? 3001),
};
