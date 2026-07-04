import { useSyncExternalStore } from "react";

/*
 * Reactive connectivity flag via useSyncExternalStore — the React-endorsed way
 * to read an external value (navigator.onLine) without a setState-in-effect.
 * SSR/first paint assumes online so the markup matches the server render.
 */
function subscribe(cb: () => void): () => void {
  window.addEventListener("online", cb);
  window.addEventListener("offline", cb);
  return () => {
    window.removeEventListener("online", cb);
    window.removeEventListener("offline", cb);
  };
}

export function useOnline(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => navigator.onLine,
    () => true,
  );
}
