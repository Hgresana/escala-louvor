import { describe, expect, it } from "vitest";
import { EnvError, parseEnv } from "./env";

const valido = {
  DATABASE_URL: "postgresql://u:p@localhost:5432/db",
  BETTER_AUTH_SECRET: "x".repeat(32),
  BETTER_AUTH_URL: "http://localhost:3000",
  GOOGLE_CLIENT_ID: "id",
  GOOGLE_CLIENT_SECRET: "secret",
};

describe("parseEnv", () => {
  it("aceita um .env completo e aplica NODE_ENV padrão", () => {
    const env = parseEnv(valido);
    expect(env.DATABASE_URL).toBe(valido.DATABASE_URL);
    expect(env.NODE_ENV).toBe("development");
  });

  it("lista TODAS as variáveis com problema, com mensagem em português", () => {
    try {
      parseEnv({});
      throw new Error("deveria ter lançado");
    } catch (e) {
      expect(e).toBeInstanceOf(EnvError);
      const msg = (e as EnvError).message;
      for (const nome of ["DATABASE_URL", "BETTER_AUTH_SECRET", "BETTER_AUTH_URL", "GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET"]) {
        expect(msg).toContain(nome);
      }
      expect(msg).toContain("faltando");
      expect(msg).toContain(".env.example");
    }
  });

  it("rejeita segredo curto, URL inválida e banco que não é Postgres", () => {
    const problemas = (() => {
      try {
        parseEnv({ ...valido, BETTER_AUTH_SECRET: "curto", BETTER_AUTH_URL: "localhost", DATABASE_URL: "mysql://x" });
      } catch (e) {
        return (e as EnvError).problems;
      }
      return [];
    })();
    expect(problemas).toHaveLength(3);
    expect(problemas.join("\n")).toMatch(/32 caracteres/);
    expect(problemas.join("\n")).toMatch(/URL completa/);
    expect(problemas.join("\n")).toMatch(/postgresql/);
  });
});
