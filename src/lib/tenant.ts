import "server-only";
import { cache } from "react";
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { auth } from "./auth";
import { prisma } from "./prisma";
import { assertLeader, isLeader, teamScope, type TeamActor, type TeamRole } from "./permissions";

export { teamScope };

export interface SessionUser {
  id: string;
  name: string;
  email: string;
  image: string | null;
}

export interface TeamContext {
  user: SessionUser;
  team: { id: string; slug: string; name: string; timezone: string };
  membership: { id: string; role: TeamRole; onboardedAt: Date | null };
  /** Forma enxuta usada pelas regras puras de permissions.ts */
  actor: TeamActor;
}

/** Sessão da requisição atual (deduplicada por request com React cache). */
export const getSessionUser = cache(async (): Promise<SessionUser | null> => {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return null;
  const { id, name, email, image } = session.user;
  return { id, name, email, image: image ?? null };
});

/** Exige login; sem sessão, manda para /login e volta para `next` depois. */
export async function requireUser(next?: string): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) redirect(next ? `/login?next=${encodeURIComponent(next)}` : "/login");
  return user;
}

/**
 * Exige que o usuário logado seja MEMBRO da equipe `teamSlug`.
 * Não-membro recebe 404 (e não 403) para não revelar que a equipe existe.
 */
export async function requireTeamMember(teamSlug: string): Promise<TeamContext> {
  const user = await requireUser(`/t/${teamSlug}`);

  const membership = await prisma.teamMembership.findFirst({
    where: { userId: user.id, team: { slug: teamSlug, archivedAt: null } },
    select: {
      id: true,
      role: true,
      onboardedAt: true,
      team: { select: { id: true, slug: true, name: true, timezone: true } },
    },
  });
  if (!membership) notFound();

  const { team, ...m } = membership;
  return {
    user,
    team,
    membership: m,
    actor: { userId: user.id, teamId: team.id, role: m.role },
  };
}

/** Para páginas só de líder: membro comum também recebe 404. */
export async function requireTeamLeader(teamSlug: string): Promise<TeamContext> {
  const ctx = await requireTeamMember(teamSlug);
  if (!isLeader(ctx.actor)) notFound();
  return ctx;
}

/** Para Server Actions: lança PermissionError (a UI decide como mostrar). */
export async function requireLeaderForAction(teamSlug: string): Promise<TeamContext> {
  const ctx = await requireTeamMember(teamSlug);
  assertLeader(ctx.actor);
  return ctx;
}

/** Perfis que esta conta controla na equipe: o próprio + dependentes (nunca os offline). */
export async function getControlledProfiles(ctx: TeamContext) {
  return prisma.memberProfile.findMany({
    where: { ...teamScope(ctx.actor), userId: ctx.user.id, archivedAt: null },
    orderBy: [{ kind: "asc" }, { displayName: "asc" }],
    select: { id: true, kind: true, displayName: true, avatarUrl: true },
  });
}
