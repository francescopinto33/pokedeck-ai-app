"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import { sampleCards } from "@/data/sampleCards";
import { addCardToCollection } from "@/lib/storage";
import type { Card, CardSearchResponse } from "@/types";

type ExternalCardFilter = "All" | Card["supertype"];
type CardSearchLanguage = "de" | "en";

const germanCardLabels: Record<string, string> = {
  Pokemon: "Pokémon",
  Trainer: "Trainer",
  Energy: "Energie",
  Grass: "Pflanze",
  Fire: "Feuer",
  Water: "Wasser",
  Lightning: "Elektro",
  Psychic: "Psycho",
  Fighting: "Kampf",
  Darkness: "Finsternis",
  Metal: "Metall",
  Dragon: "Drache",
  Colorless: "Farblos",
};

function formatGermanCardLabel(value: string) {
  return germanCardLabels[value] ?? value;
}

export default function CardsPage() {
  const [localSearch, setLocalSearch] = useState("");
  const [externalSearch, setExternalSearch] = useState("");
  const [externalResult, setExternalResult] =
    useState<CardSearchResponse | null>(null);
  const [externalError, setExternalError] = useState("");
  const [isSearchingExternal, setIsSearchingExternal] = useState(false);
  const [externalLanguage, setExternalLanguage] =
    useState<CardSearchLanguage>("de");
  const [externalCardFilter, setExternalCardFilter] =
    useState<ExternalCardFilter>("All");
  const [showStandardOnly, setShowStandardOnly] = useState(true);
  const [showBasicPokemonOnly, setShowBasicPokemonOnly] = useState(false);
  const [importAmounts, setImportAmounts] = useState<Record<string, number>>(
    {}
  );
  const [collectionMessage, setCollectionMessage] = useState("");

  const filteredCards = useMemo(() => {
    const normalizedSearch = localSearch.trim().toLowerCase();

    if (!normalizedSearch) {
      return sampleCards;
    }

    return sampleCards.filter((card) =>
      card.name.toLowerCase().includes(normalizedSearch)
    );
  }, [localSearch]);

  const filteredExternalCards = useMemo(() => {
    if (!externalResult) {
      return [];
    }

    return externalResult.cards.filter((card) => {
      const matchesCardType =
        externalCardFilter === "All" ||
        card.supertype === externalCardFilter;
      const matchesBasicPokemon =
        !showBasicPokemonOnly || card.isBasicPokemon;

      return matchesCardType && matchesBasicPokemon;
    });
  }, [externalCardFilter, externalResult, showBasicPokemonOnly]);

  async function fetchExternalCards(page: number): Promise<CardSearchResponse> {
    const params = new URLSearchParams({
      q: externalSearch.trim(),
      standardOnly: String(showStandardOnly),
      language: externalLanguage,
      page: String(page),
    });
    const response = await fetch(`/api/cards/search?${params.toString()}`);
    const result = (await response.json()) as
      | CardSearchResponse
      | { error: string };

    if (!response.ok || !("cards" in result)) {
      throw new Error(
        "error" in result
          ? result.error
          : "Die Kartendaten konnten gerade nicht geladen werden."
      );
    }

    return result;
  }

  async function handleExternalSearch(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const searchTerm = externalSearch.trim();
    if (searchTerm.length < 2) {
      setExternalResult(null);
      setExternalError("Bitte gib mindestens zwei Zeichen ein.");
      return;
    }

    setIsSearchingExternal(true);
    setExternalError("");

    try {
      setExternalResult(await fetchExternalCards(1));
    } catch (error) {
      setExternalResult(null);
      setExternalError(
        error instanceof Error
          ? error.message
          : "Die Kartendaten konnten gerade nicht geladen werden."
      );
    } finally {
      setIsSearchingExternal(false);
    }
  }

  function setImportAmount(cardId: string, value: string) {
    const amount = Math.max(1, Math.min(99, Math.floor(Number(value) || 1)));

    setImportAmounts((currentAmounts) => ({
      ...currentAmounts,
      [cardId]: amount,
    }));
  }

  function handleAddToCollection(card: Card) {
    const amount = importAmounts[card.id] ?? 1;

    addCardToCollection(card, amount);
    setCollectionMessage(
      `${amount}× ${card.name} wurde zur Sammlung hinzugefügt.`
    );
  }

  return (
    <section className="space-y-6">
      <div className="rounded-xl border bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-bold text-slate-900">Karten</h1>
        <p className="mt-2 text-slate-600">
          Suche echte Pokémon-TCG-Karten und prüfe später, welche davon in
          deiner Sammlung liegen.
        </p>

        <form className="mt-4" onSubmit={handleExternalSearch}>
          <label
            htmlFor="external-card-search"
            className="mb-2 block text-sm font-medium text-slate-700"
          >
            Echte Karten suchen
          </label>
          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              id="external-card-search"
              type="search"
              value={externalSearch}
              onChange={(event) => setExternalSearch(event.target.value)}
              placeholder={
                externalLanguage === "de"
                  ? "Zum Beispiel: Glurak ex"
                  : "Zum Beispiel: Charizard ex"
              }
              className="w-full rounded-lg border px-3 py-2 outline-none focus:ring-2 focus:ring-slate-300"
            />
            <button
              type="submit"
              disabled={isSearchingExternal}
              className="rounded-lg bg-slate-900 px-4 py-2 font-medium text-white disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSearchingExternal ? "Suche läuft …" : "Suchen"}
            </button>
          </div>
          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-sm text-slate-700">
            <label className="flex items-center gap-2">
              Kartensprache
              <select
                value={externalLanguage}
                onChange={(event) =>
                  setExternalLanguage(event.target.value as CardSearchLanguage)
                }
                className="rounded border px-2 py-1"
              >
                <option value="de">Deutsch</option>
                <option value="en">Englisch</option>
              </select>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={showStandardOnly}
                onChange={(event) => setShowStandardOnly(event.target.checked)}
              />
              Nur Standardformat 2026 (H+)
            </label>
            <label className="flex items-center gap-2">
              Kartenart
              <select
                value={externalCardFilter}
                onChange={(event) =>
                  setExternalCardFilter(event.target.value as ExternalCardFilter)
                }
                className="rounded border px-2 py-1"
              >
                <option value="All">Alle</option>
                <option value="Pokemon">Pokémon</option>
                <option value="Trainer">Trainer</option>
                <option value="Energy">Energie</option>
              </select>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={showBasicPokemonOnly}
                onChange={(event) =>
                  setShowBasicPokemonOnly(event.target.checked)}
              />
              Nur Basis-Pokémon
            </label>
          </div>
        </form>

        <p className="mt-3 text-sm text-slate-500" aria-live="polite">
          {externalError
            ? externalError
            : externalResult
              ? `${externalResult.totalCount} Treffer gefunden. ${filteredExternalCards.length} werden mit den gewählten Filtern angezeigt.`
              : "Deutsche Karten sind vorausgewählt. Standardformat 2026 und alle Filter werden bei der nächsten Suche angewendet."}
        </p>
      </div>

      {externalResult && filteredExternalCards.length === 0 ? (
        <div className="rounded-xl border bg-white p-6 text-sm text-slate-600 shadow-sm">
          Keine Karten mit den gewählten Filtern gefunden.
        </div>
      ) : null}

      {externalResult && filteredExternalCards.length > 0 ? (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold text-slate-900">
            Ergebnisse aus der Kartendatenbank
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filteredExternalCards.map((card) => (
              <article
                key={card.id}
                className="rounded-xl border bg-white p-5 shadow-sm"
              >
                {card.imageSmall ? (
                  <div className="mb-4 flex justify-center rounded-lg bg-slate-50 p-2">
                    <Image
                      src={card.imageSmall}
                      alt={card.name + " – " + (card.setName ?? "Pokémon-Karte")}
                      width={245}
                      height={342}
                      className="h-auto max-h-72 w-auto rounded shadow-sm"
                    />
                  </div>
                ) : null}
                <h3 className="text-lg font-semibold text-slate-900">
                  {card.name}
                </h3>
                <div className="mt-3 space-y-1 text-sm text-slate-600">
                  <p>
                    <span className="font-medium text-slate-800">Typ:</span>{" "}
                    {formatGermanCardLabel(card.supertype)}
                  </p>
                  {card.types?.length ? (
                    <p>
                      <span className="font-medium text-slate-800">
                        Energie-Typ:
                      </span>{" "}
                    {card.types.map(formatGermanCardLabel).join(", ")}
                    </p>
                  ) : null}
                  {card.subtype ? (
                    <p>
                      <span className="font-medium text-slate-800">
                        Untertyp:
                      </span>{" "}
                      {card.subtype}
                    </p>
                  ) : null}
                  {typeof card.hp === "number" ? (
                    <p>
                      <span className="font-medium text-slate-800">HP:</span>{" "}
                      {card.hp}
                    </p>
                  ) : null}
                  {card.setName ? (
                    <p>
                      <span className="font-medium text-slate-800">Set:</span>{" "}
                      {card.setName}
                      {card.cardNumber ? ` · Nr. ${card.cardNumber}` : ""}
                    </p>
                  ) : null}
                  <p>
                    <span className="font-medium text-slate-800">
                      Standard-legal:
                    </span>{" "}
                    {card.legalStandard ? "Ja" : "Nein"}
                  </p>
                  {card.regulationMark ? (
                    <p>
                      <span className="font-medium text-slate-800">
                        Regulierungszeichen:
                      </span>{" "}
                      {card.regulationMark}
                    </p>
                  ) : null}
                  {card.rarity ? (
                    <p>
                      <span className="font-medium text-slate-800">
                        Seltenheit:
                      </span>{" "}
                      {card.rarity}
                    </p>
                  ) : null}
                </div>
                {card.attacks?.length ||
                card.abilities?.length ||
                card.weaknesses?.length ||
                card.resistances?.length ||
                card.retreatCost?.length ? (
                  <details className="mt-4 rounded-lg bg-slate-50 p-3 text-sm text-slate-700">
                    <summary className="cursor-pointer font-medium text-slate-800">
                      Spielwerte ansehen
                    </summary>
                    {card.abilities?.length ? (
                      <div className="mt-3 space-y-2">
                        <p className="font-medium text-slate-800">Fähigkeiten</p>
                        {card.abilities.map((ability) => (
                          <p key={`${ability.type ?? "Ability"}-${ability.name}`}>
                            <span className="font-medium">{ability.name}:</span>{" "}
                            {ability.text ?? "Keine Beschreibung vorhanden."}
                          </p>
                        ))}
                      </div>
                    ) : null}
                    {card.attacks?.length ? (
                      <div className="mt-3 space-y-2">
                        <p className="font-medium text-slate-800">Angriffe</p>
                        {card.attacks.map((attack) => (
                          <p key={attack.name}>
                            <span className="font-medium">
                              {attack.name}
                              {attack.damage ? ` · ${attack.damage}` : ""}:
                            </span>{" "}
                            {attack.cost
                              .map(formatGermanCardLabel)
                              .join(" · ") || "Keine Energie"}
                            {attack.text ? ` – ${attack.text}` : ""}
                          </p>
                        ))}
                      </div>
                    ) : null}
                    {card.weaknesses?.length ? (
                      <p className="mt-3">
                        <span className="font-medium text-slate-800">
                          Schwäche:
                        </span>{" "}
                        {card.weaknesses
                          .map((weakness) =>
                            `${formatGermanCardLabel(weakness.type)} ${weakness.value ?? ""}`.trim()
                          )
                          .join(", ")}
                      </p>
                    ) : null}
                    {card.resistances?.length ? (
                      <p className="mt-2">
                        <span className="font-medium text-slate-800">
                          Resistenz:
                        </span>{" "}
                        {card.resistances
                          .map((resistance) =>
                            `${formatGermanCardLabel(resistance.type)} ${resistance.value ?? ""}`.trim()
                          )
                          .join(", ")}
                      </p>
                    ) : null}
                    {card.retreatCost?.length ? (
                      <p className="mt-2">
                        <span className="font-medium text-slate-800">
                          Rückzugskosten:
                        </span>{" "}
                      {card.retreatCost
                        .map(formatGermanCardLabel)
                        .join(" · ")}
                      </p>
                    ) : null}
                  </details>
                ) : null}
                <div className="mt-4 flex items-end gap-2">
                  <label
                    htmlFor={`collection-amount-${card.id}`}
                    className="flex-1 text-sm font-medium text-slate-700"
                  >
                    Anzahl
                    <input
                      id={`collection-amount-${card.id}`}
                      type="number"
                      min="1"
                      max="99"
                      value={importAmounts[card.id] ?? 1}
                      onChange={(event) =>
                        setImportAmount(card.id, event.target.value)
                      }
                      className="mt-1 w-full rounded border px-2 py-1"
                    />
                  </label>
                  <button
                    type="button"
                    onClick={() => handleAddToCollection(card)}
                    className="rounded border px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
                  >
                    Zur Sammlung
                  </button>
                </div>
              </article>
            ))}
          </div>
        </div>
      ) : null}

      {collectionMessage ? (
        <p aria-live="polite" className="text-sm text-green-700">
          {collectionMessage}
        </p>
      ) : null}

      <div className="rounded-xl border bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">
          Lokale Testkarten
        </h2>
        <p className="mt-1 text-sm text-slate-600">
          Diese Karten bleiben für die vorhandenen Version-1-Funktionen
          unverändert verfügbar.
        </p>

        <div className="mt-4">
          <label
            htmlFor="local-card-search"
            className="mb-2 block text-sm font-medium text-slate-700"
          >
            Testkarten durchsuchen
          </label>
          <input
            id="local-card-search"
            type="search"
            value={localSearch}
            onChange={(event) => setLocalSearch(event.target.value)}
            placeholder="Zum Beispiel: Pikachu"
            className="w-full rounded-lg border px-3 py-2 outline-none focus:ring-2 focus:ring-slate-300"
          />
        </div>
      </div>

      {filteredCards.length === 0 ? (
        <div className="rounded-xl border bg-white p-6 text-sm text-slate-600 shadow-sm">
          Keine lokalen Testkarten gefunden.
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredCards.map((card) => (
            <article
              key={card.id}
              className="rounded-xl border bg-white p-5 shadow-sm"
            >
              <h3 className="text-lg font-semibold text-slate-900">
                {card.name}
              </h3>

              <div className="mt-3 space-y-1 text-sm text-slate-600">
                <p>
                  <span className="font-medium text-slate-800">Typ:</span>{" "}
                  {card.supertype}
                </p>

                {card.subtype ? (
                  <p>
                    <span className="font-medium text-slate-800">
                      Untertyp:
                    </span>{" "}
                    {card.subtype}
                  </p>
                ) : null}

                {typeof card.hp === "number" ? (
                  <p>
                    <span className="font-medium text-slate-800">HP:</span>{" "}
                    {card.hp}
                  </p>
                ) : null}

                <p>
                  <span className="font-medium text-slate-800">
                    Basis-Pokemon:
                  </span>{" "}
                  {card.isBasicPokemon ? "Ja" : "Nein"}
                </p>

                <p>
                  <span className="font-medium text-slate-800">
                    Basis-Energie:
                  </span>{" "}
                  {card.isBasicEnergy ? "Ja" : "Nein"}
                </p>

                <p>
                  <span className="font-medium text-slate-800">
                    Standard-legal:
                  </span>{" "}
                  {card.legalStandard ? "Ja" : "Nein"}
                </p>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
