"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { sampleCards } from "@/data/sampleCards";
import { getCollection, deleteDeck, getSavedDecks } from "@/lib/storage";
import { validateDeck } from "@/lib/validateDeck";
import { compareDeckToCollection } from "@/lib/compareDeckToCollection";
import type { CollectionEntry, Deck } from "@/types";

export default function DecksPage() {
  const [decks, setDecks] = useState<Deck[]>([]);
  const [collection, setCollection] = useState<CollectionEntry[]>([]);

  useEffect(() => {
    setDecks(getSavedDecks());
    setCollection(getCollection());
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
            const comparison = compareDeckToCollection(
              deck,
              collection,
              sampleCards
            );
            const missingItems = comparison.items.filter((item) => item.missing > 0);
            const buildabilityStatus =
            comparison.totalMissingCards === 0
              ? "vollstaendig"
              : comparison.totalMissingCards < validation.totalCards / 2
                ? "teilweise"
                : "nicht";
          
          const buildabilityLabel =
            buildabilityStatus === "vollstaendig"
              ? "Deck vollständig baubar"
              : buildabilityStatus === "teilweise"
                ? "Deck teilweise baubar"
                : "Deck nicht baubar";
          
          const buildabilityClass =
            buildabilityStatus === "vollstaendig"
              ? "mt-2 text-sm font-medium text-green-700"
              : buildabilityStatus === "teilweise"
                ? "mt-2 text-sm font-medium text-amber-700"
                : "mt-2 text-sm font-medium text-red-700";
            return (
              <article
                key={deck.id}
                className="rounded-xl border bg-white p-6 shadow-sm"
              >
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="space-y-4">
                    <div>
                      <h2 className="text-lg font-semibold text-slate-900">
                        {deck.name}
                      </h2>
                      <p className="mt-1 text-sm text-slate-600">
                        Karten insgesamt: {validation.totalCards}
                      </p>
                    </div>

                    <div>
                      <p
                        className={
                          validation.isValid
                            ? "text-sm font-medium text-green-700"
                            : "text-sm font-medium text-red-700"
                        }
                      >
                        {validation.isValid ? "Gültig" : "Ungültig"}
                      </p>

                      {!validation.isValid && validation.errors.length > 0 ? (
                        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-red-700">
                          {validation.errors.map((error) => (
                            <li key={error}>{error}</li>
                          ))}
                        </ul>
                      ) : null}
                    </div>

                    <div className="rounded-lg border bg-slate-50 p-4">
                      <h3 className="text-sm font-semibold text-slate-900">
                        Sammlungs-Abgleich
                      </h3>

                      <p className={buildabilityClass}>{buildabilityLabel}</p>

                      <div className="mt-2 space-y-1 text-sm text-slate-700">
                        <p>
                          Fehlende Karten insgesamt:{" "}
                          <span className="font-medium">
                            {comparison.totalMissingCards}
                          </span>
                        </p>
                        <p>
                          Verschiedene fehlende Karten:{" "}
                          <span className="font-medium">
                            {comparison.missingUniqueCards}
                          </span>
                        </p>
                      </div>

                      <div className="mt-4">
                        <h4 className="text-sm font-medium text-slate-900">
                          Fehlende Karten im Detail
                        </h4>

                        {missingItems.length === 0 ? (
                          <p className="mt-2 text-sm text-green-700">
                            Es fehlen keine Karten.
                          </p>
                        ) : (
                          <ul className="mt-2 space-y-2 text-sm text-slate-700">
                            {missingItems.map((item) => (
                              <li
                                key={item.cardId}
                                className="rounded border bg-white p-3"
                              >
                                <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                                  <span className="font-medium text-slate-900">
                                    {item.cardName}
                                  </span>
                                  <span className="text-red-700">
                                    Fehlt: {item.missing}
                                  </span>
                                </div>
                                <div className="mt-1 text-xs text-slate-600">
                                  Benötigt: {item.needed} • Vorhanden: {item.owned}
                                </div>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    </div>
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