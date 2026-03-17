"use client";

import { Toaster as BaseToaster } from "@os-glass/components/ui/sonner";

// import * as React from "react";

/**
 * Glass UI Toaster - Toast notifications with glassmorphism effects
 *
 * The Toaster component automatically uses glass effects for all toast notifications.
 * Toasts will have:
 * - Glass background with backdrop blur
 * - Glass borders and shadows
 * - Color-coded borders for different toast types (success, error, warning, info)
 * - Glass-styled action and cancel buttons
 *
 * @example
 * ```tsx
 * import { Toaster } from "@os-glass/components/ui/glass"
 * import { toast } from "sonner"
 *
 * // Add to your root layout
 * export default function RootLayout({ children }) {
 *   return (
 *     <html>
 *       <body>
 *         {children}
 *         <Toaster />
 *       </body>
 *     </html>
 *   )
 * }
 *
 * // Use in your components
 * toast.success('Success!', { description: 'Action completed' })
 * toast.error('Error!', { description: 'Something went wrong' })
 * toast.warning('Warning!', { description: 'Please review' })
 * toast.info('Info', { description: 'Useful information' })
 *
 * // With custom styling (additional glass variants)
 * toast('Custom Toast', {
 *   description: 'With custom glass effect',
 *   className: 'glass-frosted backdrop-blur-[var(--blur-frosted)]',
 * })
 * ```
 */
export { BaseToaster as Toaster };
