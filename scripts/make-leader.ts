/**
 * Promove um membro a LÍDER. Necessário só no começo: a primeira pessoa precisa virar líder
 * por fora, porque todo convite cria membros comuns. (Na Etapa 3+ líderes promovem pela interface.)
 *
 * Uso: npm run team:leader -- seu-email@gmail.com louvor-demo
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const [email, teamSlug = "louvor-demo"] = process.argv.slice(2);
  if (!email) {
    console.error("Uso: npm run team:leader -- <email> [slug-da-equipe]");
    process.exit(1);
  }

  const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
  if (!user) {
    console.error(`❌ Nenhuma conta com o e-mail ${email}. Entre pelo link de convite primeiro.`);
    process.exit(1);
  }

  const team = await prisma.team.findUnique({ where: { slug: teamSlug } });
  if (!team) {
    console.error(`❌ Equipe "${teamSlug}" não encontrada.`);
    process.exit(1);
  }

  const { count } = await prisma.teamMembership.updateMany({
    where: { userId: user.id, teamId: team.id },
    data: { role: "LEADER" },
  });
  if (count === 0) {
    console.error(`❌ ${email} ainda não é membro de "${teamSlug}". Entre pelo link de convite primeiro.`);
    process.exit(1);
  }
  console.log(`✅ ${user.name} (${email}) agora é LÍDER de "${team.name}".`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
