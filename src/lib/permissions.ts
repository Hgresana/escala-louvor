/**
 * Regras de permissão por equipe — funções PURAS (sem banco, sem sessão).
 * `tenant.ts` carrega o contexto (sessão + membership) e usa estas regras.
 */
import type { ProfileKind, TeamRole } from "./invites";

export type { ProfileKind, TeamRole };

/** Quem está agindo, dentro de UMA equipe. */
export interface TeamActor {
  userId: string;
  teamId: string;
  role: TeamRole;
}

/** O mínimo de um perfil necessário para decidir permissões. */
export interface ProfileRef {
  teamId: string;
  kind: ProfileKind;
  userId: string | null; // conta que controla o perfil
  archivedAt: Date | null;
}

export class PermissionError extends Error {
  constructor(message = "Você não tem permissão para fazer isso.") {
    super(message);
    this.name = "PermissionError";
  }
}

export const isLeader = (actor: TeamActor): boolean => actor.role === "LEADER";

export function assertLeader(actor: TeamActor): void {
  if (!isLeader(actor)) throw new PermissionError("Apenas líderes podem fazer isso.");
}

/**
 * Editar dados/funções do perfil.
 * - Nunca atravessa equipes.
 * - Líder edita qualquer perfil da equipe (inclui OFFLINE e dependentes).
 * - Membro edita o próprio perfil e os dependentes que ele controla.
 */
export function canManageProfile(actor: TeamActor, profile: ProfileRef): boolean {
  if (profile.teamId !== actor.teamId) return false;
  if (isLeader(actor)) return true;
  return profile.userId === actor.userId && profile.kind !== "OFFLINE";
}

/**
 * Votar a disponibilidade em nome de um perfil.
 * - Próprio perfil e dependentes: quem controla (o titular).
 * - Perfil OFFLINE: qualquer líder da equipe.
 * - Líder NÃO vota por outro membro que tem login (nem pelos filhos dele).
 * - Perfil arquivado não recebe voto.
 */
export function canCastVoteFor(actor: TeamActor, profile: ProfileRef): boolean {
  if (profile.teamId !== actor.teamId) return false;
  if (profile.archivedAt) return false;
  if (profile.userId !== null && profile.userId === actor.userId) return true;
  return isLeader(actor) && profile.kind === "OFFLINE";
}

/** Só líderes veem escala em rascunho; membros veem apenas a publicada. */
export const canViewDraftSchedule = (actor: TeamActor): boolean => isLeader(actor);

/**
 * Impede que a equipe fique sem líder: o último LEADER não pode sair nem ser rebaixado/removido.
 * `leaderCount` = quantidade atual de líderes da equipe.
 */
export function canLeaveOrDemote(
  target: { role: TeamRole },
  leaderCount: number,
): boolean {
  if (target.role !== "LEADER") return true;
  return leaderCount > 1;
}

/** Filtro obrigatório em toda query multi-tenant. Use sempre: `where: { ...teamScope(actor), ... }`. */
export const teamScope = (actor: Pick<TeamActor, "teamId">) => ({ teamId: actor.teamId });
