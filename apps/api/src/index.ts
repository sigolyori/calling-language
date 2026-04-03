import "dotenv/config";
import fastify from "fastify";
import fastifyCors from "@fastify/cors";
import fastifyJwt from "@fastify/jwt";
import { env } from "./lib/env.js";
import { authRoutes } from "./routes/auth.js";
import { userRoutes } from "./routes/users.js";
import { scheduleRoutes } from "./routes/schedules.js";
import { sessionRoutes } from "./routes/sessions.js";
import { webhookRoutes } from "./routes/webhooks.js";
import { callRoutes } from "./routes/calls.js";
import { startCallWorker } from "./jobs/callQueue.js";

const app = fastify({ logger: true });

await app.register(fastifyCors, {
  origin: process.env.CORS_ORIGIN ?? "http://localhost:3000",
  credentials: true,
});

await app.register(fastifyJwt, {
  secret: env.JWT_SECRET,
});

// Routes
await app.register(authRoutes);
await app.register(userRoutes);
await app.register(scheduleRoutes);
await app.register(sessionRoutes);
await app.register(webhookRoutes);
await app.register(callRoutes);

// Health check
app.get("/health", async () => ({ status: "ok" }));

// Start BullMQ worker
startCallWorker();
console.log("[Worker] Call worker started");

try {
  await app.listen({ port: env.PORT, host: "0.0.0.0" });
  console.log(`[API] Server running on port ${env.PORT}`);
} catch (err) {
  console.error(err);
  process.exit(1);
}
