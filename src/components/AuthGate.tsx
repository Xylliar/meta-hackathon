"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { useData } from "./DataProvider";

/** Pages anyone can open; every other page needs an account. */
export const PUBLIC_PATHS = ["/connexion"];

/** Sends visitors who aren't logged in to /connexion, and logged-in users away from it. */
export function AuthGate({ children }: { children: React.ReactNode }) {
  const { status } = useData();
  const pathname = usePathname();
  const router = useRouter();
  const isPublic = PUBLIC_PATHS.includes(pathname);

  useEffect(() => {
    if (status === "anonymous" && !isPublic) router.replace("/connexion");
    if (status === "ready" && isPublic) router.replace("/");
  }, [status, isPublic, router]);

  return <>{children}</>;
}
