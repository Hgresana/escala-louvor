/**
 * Aceita apenas caminhos internos ("/convite/abc"). Bloqueia open-redirect:
 * "//evil.com", "https://evil.com", "/\evil.com", etc. Qualquer coisa suspeita vira o fallback.
 */
export function safeNextPath(next: string | null | undefined, fallback = "/"): string {
  if (!next) return fallback;
  if (!next.startsWith("/")) return fallback;
  if (next.startsWith("//") || next.startsWith("/\\")) return fallback;
  if (/[\r\n\\]/.test(next)) return fallback;
  return next;
}
