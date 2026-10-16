import { describe, expect, it } from "vitest";
import {
  PermissionError,
  assertLeader,
  canCastVoteFor,
  canLeaveOrDemote,
  canManageProfile,
  canViewDraftSchedule,
  teamScope,
  type ProfileRef,
  type TeamActor,
} from "./permissions";

const lider: TeamActor = { userId: "u-lider", teamId: "t1", role: "LEADER" };
const membro: TeamActor = { userId: "u-ana", teamId: "t1", role: "MEMBER" };

const perfil = (o: Partial<ProfileRef> = {}): ProfileRef => ({
  teamId: "t1",
  kind: "STANDARD",
  userId: "u-ana",
  archivedAt: null,
  ...o,
});

describe("canManageProfile", () => {
  it("membro gerencia o próprio perfil e os dependentes que controla", () => {
    expect(canManageProfile(membro, perfil())).toBe(true);
    expect(canManageProfile(membro, perfil({ kind: "DEPENDENT" }))).toBe(true);
  });

  it("membro NÃO gerencia perfil de outra conta nem perfil offline", () => {
    expect(canManageProfile(membro, perfil({ userId: "u-bruno" }))).toBe(false);
    expect(canManageProfile(membro, perfil({ kind: "OFFLINE", userId: null }))).toBe(false);
  });

  it("líder gerencia qualquer perfil da própria equipe", () => {
    expect(canManageProfile(lider, perfil({ userId: "u-bruno" }))).toBe(true);
    expect(canManageProfile(lider, perfil({ kind: "OFFLINE", userId: null }))).toBe(true);
    expect(canManageProfile(lider, perfil({ kind: "DEPENDENT", userId: "u-bruno" }))).toBe(true);
  });

  it("ninguém, nem líder, atravessa equipes", () => {
    const outraEquipe = perfil({ teamId: "t2" });
    expect(canManageProfile(lider, outraEquipe)).toBe(false);
    expect(canManageProfile(membro, outraEquipe)).toBe(false);
  });
});

describe("canCastVoteFor", () => {
  it("titular vota por si e pelos dependentes", () => {
    expect(canCastVoteFor(membro, perfil())).toBe(true);
    expect(canCastVoteFor(membro, perfil({ kind: "DEPENDENT" }))).toBe(true);
  });

  it("líder vota por membro offline, mas não por membros com login", () => {
    const offline = perfil({ kind: "OFFLINE", userId: null });
    expect(canCastVoteFor(lider, offline)).toBe(true);
    expect(canCastVoteFor(lider, perfil({ userId: "u-bruno" }))).toBe(false);
    expect(canCastVoteFor(lider, perfil({ kind: "DEPENDENT", userId: "u-bruno" }))).toBe(false);
  });

  it("membro comum não vota por perfil offline", () => {
    expect(canCastVoteFor(membro, perfil({ kind: "OFFLINE", userId: null }))).toBe(false);
  });

  it("não vota por perfil arquivado nem de outra equipe", () => {
    expect(canCastVoteFor(membro, perfil({ archivedAt: new Date() }))).toBe(false);
    expect(canCastVoteFor(lider, perfil({ kind: "OFFLINE", userId: null, archivedAt: new Date() }))).toBe(false);
    expect(canCastVoteFor(lider, perfil({ kind: "OFFLINE", userId: null, teamId: "t2" }))).toBe(false);
    expect(canCastVoteFor(membro, perfil({ teamId: "t2" }))).toBe(false);
  });
});

describe("papéis de líder", () => {
  it("assertLeader lança PermissionError para membro e passa para líder", () => {
    expect(() => assertLeader(membro)).toThrow(PermissionError);
    expect(() => assertLeader(lider)).not.toThrow();
  });

  it("só líder vê rascunho de escala", () => {
    expect(canViewDraftSchedule(lider)).toBe(true);
    expect(canViewDraftSchedule(membro)).toBe(false);
  });

  it("o último líder não pode sair nem ser rebaixado", () => {
    expect(canLeaveOrDemote({ role: "LEADER" }, 1)).toBe(false);
    expect(canLeaveOrDemote({ role: "LEADER" }, 2)).toBe(true);
    expect(canLeaveOrDemote({ role: "MEMBER" }, 1)).toBe(true);
  });
});

describe("teamScope", () => {
  it("injeta o teamId do ator", () => {
    expect(teamScope(membro)).toEqual({ teamId: "t1" });
  });
});
