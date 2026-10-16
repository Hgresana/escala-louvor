import Link from "next/link";

export default function Home() {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-6 p-6 text-center">
      <h1 className="text-3xl font-semibold tracking-tight">Escala Louvor</h1>
      <p className="text-zinc-600">
        Fundação da Etapa 2 rodando. Para entrar numa equipe, use o link de convite enviado pelo líder.
      </p>
      <Link
        href="/login"
        className="rounded-lg bg-zinc-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-zinc-700"
      >
        Entrar
      </Link>
    </main>
  );
}
