import "server-only";
import { Prisma } from "@prisma/client";
import { prisma } from "./prisma";
import {
  acceptInvite,
  claimProfileData,
  type AcceptInviteResult,
  type InviteRecord,
  type InviteStore,
  type InviteUser,
} from "./invites";

type Tx = Prisma.TransactionClient;

/** Adaptador Prisma da porta `InviteStore`. Recebe o cliente da transação. */
export function prismaInviteStore(tx: Tx): InviteStore {
  return {
    async findInviteByToken(token) {
      const inv = await tx.teamInvite.findUnique({
        where: { token },
        include: { team: { select: { id: true, slug: true, name: true, archivedAt: true } } },
      });
      // Equipe arquivada = convite inexistente.
      if (!inv || inv.team.archivedAt) return null;
      return toRecord(inv);
    },

    async findMembership(teamId, userId) {
      return tx.teamMembership.findUnique({
        where: { teamId_userId: { teamId, userId } },
        select: { role: true },
      });
    },

    async findProfile(profileId) {
      return tx.memberProfile.findUnique({
        where: { id: profileId },
        select: { id: true, teamId: true, kind: true, userId: true, archivedAt: true },
      });
    },

    // UPDATE condicional num único comando: serializa duas pessoas usando o último uso do convite.
    async consumeInvite(inviteId, now) {
      const afetadas = await tx.$executeRaw`
        UPDATE "TeamInvite"
        SET "useCount" = "useCount" + 1
        WHERE "id" = ${inviteId}
          AND "revokedAt" IS NULL
          AND ("expiresAt" IS NULL OR "expiresAt" > ${now})
          AND ("maxUses" IS NULL OR "useCount" < "maxUses")`;
      return afetadas === 1;
    },

    async createMembership({ teamId, userId }) {
      await tx.teamMembership.create({ data: { teamId, userId, role: "MEMBER" } });
    },

    async upsertStandardProfile({ teamId, userId, displayName, avatarUrl }) {
      const existente = await tx.memberProfile.findFirst({
        where: { teamId, userId, kind: "STANDARD" }, // inclui arquivado (índice único parcial)
        select: { id: true },
      });
      if (existente) {
        await tx.memberProfile.update({ where: { id: existente.id }, data: { archivedAt: null } });
        return existente;
      }
      return tx.memberProfile.create({
        data: { teamId, userId, kind: "STANDARD", displayName, avatarUrl },
        select: { id: true },
      });
    },

    async claimOfflineProfile({ profileId, userId, avatarUrl }) {
      const atual = await tx.memberProfile.findUnique({
        where: { id: profileId },
        select: { avatarUrl: true },
      });
      if (!atual) return false;
      // Condição no WHERE: se outra pessoa assumiu no meio tempo, count = 0.
      const { count } = await tx.memberProfile.updateMany({
        where: { id: profileId, kind: "OFFLINE", userId: null, archivedAt: null },
        data: claimProfileData({ userId, currentAvatarUrl: atual.avatarUrl, googleAvatarUrl: avatarUrl }),
      });
      return count === 1;
    },
  };
}

function toRecord(inv: {
  id: string;
  token: string;
  claimProfileId: string | null;
  expiresAt: Date | null;
  maxUses: number | null;
  useCount: number;
  revokedAt: Date | null;
  team: { id: string; slug: string; name: string };
}): InviteRecord {
  return {
    id: inv.id,
    token: inv.token,
    claimProfileId: inv.claimProfileId,
    expiresAt: inv.expiresAt,
    maxUses: inv.maxUses,
    useCount: inv.useCount,
    revokedAt: inv.revokedAt,
    team: { id: inv.team.id, slug: inv.team.slug, name: inv.team.name },
  };
}

/** Aceita o convite numa transação: ou entra tudo (convite consumido + membership + perfil) ou nada. */
export function acceptInviteInDb(token: string, user: InviteUser): Promise<AcceptInviteResult> {
  return prisma.$transaction((tx) => acceptInvite(prismaInviteStore(tx), { token, user }));
}

/** Dados para a página /convite/[token] (não consome nada). */
export async function getInvitePreview(token: string) {
  const inv = await prisma.teamInvite.findUnique({
    where: { token },
    include: { team: { select: { id: true, slug: true, name: true, archivedAt: true } } },
  });
  if (!inv || inv.team.archivedAt) return null;

  const claimProfile = inv.claimProfileId
    ? await prisma.memberProfile.findFirst({
        where: { id: inv.claimProfileId, teamId: inv.teamId },
        select: { displayName: true },
      })
    : null;

  return { invite: toRecord(inv), claimProfileName: claimProfile?.displayName ?? null };
}

export async function isTeamMember(teamId: string, userId: string): Promise<boolean> {
  const m = await prisma.teamMembership.findUnique({
    where: { teamId_userId: { teamId, userId } },
    select: { id: true },
  });
  return m !== null;
}
