"use client";

import { LogOut, Monitor, Moon, Sparkles, Sun, type LucideIcon } from "lucide-react";
import { useState } from "react";
import { useData } from "@/components/DataProvider";
import { Button, Card, CardTitle, Loaded, PageHeader } from "@/components/ui";
import type { Theme } from "@/lib/theme";

export default function SettingsPage() {
  return <Loaded>{() => <Settings />}</Loaded>;
}

const THEME_OPTIONS: { value: Theme; label: string; hint: string; Icon: LucideIcon; preview: [string, string, string] }[] = [
  { value: "light", label: "Clair", hint: "Fond clair, toujours", Icon: Sun, preview: ["#f0f2f5", "#ffffff", "#050505"] },
  { value: "dark", label: "Sombre", hint: "Fond sombre, toujours", Icon: Moon, preview: ["#18191a", "#242526", "#e4e6eb"] },
  { value: "system", label: "Automatique", hint: "Comme ton appareil", Icon: Monitor, preview: ["linear-gradient(135deg,#f0f2f5 50%,#18191a 50%)", "transparent", "transparent"] },
];

function Settings() {
  const { user, setTheme, logout } = useData();
  const [leaving, setLeaving] = useState(false);
  if (!user) return null;
  const since = new Date(user.createdAt).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-4">
      <PageHeader title="Paramètres" />

      <Card className="flex items-center gap-4">
        <span className="grid h-16 w-16 shrink-0 place-items-center rounded-full bg-accent text-2xl font-bold text-white">
          {user.name.charAt(0).toUpperCase()}
        </span>
        <div className="min-w-0">
          <p className="truncate text-xl font-bold">{user.name}</p>
          <p className="truncate text-[15px] text-muted">{user.email}</p>
          <p className="text-[13px] text-muted">Membre depuis le {since}</p>
        </div>
      </Card>

      <Card>
        <CardTitle>Apparence</CardTitle>
        <p className="-mt-2 mb-3 text-[15px] text-muted">Choisis le thème de Tempo. Il est enregistré sur ton compte.</p>
        <div role="radiogroup" aria-label="Thème" className="grid gap-2 sm:grid-cols-3">
          {THEME_OPTIONS.map(({ value, label, hint, Icon, preview }) => {
            const selected = user.theme === value;
            return (
              <button
                key={value}
                role="radio"
                aria-checked={selected}
                onClick={() => setTheme(value)}
                className={`flex items-center gap-3 rounded-lg border-2 p-3 text-left transition-colors sm:flex-col sm:items-start ${
                  selected ? "border-accent bg-accent-soft" : "border-line hover:bg-sunken"
                }`}
              >
                {/* Tiny preview of the theme: canvas, a card, a line of text. */}
                <span className="relative h-12 w-16 shrink-0 overflow-hidden rounded-md border border-line sm:h-16 sm:w-full" style={{ background: preview[0] }}>
                  {value !== "system" && (
                    <span className="absolute inset-x-2 top-2 bottom-0 rounded-t-md p-1.5" style={{ background: preview[1] }}>
                      <span className="block h-1.5 w-2/3 rounded-full" style={{ background: preview[2], opacity: 0.6 }} />
                      <span className="mt-1 block h-1.5 w-1/3 rounded-full bg-[#0866ff]" />
                    </span>
                  )}
                </span>
                <span className="min-w-0">
                  <span className={`flex items-center gap-1.5 font-semibold ${selected ? "text-accent-text" : ""}`}>
                    <Icon size={16} /> {label}
                  </span>
                  <span className="block text-[13px] text-muted">{hint}</span>
                </span>
              </button>
            );
          })}
        </div>
      </Card>

      <Card>
        <CardTitle>Compte</CardTitle>
        <Button
          variant="secondary"
          className="w-full sm:w-auto"
          disabled={leaving}
          onClick={async () => {
            setLeaving(true);
            await logout();
          }}
        >
          <LogOut size={18} /> {leaving ? "Déconnexion…" : "Se déconnecter"}
        </Button>
      </Card>

      <p className="flex items-center justify-center gap-1.5 pt-2 text-[13px] font-semibold text-muted">
        <Sparkles size={14} className="text-[#8b5cf6]" /> Tempo · Powered by <span className="ai-text">Muse</span>
      </p>
    </div>
  );
}
