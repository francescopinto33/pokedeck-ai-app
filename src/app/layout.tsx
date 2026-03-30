import type { Metadata } from "next";
import "./globals.css";
import MainNav from "@/components/MainNav";

export const metadata: Metadata = {
  title: "PokeDeck AI",
  description: "Einfache Pokemon-TCG-Deck-App fuer Version 1.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="de">
      <body className="min-h-screen bg-slate-50 text-slate-900">
        <MainNav />
        <main className="mx-auto max-w-5xl px-4 py-6">{children}</main>
      </body>
    </html>
  );
}