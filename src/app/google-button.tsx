"use client";

import { useState } from "react";
import { authClient } from "@/lib/auth-client";

export function GoogleButton({ callbackURL, label = "Continuar com Google" }: { callbackURL: string; label?: string }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function entrar() {
    setLoading(true);
    setError(null);
    const { error } = await authClient.signIn.social({ provider: "google", callbackURL });
    // Em caso de sucesso o navegador é redirecionado ao Google e o código abaixo nem executa.
    if (error) {
      setError(error.message ?? "Não foi possível iniciar o login com o Google.");
      setLoading(false);
    }
  }

  return (
    <div className="w-full">
      <button
        type="button"
        onClick={entrar}
        disabled={loading}
        className="w-full rounded-lg border border-zinc-300 bg-white px-5 py-3 text-sm font-medium text-zinc-900 shadow-sm hover:bg-zinc-50 disabled:opacity-60"
      >
        {loading ? "Abrindo o Google…" : label}
      </button>
      {error && <p role="alert" className="mt-2 text-sm text-red-600">{error}</p>}
    </div>
  );
}
