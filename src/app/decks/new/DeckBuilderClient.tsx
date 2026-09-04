"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { getDeckTemplateById } from "@/data/deckTemplates";
import { getAvailableCards } from "@/lib/availableCards";
import { compareDeckToCollection } from "@/lib/compareDeckToCollection";
import {
  deleteDeckDraft,
  getCollection,
  getDeckById,
  getDeckDraft,
  saveDeckDraft,
  upsertDeck,
} from "@/lib/storage";
import { validateDeck } from "@/lib/validateDeck";
import type {
  Card,
  CollectionEntry,
  Deck,
  DeckCard,
  DeckFormat,
} from "@/types";

type CardFilter = "All" | Card["supertype"];

const cardFilterOptions: Array<{ value: CardFilter; label: string }> = [
  { value: "All", label: "Alle" },
  { value: "Pokemon", label: "Pokémon" },
  { value: "Trainer", label: "Trainer" },
  { value: "Energy", label: "Energie" },
];

const deckPreviewSections: Array<{
  supertype: Card["supertype"];
  label: string;
}> = [
  { supertype: "Pokemon", label: "Pokémon" },
  { supertype: "Trainer", label: "Trainer" },
  { supertype: "Energy", label: "Energie" },
];

const energyTypeLabels: Record<string, string> = {
  Fire: "Feuer",
  Water: "Wasser",
  Grass: "Pflanze",
  Lightning: "Elektro",
  Psychic: "Psycho",
  Fighting: "Kampf",
  Darkness: "Finsternis",
  Metal: "Metall",
  Dragon: "Drache",
};

function createDeckId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  return `deck-${Date.now()}`;
}

function getOpeningBasicPokemonChance(basicPokemon: number, totalCards: number) {
  let chanceWithoutBasicPokemon = 1;

  for (let cardIndex = 0; cardIndex < 7; cardIndex += 1) {
    chanceWithoutBasicPokemon *=
      (totalCards - basicPokemon - cardIndex) / (totalCards - cardIndex);
  }

  return Math.round((1 - chanceWithoutBasicPokemon) * 100);
}

function getDraftKey(deckId: string | null, templateId: string | null) {
  if (deckId) {
    return "deck-" + deckId;
  }

  return templateId ? "template-" + templateId : "new";
}

export default function DeckBuilderClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const deckIdFromUrl = searchParams.get("id");
  const templateIdFromUrl = searchParams.get("template");
  const selectedTemplate = getDeckTemplateById(templateIdFromUrl);

  const [deckId, setDeckId] = useState<string | null>(null);
  const [createdAt, setCreatedAt] = useState<string>("");
  const [deckName, setDeckName] = useState("");
  const [deckCards, setDeckCards] = useState<DeckCard[]>([]);
  const [deckFormat, setDeckFormat] = useState<DeckFormat>("free");
  const [collection, setCollection] = useState<CollectionEntry[]>([]);
  const [allCards, setAllCards] = useState<Card[]>([]);
  const [collectionMessage, setCollectionMessage] = useState("");
  const [saveMessage, setSaveMessage] = useState("");
  const [copyMessage, setCopyMessage] = useState("");
  const [search, setSearch] = useState("");
  const [cardFilter, setCardFilter] = useState<CardFilter>("All");
  const [showOwnedOnly, setShowOwnedOnly] = useState(false);
  const [showStandardOnly, setShowStandardOnly] = useState(false);
  const [isDraftDirty, setIsDraftDirty] = useState(false);
  const [hasDraft, setHasDraft] = useState(false);
  const [draftMessage, setDraftMessage] = useState("");
  const [isDiscardConfirmationVisible, setIsDiscardConfirmationVisible] =
    useState(false);

  useEffect(() => {
    setCollection(getCollection());
    setAllCards(getAvailableCards());
    setCollectionMessage("");
    setIsDiscardConfirmationVisible(false);
    setDraftMessage("");

    const draftKey = getDraftKey(deckIdFromUrl, templateIdFromUrl);
    const existingDraft = getDeckDraft(draftKey);

    if (existingDraft) {
      setDeckId(existingDraft.id);
      setCreatedAt(existingDraft.createdAt);
      setDeckName(existingDraft.name);
      setDeckCards(existingDraft.cards);
      setDeckFormat(existingDraft.format ?? "free");
      setIsDraftDirty(false);
      setHasDraft(true);
      setDraftMessage("Entwurf lokal wiederhergestellt.");
      return;
    }

    if (!deckIdFromUrl && selectedTemplate) {
      const newId = createDeckId();
      const now = new Date().toISOString();

      setDeckId(newId);
      setCreatedAt(now);
      setDeckName(selectedTemplate.name);
      setDeckCards(selectedTemplate.cards.map((entry) => ({ ...entry })));
      setDeckFormat(selectedTemplate.format);
      setIsDraftDirty(false);
      setHasDraft(false);
      setDraftMessage("Startervorlage geladen. Passe sie bei Bedarf an.");
      return;
    }

    if (!deckIdFromUrl) {
      const newId = createDeckId();
      const now = new Date().toISOString();

      setDeckId(newId);
      setCreatedAt(now);
      setDeckName("");
      setDeckCards([]);
      setDeckFormat("free");
      setIsDraftDirty(false);
      setHasDraft(false);
      return;
    }

    const existingDeck = getDeckById(deckIdFromUrl);

    if (!existingDeck) {
      const fallbackId = createDeckId();
      const now = new Date().toISOString();

      setDeckId(fallbackId);
      setCreatedAt(now);
      setDeckName("");
      setDeckCards([]);
      setDeckFormat("free");
      setIsDraftDirty(false);
      setHasDraft(false);
      return;
    }

    setDeckId(existingDeck.id);
    setCreatedAt(existingDeck.createdAt);
    setDeckName(existingDeck.name);
    setDeckCards(existingDeck.cards);
    setDeckFormat(existingDeck.format ?? "free");
    setIsDraftDirty(false);
    setHasDraft(false);
  }, [deckIdFromUrl, selectedTemplate, templateIdFromUrl]);

  useEffect(() => {
    if (!isDraftDirty || !deckId || !createdAt) {
      return;
    }

    const draftKey = getDraftKey(deckIdFromUrl, templateIdFromUrl);

    if (deckName.trim() === "" && deckCards.length === 0) {
      deleteDeckDraft(draftKey);
      setDraftMessage("");
      return;
    }

    saveDeckDraft(draftKey, {
      id: deckId,
      name: deckName,
      cards: deckCards,
      format: deckFormat,
      createdAt,
      updatedAt: new Date().toISOString(),
    });
    setDraftMessage("Entwurf lokal gesichert.");
  }, [
    createdAt,
    deckCards,
    deckId,
    deckIdFromUrl,
    deckFormat,
    deckName,
    isDraftDirty,
    templateIdFromUrl,
  ]);

  const totalCards = useMemo(() => {
    return deckCards.reduce((sum, entry) => sum + entry.count, 0);
  }, [deckCards]);

  const deckComposition = useMemo(() => {
    const counts: Record<Card["supertype"], number> = {
      Pokemon: 0,
      Trainer: 0,
      Energy: 0,
    };

    for (const entry of deckCards) {
      const card = allCards.find((item) => item.id === entry.cardId);

      if (card) {
        counts[card.supertype] += entry.count;
      }
    }

    return deckPreviewSections.map((section) => ({
      ...section,
      count: counts[section.supertype],
    }));
  }, [allCards, deckCards]);

  const deckCompositionHints = useMemo(() => {
    if (totalCards === 0) {
      return ["Füge Karten hinzu, um die Zusammensetzung zu sehen."];
    }

    const getCount = (supertype: Card["supertype"]) =>
      deckComposition.find((section) => section.supertype === supertype)
        ?.count ?? 0;
    const pokemon = getCount("Pokemon");
    const trainer = getCount("Trainer");
    const energy = getCount("Energy");
    const hints: string[] = [];

    if (totalCards >= 20 && trainer < 10) {
      hints.push("Wenige Trainer: Such- und Unterstützerkarten können die Konsistenz verbessern.");
    }

    if (totalCards >= 20 && energy === 0) {
      hints.push("Keine Energie enthalten: Prüfe, ob dein Deck Energie benötigt.");
    }

    if (totalCards >= 20 && pokemon > totalCards / 2) {
      hints.push("Viele Pokémon: Prüfe, ob genug Platz für Trainer und Energie bleibt.");
    }

    if (hints.length === 0) {
      hints.push("Die Verteilung zeigt keine offensichtliche Unausgewogenheit.");
    }

    return hints;
  }, [deckComposition, totalCards]);
  const hasDraftContent = deckName.trim() !== "" || deckCards.length > 0;

  const deckSizeMessage =
    totalCards < 60
      ? "Noch " + (60 - totalCards) + " Karten bis 60."
      : totalCards === 60
        ? "Die Zielgröße von 60 Karten ist erreicht."
        : (totalCards - 60) + " Karten über dem Ziel von 60.";

  const hasActiveCardFilters =
    search.trim() !== "" ||
    cardFilter !== "All" ||
    showOwnedOnly ||
    showStandardOnly;

  const filteredCards = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return allCards.filter((card) => {
      const matchesSearch = card.name.toLowerCase().includes(normalizedSearch);
      const matchesFilter =
        cardFilter === "All" || card.supertype === cardFilter;
      const matchesCollection =
        !showOwnedOnly ||
        collection.some(
          (entry) => entry.cardId === card.id && entry.owned > 0
        );
      const matchesStandardFormat = !showStandardOnly || card.legalStandard;

      return (
        matchesSearch &&
        matchesFilter &&
        matchesCollection &&
        matchesStandardFormat
      );
    });
  }, [
    allCards,
    cardFilter,
    collection,
    search,
    showOwnedOnly,
    showStandardOnly,
  ]);

  const validationResult = useMemo(() => {
    const deckToValidate: Deck = {
      id: deckId ?? "temporary-deck",
      name: deckName || "Unbenanntes Deck",
      cards: deckCards,
      format: deckFormat,
      createdAt: createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    return validateDeck(deckToValidate, allCards);
  }, [allCards, createdAt, deckCards, deckFormat, deckId, deckName]);

  const collectionComparison = useMemo(() => {
    const deckToCompare: Deck = {
      id: deckId ?? "temporary-deck",
      name: deckName || "Unbenanntes Deck",
      cards: deckCards,
      createdAt: createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    return compareDeckToCollection(deckToCompare, collection, allCards);
  }, [allCards, collection, createdAt, deckCards, deckId, deckName]);

  function getCardCount(cardId: string) {
    const existingEntry = deckCards.find((entry) => entry.cardId === cardId);
    return existingEntry ? existingEntry.count : 0;
  }

  function getOwnedCount(cardId: string) {
    const collectionEntry = collection.find((entry) => entry.cardId === cardId);
    return collectionEntry ? collectionEntry.owned : 0;
  }

  function handleRefreshCollection() {
    setCollection(getCollection());
    setAllCards(getAvailableCards());
    setCollectionMessage("Sammlung aktualisiert.");
  }

  function changeCardCount(cardId: string, change: number) {
    setSaveMessage("");
    setCopyMessage("");
    setDraftMessage("");
    setIsDraftDirty(true);
    setHasDraft(true);

    setDeckCards((currentCards) => {
      const existingEntry = currentCards.find((entry) => entry.cardId === cardId);

      if (!existingEntry && change < 0) {
        return currentCards;
      }

      if (!existingEntry && change > 0) {
        return [...currentCards, { cardId, count: 1 }];
      }

      return currentCards
        .map((entry) => {
          if (entry.cardId !== cardId) {
            return entry;
          }

          return {
            ...entry,
            count: Math.max(0, entry.count + change),
          };
        })
        .filter((entry) => entry.count > 0);
    });
  }

  function resetCardFilters() {
    setSearch("");
    setCardFilter("All");
    setShowOwnedOnly(false);
    setShowStandardOnly(false);
  }

  function handleDiscardDraft() {
    deleteDeckDraft(getDraftKey(deckIdFromUrl, templateIdFromUrl));
    setIsDraftDirty(false);
    setHasDraft(false);
    setIsDiscardConfirmationVisible(false);
    setSaveMessage("");
    setCopyMessage("");
    setDraftMessage("");

    if (!deckIdFromUrl) {
      const newId = createDeckId();
      const now = new Date().toISOString();

      setDeckId(newId);
      setCreatedAt(now);
      setDeckName(selectedTemplate?.name ?? "");
      setDeckCards(selectedTemplate?.cards.map((entry) => ({ ...entry })) ?? []);
      setDeckFormat(selectedTemplate?.format ?? "free");
      if (selectedTemplate) {
        setDraftMessage("Startervorlage erneut geladen.");
      }
      return;
    }

    const savedDeck = getDeckById(deckIdFromUrl);

    if (savedDeck) {
      setDeckId(savedDeck.id);
      setCreatedAt(savedDeck.createdAt);
      setDeckName(savedDeck.name);
      setDeckCards(savedDeck.cards);
      setDeckFormat(savedDeck.format ?? "free");
      return;
    }

    const fallbackId = createDeckId();
    const now = new Date().toISOString();

    setDeckId(fallbackId);
    setCreatedAt(now);
    setDeckName("");
    setDeckCards([]);
    setDeckFormat("free");
  }

  async function handleCopyMissingCards() {
    const missingCards = collectionComparison.items.filter(
      (item) => item.missing > 0
    );
    const shoppingList = missingCards
      .map((item) => item.cardName + ": Fehlt " + item.missing)
      .join("\n");

    try {
      await navigator.clipboard.writeText(shoppingList);
      setCopyMessage("Einkaufsliste wurde kopiert.");
    } catch {
      setCopyMessage("Die Einkaufsliste konnte nicht kopiert werden.");
    }
  }

  const selectedCards = useMemo(() => {
    return deckCards
      .map((entry) => {
        const card = allCards.find((item) => item.id === entry.cardId);

        if (!card) {
          return null;
        }

        return {
          ...card,
          count: entry.count,
        };
      })
      .filter(Boolean) as Array<Card & { count: number }>;
  }, [allCards, deckCards]);

  const groupedSelectedCards = useMemo(() => {
    return deckPreviewSections.map((section) => ({
      ...section,
      cards: selectedCards.filter(
        (card) => card.supertype === section.supertype
      ),
    }));
  }, [selectedCards]);

  const evolutionWarnings = useMemo(() => {
    const selectedCountsByName = new Map<string, number>();
    const evolvingCardsByName = new Map<string, Card & { count: number }>();

    for (const card of selectedCards) {
      selectedCountsByName.set(
        card.name,
        (selectedCountsByName.get(card.name) ?? 0) + card.count
      );

      if (card.evolvesFrom) {
        const existingCard = evolvingCardsByName.get(card.name);
        evolvingCardsByName.set(card.name, {
          ...card,
          count: (existingCard?.count ?? 0) + card.count,
        });
      }
    }

    return Array.from(evolvingCardsByName.values()).flatMap((card) => {
      const previousStageCount = selectedCountsByName.get(card.evolvesFrom!) ?? 0;

      if (previousStageCount === 0) {
        return [
          card.name +
            " entwickelt sich aus " +
            card.evolvesFrom +
            ", aber diese Vorstufe fehlt im Deck.",
        ];
      }

      if (previousStageCount < card.count) {
        return [
          card.name +
            " ist " +
            card.count +
            "-mal enthalten, aber " +
            card.evolvesFrom +
            " nur " +
            previousStageCount +
            "-mal. Ergänze Vorstufen für eine verlässlichere Entwicklungslinie.",
        ];
      }

      return [];
    });
  }, [selectedCards]);

  const missingEnergyTypeWarnings = useMemo(() => {
    const pokemonTypes = new Set(
      selectedCards
        .filter((card) => card.supertype === "Pokemon")
        .flatMap((card) => card.types ?? [])
        .filter((type) => type !== "Colorless")
    );
    const energyTypes = new Set(
      selectedCards
        .filter((card) => card.supertype === "Energy" && card.isBasicEnergy)
        .flatMap((card) => card.types ?? [])
    );

    return Array.from(pokemonTypes)
      .filter((type) => !energyTypes.has(type))
      .map(
        (type) =>
          "Für " +
          (energyTypeLabels[type] ?? type) +
          "-Pokémon fehlt eine passende Basis-Energie."
      );
  }, [selectedCards]);

  const nonStandardCards = useMemo(() => {
    return selectedCards.filter((card) => !card.legalStandard);
  }, [selectedCards]);

  const startHandHint = useMemo(() => {
    if (totalCards !== 60) {
      return null;
    }

    const basicPokemonCount = selectedCards
      .filter((card) => card.isBasicPokemon)
      .reduce((sum, card) => sum + card.count, 0);

    if (basicPokemonCount === 0 || basicPokemonCount >= 6) {
      return null;
    }

    return {
      basicPokemonCount,
      chance: getOpeningBasicPokemonChance(basicPokemonCount, totalCards),
    };
  }, [selectedCards, totalCards]);

  function handleSaveDeck() {
    const finalDeckId = deckId ?? createDeckId();
    const now = new Date().toISOString();

    const deckToSave: Deck = {
      id: finalDeckId,
      name: deckName.trim() || "Unbenanntes Deck",
      cards: deckCards,
      format: deckFormat,
      createdAt: createdAt || now,
      updatedAt: now,
    };

    upsertDeck(deckToSave);
    deleteDeckDraft(getDraftKey(deckIdFromUrl, templateIdFromUrl));
    setIsDraftDirty(false);
    setHasDraft(false);
    setIsDiscardConfirmationVisible(false);
    setSaveMessage("Deck wurde gespeichert.");
    setDraftMessage("");
    router.push("/decks");
  }

  return (
    <section className="space-y-6">
      <div className="rounded-xl border bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-bold text-slate-900">
          {deckIdFromUrl
            ? "Deck bearbeiten"
            : selectedTemplate
              ? "Deckvorlage bearbeiten"
              : "Neues Deck"}
        </h1>
        <p className="mt-2 text-slate-600">
          Erstelle ein Deck, fuege Karten hinzu und pruefe die Grundregeln live.
        </p>
        <p className="mt-1 text-sm text-slate-500">
          Ungespeicherte Änderungen werden auf diesem Gerät als Entwurf gesichert.
        </p>
        {draftMessage ? (
          <p aria-live="polite" className="mt-1 text-sm text-green-700">
            {draftMessage}
          </p>
        ) : null}
        {hasDraft && hasDraftContent ? (
          <div className="mt-3">
            {isDiscardConfirmationVisible ? (
              <div className="rounded-lg border border-red-200 bg-red-50 p-3">
                <p className="text-sm text-red-800">
                  Entwurf wirklich verwerfen? Ungespeicherte Änderungen gehen verloren.
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={handleDiscardDraft}
                    className="rounded border border-red-700 px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-100"
                  >
                    Entwurf verwerfen
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsDiscardConfirmationVisible(false)}
                    className="rounded border px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
                  >
                    Abbrechen
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setIsDiscardConfirmationVisible(true)}
                className="text-sm font-medium text-red-700 underline hover:text-red-800"
              >
                Entwurf verwerfen
              </button>
            )}
          </div>
        ) : null}

        <div className="mt-4">
          <label
            htmlFor="deck-name"
            className="mb-2 block text-sm font-medium text-slate-700"
          >
            Deckname
          </label>
          <input
            id="deck-name"
            type="text"
            value={deckName}
            onChange={(event) => {
              setDeckName(event.target.value);
              setDraftMessage("");
              setIsDraftDirty(true);
              setHasDraft(true);
            }}
            placeholder="Zum Beispiel: Mein erstes Feuer-Deck"
            className="w-full rounded-lg border px-3 py-2 outline-none focus:ring-2 focus:ring-slate-300"
          />
        </div>

        <div className="mt-4">
          <label
            htmlFor="deck-format"
            className="mb-2 block text-sm font-medium text-slate-700"
          >
            Spielformat
          </label>
          <select
            id="deck-format"
            value={deckFormat}
            onChange={(event) => {
              setDeckFormat(event.target.value as DeckFormat);
              setDraftMessage("");
              setIsDraftDirty(true);
              setHasDraft(true);
            }}
            className="w-full rounded-lg border bg-white px-3 py-2 outline-none focus:ring-2 focus:ring-slate-300"
          >
            <option value="free">Freies Deck</option>
            <option value="standard-2026">Standardformat 2026</option>
          </select>
          <p className="mt-1 text-sm text-slate-500">
            Freie Decks dürfen auch ältere Karten enthalten.
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-4">
          <div className="rounded-xl border bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900">Alle Karten</h2>
            <p className="mt-1 text-sm text-slate-600">
              Fuege Karten mit +1 hinzu oder entferne sie mit -1.
            </p>

            <div className="mt-4">
              <label
                htmlFor="deck-card-search"
                className="mb-2 block text-sm font-medium text-slate-700"
              >
                Karten suchen
              </label>
              <input
                id="deck-card-search"
                type="text"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Zum Beispiel: Pikachu"
                className="w-full rounded-lg border px-3 py-2 outline-none focus:ring-2 focus:ring-slate-300"
              />
            </div>

            <fieldset className="mt-4">
              <legend className="mb-2 text-sm font-medium text-slate-700">
                Kartentyp
              </legend>
              <div className="flex flex-wrap gap-2">
                {cardFilterOptions.map((option) => {
                  const isActive = cardFilter === option.value;

                  return (
                    <button
                      key={option.value}
                      type="button"
                      aria-pressed={isActive}
                      onClick={() => setCardFilter(option.value)}
                      className={
                        isActive
                          ? "rounded-lg bg-slate-900 px-3 py-2 text-sm font-medium text-white"
                          : "rounded-lg border px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
                      }
                    >
                      {option.label}
                    </button>
                  );
                })}
              </div>
            </fieldset>

            <div className="mt-4">
              <button
                type="button"
                aria-pressed={showOwnedOnly}
                onClick={() => setShowOwnedOnly((currentValue) => !currentValue)}
                className={
                  showOwnedOnly
                    ? "rounded-lg bg-slate-900 px-3 py-2 text-sm font-medium text-white"
                    : "rounded-lg border px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
                }
              >
                Nur vorhandene Karten
              </button>
              <button
                type="button"
                aria-pressed={showStandardOnly}
                onClick={() =>
                  setShowStandardOnly((currentValue) => !currentValue)
                }
                className={
                  showStandardOnly
                    ? "ml-2 rounded-lg bg-slate-900 px-3 py-2 text-sm font-medium text-white"
                    : "ml-2 rounded-lg border px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
                }
              >
                Nur Standardformat 2026
              </button>
            </div>

            <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm text-slate-600">
                {filteredCards.length} {filteredCards.length === 1 ? "Karte" : "Karten"}{" "}
                angezeigt
              </p>

              {hasActiveCardFilters ? (
                <button
                  type="button"
                  onClick={resetCardFilters}
                  className="text-sm font-medium text-slate-700 underline hover:text-slate-900"
                >
                  Filter zurücksetzen
                </button>
              ) : null}
            </div>

            <div className="mt-3 space-y-3">
              {filteredCards.length === 0 ? (
                <div className="rounded-lg border p-4 text-sm text-slate-600">
                  Keine Karten gefunden.
                </div>
              ) : null}

              {filteredCards.map((card) => {
                const count = getCardCount(card.id);
                const owned = getOwnedCount(card.id);
                const missing = Math.max(0, count - owned);

                return (
                  <div
                    key={card.id}
                    className="flex items-center justify-between rounded-lg border p-3"
                  >
                    <div>
                      <p className="font-medium text-slate-900">{card.name}</p>
                      <p className="text-sm text-slate-600">
                        {card.supertype}
                        {card.subtype ? ` • ${card.subtype}` : ""}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        Sammlung: {owned} vorhanden • Fehlt fürs Deck: {missing}
                      </p>
                      {!card.legalStandard ? (
                        <p className="mt-1 text-xs font-medium text-amber-700">
                          Nicht im Standardformat 2026 zugelassen
                        </p>
                      ) : null}
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => changeCardCount(card.id, -1)}
                        className="rounded border px-3 py-1 text-sm hover:bg-slate-100"
                      >
                        -1
                      </button>

                      <span className="min-w-8 text-center text-sm font-medium">
                        {count}
                      </span>

                      <button
                        type="button"
                        onClick={() => changeCardCount(card.id, 1)}
                        className="rounded border px-3 py-1 text-sm hover:bg-slate-100"
                      >
                        +1
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-xl border bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900">Deck-Vorschau</h2>
            <p className="mt-1 text-sm text-slate-600">
              Aktuelle Karten in deinem Deck.
            </p>

            <div className="mt-4">
              <p className="text-sm font-medium text-slate-800">
                Gesamtzahl Karten: {totalCards} / 60
              </p>
              <p className="mt-1 text-sm text-slate-600">{deckSizeMessage}</p>
            </div>

            <div className="mt-4 rounded-lg border bg-slate-50 p-3">
              <h3 className="text-sm font-semibold text-slate-900">
                Deck-Zusammensetzung
              </h3>
              <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                {deckComposition.map((section) => (
                  <div key={section.supertype} className="rounded bg-white p-2">
                    <p className="text-xs text-slate-600">{section.label}</p>
                    <p className="mt-1 text-sm font-semibold text-slate-900">
                      {section.count}
                    </p>
                    <p className="text-xs text-slate-500">
                      {totalCards > 0
                        ? Math.round((section.count / totalCards) * 100)
                        : 0}
                      %
                    </p>
                  </div>
                ))}
              </div>
              <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-slate-700">
                {deckCompositionHints.map((hint) => (
                  <li key={hint}>{hint}</li>
                ))}
              </ul>
            </div>

            {startHandHint ? (
              <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm">
                <h3 className="font-semibold text-amber-900">
                  Starthand-Hinweis
                </h3>
                <p className="mt-2 text-amber-900">
                  Mit {startHandHint.basicPokemonCount} Basis-Pokémon liegt die
                  Chance auf mindestens eines in den ersten sieben Karten bei
                  etwa {startHandHint.chance} %. Mehr Basis-Pokémon können
                  Mulligans seltener machen.
                </p>
              </div>
            ) : null}

            {evolutionWarnings.length > 0 ? (
              <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm">
                <h3 className="font-semibold text-amber-900">
                  Entwicklungs-Hinweise
                </h3>
                <ul className="mt-2 list-disc space-y-1 pl-5 text-amber-900">
                  {evolutionWarnings.map((warning) => (
                    <li key={warning}>{warning}</li>
                  ))}
                </ul>
              </div>
            ) : null}

            {missingEnergyTypeWarnings.length > 0 ? (
              <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm">
                <h3 className="font-semibold text-amber-900">
                  Energie-Hinweise
                </h3>
                <ul className="mt-2 list-disc space-y-1 pl-5 text-amber-900">
                  {missingEnergyTypeWarnings.map((warning) => (
                    <li key={warning}>{warning}</li>
                  ))}
                </ul>
              </div>
            ) : null}

            {nonStandardCards.length > 0 ? (
              <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm">
                <h3 className="font-semibold text-amber-900">
                  Standardformat-Hinweis
                </h3>
                <p className="mt-2 text-amber-900">
                  Diese Karten sind nach dem Stand des Standardformats 2026
                  nicht zugelassen. Das Deck kann trotzdem als freies Deck
                  weiterbearbeitet werden.
                </p>
                <ul className="mt-2 list-disc space-y-1 pl-5 text-amber-900">
                  {nonStandardCards.map((card) => (
                    <li key={card.id}>
                      {card.name} ({card.count}x)
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            <div className="mt-4 rounded-lg border bg-slate-50 p-3 text-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-medium text-slate-800">Sammlungsstatus</p>
                <button
                  type="button"
                  onClick={handleRefreshCollection}
                  className="rounded border px-3 py-2 text-sm font-medium text-slate-700 hover:bg-white"
                >
                  Sammlung aktualisieren
                </button>
              </div>
              {collectionMessage ? (
                <p aria-live="polite" className="mt-2 text-sm text-green-700">
                  {collectionMessage}
                </p>
              ) : null}
              {totalCards === 0 ? (
                <p className="mt-1 text-slate-600">
                  Füge Karten hinzu, um dein Deck mit deiner Sammlung abzugleichen.
                </p>
              ) : collectionComparison.isFullyBuildable ? (
                <p className="mt-1 text-green-700">
                  Alle Karten für dieses Deck sind in deiner Sammlung vorhanden.
                </p>
              ) : (
                <>
                  <p className="mt-1 text-red-700">
                    Es fehlen noch {collectionComparison.totalMissingCards} Karten für dieses Deck ({collectionComparison.missingUniqueCards} verschiedene Karten).
                  </p>
                  <ul className="mt-2 space-y-1 text-slate-700">
                    {collectionComparison.items
                      .filter((item) => item.missing > 0)
                      .map((item) => (
                        <li
                          key={item.cardId}
                          className="flex items-center justify-between gap-2"
                        >
                          <span>{item.cardName}</span>
                          <span className="font-medium">Fehlt: {item.missing}</span>
                        </li>
                      ))}
                  </ul>
                  <button
                    type="button"
                    onClick={handleCopyMissingCards}
                    className="mt-3 rounded border px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
                  >
                    Fehlende Karten kopieren
                  </button>
                  {copyMessage ? (
                    <p className="mt-2 text-sm text-slate-600">{copyMessage}</p>
                  ) : null}
                </>
              )}
            </div>

            <div className="mt-4 space-y-4">
              {selectedCards.length === 0 ? (
                <p className="text-sm text-slate-600">
                  Noch keine Karten im Deck.
                </p>
              ) : (
                groupedSelectedCards.map((section) => {
                  if (section.cards.length === 0) {
                    return null;
                  }

                  return (
                    <div key={section.supertype}>
                      <h3 className="mb-2 text-sm font-semibold text-slate-900">
                        {section.label}
                      </h3>

                      <div className="space-y-2">
                        {section.cards.map((card) => (
                          <div
                            key={card.id}
                            className="flex items-center justify-between rounded-lg border p-3"
                          >
                            <div className="flex min-w-0 items-center gap-3">
                              {card.imageSmall ? (
                                <Image
                                  src={card.imageSmall}
                                  alt={
                                    card.name +
                                    " – " +
                                    (card.setName ?? "Pokémon-Karte")
                                  }
                                  width={42}
                                  height={59}
                                  className="h-auto w-11 shrink-0 rounded shadow-sm"
                                />
                              ) : null}
                              <div className="min-w-0">
                                <p className="truncate text-sm text-slate-900">
                                  {card.name}
                                </p>
                                {card.setName ? (
                                  <p className="truncate text-xs text-slate-500">
                                    {card.setName}
                                    {card.cardNumber
                                      ? ` · Nr. ${card.cardNumber}`
                                      : ""}
                                  </p>
                                ) : null}
                              </div>
                            </div>
                            <span className="text-sm font-medium text-slate-700">
                              x{card.count}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <div className="rounded-xl border bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900">Deck-Pruefung</h2>

            <div className="mt-4 space-y-2">
              <p
                className={
                  validationResult.isValid
                    ? "text-sm font-medium text-green-700"
                    : "text-sm font-medium text-red-700"
                }
              >
                {validationResult.isValid ? "Deck ist gueltig." : "Deck ist ungueltig."}
              </p>

              {validationResult.errors.length > 0 ? (
                <ul className="list-disc space-y-1 pl-5 text-sm text-red-700">
                  {validationResult.errors.map((error) => (
                    <li key={error}>{error}</li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-slate-600">Keine Fehler gefunden.</p>
              )}

              {validationResult.warnings.length > 0 ? (
                <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
                  <p className="text-sm font-semibold text-amber-900">
                    Deck-Hinweise
                  </p>
                  <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-amber-900">
                    {validationResult.warnings.map((warning) => (
                      <li key={warning}>{warning}</li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>

            <div className="mt-6">
              <button
                type="button"
                onClick={handleSaveDeck}
                className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
              >
                Deck speichern
              </button>
            </div>

            {saveMessage ? (
              <p className="mt-3 text-sm text-green-700">{saveMessage}</p>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}
