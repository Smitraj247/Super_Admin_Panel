"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";

/**
 * ThemeProvider wrapper for next-themes
 * 
 * Note: The console warning about script tags in Next.js 16 with Turbopack is a known issue
 * with next-themes library. It's harmless and doesn't affect functionality.
 * See: https://github.com/pacocoursey/next-themes/issues/267
 * 
 * The warning occurs because next-themes injects a script to prevent FOUC (Flash of Unstyled Content)
 * but Next.js 16's Turbopack incorrectly flags this during development.
 * This warning does NOT appear in production builds.
 */
export function ThemeProvider({ children, ...props }) {
  return <NextThemesProvider {...props}>{children}</NextThemesProvider>;
}
