"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { getAvailableCards } from "@/lib/availableCards";
import { getDeckSuggestions } from "@/lib/deckSuggestions";
import { getCollection } from "@/lib/storage";
import type { Card, CollectionEntry } from "@/types";

export default function SuggestionsPage() {
  const [collection, setCollection] = useState<CollectionEntry[]>([]);
  const [allCards, setAllCards] = useState<Card[]>([]);

  useEffect(() => {
    setCollection(getCollection());
    setAllCards(getAvailableCards());
  }, []);

  const suggestions = useMemo(
    () => getDeckSuggestions(collection, allCards),
    [allCards, collection]
  );

  return (
    <section className="space-y-6">
      <div className="rounded-xl border bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-bold text-slate-900">
          Deckvorschläge aus deiner Sammlung
        </h1>
        <p className="mt-2 text-slate-600">
          Diese erste Vorschlagsversion vergleicht regelkonforme
          Startervorlagen mit deinen exakten Karten und Mengen. So siehst du
          direkt, welches Deck deiner Sammlung am nächsten ist und was noch
          fehlt.
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <Link
            href="/collection"
            className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
          >
            Sammlung öffnen
          </Link>
          <Link
            href="/cards"
            className="rounded-lg border px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
          >
            Karten suchen
          </Link>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {suggestions.map((suggestion) => (
          <article
            key={suggestion.id}
            className="rounded-xl border bg-white p-5 shadow-sm"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-slate-500">
                  Fokus: {suggestion.focus}
                </p>
                <h2 className="mt-1 text-lg font-semibold text-slate-900">
                  {suggestion.name}
                </h2>
              </div>
              <span
                className={
                  suggestion.isFullyBuildable
                    ? "rounded-full bg-green-100 px-2 py-1 text-xs font-semibold text-green-800"
                    : "rounded-full bg-amber-100 px-2 py-1 text-xs font-semibold text-amber-800"
                }
              >
                {suggestion.isFullyBuildable ? "Vollständig" : "Im Aufbau"}
              </span>
            </div>

            <p className="mt-3 text-sm text-slate-600">
              {suggestion.description}
            </p>

            <div className="mt-4">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium text-slate-800">
                  {suggestion.ownedCards} von {suggestion.totalCards} Karten
                </span>
                <span className="text-slate-600">
                  {suggestion.completionPercentage} %
                </span>
              </div>
              <div
                className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100"
                aria-label={`${suggestion.completionPercentage} Prozent vorhanden`}
              >
                <div
                  className="h-full rounded-full bg-slate-900"
                  style={{ width: `${suggestion.completionPercentage}%` }}
                />
              </div>
            </div>

            {suggestion.isFullyBuildable ? (
              <p className="mt-4 text-sm font-medium text-green-700">
                Alle 60 Karten sind in deiner Sammlung vorhanden.
              </p>
            ) : (
              <p className="mt-4 text-sm text-slate-700">
                Es fehlen noch {suggestion.totalMissingCards} Karten (
                {suggestion.missingUniqueCards} verschiedene Kartenarten).
              </p>
            )}

            <details className="mt-4 rounded-lg bg-slate-50 p-3 text-sm">
              <summary className="cursor-pointer font-medium text-slate-800">
                Fehlende Karten ansehen
              </summary>
              {suggestion.isFullyBuildable ? (
                <p className="mt-2 text-green-700">Keine Karten fehlen.</p>
              ) : (
                <ul className="mt-2 space-y-1 text-slate-700">
                  {suggestion.items
                    .filter((item) => item.missing > 0)
                    .map((item) => (
                      <li key={item.cardId}>
                        {item.cardName}: Fehlt {item.missing} von {item.needed}
                      </li>
                    ))}
                </ul>
              )}
            </details>
          </article>
        ))}
      </div>
    </section>
  );
}
