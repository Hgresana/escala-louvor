import { describe, expect, it } from "vitest";
import { SEED_ROLES, SEED_TEMPLATES } from "./seed-data";

describe("dados do seed", () => {
  it("tem as 8 funções pedidas, sem nomes repetidos", () => {
    const nomes = SEED_ROLES.map((r) => r.name);
    expect(nomes).toEqual([
      "Sonoplasta",
      "Projetor",
      "Vocal 1 (Violão/Condução)",
      "Vocal 2",
      "Bateria/Cajon",
      "Teclado",
      "Baixo",
      "Guitarra",
    ]);
    expect(new Set(nomes).size).toBe(nomes.length);
  });

  it("tem 2 templates, nomes únicos e exatamente 1 padrão", () => {
    expect(SEED_TEMPLATES).toHaveLength(2);
    expect(new Set(SEED_TEMPLATES.map((t) => t.name)).size).toBe(2);
    expect(SEED_TEMPLATES.filter((t) => t.isDefault)).toHaveLength(1);
  });

  it("todo slot aponta para uma função que existe e não repete a função no mesmo template", () => {
    const nomes = new Set(SEED_ROLES.map((r) => r.name));
    for (const t of SEED_TEMPLATES) {
      const usadas = t.slots.map((s) => s.role);
      for (const r of usadas) expect(nomes.has(r), `${t.name}: função "${r}" inexistente`).toBe(true);
      expect(new Set(usadas).size, `${t.name}: função repetida`).toBe(usadas.length);
    }
  });

  it("a banda completa tem guitarra opcional (exemplo do dia sem guitarra)", () => {
    const completa = SEED_TEMPLATES.find((t) => t.isDefault)!;
    expect(completa.slots.find((s) => s.role === "Guitarra")?.requirement).toBe("OPTIONAL");
  });
});
