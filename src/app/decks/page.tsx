"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { sampleCards } from "@/data/sampleCards";
import { deleteDeck, getSavedDecks } from "@/lib/storage";
import { validateDeck } from "@/lib/validateDeck";
import type { Deck } from "@/types";

export default function DecksPage() {
  const [decks, setDecks] = useState<Deck[]>([]);

  useEffect(() => {
    setDecks(getSavedDecks());
  }, []);

  function handleDeleteDeck(id: string) {
    const updatedDecks = deleteDeck(id);
    setDecks(updatedDecks);
  }

  return (
    <section className="space-y-6">
      <div className="rounded-xl border bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-bold text-slate-900">Decks</h1>
        <p className="mt-2 text-slate-600">
          Hier siehst du alle gespeicherten Decks.
        </p>
      </div>

      {decks.length === 0 ? (
        <div className="rounded-xl border bg-white p-6 shadow-sm">
          <p className="text-slate-700">Noch keine Decks gespeichert.</p>
          <Link
            href="/decks/new"
            className="mt-4 inline-block rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
          >
            Neues Deck erstellen
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {decks.map((deck) => {
            const validation = validateDeck(deck, sampleCards);

            return (
              <article
                key={deck.id}
                className="rounded-xl border bg-white p-6 shadow-sm"
              >
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <h2 className="text-lg font-semibold text-slate-900">
                      {deck.name}
                    </h2>
                    <p className="mt-1 text-sm text-slate-600">
                      Karten insgesamt: {validation.totalCards}
                    </p>
                    <p
                      className={
                        validation.isValid
                          ? "mt-2 text-sm font-medium text-green-700"
                          : "mt-2 text-sm font-medium text-red-700"
                      }
                    >
                      {validation.isValid ? "Gültig" : "Ungültig"}
                    </p>

                    {!validation.isValid && validation.errors.length > 0 ? (
                      <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-red-700">
                        {validation.errors.map((error) => (
                          <li key={error}>{error}</li>
                        ))}
                      </ul>
                    ) : null}
                  </div>

                  <div className="flex gap-2">
                    <Link
                      href={`/decks/new?id=${deck.id}`}
                      className="rounded border px-4 py-2 text-sm hover:bg-slate-100"
                    >
                      Bearbeiten
                    </Link>

                    <button
                      type="button"
                      onClick={() => handleDeleteDeck(deck.id)}
                      className="rounded border px-4 py-2 text-sm text-red-700 hover:bg-red-50"
                    >
                      Löschen
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}