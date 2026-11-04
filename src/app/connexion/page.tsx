"use client";

import { CalendarDays, Camera, Eye, EyeOff, Layers, Sparkles, Timer } from "lucide-react";
import { useState, type InputHTMLAttributes } from "react";
import { postJson, useData } from "@/components/DataProvider";
import { IconBubble, Spinner } from "@/components/ui";
import { MIN_PASSWORD_LENGTH } from "@/lib/accounts";

export default function LoginPage() {
  const { status } = useData();
  // Logged in: AuthGate is already sending the user to the home page.
  if (status !== "anonymous") {
    return (
      <div className="grid place-items-center py-24">
        <Spinner />
      </div>
    );
  }
  return <Login />;
}

const FEATURES = [
  { Icon: Camera, color: "#31a24c", text: "Prends tes cours en photo : Muse en fait un cours clair." },
  { Icon: Layers, color: "#0866ff", text: "Des flashcards et un quiz, jusqu'à ce que ça rentre." },
  { Icon: CalendarDays, color: "#f02849", text: "15 minutes par jour, planifiées jusqu'à l'examen." },
];

function Login() {
  const { reload } = useData();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const signup = mode === "signup";

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await postJson(signup ? "/api/auth/signup" : "/api/auth/login", signup ? { name, email, password } : { email, password });
      await reload();
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  }

  const switchTo = (next: typeof mode) => {
    setMode(next);
    setError(null);
  };

  return (
    <div className="mx-auto grid max-w-5xl items-center gap-8 py-4 md:min-h-[calc(100dvh-6rem)] md:grid-cols-[1.15fr_1fr] md:gap-14 md:py-10">
      <div className="text-center md:text-left">
        <div className="flex items-center justify-center gap-3 md:justify-start">
          <span className="grid h-14 w-14 place-items-center rounded-full bg-accent text-white md:h-16 md:w-16">
            <Timer size={32} strokeWidth={2.4} />
          </span>
          <span className="text-5xl font-bold tracking-tight text-accent md:text-6xl">Tempo</span>
        </div>
        <p className="mt-4 text-xl leading-snug md:text-[28px] md:leading-9">Révise 15 minutes par jour et arrive à tes examens préparé.</p>
        <ul className="mt-6 hidden flex-col gap-3 md:flex">
          {FEATURES.map((f) => (
            <li key={f.text} className="flex items-center gap-3 text-[17px]">
              <IconBubble Icon={f.Icon} color={f.color} size={40} />
              {f.text}
            </li>
          ))}
        </ul>
        <p className="mt-6 hidden items-center gap-1.5 text-sm font-semibold text-muted md:flex">
          <Sparkles size={15} className="text-[#8b5cf6]" /> Powered by <span className="ai-text">Muse</span>
        </p>
      </div>

      <div className="mx-auto w-full max-w-[400px]">
        <form onSubmit={submit} className="flex flex-col gap-3 rounded-lg bg-surface p-4 shadow-pop">
          {signup && (
            <div className="mb-1 border-b border-line pb-3">
              <h1 className="text-[28px] leading-8 font-bold">Créer un compte</h1>
              <p className="text-[15px] text-muted">C&apos;est rapide et gratuit.</p>
            </div>
          )}
          {signup && <BigInput placeholder="Prénom" autoComplete="given-name" value={name} onChange={(e) => setName(e.target.value)} required maxLength={50} />}
          <BigInput type="email" placeholder="Adresse e-mail" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          <PasswordInput
            placeholder={signup ? `Mot de passe (${MIN_PASSWORD_LENGTH} caractères minimum)` : "Mot de passe"}
            autoComplete={signup ? "new-password" : "current-password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            minLength={signup ? MIN_PASSWORD_LENGTH : undefined}
            required
          />
          {error && (
            <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </p>
          )}

          {signup ? (
            <>
              <button
                type="submit"
                disabled={busy}
                className="mx-auto mt-1 h-11 w-full rounded-md bg-[#00a400] text-lg font-bold text-white hover:bg-[#008f00] disabled:opacity-60 sm:w-56"
              >
                {busy ? "Création…" : "S'inscrire"}
              </button>
              <button type="button" onClick={() => switchTo("login")} className="mt-1 text-[15px] font-medium text-accent-text hover:underline">
                Tu as déjà un compte ?
              </button>
            </>
          ) : (
            <>
              <button type="submit" disabled={busy} className="h-12 rounded-md bg-accent text-xl font-bold text-white hover:bg-accent-strong disabled:opacity-60">
                {busy ? "Connexion…" : "Se connecter"}
              </button>
              <hr className="my-2 border-line" />
              <button
                type="button"
                onClick={() => switchTo("signup")}
                className="mx-auto h-12 rounded-md bg-[#42b72a] px-4 text-[17px] font-bold text-white hover:bg-[#36a420]"
              >
                Créer un compte
              </button>
            </>
          )}
        </form>
        <p className="mt-6 text-center text-sm text-muted">Tes cours et ta progression restent liés à ton compte.</p>
      </div>
    </div>
  );
}

const bigInputClass =
  "h-[52px] w-full rounded-md border border-input bg-surface px-4 text-[17px] text-ink outline-none placeholder:text-placeholder focus:border-accent focus:ring-2 focus:ring-accent/20";

function BigInput(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={bigInputClass} {...props} />;
}

function PasswordInput(props: InputHTMLAttributes<HTMLInputElement>) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="relative">
      <input className={`${bigInputClass} pr-12`} type={visible ? "text" : "password"} {...props} />
      <button
        type="button"
        onClick={() => setVisible(!visible)}
        aria-label={visible ? "Masquer le mot de passe" : "Afficher le mot de passe"}
        className="absolute top-1/2 right-2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-full text-muted hover:bg-sunken"
      >
        {visible ? <EyeOff size={20} /> : <Eye size={20} />}
      </button>
    </div>
  );
}
