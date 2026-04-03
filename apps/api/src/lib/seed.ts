import "dotenv/config";
import { prisma } from "./prisma.js";
import bcrypt from "bcryptjs";

async function main() {
  const passwordHash = await bcrypt.hash("password123", 12);

  const user = await prisma.user.upsert({
    where: { email: "test@example.com" },
    update: {},
    create: {
      email: "test@example.com",
      passwordHash,
      name: "Test User",
      phoneNumber: "+1234567890",
      englishLevel: "intermediate",
      timezone: "Asia/Seoul",
    },
  });

  console.log("Seeded user:", user.email);
  await prisma.$disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
