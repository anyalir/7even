/**
 * Format a display label with optional shortId prefix.
 * e.g. "O1KR2T3 — Design the thing" or just "Design the thing" if no shortId.
 */
export function label(shortId: unknown, name: string): string {
  if (shortId && typeof shortId === "string") {
    return `${shortId} — ${name}`;
  }
  return name;
}

/** Return shortId or empty string */
export function sid(item: Record<string, unknown>): string {
  return (item.shortId as string) || "";
}

/** Return summary if available, otherwise name (description). For compact views. */
export function compact(item: Record<string, unknown>): string {
  return (item.summary as string) || (item.name as string) || (item.description as string) || "";
}
