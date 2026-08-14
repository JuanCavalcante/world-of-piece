import { useEffect, useState } from "react";

const KEY = "wop-dev-admin";
export const DEV_ADMIN_PASSWORD = "admindev20633";

export function isDevAdmin(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.sessionStorage.getItem(KEY) === "1";
  } catch {
    return false;
  }
}

export function setDevAdmin(on: boolean) {
  if (typeof window === "undefined") return;
  try {
    if (on) window.sessionStorage.setItem(KEY, "1");
    else window.sessionStorage.removeItem(KEY);
    window.dispatchEvent(new Event("wop-dev-admin-change"));
  } catch {
    /* ignore */
  }
}

/** Reativo ao desbloqueio feito em /admindev (mesma aba). */
export function useDevAdmin(): boolean {
  const [on, setOn] = useState(false);
  useEffect(() => {
    const sync = () => setOn(isDevAdmin());
    sync();
    window.addEventListener("wop-dev-admin-change", sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener("wop-dev-admin-change", sync);
      window.removeEventListener("storage", sync);
    };
  }, []);
  return on;
}
