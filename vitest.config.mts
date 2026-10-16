import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts", "prisma/**/*.test.ts", "scripts/**/*.test.ts"],
    // Valores falsos só para os testes: eles nunca dependem do seu .env real.
    env: {
      NODE_ENV: "test",
      DATABASE_URL: "postgresql://teste:teste@localhost:5432/teste",
      BETTER_AUTH_SECRET: "segredo-de-teste-com-mais-de-32-caracteres!!",
      BETTER_AUTH_URL: "http://localhost:3000",
      GOOGLE_CLIENT_ID: "client-id-de-teste",
      GOOGLE_CLIENT_SECRET: "client-secret-de-teste",
    },
  },
});
