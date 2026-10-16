import { Suspense } from "react";
import { getControlledProfiles, requireTeamMember } from "@/lib/tenant";

type Params = Promise<{ teamSlug: string }>;

/**
 * PLACEHOLDER da Etapa 2 — serve só para o smoke test (prova login + convite + isolamento por equipe).
 * Na Etapa 3 este arquivo é substituído pelo layout real (sidebar / bottom nav) e pela tela de Escalas.
 */
export default function TeamHomePlaceholder(props: { params: Params }) {
  return (
    <main className="mx-auto min-h-screen max-w-lg space-y-4 p-6">
      <Suspense fallback={<p className="text-sm text-zinc-500">Carregando equipe…</p>}>
        <TeamInfo params={props.params} />
      </Suspense>
    </main>
  );
}

async function TeamInfo({ params }: { params: Params }) {
  const { teamSlug } = await params;
  const ctx = await requireTeamMember(teamSlug); // não-membro → 404
  const perfis = await getControlledProfiles(ctx);

  return (
    <>
      <h1 className="text-2xl font-semibold tracking-tight">{ctx.team.name}</h1>
      <p className="text-sm text-zinc-600">
        Logado como <strong>{ctx.user.name}</strong> · papel:{" "}
        <span className="rounded bg-zinc-100 px-1.5 py-0.5 font-mono text-xs">{ctx.membership.role}</span>
      </p>
      <section>
        <h2 className="mb-2 text-sm font-medium text-zinc-500">Perfis que você controla</h2>
        <ul className="space-y-1 text-sm">
          {perfis.map((p) => (
            <li key={p.id} className="rounded border border-zinc-200 px-3 py-2">
              {p.displayName} <span className="text-zinc-400">({p.kind})</span>
            </li>
          ))}
        </ul>
      </section>
      <p className="text-xs text-zinc-400">Etapa 2 concluída. O layout real chega na Etapa 3.</p>
    </>
  );
}
