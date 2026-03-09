/**
 * Safe localStorage wrapper that never throws.
 *
 * iOS Safari throws "The operation is insecure" (SecurityError) when
 * localStorage is accessed in private browsing mode, restricted WebViews,
 * or when cookies/storage are disabled. This wrapper catches all errors
 * and falls back to an in-memory store so the app remains functional.
 */
export declare const storage: {
    getItem(key: string): string | null;
    setItem(key: string, value: string): void;
    removeItem(key: string): void;
};
//# sourceMappingURL=storage.d.ts.map