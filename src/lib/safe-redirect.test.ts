import { describe, expect, it } from "vitest";
import { safeNextPath } from "./safe-redirect";

describe("safeNextPath", () => {
  it("aceita caminhos internos", () => {
    expect(safeNextPath("/convite/abc")).toBe("/convite/abc");
    expect(safeNextPath("/t/louvor?x=1")).toBe("/t/louvor?x=1");
  });

  it.each([
    "https://evil.com",
    "//evil.com",
    "/\\evil.com",
    "javascript:alert(1)",
    "evil.com",
    "/ok\r\nSet-Cookie: a=b",
  ])("bloqueia %s", (valor) => {
    expect(safeNextPath(valor, "/inicio")).toBe("/inicio");
  });

  it("usa o fallback quando vazio", () => {
    expect(safeNextPath(null)).toBe("/");
    expect(safeNextPath(undefined, "/x")).toBe("/x");
  });
});
