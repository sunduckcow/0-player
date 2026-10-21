import { useSyncExternalStore } from "react";

export const compact =
  typeof matchMedia === "function"
    ? matchMedia(
        "(max-width:760px), (pointer:coarse), (max-width:1000px) and (max-height:560px)",
      )
    : null;
export const motion =
  typeof matchMedia === "function"
    ? matchMedia("(prefers-reduced-motion: reduce)")
    : null;
export const dark =
  typeof matchMedia === "function"
    ? matchMedia("(prefers-color-scheme: dark)")
    : null;
function subscribe(media: MediaQueryList | null, changed: () => void) {
  media?.addEventListener("change", changed);
  return () => media?.removeEventListener("change", changed);
}
export const subscribeCompact = (changed: () => void) =>
  subscribe(compact, changed);
export const subscribeMotion = (changed: () => void) =>
  subscribe(motion, changed);
export const subscribeDark = (changed: () => void) => subscribe(dark, changed);

function useMediaMatch(
  media: MediaQueryList | null,
  subscribe: (changed: () => void) => () => void,
) {
  return useSyncExternalStore(
    subscribe,
    () => media?.matches ?? false,
    () => false,
  );
}

export function useSettingsMedia() {
  return {
    narrow: useMediaMatch(compact, subscribeCompact),
    reducedMotion: useMediaMatch(motion, subscribeMotion),
    systemDark: useMediaMatch(dark, subscribeDark),
  };
}
