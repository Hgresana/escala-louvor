/**
 * Regras de convite — lógica PURA (sem Prisma, sem Next).
 * O acesso a dados entra por `InviteStore`; em produção quem implementa é
 * `invites-db.ts` (dentro de uma transação), nos testes é um fake em memória.
 *
 * Imports relativos de propósito: este arquivo também roda no seed (tsx), que não resolve "@/".
 */
import { randomBytes } from "node:crypto";

export type TeamRole = "LEADER" | "MEMBER";
export type ProfileKind = "STANDARD" | "DEPENDENT" | "OFFLINE";

export type InviteErrorCode =
  | "INVITE_NOT_FOUND"
  | "INVITE_REVOKED"
  | "INVITE_EXPIRED"
  | "INVITE_EXHAUSTED"
  | "ALREADY_MEMBER_CANNOT_CLAIM"
  | "CLAIM_PROFILE_UNAVAILABLE";

const MENSAGENS: Record<InviteErrorCode, string> = {
  INVITE_NOT_FOUND: "Este convite não existe. Peça um novo link ao líder da equipe.",
  INVITE_REVOKED: "Este convite foi cancelado. Peça um novo link ao líder da equipe.",
  INVITE_EXPIRED: "Este convite expirou. Peça um novo link ao líder da equipe.",
  INVITE_EXHAUSTED: "Este convite já foi usado o número máximo de vezes.",
  ALREADY_MEMBER_CANNOT_CLAIM:
    "Você já faz parte desta equipe, então não pode assumir outro perfil por este convite. Fale com o líder.",
  CLAIM_PROFILE_UNAVAILABLE:
    "O perfil reservado neste convite não está mais disponível. Fale com o líder da equipe.",
};

export class InviteError extends Error {
  constructor(public readonly code: InviteErrorCode) {
    super(MENSAGENS[code]);
    this.name = "InviteError";
  }
}

export function inviteErrorMessage(code: string): string {
  return code in MENSAGENS ? MENSAGENS[code as InviteErrorCode] : "Não foi possível usar este convite.";
}

export interface InviteRecord {
  id: string;
  token: string;
  claimProfileId: string | null;
  expiresAt: Date | null;
  maxUses: number | null;
  useCount: number;
  revokedAt: Date | null;
  team: { id: string; slug: string; name: string };
}

export interface ProfileRecord {
  id: string;
  teamId: string;
  kind: ProfileKind;
  userId: string | null;
  archivedAt: Date | null;
}

/** Porta de acesso a dados. Todas as operações rodam na MESMA transação. */
export interface InviteStore {
  findInviteByToken(token: string): Promise<InviteRecord | null>;
  findMembership(teamId: string, userId: string): Promise<{ role: TeamRole } | null>;
  findProfile(profileId: string): Promise<ProfileRecord | null>;
  /**
   * Consome 1 uso de forma ATÔMICA, revalidando revogação/expiração/limite no próprio UPDATE.
   * Retorna false se o convite deixou de valer entre a leitura e agora (corrida).
   */
  consumeInvite(inviteId: string, now: Date): Promise<boolean>;
  createMembership(input: { teamId: string; userId: string }): Promise<void>;
  /**
   * Cria o perfil STANDARD da conta na equipe — ou REATIVA um já existente (arquivado
   * numa saída anterior), porque o índice único parcial permite só 1 STANDARD por (equipe, conta).
   */
  upsertStandardProfile(input: {
    teamId: string;
    userId: string;
    displayName: string;
    avatarUrl: string | null;
  }): Promise<{ id: string }>;
  /**
   * Converte um perfil OFFLINE em STANDARD da conta, preservando o id (e, portanto, o histórico).
   * Limpa `alwaysAvailable` (o banco só aceita true para OFFLINE).
   * Retorna false se alguém assumiu o perfil antes (corrida).
   */
  claimOfflineProfile(input: {
    profileId: string;
    userId: string;
    avatarUrl: string | null;
  }): Promise<boolean>;
}

/** Verifica se o convite está utilizável agora. Reutilizada pela página de pré-visualização. */
export function checkInviteUsable(
  invite: Pick<InviteRecord, "revokedAt" | "expiresAt" | "maxUses" | "useCount">,
  now: Date,
): InviteErrorCode | null {
  if (invite.revokedAt) return "INVITE_REVOKED";
  if (invite.expiresAt && invite.expiresAt.getTime() <= now.getTime()) return "INVITE_EXPIRED";
  if (invite.maxUses !== null && invite.useCount >= invite.maxUses) return "INVITE_EXHAUSTED";
  return null;
}

export type AcceptInviteResult =
  | { status: "joined"; teamId: string; teamSlug: string; profileId: string }
  | { status: "claimed"; teamId: string; teamSlug: string; profileId: string }
  | { status: "already_member"; teamId: string; teamSlug: string };

export interface InviteUser {
  id: string;
  name: string;
  image: string | null;
}

export async function acceptInvite(
  store: InviteStore,
  input: { token: string; user: InviteUser; now?: Date },
): Promise<AcceptInviteResult> {
  const now = input.now ?? new Date();
  const { user } = input;

  const invite = await store.findInviteByToken(input.token);
  if (!invite) throw new InviteError("INVITE_NOT_FOUND");

  const teamRef = { teamId: invite.team.id, teamSlug: invite.team.slug };

  // Quem já é membro não "gasta" convite. Convite de vínculo, porém, é recusado:
  // mesclar um perfil offline com um perfil já existente seria destrutivo.
  const existing = await store.findMembership(invite.team.id, user.id);
  if (existing) {
    if (invite.claimProfileId) throw new InviteError("ALREADY_MEMBER_CANNOT_CLAIM");
    return { status: "already_member", ...teamRef };
  }

  const unusable = checkInviteUsable(invite, now);
  if (unusable) throw new InviteError(unusable);

  // Convite de vínculo: o perfil precisa ser um OFFLINE livre, ativo e da MESMA equipe.
  if (invite.claimProfileId) {
    const profile = await store.findProfile(invite.claimProfileId);
    const ok =
      profile !== null &&
      profile.teamId === invite.team.id &&
      profile.kind === "OFFLINE" &&
      profile.userId === null &&
      profile.archivedAt === null;
    if (!ok) throw new InviteError("CLAIM_PROFILE_UNAVAILABLE");
  }

  // Só depois de validar tudo, consome (atômico). Falhou aqui = alguém usou no mesmo instante.
  const consumed = await store.consumeInvite(invite.id, now);
  if (!consumed) throw new InviteError("INVITE_EXHAUSTED");

  await store.createMembership({ teamId: invite.team.id, userId: user.id });

  if (invite.claimProfileId) {
    const claimed = await store.claimOfflineProfile({
      profileId: invite.claimProfileId,
      userId: user.id,
      avatarUrl: user.image,
    });
    // Lançar aqui faz a transação inteira (membership + uso do convite) ser desfeita.
    if (!claimed) throw new InviteError("CLAIM_PROFILE_UNAVAILABLE");
    return { status: "claimed", ...teamRef, profileId: invite.claimProfileId };
  }

  const profile = await store.upsertStandardProfile({
    teamId: invite.team.id,
    userId: user.id,
    displayName: user.name,
    avatarUrl: user.image,
  });
  return { status: "joined", ...teamRef, profileId: profile.id };
}

/**
 * Dados aplicados ao perfil OFFLINE quando uma conta o assume. Usada pelo adaptador do banco
 * E pelos testes, para que o comportamento testado seja o de produção.
 * - mantém o nome definido pelo líder (só a foto é preenchida se estiver vazia);
 * - `alwaysAvailable` volta a false: o CHECK do banco só aceita true para perfis OFFLINE.
 */
export function claimProfileData(input: {
  userId: string;
  currentAvatarUrl: string | null;
  googleAvatarUrl: string | null;
}) {
  return {
    kind: "STANDARD" as const,
    userId: input.userId,
    alwaysAvailable: false,
    avatarUrl: input.currentAvatarUrl ?? input.googleAvatarUrl,
  };
}

/** Token url-safe com 256 bits de entropia (43 caracteres). */
export function generateInviteToken(): string {
  return randomBytes(32).toString("base64url");
}

export function buildInvitePath(token: string): string {
  return `/convite/${token}`;
}
