import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { nextCookies } from "better-auth/next-js";
import { env } from "./env";
import { prisma } from "./prisma";

export const auth = betterAuth({
  baseURL: env.BETTER_AUTH_URL,
  secret: env.BETTER_AUTH_SECRET,
  database: prismaAdapter(prisma, { provider: "postgresql" }),

  // Só Google: nome, e-mail e foto vêm do perfil do Google para User.name/email/image.
  socialProviders: {
    google: {
      clientId: env.GOOGLE_CLIENT_ID,
      clientSecret: env.GOOGLE_CLIENT_SECRET,
    },
  },

  session: {
    expiresIn: 60 * 60 * 24 * 30, // 30 dias: é um app de celular, ninguém quer logar toda semana
    updateAge: 60 * 60 * 24,      // renova o prazo a cada 1 dia de uso
  },

  // IMPORTANTE: nextCookies deve ser o ÚLTIMO plugin (permite setar cookies em Server Actions).
  plugins: [nextCookies()],
});

export type Session = typeof auth.$Infer.Session;
