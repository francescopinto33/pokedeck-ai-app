"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { getAvailableCards } from "@/lib/availableCards";
import { getCollectionDeckIdeas } from "@/lib/collectionDeckIdeas";
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
  const collectionDeckIdeas = useMemo(
    () => getCollectionDeckIdeas(collection, allCards),
    [allCards, collection]
  );

  return (
    <section className="space-y-6">
      <div className="rounded-xl border bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-bold text-slate-900">
          Deckvorschläge aus deiner Sammlung
        </h1>
        <p className="mt-2 text-slate-600">
          Die Auswertung erkennt zuerst die stärksten Typ-Ansätze in deinen
          echten Karten. Zusätzlich vergleicht sie vollständige
          Startervorlagen im angegebenen Format mit deinen exakten Karten und
          Mengen.
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

      <div className="rounded-xl border bg-white p-6 shadow-sm">
        <h2 className="text-xl font-semibold text-slate-900">
          Deine stärksten Deck-Ansätze
        </h2>
        <p className="mt-2 text-sm text-slate-600">
          Diese Einschätzung basiert auf deinen vorhandenen Pokémon und
          passenden Basis-Energien sowie Trainerkarten. Sie ist eine
          Orientierung, noch keine automatisch erzeugte Deckliste.
        </p>
        <details className="mt-4 rounded-lg bg-slate-50 p-3 text-sm text-slate-700">
          <summary className="cursor-pointer font-medium text-slate-800">
            So entsteht der Bereitschaftswert
          </summary>
          <p className="mt-2">
            Gewertet werden Pokémon des jeweiligen Typs, Basis-Pokémon für
            eine stabile Starthand, passende Basis-Energien und die Anzahl
            deiner Trainerkarten. Der Wert zeigt die vorhandene Grundlage,
            nicht die Spielstärke eines fertigen Decks.
          </p>
        </details>

        {collectionDeckIdeas.length === 0 ? (
          <p className="mt-4 rounded-lg bg-slate-50 p-4 text-sm text-slate-700">
            Füge echte Pokémon-Karten und passende Basis-Energien zu deiner
            Sammlung hinzu, damit persönliche Deck-Ansätze erscheinen.
          </p>
        ) : (
          <div className="mt-4 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {collectionDeckIdeas.map((idea) => (
              <article key={idea.type} className="rounded-lg border p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm text-slate-500">Typ-Ansatz</p>
                    <h3 className="text-lg font-semibold text-slate-900">
                      {idea.label}
                    </h3>
                  </div>
                  <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700">
                    {idea.status}
                  </span>
                </div>

                <p className="mt-3 text-sm font-medium text-slate-800">
                  Grundlage: {idea.readinessScore} %
                </p>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full bg-slate-900"
                    style={{ width: `${idea.readinessScore}%` }}
                  />
                </div>

                <dl className="mt-4 grid grid-cols-2 gap-2 text-center text-sm sm:grid-cols-4">
                  <div className="rounded bg-slate-50 p-2">
                    <dt className="text-slate-500">Pokémon</dt>
                    <dd className="mt-1 font-semibold text-slate-900">
                      {idea.pokemonCount}
                    </dd>
                  </div>
                  <div className="rounded bg-slate-50 p-2">
                    <dt className="text-slate-500">Basis</dt>
                    <dd className="mt-1 font-semibold text-slate-900">
                      {idea.basicPokemonCount}
                    </dd>
                  </div>
                  <div className="rounded bg-slate-50 p-2">
                    <dt className="text-slate-500">Entwicklung</dt>
                    <dd className="mt-1 font-semibold text-slate-900">
                      {idea.evolutionPokemonCount}
                    </dd>
                  </div>
                  <div className="rounded bg-slate-50 p-2">
                    <dt className="text-slate-500">Energie</dt>
                    <dd className="mt-1 font-semibold text-slate-900">
                      {idea.basicEnergyCount}
                    </dd>
                  </div>
                </dl>

                <ul className="mt-4 list-disc space-y-1 pl-5 text-sm text-slate-700">
                  {idea.hints.map((hint) => (
                    <li key={hint}>{hint}</li>
                  ))}
                </ul>

                <p className="mt-4 text-sm text-slate-700">
                  Trainerkarten in deiner Sammlung: {" "}
                  <span className="font-semibold text-slate-900">
                    {idea.trainerCount}
                  </span>
                </p>

                <Link
                  href={`/decks/new?focusType=${encodeURIComponent(idea.type)}`}
                  className="mt-4 inline-block rounded border px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
                >
                  {idea.label}-Karten im Builder öffnen
                </Link>
              </article>
            ))}
          </div>
        )}
      </div>

      <div>
        <h2 className="text-xl font-semibold text-slate-900">
          Startervorlagen
        </h2>
        <p className="mt-1 text-sm text-slate-600">
          Vergleiche deine Sammlung mit vollständigen 60-Karten-Vorlagen.
        </p>
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
                <p className="mt-1 text-sm font-medium text-slate-500">
                  {suggestion.format === "standard-2026"
                    ? "Standardformat 2026"
                    : "Freies Deck"}
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
            <Link
              href={`/decks/new?template=${suggestion.id}`}
              className="mt-4 inline-block rounded border px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
            >
              Vorlage im Deck-Builder öffnen
            </Link>
          </article>
        ))}
      </div>
    </section>
  );
}
