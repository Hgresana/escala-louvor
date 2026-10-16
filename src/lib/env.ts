import { z } from "zod";

/** Mensagem clara tanto para variável ausente quanto para valor com tipo errado. */
const texto = (nome: string) =>
  z.string({
    error: (iss) =>
      iss.input === undefined
        ? `${nome} está faltando no .env`
        : `${nome} precisa ser um texto`,
  });

const schema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),

  DATABASE_URL: texto("DATABASE_URL").refine(
    (v) => v.startsWith("postgresql://") || v.startsWith("postgres://"),
    "DATABASE_URL deve começar com postgresql:// (veja .env.example)",
  ),

  BETTER_AUTH_SECRET: texto("BETTER_AUTH_SECRET").min(
    32,
    "BETTER_AUTH_SECRET deve ter pelo menos 32 caracteres (gere um novo, veja .env.example)",
  ),

  BETTER_AUTH_URL: texto("BETTER_AUTH_URL").refine(
    (v) => URL.canParse(v),
    "BETTER_AUTH_URL deve ser uma URL completa, ex.: http://localhost:3000",
  ),

  GOOGLE_CLIENT_ID: texto("GOOGLE_CLIENT_ID").min(1, "GOOGLE_CLIENT_ID está vazio"),
  GOOGLE_CLIENT_SECRET: texto("GOOGLE_CLIENT_SECRET").min(1, "GOOGLE_CLIENT_SECRET está vazio"),
});

export type Env = z.infer<typeof schema>;

export class EnvError extends Error {
  constructor(public readonly problems: string[]) {
    super(
      [
        "❌ Variáveis de ambiente inválidas:",
        ...problems.map((p) => `   • ${p}`),
        "",
        "   Copie .env.example para .env e preencha os valores.",
      ].join("\n"),
    );
    this.name = "EnvError";
  }
}

/** Valida um objeto de variáveis. Exportada para ser testável sem tocar em process.env. */
export function parseEnv(source: Record<string, string | undefined>): Env {
  const result = schema.safeParse(source);
  if (!result.success) {
    const problems = result.error.issues.map((i) => {
      const campo = i.path.join(".");
      // mensagens customizadas já citam o nome da variável; evita "X: X está faltando"
      return i.message.includes(campo) ? i.message : `${campo}: ${i.message}`;
    });
    throw new EnvError(problems);
  }
  return result.data;
}

/**
 * SKIP_ENV_VALIDATION=1 existe só para etapas de build sem segredos (ex.: Docker build/CI).
 * Em runtime normal a validação sempre roda.
 */
export const env: Env =
  process.env.SKIP_ENV_VALIDATION === "1"
    ? (process.env as unknown as Env)
    : parseEnv(process.env);
