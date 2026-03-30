import Link from "next/link";

export default function MainNav() {
  return (
    <nav className="border-b bg-white">
      <div className="mx-auto flex max-w-5xl flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Link href="/" className="text-lg font-bold text-slate-900">
            PokeDeck AI
          </Link>
        </div>

        <div className="flex flex-wrap gap-2">
          <Link
            href="/"
            className="rounded border px-3 py-2 text-sm text-slate-700 hover:bg-slate-100"
          >
            Start
          </Link>
          <Link
            href="/cards"
            className="rounded border px-3 py-2 text-sm text-slate-700 hover:bg-slate-100"
          >
            Karten
          </Link>
          <Link
            href="/decks"
            className="rounded border px-3 py-2 text-sm text-slate-700 hover:bg-slate-100"
          >
            Decks
          </Link>
          <Link
            href="/decks/new"
            className="rounded border px-3 py-2 text-sm text-slate-700 hover:bg-slate-100"
          >
            Neues Deck
          </Link>
          <Link
            href="/collection"
            className="rounded border px-3 py-2 text-sm text-slate-700 hover:bg-slate-100"
          >
            Sammlung
          </Link>
        </div>
      </div>
    </nav>
  );
}