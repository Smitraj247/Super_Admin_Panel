import dynamic from "next/dynamic";

/**
 * Helper for dynamically importing components to improve Core Web Vitals
 * Usage: const MyComponent = dynamicImport(() => import('./MyComponent'))
 */
export const dynamicImport = (importFunc, options = {}) => {
  return dynamic(importFunc, {
    loading: () => <div>Loading...</div>,
    ssr: true,
    ...options,
  });
};

/**
 * Lazy load components that are not critical for initial page load
 * This helps reduce the JavaScript bundle size and improve FCP/LCP
 */
export const lazyLoadComponent = (importFunc, fallback = null) => {
  return dynamic(importFunc, {
    loading: () => fallback || <div className="p-4">Loading...</div>,
    ssr: false,
  });
};
