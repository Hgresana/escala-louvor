import { PrismaClient } from "@prisma/client";
import { env } from "./env"; // garante que o .env foi validado antes de conectar

// Reaproveita a instância no hot-reload do `next dev` (evita estourar conexões).
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

if (env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
