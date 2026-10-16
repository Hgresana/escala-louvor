/** Dados iniciais do seed — módulo puro (sem Prisma) para poder ser testado. */

export interface SeedRole {
  name: string;
  icon: string; // nome de ícone lucide-react
  color: string;
}

export interface SeedTemplate {
  name: string;
  isDefault: boolean;
  slots: { role: string; requirement: "REQUIRED" | "OPTIONAL" }[];
}

export const SEED_TEAM = { name: "Louvor (Demo)", slug: "louvor-demo" } as const;

/** A ordem do array vira `sortOrder` (e a ordem das vagas no culto). */
export const SEED_ROLES: SeedRole[] = [
  { name: "Sonoplasta", icon: "sliders-horizontal", color: "#64748b" },
  { name: "Projetor", icon: "presentation", color: "#0ea5e9" },
  { name: "Vocal 1 (Violão/Condução)", icon: "mic", color: "#e11d48" },
  { name: "Vocal 2", icon: "mic-vocal", color: "#f43f5e" },
  { name: "Bateria/Cajon", icon: "drum", color: "#f59e0b" },
  { name: "Teclado", icon: "piano", color: "#8b5cf6" },
  { name: "Baixo", icon: "guitar", color: "#10b981" },
  { name: "Guitarra", icon: "guitar", color: "#ef4444" },
];

export const SEED_TEMPLATES: SeedTemplate[] = [
  {
    name: "Banda Completa",
    isDefault: true,
    slots: [
      { role: "Sonoplasta", requirement: "REQUIRED" },
      { role: "Projetor", requirement: "REQUIRED" },
      { role: "Vocal 1 (Violão/Condução)", requirement: "REQUIRED" },
      { role: "Vocal 2", requirement: "REQUIRED" },
      { role: "Bateria/Cajon", requirement: "REQUIRED" },
      { role: "Teclado", requirement: "REQUIRED" },
      { role: "Baixo", requirement: "REQUIRED" },
      { role: "Guitarra", requirement: "OPTIONAL" }, // nem todo culto tem guitarra
    ],
  },
  {
    name: "Banda Reduzida",
    isDefault: false,
    slots: [
      { role: "Sonoplasta", requirement: "REQUIRED" },
      { role: "Projetor", requirement: "REQUIRED" },
      { role: "Vocal 1 (Violão/Condução)", requirement: "REQUIRED" },
      { role: "Vocal 2", requirement: "OPTIONAL" },
      { role: "Teclado", requirement: "REQUIRED" },
      { role: "Bateria/Cajon", requirement: "OPTIONAL" },
    ],
  },
];
