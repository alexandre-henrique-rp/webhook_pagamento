import "dotenv/config";
import { PrismaClient } from "@prisma/client";

/**
 * Expõe clientes Prisma separados para escrita (primary) e leitura (replica).
 * - Garante singleton em modo dev para evitar excesso de conexões em hot-reload.
 * - Valida variáveis de ambiente obrigatórias no boot.
 * - Habilita logs úteis em desenvolvimento para facilitar troubleshooting.
 */

type PrismaReadWrite = {
  write: PrismaClient;
  read: PrismaClient;
};

function ensureEnv(name: "DATABASE_URL_WRITE" | "DATABASE_URL_READ"): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `Variável de ambiente ${name} não definida. Configure-a no arquivo .env`
    );
  }
  return value;
}

function createClients(): PrismaReadWrite {
  const isDev = process.env.NODE_ENV !== "production";

  const write = new PrismaClient({
    datasources: { db: { url: ensureEnv("DATABASE_URL_WRITE") } },
    log: isDev ? ["query", "info", "warn", "error"] : ["warn", "error"]
  });

  const read = new PrismaClient({
    datasources: { db: { url: ensureEnv("DATABASE_URL_READ") } },
    log: isDev ? ["info", "warn", "error"] : ["warn", "error"]
  });

  return { write, read };
}

const globalForPrisma = globalThis as unknown as {
  prismaRW?: PrismaReadWrite;
};

export const prisma: PrismaReadWrite =
  globalForPrisma.prismaRW ?? createClients();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prismaRW = prisma;
}

/**
 * Dica de uso:
 * - Leitura: await prisma.read.solicitacao.findUnique(...)
 * - Escrita: await prisma.write.solicitacao.update(...)
 * - Transações: await prisma.write.$transaction(async (tx) => { ... })
 */
