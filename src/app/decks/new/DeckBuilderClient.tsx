"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { sampleCards } from "@/data/sampleCards";
import { getDeckById, upsertDeck } from "@/lib/storage";
import { validateDeck } from "@/lib/validateDeck";
import type { Deck, DeckCard } from "@/types";

function createDeckId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  return `deck-${Date.now()}`;
}

export default function DeckBuilderClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const deckIdFromUrl = searchParams.get("id");

  const [deckId, setDeckId] = useState<string | null>(null);
  const [createdAt, setCreatedAt] = useState<string>("");
  const [deckName, setDeckName] = useState("");
  const [deckCards, setDeckCards] = useState<DeckCard[]>([]);
  const [saveMessage, setSaveMessage] = useState("");

  useEffect(() => {
    if (!deckIdFromUrl) {
      const newId = createDeckId();
      const now = new Date().toISOString();

      setDeckId(newId);
      setCreatedAt(now);
      setDeckName("");
      setDeckCards([]);
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
      return;
    }

    setDeckId(existingDeck.id);
    setCreatedAt(existingDeck.createdAt);
    setDeckName(existingDeck.name);
    setDeckCards(existingDeck.cards);
  }, [deckIdFromUrl]);

  const totalCards = useMemo(() => {
    return deckCards.reduce((sum, entry) => sum + entry.count, 0);
  }, [deckCards]);

  const validationResult = useMemo(() => {
    const deckToValidate: Deck = {
      id: deckId ?? "temporary-deck",
      name: deckName || "Unbenanntes Deck",
      cards: deckCards,
      createdAt: createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    return validateDeck(deckToValidate, sampleCards);
  }, [createdAt, deckCards, deckId, deckName]);

  function getCardCount(cardId: string) {
    const existingEntry = deckCards.find((entry) => entry.cardId === cardId);
    return existingEntry ? existingEntry.count : 0;
  }

  function changeCardCount(cardId: string, change: number) {
    setSaveMessage("");

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

  const selectedCards = useMemo(() => {
    return deckCards
      .map((entry) => {
        const card = sampleCards.find((item) => item.id === entry.cardId);

        if (!card) {
          return null;
        }

        return {
          ...card,
          count: entry.count,
        };
      })
      .filter(Boolean) as Array<(typeof sampleCards)[number] & { count: number }>;
  }, [deckCards]);

  function handleSaveDeck() {
    const finalDeckId = deckId ?? createDeckId();
    const now = new Date().toISOString();

    const deckToSave: Deck = {
      id: finalDeckId,
      name: deckName.trim() || "Unbenanntes Deck",
      cards: deckCards,
      createdAt: createdAt || now,
      updatedAt: now,
    };

    upsertDeck(deckToSave);
    setSaveMessage("Deck wurde gespeichert.");
    router.push("/decks");
  }

  return (
    <section className="space-y-6">
      <div className="rounded-xl border bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-bold text-slate-900">
          {deckIdFromUrl ? "Deck bearbeiten" : "Neues Deck"}
        </h1>
        <p className="mt-2 text-slate-600">
          Erstelle ein Deck, fuege Karten hinzu und pruefe die Grundregeln live.
        </p>

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
            onChange={(event) => setDeckName(event.target.value)}
            placeholder="Zum Beispiel: Mein erstes Feuer-Deck"
            className="w-full rounded-lg border px-3 py-2 outline-none focus:ring-2 focus:ring-slate-300"
          />
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-4">
          <div className="rounded-xl border bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900">Alle Karten</h2>
            <p className="mt-1 text-sm text-slate-600">
              Fuege Karten mit +1 hinzu oder entferne sie mit -1.
            </p>

            <div className="mt-4 space-y-3">
              {sampleCards.map((card) => {
                const count = getCardCount(card.id);

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
                Gesamtzahl Karten: {totalCards}
              </p>
            </div>

            <div className="mt-4 space-y-2">
              {selectedCards.length === 0 ? (
                <p className="text-sm text-slate-600">
                  Noch keine Karten im Deck.
                </p>
              ) : (
                selectedCards.map((card) => (
                  <div
                    key={card.id}
                    className="flex items-center justify-between rounded-lg border p-3"
                  >
                    <span className="text-sm text-slate-900">{card.name}</span>
                    <span className="text-sm font-medium text-slate-700">
                      x{card.count}
                    </span>
                  </div>
                ))
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