import { Suspense } from "react";
import { redirect } from "next/navigation";
import { GoogleButton } from "../../google-button";
import { joinTeamAction } from "./actions";
import { getInvitePreview, isTeamMember } from "@/lib/invites-db";
import { buildInvitePath, checkInviteUsable, inviteErrorMessage } from "@/lib/invites";
import { getSessionUser } from "@/lib/tenant";

type Params = Promise<{ token: string }>;
type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default function ConvitePage(props: { params: Params; searchParams: SearchParams }) {
  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col items-center justify-center gap-5 p-6 text-center">
      <Suspense fallback={<p className="text-sm text-zinc-500">Carregando convite…</p>}>
        <ConviteContent params={props.params} searchParams={props.searchParams} />
      </Suspense>
    </main>
  );
}

async function ConviteContent({ params, searchParams }: { params: Params; searchParams: SearchParams }) {
  const { token } = await params;
  const sp = await searchParams;
  const erro = typeof sp.erro === "string" ? sp.erro : null;

  const preview = await getInvitePreview(token);
  if (!preview) return <Aviso titulo="Convite não encontrado" texto={inviteErrorMessage("INVITE_NOT_FOUND")} />;

  const { invite, claimProfileName } = preview;
  const user = await getSessionUser();

  // Quem já é membro não precisa de convite: vai direto para a equipe.
  if (user && !erro) {
    const jaMembro = await isTeamMember(invite.team.id, user.id);
    if (jaMembro && !invite.claimProfileId) redirect(`/t/${invite.team.slug}`);
  }

  const problema = erro ?? checkInviteUsable(invite, new Date());
  if (problema) return <Aviso titulo="Não foi possível entrar" texto={inviteErrorMessage(problema)} />;

  return (
    <>
      <p className="text-sm text-zinc-500">Você foi convidado(a) para a equipe</p>
      <h1 className="text-2xl font-semibold tracking-tight">{invite.team.name}</h1>

      {claimProfileName && (
        <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900">
          Este convite liga a sua conta ao perfil <strong>{claimProfileName}</strong>, já criado pelo líder.
          O histórico de escalas dele será mantido.
        </p>
      )}

      {user ? (
        <form action={joinTeamAction} className="w-full">
          <input type="hidden" name="token" value={token} />
          <p className="mb-3 text-sm text-zinc-600">
            Entrando como <strong>{user.name}</strong> ({user.email})
          </p>
          <button
            type="submit"
            className="w-full rounded-lg bg-zinc-900 px-5 py-3 text-sm font-medium text-white hover:bg-zinc-700"
          >
            Entrar na equipe
          </button>
        </form>
      ) : (
        <GoogleButton callbackURL={buildInvitePath(token)} label="Entrar com Google para aceitar" />
      )}
    </>
  );
}

function Aviso({ titulo, texto }: { titulo: string; texto: string }) {
  return (
    <>
      <h1 className="text-xl font-semibold">{titulo}</h1>
      <p role="alert" className="text-sm text-zinc-600">{texto}</p>
    </>
  );
}
