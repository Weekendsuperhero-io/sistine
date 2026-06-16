/**
 * Get the Storybook URL based on environment
 * In production, uses NEXT_PUBLIC_STORYBOOK_URL env var
 * In development, uses localhost:6006
 */
export function getStorybookUrl(componentName: string): string {
  const baseUrl = process.env.NEXT_PUBLIC_STORYBOOK_URL || "https://weekendsuperhero.io/storybook";
  // Convert component name to lowercase and remove hyphens for Storybook URL format
  // Storybook converts "Sistine/AlertDialog" to "sistine-alertdialog"
  // Component names from registry are kebab-case (e.g., "alert-dialog")
  // But Storybook URLs use lowercase without hyphens (e.g., "alertdialog")
  const storybookComponentName = componentName.toLowerCase().replace(/-/g, "");
  return `${baseUrl}/?path=/docs/sistine-${storybookComponentName}--docs`;
}
