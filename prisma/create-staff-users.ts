/**
 * One-off, idempotent: create the accountant + delivery users on the EXISTING
 * database without wiping data (do NOT run `npm run db:seed` for this). Safe to
 * re-run — upserts by unique loginId. Run with:  npx tsx prisma/create-staff-users.ts
 */
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const cstar = await prisma.entity.findFirst({ where: { name: "C-Star" } });
  if (!cstar) throw new Error("No C-Star entity — the DB is not seeded.");

  const users = [
    {
      loginId: "accountant",
      name: "Accountant",
      password: "acc123",
      role: "accountant",
    },
    {
      loginId: "delivery",
      name: "Delivery / Data Entry",
      password: "del123",
      role: "delivery",
    },
  ];

  for (const u of users) {
    const passwordHash = await bcrypt.hash(u.password, 10);
    await prisma.user.upsert({
      where: { loginId: u.loginId },
      // Reset the password hash on re-run so credentials are deterministic;
      // leave role/access alone in case an admin later tunes them.
      update: { passwordHash },
      create: {
        name: u.name,
        loginId: u.loginId,
        passwordHash,
        role: u.role,
        entityAccess: "cstar",
        regionScope: "all",
        entityId: cstar.id,
      },
    });
    console.log(`upserted user: ${u.loginId}`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
