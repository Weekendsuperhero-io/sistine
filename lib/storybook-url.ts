/**
 * Get the Storybook URL based on environment
 * In production, uses NEXT_PUBLIC_STORYBOOK_URL env var
 * In development, uses localhost:6006
 */
export function getStorybookUrl(componentName: string): string {
  const baseUrl = process.env.NEXT_PUBLIC_STORYBOOK_URL || 'http://localhost:6006'
  return `${baseUrl}/?path=/docs/glass-ui-${componentName}--docs`
}

