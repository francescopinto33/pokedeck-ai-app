import Link from "next/link";

export default function HomePage() {
  return (
    <section className="space-y-8">
      <div className="rounded-xl border bg-white p-8 shadow-sm">
        <h1 className="text-3xl font-bold text-slate-900">PokeDeck AI</h1>
        <p className="mt-4 max-w-2xl text-slate-700">
          Willkommen zu deiner einfachen Pokemon-TCG-Deck-App. In Version 1
          kannst du Karten anzeigen, Decks erstellen, Decks prüfen, Decks
          speichern und eine einfache Sammlung verwalten.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Link
          href="/cards"
          className="rounded-xl border bg-white p-5 shadow-sm transition hover:bg-slate-50"
        >
          <h2 className="text-lg font-semibold text-slate-900">Karten</h2>
          <p className="mt-2 text-sm text-slate-600">
            Testkarten anzeigen und durchsuchen.
          </p>
        </Link>

        <Link
          href="/decks"
          className="rounded-xl border bg-white p-5 shadow-sm transition hover:bg-slate-50"
        >
          <h2 className="text-lg font-semibold text-slate-900">Decks</h2>
          <p className="mt-2 text-sm text-slate-600">
            Gespeicherte Decks ansehen und verwalten.
          </p>
        </Link>

        <Link
          href="/decks/new"
          className="rounded-xl border bg-white p-5 shadow-sm transition hover:bg-slate-50"
        >
          <h2 className="text-lg font-semibold text-slate-900">Neues Deck</h2>
          <p className="mt-2 text-sm text-slate-600">
            Ein neues Deck erstellen und prüfen.
          </p>
        </Link>

        <Link
          href="/collection"
          className="rounded-xl border bg-white p-5 shadow-sm transition hover:bg-slate-50"
        >
          <h2 className="text-lg font-semibold text-slate-900">Sammlung</h2>
          <p className="mt-2 text-sm text-slate-600">
            Deine Kartenbestände einfach verwalten.
          </p>
        </Link>
      </div>
    </section>
  );
}