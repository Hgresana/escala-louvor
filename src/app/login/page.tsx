import { Suspense } from "react";
import { redirect } from "next/navigation";
import { GoogleButton } from "../google-button";
import { getSessionUser } from "@/lib/tenant";
import { safeNextPath } from "@/lib/safe-redirect";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default function LoginPage(props: { searchParams: SearchParams }) {
  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col items-center justify-center gap-6 p-6 text-center">
      <h1 className="text-2xl font-semibold tracking-tight">Entrar</h1>
      {/* searchParams e cookies são dados de requisição: ficam atrás de Suspense (Cache Components) */}
      <Suspense fallback={<p className="text-sm text-zinc-500">Carregando…</p>}>
        <LoginContent searchParams={props.searchParams} />
      </Suspense>
    </main>
  );
}

async function LoginContent({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;
  const next = safeNextPath(typeof sp.next === "string" ? sp.next : undefined, "/");

  const user = await getSessionUser();
  if (user) redirect(next);

  return (
    <>
      <p className="text-sm text-zinc-600">Use sua conta Google para acessar suas equipes.</p>
      <GoogleButton callbackURL={next} />
    </>
  );
}
