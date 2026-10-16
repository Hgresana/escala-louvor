/**
 * Seed idempotente: pode rodar várias vezes sem duplicar nada.
 * Cria a equipe demo, as 8 funções, 2 templates e um convite ativo (o link aparece no final).
 *
 * Imports relativos (e não "@/"): o tsx não resolve o alias do tsconfig.
 */
import { PrismaClient } from "@prisma/client";
import { generateInviteToken, buildInvitePath } from "../src/lib/invites";
import { SEED_ROLES, SEED_TEAM, SEED_TEMPLATES } from "./seed-data";

const prisma = new PrismaClient();

async function main() {
  await prisma.$transaction(async (tx) => {
    // ── Equipe ──
    const team = await tx.team.upsert({
      where: { slug: SEED_TEAM.slug },
      update: {},
      create: { name: SEED_TEAM.name, slug: SEED_TEAM.slug },
    });

    // ── Funções ──
    const roleId = new Map<string, string>();
    for (const [i, r] of SEED_ROLES.entries()) {
      const role = await tx.role.upsert({
        where: { teamId_name: { teamId: team.id, name: r.name } },
        update: {},
        create: { teamId: team.id, name: r.name, icon: r.icon, color: r.color, sortOrder: i },
      });
      roleId.set(r.name, role.id);
    }

    // ── Templates (presets) ──
    // Só cria se não existir: nunca sobrescreve um preset que o líder já editou.
    for (const [i, t] of SEED_TEMPLATES.entries()) {
      const existente = await tx.serviceTemplate.findUnique({
        where: { teamId_name: { teamId: team.id, name: t.name } },
        select: { id: true },
      });
      if (existente) continue;

      // Respeita o índice "1 padrão por equipe": se já há outro padrão, este entra como não-padrão.
      const jaTemPadrao = await tx.serviceTemplate.count({ where: { teamId: team.id, isDefault: true } });
      await tx.serviceTemplate.create({
        data: {
          teamId: team.id,
          name: t.name,
          isDefault: t.isDefault && jaTemPadrao === 0,
          sortOrder: i,
          slots: {
            create: t.slots.map((s, idx) => ({
              roleId: roleId.get(s.role)!,
              requirement: s.requirement,
              sortOrder: idx,
            })),
          },
        },
      });
    }

    // ── Convite ativo (reaproveita se já existir um) ──
    let invite = await tx.teamInvite.findFirst({
      where: { teamId: team.id, claimProfileId: null, revokedAt: null, expiresAt: null, maxUses: null },
      orderBy: { createdAt: "asc" },
    });
    if (!invite) {
      invite = await tx.teamInvite.create({
        data: { teamId: team.id, token: generateInviteToken(), createdById: "seed" },
      });
    }

    const base = process.env.BETTER_AUTH_URL ?? "http://localhost:3000";
    console.log("\n✅ Seed concluído");
    console.log(`   Equipe:     ${team.name} (slug: ${team.slug})`);
    console.log(`   Funções:    ${SEED_ROLES.length}`);
    console.log(`   Templates:  ${SEED_TEMPLATES.map((t) => t.name).join(", ")}`);
    console.log(`\n🔗 Link de convite:\n   ${base}${buildInvitePath(invite.token)}\n`);
    console.log(`   Depois de entrar por esse link, vire líder com:\n   npm run team:leader -- seu-email@gmail.com ${team.slug}\n`);
  });
}

main()
  .catch((e) => {
    console.error("❌ Seed falhou:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
