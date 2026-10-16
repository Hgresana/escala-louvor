// Anexa prisma/custom-constraints.sql à migration "init" (criada com --create-only).
// Em Node puro e com fs, para funcionar igual em Windows, macOS e Linux (sem `cat >>`).
import { readFileSync, readdirSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const MARCADOR = "-- >>> custom-constraints (anexado por scripts/append-constraints.mjs)";
const migrationsDir = join("prisma", "migrations");

if (!existsSync(migrationsDir)) {
  console.error("❌ prisma/migrations não existe. Rode antes:\n   npx prisma migrate dev --name init --create-only");
  process.exit(1);
}

const initDirs = readdirSync(migrationsDir, { withFileTypes: true })
  .filter((d) => d.isDirectory() && d.name.endsWith("_init"))
  .map((d) => d.name)
  .sort();

if (initDirs.length === 0) {
  console.error("❌ Não achei a migration *_init. Rode antes:\n   npx prisma migrate dev --name init --create-only");
  process.exit(1);
}

const arquivo = join(migrationsDir, initDirs[0], "migration.sql");
const atual = readFileSync(arquivo, "utf8");

if (atual.includes(MARCADOR)) {
  console.log(`✅ As constraints já estão em ${arquivo}. Nada a fazer.`);
  process.exit(0);
}

const sql = readFileSync(join("prisma", "custom-constraints.sql"), "utf8");
writeFileSync(arquivo, `${atual.trimEnd()}\n\n${MARCADOR}\n${sql}`, "utf8");
console.log(`✅ Constraints anexadas em ${arquivo}\n   Agora rode: npx prisma migrate dev`);
