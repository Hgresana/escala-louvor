"use server";

import { redirect } from "next/navigation";
import { requireUser } from "@/lib/tenant";
import { acceptInviteInDb } from "@/lib/invites-db";
import { InviteError, buildInvitePath } from "@/lib/invites";

/**
 * Server Actions são alcançáveis por POST direto: a autenticação é conferida AQUI,
 * e o token vem do formulário (nunca confiamos em nada vindo da UI).
 */
export async function joinTeamAction(formData: FormData) {
  const token = formData.get("token");
  if (typeof token !== "string" || token.length === 0 || token.length > 200) {
    redirect("/");
  }

  const user = await requireUser(buildInvitePath(token));

  let teamSlug: string;
  try {
    const result = await acceptInviteInDb(token, { id: user.id, name: user.name, image: user.image });
    teamSlug = result.teamSlug;
  } catch (e) {
    if (e instanceof InviteError) {
      redirect(`${buildInvitePath(token)}?erro=${e.code}`);
    }
    throw e;
  }

  // redirect() lança uma exceção interna do Next: precisa ficar FORA do try/catch.
  redirect(`/t/${teamSlug}`);
}
