/**
 * Applies the 20260702180000_platform_config_process migration directly with
 * node:sqlite and records it in _prisma_migrations — used where the Prisma
 * engines can't run (e.g. sandboxed CI). Safe to re-run: skips if already
 * applied. Also seeds the hidden platform_admin login if missing.
 *
 *   node --experimental-sqlite scripts/apply-v3-migration.mjs [path/to/dev.db]
 */
import { DatabaseSync } from "node:sqlite";
import { createHash, randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import bcrypt from "bcryptjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const dbPath = process.argv[2] ?? join(root, "prisma", "dev.db");
const migName = "20260702180000_platform_config_process";
const sqlPath = join(root, "prisma", "migrations", migName, "migration.sql");
const sql = readFileSync(sqlPath, "utf8");

const db = new DatabaseSync(dbPath);

const applied = db
  .prepare("SELECT 1 FROM _prisma_migrations WHERE migration_name = ?")
  .all(migName);
if (applied.length > 0) {
  console.log(`✓ ${migName} already applied to ${dbPath}`);
} else {
  db.exec("BEGIN");
  try {
    for (const stmt of sql.split(";")) {
      const s = stmt.trim();
      if (s) db.exec(s);
    }
    const checksum = createHash("sha256").update(sql).digest("hex");
    const now = new Date().toISOString();
    db.prepare(
      `INSERT INTO _prisma_migrations (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count)
       VALUES (?, ?, ?, ?, NULL, NULL, ?, 1)`,
    ).run(randomUUID(), checksum, now, migName, now);
    db.exec("COMMIT");
    console.log(`✓ applied ${migName} to ${dbPath}`);
  } catch (e) {
    db.exec("ROLLBACK");
    throw e;
  }
}

// --- Seed the hidden product-owner login (platform_admin) if missing --------
const existing = db.prepare("SELECT id FROM User WHERE loginId = 'platform'").all();
if (existing.length > 0) {
  console.log("✓ platform_admin user already exists (loginId: platform)");
} else {
  const entity = db.prepare("SELECT id FROM Entity ORDER BY createdAt ASC").all()[0];
  if (!entity) {
    console.log("! no Entity found — run the seed first, then re-run this script");
  } else {
    const hash = bcrypt.hashSync(process.env.PLATFORM_PASSWORD ?? "platform123", 10);
    const cuid = "pa_" + randomUUID().replace(/-/g, "").slice(0, 22);
    db.prepare(
      `INSERT INTO User (id, name, loginId, passwordHash, role, entityAccess, regionScope, createdAt, entityId)
       VALUES (?, 'Platform Owner', 'platform', ?, 'platform_admin', 'both', 'all', ?, ?)`,
    ).run(cuid, hash, new Date().toISOString(), entity.id);
    console.log("✓ created platform_admin user — loginId: platform / password: platform123 (CHANGE IT)");
  }
}
db.close();
