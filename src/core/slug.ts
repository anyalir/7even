/**
 * Generate a kebab-case slug from a description string.
 * - Lowercase
 * - Replace non-alphanumeric with hyphens
 * - Collapse consecutive hyphens
 * - Trim leading/trailing hyphens
 * - Max 60 characters
 */
export function generateSlug(description: string): string {
  return description
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60)
    .replace(/-$/, "");
}
