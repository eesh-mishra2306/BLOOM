import { useSyncExternalStore } from "react";

const noSubscribe = () => () => {};

/**
 * Reads a browser-only value (user agent, feature support) without a hydration mismatch:
 * the server render and first client render use `server`, then React switches to the real value.
 * `client` must return a primitive or a stable reference.
 */
export function useClientValue<T>(client: () => T, server: T): T {
  return useSyncExternalStore(noSubscribe, client, () => server);
}
