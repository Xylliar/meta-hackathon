import type { Metadata, Viewport } from "next";
import { AuthGate } from "@/components/AuthGate";
import { DataProvider } from "@/components/DataProvider";
import { Nav } from "@/components/Nav";
import { THEME_SCRIPT } from "@/lib/theme";
import "./globals.css";

export const metadata: Metadata = {
  title: "Tempo — révisions en 15 min par jour",
  description: "Scanne tes cours, ajoute tes examens : Tempo prépare ton cours, tes flashcards et un planning de révision quotidien.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#242526" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    // The inline script sets data-theme before React hydrates, hence suppressHydrationWarning.
    <html lang="fr" data-theme="light" className="h-full antialiased" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body className="min-h-full">
        <DataProvider>
          <AuthGate>
            <Nav />
            <main className="mx-auto w-full max-w-6xl px-3 pt-4 pb-[calc(5rem+env(safe-area-inset-bottom))] sm:px-4 sm:pt-6 md:pb-10">{children}</main>
          </AuthGate>
        </DataProvider>
      </body>
    </html>
  );
}
