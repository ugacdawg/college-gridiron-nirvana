import type { Metadata, Viewport } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { versionInfo } from "@/lib/data";
import { Header, Logo } from "@/components/shell/header";
import { themeInitScript } from "@/components/shell/theme-toggle";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "College Gridiron Nirvana · 2027–2031 Power Four schedule scenario", template: "%s · College Gridiron Nirvana" },
  description:
    "Five seasons. Every team. Every game. Explore a hypothetical, model-generated 2027–2031 Power Four + Notre Dame football schedule: team calendars, weekly boards, rivalries, rotations and audits. Not an official schedule.",
  applicationName: "College Gridiron Nirvana",
  openGraph: {
    title: "College Gridiron Nirvana",
    siteName: "College Gridiron Nirvana",
    description: "Five seasons. Every team. Every game. A hypothetical 2027–2031 Power Four schedule scenario — not an official schedule.",
    type: "website",
  },
  twitter: { card: "summary", title: "College Gridiron Nirvana", description: "Five seasons. Every team. Every game. Hypothetical 2027–2031 schedule scenario." },
  appleWebApp: { title: "Gridiron Nirvana" },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f5f3ee" },
    { media: "(prefers-color-scheme: dark)", color: "#0c0e11" },
  ],
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className="min-h-dvh">
        <a href="#main" className="sr-only z-50 rounded-md bg-ink px-3 py-2 text-bg focus:not-sr-only focus:fixed focus:left-3 focus:top-3">
          Skip to content
        </a>
        <div role="note" aria-label="Scenario disclosure" className="border-b border-accent/25 bg-accent-soft">
          <p className="mx-auto max-w-[1400px] px-4 py-1.5 text-center text-[12px] leading-snug text-ink sm:px-6">
            <strong className="font-semibold">Hypothetical scenario — not an official schedule.</strong>{" "}
            <span className="text-ink-2">
              Model-generated 2027–2031 fixtures; dates are modeled Saturdays with no kickoff times, TV or results.{" "}
              <Link href="/methodology" className="underline underline-offset-2">
                Methodology
              </Link>
            </span>
          </p>
        </div>
        <Suspense fallback={<div className="h-14 border-b border-line" />}>
          <Header />
        </Suspense>
        <main id="main" className="mx-auto w-full max-w-[1400px] px-4 pb-16 pt-6 sm:px-6 sm:pt-8">
          {children}
        </main>
        <footer className="no-print border-t border-line">
          <div className="mx-auto flex max-w-[1400px] flex-col gap-3 px-4 py-6 text-xs text-ink-3 sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <div className="flex items-center gap-2">
              <Logo />
              <span>
                College Gridiron Nirvana · counterfactual 2027–2031 scheduling model {versionInfo.name} · 2,210 modeled fixtures. Not affiliated with the NCAA or any conference.
              </span>
            </div>
            <div className="flex gap-4">
              <Link href="/methodology" className="hover:text-ink">
                Methodology &amp; sources
              </Link>
              <Link href="/methodology#version" className="hover:text-ink">
                Model v{versionInfo.version}
              </Link>
              <Link href="/methodology#validation" className="hover:text-ink">
                Validation report
              </Link>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
