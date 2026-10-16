import { beforeEach, describe, expect, it } from "vitest";
import {
  InviteError,
  acceptInvite,
  buildInvitePath,
  checkInviteUsable,
  claimProfileData,
  generateInviteToken,
  type InviteRecord,
  type InviteStore,
  type InviteUser,
  type ProfileKind,
  type ProfileRecord,
  type TeamRole,
} from "./invites";

// ─────────────────────────── fake em memória ───────────────────────────
// Reproduz as regras que o banco impõe, para os testes pegarem violações de verdade.

interface FakeProfile extends ProfileRecord {
  displayName: string;
  avatarUrl: string | null;
  alwaysAvailable: boolean;
}

class FakeStore implements InviteStore {
  invites = new Map<string, InviteRecord>();
  memberships: { teamId: string; userId: string; role: TeamRole }[] = [];
  profiles: FakeProfile[] = [];
  /** Simula a corrida: o convite parecia válido na leitura, mas outro request o consumiu antes. */
  forceConsumeFail = false;
  forceClaimFail = false;
  private seq = 0;

  async findInviteByToken(token: string) {
    return this.invites.get(token) ?? null;
  }
  async findMembership(teamId: string, userId: string) {
    const m = this.memberships.find((x) => x.teamId === teamId && x.userId === userId);
    return m ? { role: m.role } : null;
  }
  async findProfile(profileId: string) {
    return this.profiles.find((p) => p.id === profileId) ?? null;
  }
  async consumeInvite(inviteId: string, now: Date) {
    const inv = [...this.invites.values()].find((i) => i.id === inviteId);
    if (!inv || this.forceConsumeFail) return false;
    const esgotado = inv.maxUses !== null && inv.useCount >= inv.maxUses;
    const expirado = inv.expiresAt !== null && inv.expiresAt <= now;
    if (inv.revokedAt || esgotado || expirado) return false;
    inv.useCount += 1;
    return true;
  }
  async createMembership(i: { teamId: string; userId: string }) {
    if (this.memberships.some((m) => m.teamId === i.teamId && m.userId === i.userId)) {
      throw new Error("unique (teamId, userId) violado");
    }
    this.memberships.push({ ...i, role: "MEMBER" });
  }
  async upsertStandardProfile(i: { teamId: string; userId: string; displayName: string; avatarUrl: string | null }) {
    const existente = this.profiles.find(
      (p) => p.teamId === i.teamId && p.userId === i.userId && p.kind === "STANDARD",
    );
    if (existente) {
      existente.archivedAt = null;
      return { id: existente.id };
    }
    const p: FakeProfile = {
      id: `p${++this.seq}`,
      teamId: i.teamId,
      kind: "STANDARD",
      userId: i.userId,
      archivedAt: null,
      displayName: i.displayName,
      avatarUrl: i.avatarUrl,
      alwaysAvailable: false,
    };
    this.profiles.push(p);
    return { id: p.id };
  }
  async claimOfflineProfile(i: { profileId: string; userId: string; avatarUrl: string | null }) {
    const p = this.profiles.find((x) => x.id === i.profileId);
    if (!p || this.forceClaimFail || p.kind !== "OFFLINE" || p.userId !== null) return false;
    // mesma função que o adaptador do Prisma usa em produção
    Object.assign(
      p,
      claimProfileData({ userId: i.userId, currentAvatarUrl: p.avatarUrl, googleAvatarUrl: i.avatarUrl }),
    );
    return true;
  }

  // ── helpers dos testes ──
  addInvite(o: Partial<InviteRecord> = {}): InviteRecord {
    const inv: InviteRecord = {
      id: `i${++this.seq}`,
      token: `tok${this.seq}`,
      claimProfileId: null,
      expiresAt: null,
      maxUses: null,
      useCount: 0,
      revokedAt: null,
      team: { id: "t1", slug: "louvor", name: "Louvor" },
      ...o,
    };
    this.invites.set(inv.token, inv);
    return inv;
  }
  addProfile(o: Partial<FakeProfile> = {}): FakeProfile {
    const p: FakeProfile = {
      id: `p${++this.seq}`,
      teamId: "t1",
      kind: "OFFLINE" as ProfileKind,
      userId: null,
      archivedAt: null,
      displayName: "Vovô José",
      avatarUrl: null,
      alwaysAvailable: true,
      ...o,
    };
    this.profiles.push(p);
    return p;
  }
}

const ana: InviteUser = { id: "u-ana", name: "Ana Souza", image: "https://img/ana.png" };
const bruno: InviteUser = { id: "u-bruno", name: "Bruno Lima", image: null };
const NOW = new Date("2026-11-01T12:00:00Z");

async function erroDe(p: Promise<unknown>): Promise<InviteError> {
  try {
    await p;
  } catch (e) {
    expect(e).toBeInstanceOf(InviteError);
    return e as InviteError;
  }
  throw new Error("esperava InviteError, mas não houve erro");
}

let store: FakeStore;
beforeEach(() => {
  store = new FakeStore();
});

// ─────────────────────────── convite comum ───────────────────────────
describe("convite comum", () => {
  it("cria membership MEMBER e perfil STANDARD com nome e foto do Google, e consome 1 uso", async () => {
    const inv = store.addInvite({ maxUses: 5 });

    const r = await acceptInvite(store, { token: inv.token, user: ana, now: NOW });

    expect(r).toMatchObject({ status: "joined", teamId: "t1", teamSlug: "louvor" });
    expect(store.memberships).toEqual([{ teamId: "t1", userId: "u-ana", role: "MEMBER" }]);
    expect(store.profiles).toHaveLength(1);
    expect(store.profiles[0]).toMatchObject({
      kind: "STANDARD",
      userId: "u-ana",
      displayName: "Ana Souza",
      avatarUrl: "https://img/ana.png",
      alwaysAvailable: false,
    });
    expect(inv.useCount).toBe(1);
  });

  it("nunca entra como LEADER, mesmo que o link seja usado por qualquer pessoa", async () => {
    const inv = store.addInvite();
    await acceptInvite(store, { token: inv.token, user: ana, now: NOW });
    expect(store.memberships.every((m) => m.role === "MEMBER")).toBe(true);
  });

  it("é idempotente: quem já é membro não duplica nada nem gasta o convite", async () => {
    const inv = store.addInvite({ maxUses: 1 });
    await acceptInvite(store, { token: inv.token, user: ana, now: NOW });

    const r = await acceptInvite(store, { token: inv.token, user: ana, now: NOW });

    expect(r.status).toBe("already_member");
    expect(store.memberships).toHaveLength(1);
    expect(store.profiles).toHaveLength(1);
    expect(inv.useCount).toBe(1);
  });

  it("quem já é membro consegue abrir um convite que já esgotou/expirou (só vê que já está dentro)", async () => {
    const inv = store.addInvite({ maxUses: 1 });
    await acceptInvite(store, { token: inv.token, user: ana, now: NOW });
    const depois = new Date("2027-01-01T00:00:00Z");
    inv.expiresAt = new Date("2026-12-01T00:00:00Z");

    const r = await acceptInvite(store, { token: inv.token, user: ana, now: depois });
    expect(r.status).toBe("already_member");
  });

  it("reativa o perfil STANDARD arquivado quando a pessoa volta para a equipe", async () => {
    const antigo = store.addProfile({ kind: "STANDARD", userId: "u-ana", archivedAt: new Date("2026-01-01"), alwaysAvailable: false });
    const inv = store.addInvite();

    const r = await acceptInvite(store, { token: inv.token, user: ana, now: NOW });

    expect(r).toMatchObject({ status: "joined", profileId: antigo.id });
    expect(store.profiles).toHaveLength(1); // não criou um segundo STANDARD
    expect(antigo.archivedAt).toBeNull();
  });
});

// ─────────────────────────── validade do convite ───────────────────────────
describe("validade do convite", () => {
  it("token inexistente", async () => {
    const e = await erroDe(acceptInvite(store, { token: "nao-existe", user: ana, now: NOW }));
    expect(e.code).toBe("INVITE_NOT_FOUND");
  });

  it("revogado", async () => {
    const inv = store.addInvite({ revokedAt: new Date("2026-10-31") });
    const e = await erroDe(acceptInvite(store, { token: inv.token, user: ana, now: NOW }));
    expect(e.code).toBe("INVITE_REVOKED");
    expect(store.memberships).toHaveLength(0);
  });

  it("expirado (inclui exatamente no instante de expirar)", async () => {
    const inv = store.addInvite({ expiresAt: NOW });
    const e = await erroDe(acceptInvite(store, { token: inv.token, user: ana, now: NOW }));
    expect(e.code).toBe("INVITE_EXPIRED");
    expect(store.memberships).toHaveLength(0);
  });

  it("limite de usos atingido", async () => {
    const inv = store.addInvite({ maxUses: 1 });
    await acceptInvite(store, { token: inv.token, user: ana, now: NOW });

    const e = await erroDe(acceptInvite(store, { token: inv.token, user: bruno, now: NOW }));
    expect(e.code).toBe("INVITE_EXHAUSTED");
    expect(store.memberships).toHaveLength(1);
  });

  it("corrida: convite parecia válido na leitura, mas foi consumido por outro request", async () => {
    const inv = store.addInvite({ maxUses: 1 });
    store.forceConsumeFail = true;

    const e = await erroDe(acceptInvite(store, { token: inv.token, user: bruno, now: NOW }));

    expect(e.code).toBe("INVITE_EXHAUSTED");
    expect(store.memberships).toHaveLength(0); // consumir vem ANTES de criar qualquer coisa
    expect(store.profiles).toHaveLength(0);
  });

  it("checkInviteUsable: convite sem limite nem validade é sempre utilizável", () => {
    expect(
      checkInviteUsable({ revokedAt: null, expiresAt: null, maxUses: null, useCount: 999 }, NOW),
    ).toBeNull();
  });
});

// ─────────────────────────── vínculo de perfil offline ───────────────────────────
describe("convite de vínculo (claimProfileId)", () => {
  it("transforma o perfil OFFLINE em STANDARD da conta, preservando id, nome e histórico", async () => {
    const offline = store.addProfile({ displayName: "Vovô José", alwaysAvailable: true });
    const inv = store.addInvite({ claimProfileId: offline.id, maxUses: 1 });

    const r = await acceptInvite(store, { token: inv.token, user: ana, now: NOW });

    expect(r).toMatchObject({ status: "claimed", profileId: offline.id });
    expect(store.profiles).toHaveLength(1); // nenhum perfil novo
    expect(offline).toMatchObject({
      id: offline.id,
      kind: "STANDARD",
      userId: "u-ana",
      displayName: "Vovô José", // nome definido pelo líder é mantido
    });
    expect(store.memberships).toEqual([{ teamId: "t1", userId: "u-ana", role: "MEMBER" }]);
    expect(inv.useCount).toBe(1);
  });

  it("limpa alwaysAvailable ao assumir (o banco só permite true para OFFLINE)", async () => {
    const offline = store.addProfile({ alwaysAvailable: true });
    const inv = store.addInvite({ claimProfileId: offline.id });

    await acceptInvite(store, { token: inv.token, user: ana, now: NOW });

    expect(offline.alwaysAvailable).toBe(false);
  });

  it("claimProfileData: nunca devolve alwaysAvailable=true e só usa a foto do Google se não houver foto", () => {
    const semFoto = claimProfileData({ userId: "u", currentAvatarUrl: null, googleAvatarUrl: "g.png" });
    expect(semFoto).toEqual({ kind: "STANDARD", userId: "u", alwaysAvailable: false, avatarUrl: "g.png" });

    const comFoto = claimProfileData({ userId: "u", currentAvatarUrl: "lider.png", googleAvatarUrl: "g.png" });
    expect(comFoto.avatarUrl).toBe("lider.png");
  });

  it.each([
    ["de outra equipe", { teamId: "t2" }],
    ["que não é OFFLINE (STANDARD)", { kind: "STANDARD" as ProfileKind, userId: "u-x", alwaysAvailable: false }],
    ["que não é OFFLINE (DEPENDENT)", { kind: "DEPENDENT" as ProfileKind, userId: "u-x", alwaysAvailable: false }],
    ["arquivado", { archivedAt: new Date("2026-05-01") }],
  ] as const)("recusa vincular perfil %s", async (_nome, override) => {
    const alvo = store.addProfile(override);
    const inv = store.addInvite({ claimProfileId: alvo.id });
    const antes = { ...alvo };

    const e = await erroDe(acceptInvite(store, { token: inv.token, user: ana, now: NOW }));

    expect(e.code).toBe("CLAIM_PROFILE_UNAVAILABLE");
    expect(alvo).toEqual(antes); // perfil intacto
    expect(store.memberships).toHaveLength(0);
    expect(inv.useCount).toBe(0);
  });

  it("recusa quando o perfil não existe mais", async () => {
    const inv = store.addInvite({ claimProfileId: "fantasma" });
    const e = await erroDe(acceptInvite(store, { token: inv.token, user: ana, now: NOW }));
    expect(e.code).toBe("CLAIM_PROFILE_UNAVAILABLE");
  });

  it("quem já é membro não pode assumir outro perfil (evita mesclar perfis) e nada muda", async () => {
    const jaMembro = store.addInvite();
    await acceptInvite(store, { token: jaMembro.token, user: ana, now: NOW });
    const offline = store.addProfile();
    const inv = store.addInvite({ claimProfileId: offline.id });
    const antes = { ...offline };

    const e = await erroDe(acceptInvite(store, { token: inv.token, user: ana, now: NOW }));

    expect(e.code).toBe("ALREADY_MEMBER_CANNOT_CLAIM");
    expect(offline).toEqual(antes);
    expect(inv.useCount).toBe(0);
  });

  it("convite de vínculo usado por duas pessoas: só a primeira assume o perfil", async () => {
    const offline = store.addProfile();
    const inv = store.addInvite({ claimProfileId: offline.id, maxUses: 1 });

    await acceptInvite(store, { token: inv.token, user: ana, now: NOW });
    const e = await erroDe(acceptInvite(store, { token: inv.token, user: bruno, now: NOW }));

    expect(e.code).toBe("INVITE_EXHAUSTED");
    expect(offline.userId).toBe("u-ana");
  });

  it("perfil assumido por outro no meio da corrida → erro (a transação real desfaz o resto)", async () => {
    const offline = store.addProfile();
    const inv = store.addInvite({ claimProfileId: offline.id });
    store.forceClaimFail = true;

    const e = await erroDe(acceptInvite(store, { token: inv.token, user: ana, now: NOW }));

    expect(e.code).toBe("CLAIM_PROFILE_UNAVAILABLE");
  });
});

// ─────────────────────────── tokens ───────────────────────────
describe("generateInviteToken", () => {
  it("gera tokens url-safe, longos e únicos", () => {
    const tokens = new Set(Array.from({ length: 200 }, generateInviteToken));
    expect(tokens.size).toBe(200);
    for (const t of tokens) {
      expect(t).toMatch(/^[A-Za-z0-9_-]{43}$/); // 32 bytes em base64url
    }
  });

  it("monta o caminho do convite", () => {
    expect(buildInvitePath("abc")).toBe("/convite/abc");
  });
});
