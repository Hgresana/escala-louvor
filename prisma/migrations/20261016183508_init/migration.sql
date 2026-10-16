-- CreateEnum
CREATE TYPE "TeamRole" AS ENUM ('LEADER', 'MEMBER');

-- CreateEnum
CREATE TYPE "ProfileKind" AS ENUM ('STANDARD', 'DEPENDENT', 'OFFLINE');

-- CreateEnum
CREATE TYPE "SlotRequirement" AS ENUM ('REQUIRED', 'OPTIONAL');

-- CreateEnum
CREATE TYPE "PollStatus" AS ENUM ('DRAFT', 'OPEN', 'CLOSED');

-- CreateEnum
CREATE TYPE "ScheduleStatus" AS ENUM ('DRAFT', 'PUBLISHED');

-- CreateEnum
CREATE TYPE "Availability" AS ENUM ('AVAILABLE', 'UNAVAILABLE');

-- CreateEnum
CREATE TYPE "AssignmentSource" AS ENUM ('AUTO', 'MANUAL');

-- CreateEnum
CREATE TYPE "AssignmentFlag" AS ENUM ('CONSECUTIVE', 'NOT_AVAILABLE', 'NOT_QUALIFIED', 'DOUBLE_BOOKED');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('POLL_OPENED', 'SCHEDULE_PUBLISHED', 'SCHEDULE_CHANGED', 'REMINDER');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "emailVerified" BOOLEAN NOT NULL DEFAULT false,
    "image" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "token" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "userId" TEXT NOT NULL,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Account" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "accessToken" TEXT,
    "refreshToken" TEXT,
    "idToken" TEXT,
    "accessTokenExpiresAt" TIMESTAMP(3),
    "refreshTokenExpiresAt" TIMESTAMP(3),
    "scope" TEXT,
    "password" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Verification" (
    "id" TEXT NOT NULL,
    "identifier" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Verification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Team" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "timezone" TEXT NOT NULL DEFAULT 'America/Sao_Paulo',
    "reminderLeadHours" INTEGER NOT NULL DEFAULT 24,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "archivedAt" TIMESTAMP(3),
    "avoidConsecutiveDays" BOOLEAN NOT NULL DEFAULT true,
    "optionalAllowsConsecutive" BOOLEAN NOT NULL DEFAULT false,
    "allowDoubleBooking" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Team_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TeamMembership" (
    "id" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "TeamRole" NOT NULL DEFAULT 'MEMBER',
    "notifyPollOpened" BOOLEAN NOT NULL DEFAULT true,
    "notifySchedule" BOOLEAN NOT NULL DEFAULT true,
    "notifyReminders" BOOLEAN NOT NULL DEFAULT true,
    "onboardedAt" TIMESTAMP(3),
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TeamMembership_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TeamInvite" (
    "id" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "claimProfileId" TEXT,
    "expiresAt" TIMESTAMP(3),
    "maxUses" INTEGER,
    "useCount" INTEGER NOT NULL DEFAULT 0,
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TeamInvite_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MemberProfile" (
    "id" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "kind" "ProfileKind" NOT NULL,
    "userId" TEXT,
    "displayName" TEXT NOT NULL,
    "avatarUrl" TEXT,
    "alwaysAvailable" BOOLEAN NOT NULL DEFAULT false,
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MemberProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Role" (
    "id" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "color" TEXT,
    "icon" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "archivedAt" TIMESTAMP(3),

    CONSTRAINT "Role_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MemberRole" (
    "profileId" TEXT NOT NULL,
    "roleId" TEXT NOT NULL,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "MemberRole_pkey" PRIMARY KEY ("profileId","roleId")
);

-- CreateTable
CREATE TABLE "ServiceTemplate" (
    "id" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ServiceTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ServiceTemplateSlot" (
    "id" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "roleId" TEXT NOT NULL,
    "requirement" "SlotRequirement" NOT NULL DEFAULT 'REQUIRED',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ServiceTemplateSlot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Poll" (
    "id" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "month" DATE NOT NULL,
    "status" "PollStatus" NOT NULL DEFAULT 'DRAFT',
    "openedAt" TIMESTAMP(3),
    "closesAt" TIMESTAMP(3),
    "closedAt" TIMESTAMP(3),
    "scheduleStatus" "ScheduleStatus" NOT NULL DEFAULT 'DRAFT',
    "schedulePublishedAt" TIMESTAMP(3),
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Poll_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PollEventSlot" (
    "id" TEXT NOT NULL,
    "pollId" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "label" TEXT NOT NULL,
    "templateId" TEXT,
    "notes" TEXT,
    "cancelledAt" TIMESTAMP(3),

    CONSTRAINT "PollEventSlot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EventPosition" (
    "id" TEXT NOT NULL,
    "eventSlotId" TEXT NOT NULL,
    "roleId" TEXT NOT NULL,
    "requirement" "SlotRequirement" NOT NULL DEFAULT 'REQUIRED',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "EventPosition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AvailabilityVote" (
    "id" TEXT NOT NULL,
    "eventSlotId" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "availability" "Availability" NOT NULL,
    "castByUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AvailabilityVote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScheduleAssignment" (
    "id" TEXT NOT NULL,
    "eventSlotId" TEXT NOT NULL,
    "positionId" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "source" "AssignmentSource" NOT NULL,
    "flags" "AssignmentFlag"[],
    "note" TEXT,
    "assignedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ScheduleAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PushSubscription" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "endpoint" TEXT NOT NULL,
    "p256dh" TEXT NOT NULL,
    "auth" TEXT NOT NULL,
    "userAgent" TEXT,
    "failureCount" INTEGER NOT NULL DEFAULT 0,
    "lastSuccessAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PushSubscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NotificationLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL,
    "dedupeKey" TEXT NOT NULL,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NotificationLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Session_token_key" ON "Session"("token");

-- CreateIndex
CREATE INDEX "Session_userId_idx" ON "Session"("userId");

-- CreateIndex
CREATE INDEX "Account_userId_idx" ON "Account"("userId");

-- CreateIndex
CREATE INDEX "Verification_identifier_idx" ON "Verification"("identifier");

-- CreateIndex
CREATE UNIQUE INDEX "Team_slug_key" ON "Team"("slug");

-- CreateIndex
CREATE INDEX "TeamMembership_userId_idx" ON "TeamMembership"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "TeamMembership_teamId_userId_key" ON "TeamMembership"("teamId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "TeamInvite_token_key" ON "TeamInvite"("token");

-- CreateIndex
CREATE INDEX "TeamInvite_teamId_idx" ON "TeamInvite"("teamId");

-- CreateIndex
CREATE INDEX "MemberProfile_teamId_kind_idx" ON "MemberProfile"("teamId", "kind");

-- CreateIndex
CREATE INDEX "MemberProfile_userId_idx" ON "MemberProfile"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Role_teamId_name_key" ON "Role"("teamId", "name");

-- CreateIndex
CREATE INDEX "MemberRole_roleId_idx" ON "MemberRole"("roleId");

-- CreateIndex
CREATE UNIQUE INDEX "ServiceTemplate_teamId_name_key" ON "ServiceTemplate"("teamId", "name");

-- CreateIndex
CREATE INDEX "ServiceTemplateSlot_templateId_idx" ON "ServiceTemplateSlot"("templateId");

-- CreateIndex
CREATE INDEX "Poll_teamId_month_idx" ON "Poll"("teamId", "month");

-- CreateIndex
CREATE INDEX "PollEventSlot_teamId_date_idx" ON "PollEventSlot"("teamId", "date");

-- CreateIndex
CREATE INDEX "PollEventSlot_pollId_startsAt_idx" ON "PollEventSlot"("pollId", "startsAt");

-- CreateIndex
CREATE INDEX "EventPosition_eventSlotId_idx" ON "EventPosition"("eventSlotId");

-- CreateIndex
CREATE INDEX "AvailabilityVote_profileId_idx" ON "AvailabilityVote"("profileId");

-- CreateIndex
CREATE UNIQUE INDEX "AvailabilityVote_eventSlotId_profileId_key" ON "AvailabilityVote"("eventSlotId", "profileId");

-- CreateIndex
CREATE UNIQUE INDEX "ScheduleAssignment_positionId_key" ON "ScheduleAssignment"("positionId");

-- CreateIndex
CREATE INDEX "ScheduleAssignment_eventSlotId_profileId_idx" ON "ScheduleAssignment"("eventSlotId", "profileId");

-- CreateIndex
CREATE INDEX "ScheduleAssignment_profileId_idx" ON "ScheduleAssignment"("profileId");

-- CreateIndex
CREATE UNIQUE INDEX "PushSubscription_endpoint_key" ON "PushSubscription"("endpoint");

-- CreateIndex
CREATE INDEX "PushSubscription_userId_idx" ON "PushSubscription"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "NotificationLog_dedupeKey_key" ON "NotificationLog"("dedupeKey");

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Account" ADD CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeamMembership" ADD CONSTRAINT "TeamMembership_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeamMembership" ADD CONSTRAINT "TeamMembership_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeamInvite" ADD CONSTRAINT "TeamInvite_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MemberProfile" ADD CONSTRAINT "MemberProfile_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MemberProfile" ADD CONSTRAINT "MemberProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Role" ADD CONSTRAINT "Role_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MemberRole" ADD CONSTRAINT "MemberRole_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "MemberProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MemberRole" ADD CONSTRAINT "MemberRole_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceTemplate" ADD CONSTRAINT "ServiceTemplate_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceTemplateSlot" ADD CONSTRAINT "ServiceTemplateSlot_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "ServiceTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceTemplateSlot" ADD CONSTRAINT "ServiceTemplateSlot_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Poll" ADD CONSTRAINT "Poll_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PollEventSlot" ADD CONSTRAINT "PollEventSlot_pollId_fkey" FOREIGN KEY ("pollId") REFERENCES "Poll"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PollEventSlot" ADD CONSTRAINT "PollEventSlot_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PollEventSlot" ADD CONSTRAINT "PollEventSlot_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "ServiceTemplate"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventPosition" ADD CONSTRAINT "EventPosition_eventSlotId_fkey" FOREIGN KEY ("eventSlotId") REFERENCES "PollEventSlot"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventPosition" ADD CONSTRAINT "EventPosition_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AvailabilityVote" ADD CONSTRAINT "AvailabilityVote_eventSlotId_fkey" FOREIGN KEY ("eventSlotId") REFERENCES "PollEventSlot"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AvailabilityVote" ADD CONSTRAINT "AvailabilityVote_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "MemberProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScheduleAssignment" ADD CONSTRAINT "ScheduleAssignment_eventSlotId_fkey" FOREIGN KEY ("eventSlotId") REFERENCES "PollEventSlot"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScheduleAssignment" ADD CONSTRAINT "ScheduleAssignment_positionId_fkey" FOREIGN KEY ("positionId") REFERENCES "EventPosition"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScheduleAssignment" ADD CONSTRAINT "ScheduleAssignment_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "MemberProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PushSubscription" ADD CONSTRAINT "PushSubscription_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NotificationLog" ADD CONSTRAINT "NotificationLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- >>> custom-constraints (anexado por scripts/append-constraints.mjs)
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
