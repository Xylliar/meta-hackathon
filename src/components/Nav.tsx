"use client";

import { BookOpen, CalendarDays, House, LogOut, Settings, Sparkles, Timer, X, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { PUBLIC_PATHS } from "./AuthGate";
import { useData } from "./DataProvider";
import { formatShort, parseISODate } from "@/lib/date";

export const NAV_LINKS: { href: string; label: string; Icon: LucideIcon; color: string }[] = [
  { href: "/", label: "Accueil", Icon: House, color: "#0866ff" },
  { href: "/cours", label: "Cours", Icon: BookOpen, color: "#31a24c" },
  { href: "/planning", label: "Planning", Icon: CalendarDays, color: "#f02849" },
];

export function NavIcon({ Icon, active, size = 24 }: { Icon: LucideIcon; active: boolean; size?: number }) {
  return <Icon size={size} strokeWidth={active ? 2.3 : 2} fill={active ? "currentColor" : "none"} fillOpacity={active ? 0.15 : 0} />;
}

export function Logo() {
  return (
    <Link href="/" className="flex shrink-0 items-center gap-2" aria-label="Tempo, accueil">
      <span className="grid h-10 w-10 place-items-center rounded-full bg-accent text-white">
        <Timer size={22} strokeWidth={2.4} />
      </span>
      <span className="text-xl font-bold tracking-tight text-accent sm:text-[22px]">Tempo</span>
    </Link>
  );
}

function UserAvatar({ name, size }: { name: string; size: number }) {
  return (
    <span className="grid shrink-0 place-items-center rounded-full bg-accent font-bold text-white" style={{ width: size, height: size, fontSize: size * 0.42 }}>
      {name.charAt(0).toUpperCase()}
    </span>
  );
}

function AccountMenu() {
  const { user, logout } = useData();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  if (!user) return null;
  const item = "flex w-full items-center gap-3 rounded-lg p-2 text-left text-[15px] font-semibold hover:bg-sunken";
  return (
    <div ref={ref} className="relative hidden md:block">
      <button onClick={() => setOpen(!open)} aria-label="Ton compte" aria-expanded={open} aria-haspopup="menu" className="rounded-full hover:opacity-90">
        <UserAvatar name={user.name} size={40} />
      </button>
      {open && (
        <div role="menu" className="absolute top-12 right-0 w-80 rounded-lg bg-surface p-2 whitespace-normal shadow-pop">
          <Link href="/parametres" onClick={() => setOpen(false)} className="flex items-center gap-3 rounded-lg p-2 shadow-card hover:bg-sunken">
            <UserAvatar name={user.name} size={40} />
            <span className="min-w-0">
              <span className="block truncate text-[15px] font-semibold">{user.name}</span>
              <span className="block truncate text-[13px] font-normal text-muted">{user.email}</span>
            </span>
          </Link>
          <hr className="my-2 border-line" />
          <Link href="/parametres" role="menuitem" onClick={() => setOpen(false)} className={item}>
            <span className="grid h-9 w-9 place-items-center rounded-full bg-pressed">
              <Settings size={20} />
            </span>
            Paramètres
          </Link>
          <button role="menuitem" onClick={() => logout()} className={item}>
            <span className="grid h-9 w-9 place-items-center rounded-full bg-pressed">
              <LogOut size={20} />
            </span>
            Se déconnecter
          </button>
        </div>
      )}
    </div>
  );
}

export function Nav() {
  const pathname = usePathname();
  const { provider, dayOffset, setDayOffset, today, status, user } = useData();
  const isActive = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));
  if (PUBLIC_PATHS.includes(pathname) || status === "anonymous") return null;

  return (
    <>
      <header className="sticky top-0 z-30 bg-surface shadow-card">
        <div className="mx-auto flex h-14 max-w-6xl items-center px-3 sm:px-4">
          <div className="flex flex-1 items-center">
            <Logo />
          </div>

          <nav className="hidden h-full items-stretch md:flex" aria-label="Navigation principale">
            {NAV_LINKS.map(({ href, label, Icon }) => {
              const active = isActive(href);
              return (
                <Link
                  key={href}
                  href={href}
                  title={label}
                  aria-label={label}
                  aria-current={active ? "page" : undefined}
                  className={`relative flex w-24 items-center justify-center px-1 lg:w-28 ${active ? "text-accent" : "text-muted"}`}
                >
                  <span className={`flex h-12 w-full items-center justify-center rounded-lg ${active ? "" : "hover:bg-sunken"}`}>
                    <NavIcon Icon={Icon} active={active} size={26} />
                  </span>
                  {active && <span className="absolute inset-x-1 bottom-0 h-[3px] rounded-t-full bg-accent" />}
                </Link>
              );
            })}
          </nav>

          <div className="flex flex-1 items-center justify-end gap-1.5 text-xs whitespace-nowrap sm:gap-2">
            {dayOffset !== 0 && today && (
              <button
                onClick={() => setDayOffset(0)}
                className="flex items-center gap-1 rounded-full bg-pressed px-2.5 py-1.5 font-semibold text-ink hover:bg-pressed-hover sm:px-3"
                title="Revenir à la vraie date"
              >
                <span className="sm:hidden">{parseISODate(today).toLocaleDateString("fr-FR", { day: "numeric", month: "numeric" })}</span>
                <span className="hidden sm:inline">Jour simulé : {formatShort(today)}</span>
                <X size={14} />
              </button>
            )}
            {provider === "muse" && (
              <span className="flex items-center gap-1.5 rounded-full bg-sunken px-2.5 py-1.5 font-semibold sm:px-3" title="Cours, flashcards et quiz générés par Muse Spark, le modèle de Meta">
                <Sparkles size={14} className="text-[#8b5cf6]" />
                <span className="font-medium text-muted">Powered by</span>
                <span className="-ml-0.5 ai-text">Muse</span>
              </span>
            )}
            {provider === "mock" && (
              <span className="rounded-full bg-amber-100 px-3 py-1.5 font-semibold text-amber-800" title="Les contenus sont des exemples tant que la clé Muse n'est pas branchée">
                IA : démo
              </span>
            )}
            <AccountMenu />
          </div>
        </div>
      </header>

      <nav
        className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden"
        aria-label="Navigation principale"
      >
        <div className="grid grid-cols-4">
          {NAV_LINKS.map(({ href, label, Icon }) => {
            const active = isActive(href);
            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? "page" : undefined}
                className={`relative flex flex-col items-center gap-0.5 pt-2 pb-1.5 text-[11px] font-semibold ${active ? "text-accent" : "text-muted"}`}
              >
                {active && <span className="absolute inset-x-6 top-0 h-[3px] rounded-b-full bg-accent" />}
                <NavIcon Icon={Icon} active={active} />
                {label}
              </Link>
            );
          })}
          <Link
            href="/parametres"
            aria-current={isActive("/parametres") ? "page" : undefined}
            className={`relative flex flex-col items-center gap-0.5 pt-2 pb-1.5 text-[11px] font-semibold ${isActive("/parametres") ? "text-accent" : "text-muted"}`}
          >
            {isActive("/parametres") && <span className="absolute inset-x-6 top-0 h-[3px] rounded-b-full bg-accent" />}
            <span className={`rounded-full ${isActive("/parametres") ? "ring-2 ring-accent ring-offset-1 ring-offset-surface" : ""}`}>
              <UserAvatar name={user?.name ?? "?"} size={24} />
            </span>
            Menu
          </Link>
        </div>
      </nav>
    </>
  );
}
