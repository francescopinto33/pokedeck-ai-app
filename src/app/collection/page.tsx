"use client";

import { useEffect, useMemo, useState } from "react";
import { sampleCards } from "@/data/sampleCards";
import { getCollection, saveCollection } from "@/lib/storage";
import type { CollectionEntry } from "@/types";

export default function CollectionPage() {
  const [entries, setEntries] = useState<CollectionEntry[]>([]);
  const [search, setSearch] = useState("");
  const [saveMessage, setSaveMessage] = useState("");

  useEffect(() => {
    setEntries(getCollection());
  }, []);

  function getOwnedCount(cardId: string) {
    const entry = entries.find((item) => item.cardId === cardId);
    return entry ? entry.owned : 0;
  }

  function changeOwnedCount(cardId: string, change: number) {
    setSaveMessage("");

    setEntries((currentEntries) => {
      const existingEntry = currentEntries.find((item) => item.cardId === cardId);

      if (!existingEntry && change < 0) {
        return currentEntries;
      }

      if (!existingEntry && change > 0) {
        return [...currentEntries, { cardId, owned: 1 }];
      }

      return currentEntries
        .map((item) => {
          if (item.cardId !== cardId) {
            return item;
          }

          return {
            ...item,
            owned: Math.max(0, item.owned + change),
          };
        })
        .filter((item) => item.owned > 0);
    });
  }

  function handleSaveCollection() {
    saveCollection(entries);
    setSaveMessage("Sammlung wurde gespeichert.");
  }

  const filteredCards = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    if (!normalizedSearch) {
      return sampleCards;
    }

    return sampleCards.filter((card) =>
      card.name.toLowerCase().includes(normalizedSearch)
    );
  }, [search]);

  return (
    <section className="space-y-6">
      <div className="rounded-xl border bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-bold text-slate-900">Sammlung</h1>
        <p className="mt-2 text-slate-600">
          Verwalte hier einfach, welche Karten du besitzt.
        </p>

        <div className="mt-4">
          <label
            htmlFor="collection-search"
            className="mb-2 block text-sm font-medium text-slate-700"
          >
            Karten suchen
          </label>
          <input
            id="collection-search"
            type="text"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Zum Beispiel: Charizard"
            className="w-full rounded-lg border px-3 py-2 outline-none focus:ring-2 focus:ring-slate-300"
          />
        </div>
      </div>

      <div className="rounded-xl border bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-lg font-semibold text-slate-900">
            Karten in deiner Sammlung
          </h2>

          <button
            type="button"
            onClick={handleSaveCollection}
            className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
          >
            Sammlung speichern
          </button>
        </div>

        {saveMessage ? (
          <p className="mt-3 text-sm text-green-700">{saveMessage}</p>
        ) : null}

        <div className="mt-4 space-y-3">
          {filteredCards.length === 0 ? (
            <div className="rounded-lg border p-4 text-sm text-slate-600">
              Keine Karten gefunden.
            </div>
          ) : (
            filteredCards.map((card) => {
              const owned = getOwnedCount(card.id);

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
                      onClick={() => changeOwnedCount(card.id, -1)}
                      className="rounded border px-3 py-1 text-sm hover:bg-slate-100"
                    >
                      -1
                    </button>

                    <span className="min-w-8 text-center text-sm font-medium">
                      {owned}
                    </span>

                    <button
                      type="button"
                      onClick={() => changeOwnedCount(card.id, 1)}
                      className="rounded border px-3 py-1 text-sm hover:bg-slate-100"
                    >
                      +1
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </section>
  );
}