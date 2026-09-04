"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { sampleCards } from "@/data/sampleCards";
import { addCardToCollection } from "@/lib/storage";
import type {
  Card,
  CardListResolutionResponse,
  CardSearchResponse,
} from "@/types";

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

function mergeCardSearchPages(
  currentResult: CardSearchResponse,
  nextResult: CardSearchResponse
): CardSearchResponse {
  const cardsById = new Map<string, Card>();

  for (const card of [...currentResult.cards, ...nextResult.cards]) {
    cardsById.set(card.id, card);
  }

  return {
    ...nextResult,
    cards: Array.from(cardsById.values()),
    totalCount: Math.max(currentResult.totalCount, nextResult.totalCount),
  };
}

function getCardListResolutionLabel(status: "matched" | "needsChoice" | "notFound") {
  if (status === "matched") {
    return "Eindeutig zugeordnet";
  }

  return status === "needsChoice" ? "Auswahl nötig" : "Nicht gefunden";
}

export default function CardsPage() {
  const [localSearch, setLocalSearch] = useState("");
  const [externalSearch, setExternalSearch] = useState("");
  const [externalResult, setExternalResult] =
    useState<CardSearchResponse | null>(null);
  const [externalError, setExternalError] = useState("");
  const [isSearchingExternal, setIsSearchingExternal] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [externalLanguage, setExternalLanguage] =
    useState<CardSearchLanguage>("de");
  const [externalCardFilter, setExternalCardFilter] =
    useState<ExternalCardFilter>("All");
  const [showStandardOnly, setShowStandardOnly] = useState(true);
  const [showBasicPokemonOnly, setShowBasicPokemonOnly] = useState(false);
  const [importAmounts, setImportAmounts] = useState<Record<string, number>>(
    {}
  );
  const [selectedCardIds, setSelectedCardIds] = useState<Set<string>>(
    new Set()
  );
  const [cardListContent, setCardListContent] = useState("");
  const [cardListResult, setCardListResult] =
    useState<CardListResolutionResponse | null>(null);
  const [cardListChoices, setCardListChoices] = useState<Record<string, string>>(
    {}
  );
  const [cardListError, setCardListError] = useState("");
  const [isResolvingCardList, setIsResolvingCardList] = useState(false);
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

  const selectedCardListItems = useMemo(() => {
    if (!cardListResult) {
      return [];
    }

    return cardListResult.items.flatMap((item, index) => {
      const selectedCardId =
        cardListChoices[String(index)] ??
        (item.status === "matched" ? item.candidates[0]?.id : undefined);
      const card = item.candidates.find((candidate) => candidate.id === selectedCardId);

      return card ? [{ card, amount: item.amount }] : [];
    });
  }, [cardListChoices, cardListResult]);

  const cardListSummary = useMemo(() => {
    if (!cardListResult) {
      return { needsChoice: 0, notFound: 0 };
    }

    return cardListResult.items.reduce(
      (summary, item, index) => {
        if (item.status === "notFound") {
          summary.notFound += 1;
        }

        if (item.status === "needsChoice" && !cardListChoices[String(index)]) {
          summary.needsChoice += 1;
        }

        return summary;
      },
      { needsChoice: 0, notFound: 0 }
    );
  }, [cardListChoices, cardListResult]);

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
    setExternalResult(null);
    setSelectedCardIds(new Set());

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

  async function handleLoadMoreExternalCards() {
    if (!externalResult || !externalResult.hasMore || isLoadingMore) {
      return;
    }

    setIsLoadingMore(true);
    setExternalError("");

    try {
      const nextResult = await fetchExternalCards(externalResult.page + 1);

      setExternalResult((currentResult) => {
        if (!currentResult) {
          return nextResult;
        }

        return mergeCardSearchPages(currentResult, nextResult);
      });
    } catch (error) {
      setExternalError(
        error instanceof Error
          ? error.message
          : "Die Kartendaten konnten gerade nicht geladen werden."
      );
    } finally {
      setIsLoadingMore(false);
    }
  }

  async function handleResolveCardList(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!cardListContent.trim()) {
      setCardListResult(null);
      setCardListError("Füge mindestens eine Karte zur Liste hinzu.");
      return;
    }

    setIsResolvingCardList(true);
    setCardListError("");
    setCardListResult(null);
    setCardListChoices({});

    try {
      const response = await fetch("/api/cards/resolve-list", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: cardListContent,
          language: externalLanguage,
          standardOnly: showStandardOnly,
        }),
      });
      const result = (await response.json()) as
        | CardListResolutionResponse
        | { error: string };

      if (!response.ok || !("items" in result)) {
        throw new Error(
          "error" in result
            ? result.error
            : "Die Kartenliste konnte gerade nicht abgeglichen werden."
        );
      }

      const initialChoices: Record<string, string> = {};

      result.items.forEach((item, index) => {
        if (item.status === "matched" && item.candidates[0]) {
          initialChoices[String(index)] = item.candidates[0].id;
        }
      });

      setCardListChoices(initialChoices);
      setCardListResult(result);
    } catch (error) {
      setCardListError(
        error instanceof Error
          ? error.message
          : "Die Kartenliste konnte gerade nicht abgeglichen werden."
      );
    } finally {
      setIsResolvingCardList(false);
    }
  }

  function setImportAmount(cardId: string, value: string) {
    const amount = Math.max(1, Math.min(99, Math.floor(Number(value) || 1)));

    setImportAmounts((currentAmounts) => ({
      ...currentAmounts,
      [cardId]: amount,
    }));
  }

  function toggleCardSelection(cardId: string) {
    setSelectedCardIds((currentCardIds) => {
      const nextCardIds = new Set(currentCardIds);

      if (nextCardIds.has(cardId)) {
        nextCardIds.delete(cardId);
      } else {
        nextCardIds.add(cardId);
      }

      return nextCardIds;
    });
  }

  function selectAllFilteredCards() {
    setSelectedCardIds((currentCardIds) => {
      const nextCardIds = new Set(currentCardIds);

      for (const card of filteredExternalCards) {
        nextCardIds.add(card.id);
      }

      return nextCardIds;
    });
  }

  function handleAddToCollection(card: Card) {
    const amount = importAmounts[card.id] ?? 1;

    addCardToCollection(card, amount);
    setSelectedCardIds((currentCardIds) => {
      if (!currentCardIds.has(card.id)) {
        return currentCardIds;
      }

      const nextCardIds = new Set(currentCardIds);
      nextCardIds.delete(card.id);
      return nextCardIds;
    });
    setCollectionMessage(
      `${amount}× ${card.name} wurde zur Sammlung hinzugefügt.`
    );
  }

  function handleAddSelectedToCollection() {
    const selectedCards = externalResult?.cards.filter((card) =>
      selectedCardIds.has(card.id)
    );

    if (!selectedCards?.length) {
      return;
    }

    const totalCopies = selectedCards.reduce((sum, card) => {
      const amount = importAmounts[card.id] ?? 1;
      addCardToCollection(card, amount);
      return sum + amount;
    }, 0);

    setSelectedCardIds(new Set());
    setCollectionMessage(
      `${selectedCards.length} ${selectedCards.length === 1 ? "Kartenart" : "Kartenarten"} mit insgesamt ${totalCopies} ${totalCopies === 1 ? "Exemplar" : "Exemplaren"} wurden zur Sammlung hinzugefügt.`
    );
  }

  function handleAddCardListToCollection() {
    if (selectedCardListItems.length === 0) {
      return;
    }

    const totalCopies = selectedCardListItems.reduce((sum, item) => {
      addCardToCollection(item.card, item.amount);
      return sum + item.amount;
    }, 0);

    setCardListContent("");
    setCardListChoices({});
    setCardListResult(null);
    setCollectionMessage(
      `${selectedCardListItems.length} ${selectedCardListItems.length === 1 ? "Kartenart" : "Kartenarten"} mit insgesamt ${totalCopies} ${totalCopies === 1 ? "Exemplar" : "Exemplaren"} wurden aus der Liste zur Sammlung hinzugefügt.`
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
              ? `${externalResult.cards.length} Karten geladen. ${filteredExternalCards.length} werden mit den gewählten Filtern angezeigt.${externalResult.hasMore ? " Weitere Treffer können geladen werden." : ""}`
              : "Deutsche Karten sind vorausgewählt. Standardformat 2026 und alle Filter werden bei der nächsten Suche angewendet."}
        </p>
      </div>

      <div className="rounded-xl border bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">
          Eigene Kartenliste abgleichen
        </h2>
        <p className="mt-1 text-sm text-slate-600">
          Eine Karte pro Zeile, zum Beispiel <code>Glurak ex, 2</code> oder{" "}
          <code>Feuer-Energie x 8</code>. Die aktuelle Kartensprache und der
          Standardformat-Filter werden berücksichtigt.
        </p>
        <form className="mt-4" onSubmit={handleResolveCardList}>
          <label
            htmlFor="card-list-import"
            className="mb-2 block text-sm font-medium text-slate-700"
          >
            Kartenliste
          </label>
          <textarea
            id="card-list-import"
            value={cardListContent}
            onChange={(event) => setCardListContent(event.target.value)}
            placeholder={"Glurak ex, 2\nFeuer-Energie x 8"}
            rows={6}
            className="w-full rounded-lg border px-3 py-2 font-mono text-sm outline-none focus:ring-2 focus:ring-slate-300"
          />
          <button
            type="submit"
            disabled={isResolvingCardList}
            className="mt-3 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isResolvingCardList ? "Liste wird abgeglichen …" : "Liste abgleichen"}
          </button>
        </form>

        {cardListError ? (
          <p aria-live="polite" className="mt-3 text-sm text-red-700">
            {cardListError}
          </p>
        ) : null}

        {cardListResult ? (
          <div className="mt-4 rounded-lg bg-slate-50 p-4 text-sm text-slate-700">
            <p className="font-medium text-slate-900">
              {cardListResult.items.length} Kartenarten geprüft.
            </p>
            <p className="mt-1">
              {selectedCardListItems.length} zur Übernahme bereit
              {cardListSummary.needsChoice > 0
                ? ` · ${cardListSummary.needsChoice} Druck${cardListSummary.needsChoice === 1 ? "" : "e"} auswählen`
                : ""}
              {cardListSummary.notFound > 0
                ? ` · ${cardListSummary.notFound} nicht gefunden`
                : ""}
            </p>
            <ul className="mt-3 space-y-2">
              {cardListResult.items.map((item, index) => (
                <li key={item.name}>
                  <span className="font-medium">{item.amount}× {item.name}:</span>{" "}
                  {getCardListResolutionLabel(item.status)}
                  {item.status === "matched" && item.candidates[0]
                    ? ` · ${item.candidates[0].setName ?? "Set unbekannt"}`
                    : ""}
                  {item.status === "needsChoice" ? (
                    <label className="mt-2 block">
                      <span className="sr-only">Druck für {item.name} auswählen</span>
                      <select
                        value={cardListChoices[String(index)] ?? ""}
                        onChange={(event) =>
                          setCardListChoices((currentChoices) => ({
                            ...currentChoices,
                            [String(index)]: event.target.value,
                          }))
                        }
                        className="w-full rounded border bg-white px-2 py-1"
                      >
                        <option value="">Passenden Druck auswählen</option>
                        {item.candidates.map((card) => (
                          <option key={card.id} value={card.id}>
                            {card.name} · {card.setName ?? "Set unbekannt"}
                            {card.cardNumber ? ` · Nr. ${card.cardNumber}` : ""}
                          </option>
                        ))}
                      </select>
                    </label>
                  ) : null}
                </li>
              ))}
            </ul>
            {cardListResult.errors.length > 0 ? (
              <ul className="mt-3 list-disc space-y-1 pl-5 text-amber-700">
                {cardListResult.errors.map((error) => (
                  <li key={error}>{error}</li>
                ))}
              </ul>
            ) : null}
            {selectedCardListItems.length > 0 ? (
              <button
                type="button"
                onClick={handleAddCardListToCollection}
                className="mt-4 rounded-lg bg-slate-900 px-4 py-2 font-medium text-white hover:bg-slate-800"
              >
                {selectedCardListItems.length} zugeordnete{" "}
                {selectedCardListItems.length === 1 ? "Kartenart" : "Kartenarten"}{" "}
                zur Sammlung hinzufügen
              </button>
            ) : null}
          </div>
        ) : null}
      </div>

      {externalResult && filteredExternalCards.length === 0 ? (
        <div className="rounded-xl border bg-white p-6 text-sm text-slate-600 shadow-sm">
          Keine Karten mit den gewählten Filtern gefunden.
        </div>
      ) : null}

      {externalResult && filteredExternalCards.length > 0 ? (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-semibold text-slate-900">
              Ergebnisse aus der Kartendatenbank
            </h2>
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <span aria-live="polite" className="text-slate-600">
                {selectedCardIds.size} ausgewählt
              </span>
              <button
                type="button"
                onClick={selectAllFilteredCards}
                className="rounded border px-3 py-2 font-medium text-slate-700 hover:bg-slate-100"
              >
                Alle angezeigten auswählen
              </button>
              {selectedCardIds.size > 0 ? (
                <>
                  <button
                    type="button"
                    onClick={handleAddSelectedToCollection}
                    className="rounded bg-slate-900 px-3 py-2 font-medium text-white hover:bg-slate-800"
                  >
                    Auswahl zur Sammlung hinzufügen
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedCardIds(new Set())}
                    className="font-medium text-slate-700 underline hover:text-slate-900"
                  >
                    Auswahl aufheben
                  </button>
                </>
              ) : null}
            </div>
          </div>
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
                <div className="flex items-start justify-between gap-3">
                  <h3 className="text-lg font-semibold text-slate-900">
                    {card.name}
                  </h3>
                  <label
                    htmlFor={`select-card-${card.id}`}
                    className="flex shrink-0 items-center gap-2 text-sm text-slate-700"
                  >
                    <input
                      id={`select-card-${card.id}`}
                      type="checkbox"
                      checked={selectedCardIds.has(card.id)}
                      onChange={() => toggleCardSelection(card.id)}
                    />
                    Auswählen
                  </label>
                </div>
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
          {externalResult.hasMore ? (
            <div className="pt-2 text-center">
              <button
                type="button"
                onClick={handleLoadMoreExternalCards}
                disabled={isLoadingMore}
                className="rounded-lg border px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isLoadingMore ? "Weitere Karten werden geladen …" : "Weitere Karten laden"}
              </button>
            </div>
          ) : null}
        </div>
      ) : null}

      {collectionMessage ? (
        <p aria-live="polite" className="text-sm text-green-700">
          {collectionMessage} {" "}
          <Link href="/collection" className="font-medium underline">
            Sammlung öffnen
          </Link>
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
