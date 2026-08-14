import { createContext, useContext } from "react";
import { Link } from "@tanstack/react-router";

export type AdminBase = "/admin" | "/admindev";

const Ctx = createContext<AdminBase>("/admin");

export const AdminBaseProvider = Ctx.Provider;

/** Base path of the admin panel currently rendered ("/admin" or "/admindev"). */
export function useAdminBase(): AdminBase {
  return useContext(Ctx);
}

/** True when rendering inside the hidden developer panel (/admindev). */
export function useDevPanel(): boolean {
  return useContext(Ctx) === "/admindev";
}

type AdminLinkProps = {
  /** Path suffix after the admin base, e.g. "" or "/players/$id". */
  to: string;
  params?: Record<string, string>;
  className?: string;
  children?: React.ReactNode;
};

/** Link that stays inside the current admin panel (/admin or /admindev). */
export function AdminLink({ to, ...rest }: AdminLinkProps) {
  const base = useAdminBase();
  const Any = Link as unknown as React.ComponentType<Record<string, unknown>>;
  return <Any {...(rest as Record<string, unknown>)} to={`${base}${to}` as string} />;
}
