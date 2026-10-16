-- ═══════════════════════════════════════════════════════════════════════════
-- Constraints que o Prisma não consegue expressar no schema.
-- É ANEXADO à migration "init" por `node scripts/append-constraints.mjs`.
-- ═══════════════════════════════════════════════════════════════════════════

-- Tipo do perfil × conta que o controla:
--   OFFLINE  → sem conta (userId nulo)
--   STANDARD/DEPENDENT → sempre com conta (titular)
ALTER TABLE "MemberProfile" ADD CONSTRAINT "member_profile_kind_user_chk" CHECK (
  ("kind" = 'OFFLINE'  AND "userId" IS NULL) OR
  ("kind" <> 'OFFLINE' AND "userId" IS NOT NULL)
);

-- "Sempre disponível por padrão" só existe para perfis offline.
ALTER TABLE "MemberProfile" ADD CONSTRAINT "member_profile_always_avail_chk"
  CHECK ("alwaysAvailable" = false OR "kind" = 'OFFLINE');

-- Um único perfil STANDARD por (equipe, conta). Dependentes não entram na regra.
CREATE UNIQUE INDEX "member_profile_one_standard"
  ON "MemberProfile" ("teamId", "userId") WHERE "kind" = 'STANDARD';

-- Um único template padrão por equipe.
CREATE UNIQUE INDEX "service_template_one_default"
  ON "ServiceTemplate" ("teamId") WHERE "isDefault" = true;
