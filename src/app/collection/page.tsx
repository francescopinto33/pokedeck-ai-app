"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { getAvailableCards } from "@/lib/availableCards";
import {
  createCollectionCsv,
  mergeCollectionEntries,
  parseCollectionCsv,
  type CollectionCsvPreview,
} from "@/lib/collectionCsv";
import {
  getCollection,
  getImportedCards,
  mergeImportedCards,
  saveCollection,
} from "@/lib/storage";
import type { Card, CollectionEntry } from "@/types";

type CollectionCardFilter = "All" | Card["supertype"];

const collectionCardFilterOptions: Array<{
  value: CollectionCardFilter;
  label: string;
}> = [
  { value: "All", label: "Alle" },
  { value: "Pokemon", label: "Pokémon" },
  { value: "Trainer", label: "Trainer" },
  { value: "Energy", label: "Energie" },
];

const collectionFocusTypeLabels: Record<string, string> = {
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

export default function CollectionPage() {
  const [entries, setEntries] = useState<CollectionEntry[]>([]);
  const [allCards, setAllCards] = useState<Card[]>([]);
  const [search, setSearch] = useState("");
  const [cardFilter, setCardFilter] = useState<CollectionCardFilter>("All");
  const [focusType, setFocusType] = useState<string | null>(null);
  const [isFocusActive, setIsFocusActive] = useState(false);
  const [showOwnedOnly, setShowOwnedOnly] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");
  const [importPreview, setImportPreview] =
    useState<CollectionCsvPreview | null>(null);
  const [importMessage, setImportMessage] = useState("");

  useEffect(() => {
    setEntries(getCollection());
    setAllCards(getAvailableCards());

    const requestedFocusType = new URLSearchParams(
      window.location.search
    ).get("focusType");

    if (
      requestedFocusType &&
      collectionFocusTypeLabels[requestedFocusType]
    ) {
      setFocusType(requestedFocusType);
      setIsFocusActive(true);
      setShowOwnedOnly(true);
    }
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

  async function handleCsvFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    setImportPreview(null);
    setImportMessage("");

    if (!file) {
      return;
    }

    if (file.size > 1_000_000) {
      setImportMessage("Die CSV-Datei darf höchstens 1 MB groß sein.");
      return;
    }

    const content = await file.text();
    const preview = parseCollectionCsv(
      content,
      new Set(allCards.map((card) => card.id))
    );

    setImportPreview(preview);
    if (preview.entries.length === 0) {
      setImportMessage("Keine gültigen Karten zum Übernehmen gefunden.");
    }
  }

  function handleConfirmImport() {
    if (!importPreview || importPreview.entries.length === 0) {
      return;
    }

    const updatedEntries = mergeCollectionEntries(
      entries,
      importPreview.entries
    );

    mergeImportedCards(importPreview.cards);
    setEntries(updatedEntries);
    setAllCards(getAvailableCards());
    saveCollection(updatedEntries);
    setSaveMessage("");
    setImportMessage(
      String(importPreview.entries.length) +
        " Kartenarten wurden zur Sammlung hinzugefügt."
    );
    setImportPreview(null);
  }

  function handleExportCollection() {
    const csv = createCollectionCsv(entries, getImportedCards());
    const file = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const downloadUrl = URL.createObjectURL(file);
    const link = document.createElement("a");

    link.href = downloadUrl;
    link.download = "pokedeck-ai-sammlung.csv";
    link.click();
    URL.revokeObjectURL(downloadUrl);
    setImportMessage("CSV-Datei wurde heruntergeladen.");
  }

  const filteredCards = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return allCards.filter((card) => {
      const matchesSearch =
        !normalizedSearch || card.name.toLowerCase().includes(normalizedSearch);
      const matchesCardType =
        cardFilter === "All" || card.supertype === cardFilter;
      const matchesCollection =
        !showOwnedOnly ||
        entries.some((entry) => entry.cardId === card.id && entry.owned > 0);
      const matchesFocusType =
        !isFocusActive ||
        !focusType ||
        card.supertype === "Trainer" ||
        card.types?.includes(focusType);

      return (
        matchesSearch &&
        matchesCardType &&
        matchesCollection &&
        matchesFocusType
      );
    });
  }, [
    allCards,
    cardFilter,
    entries,
    focusType,
    isFocusActive,
    search,
    showOwnedOnly,
  ]);
  const ownedCardsInFilter = filteredCards.reduce((sum, card) => {
    const owned = entries.find((entry) => entry.cardId === card.id)?.owned ?? 0;

    return sum + owned;
  }, 0);
  const hasActiveFilters =
    search.trim() !== "" ||
    cardFilter !== "All" ||
    showOwnedOnly ||
    isFocusActive;

  function resetCollectionFilters() {
    setSearch("");
    setCardFilter("All");
    setIsFocusActive(false);
    setShowOwnedOnly(false);
  }

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

        <fieldset className="mt-4">
          <legend className="mb-2 text-sm font-medium text-slate-700">
            Kartentyp
          </legend>
          <div className="flex flex-wrap gap-2">
            {collectionCardFilterOptions.map((option) => {
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

        <button
          type="button"
          aria-pressed={showOwnedOnly}
          onClick={() => setShowOwnedOnly((currentValue) => !currentValue)}
          className={
            showOwnedOnly
              ? "mt-4 rounded-lg bg-slate-900 px-3 py-2 text-sm font-medium text-white"
              : "mt-4 rounded-lg border px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
          }
        >
          Nur vorhandene Karten
        </button>

        {isFocusActive && focusType ? (
          <div className="mt-4 flex flex-wrap items-center gap-3 rounded-lg bg-slate-50 p-3 text-sm text-slate-700">
            <span>
              Fokus: {collectionFocusTypeLabels[focusType]}. Gezeigt werden
              deine passenden Pokémon und Energien sowie Trainerkarten.
            </span>
            <button
              type="button"
              onClick={() => {
                setIsFocusActive(false);
                setShowOwnedOnly(false);
              }}
              className="font-medium underline hover:text-slate-900"
            >
              Fokus entfernen
            </button>
          </div>
        ) : null}
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

        <div className="mt-5 rounded-lg border bg-slate-50 p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h3 className="text-sm font-semibold text-slate-900">
                Sammlung per CSV übertragen
              </h3>
              <p className="mt-1 text-sm text-slate-600">
                Erwartet werden die Spalten <code>cardId</code> und{" "}
                <code>owned</code>. Unbekannte Karten werden vor dem Import
                angezeigt und nicht übernommen.
              </p>
            </div>
            <button
              type="button"
              onClick={handleExportCollection}
              className="rounded border px-3 py-2 text-sm font-medium text-slate-700 hover:bg-white"
            >
              CSV herunterladen
            </button>
          </div>

          <label
            htmlFor="collection-csv-import"
            className="mt-4 block text-sm font-medium text-slate-700"
          >
            CSV-Datei auswählen
          </label>
          <input
            id="collection-csv-import"
            type="file"
            accept=".csv,text/csv"
            onChange={handleCsvFile}
            className="mt-2 block w-full text-sm text-slate-700"
          />

          {importPreview ? (
            <div className="mt-4 space-y-2 text-sm text-slate-700">
              <p>
                {importPreview.rowCount} Zeilen geprüft,{" "}
                {importPreview.entries.length} Kartenarten können übernommen
                werden.
              </p>
              {importPreview.errors.length > 0 ? (
                <ul className="list-disc space-y-1 pl-5 text-amber-700">
                  {importPreview.errors.slice(0, 5).map((error) => (
                    <li key={error}>{error}</li>
                  ))}
                </ul>
              ) : null}
              {importPreview.entries.length > 0 ? (
                <button
                  type="button"
                  onClick={handleConfirmImport}
                  className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
                >
                  {importPreview.entries.length} Kartenarten hinzufügen
                </button>
              ) : null}
            </div>
          ) : null}

          {importMessage ? (
            <p aria-live="polite" className="mt-3 text-sm text-green-700">
              {importMessage}
            </p>
          ) : null}
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm text-slate-600">
            {filteredCards.length} {filteredCards.length === 1 ? "Kartenart" : "Kartenarten"}{" "}
            angezeigt · {ownedCardsInFilter} {ownedCardsInFilter === 1 ? "Exemplar" : "Exemplare"}{" "}
            vorhanden
          </p>
          {hasActiveFilters ? (
            <button
              type="button"
              onClick={resetCollectionFilters}
              className="text-sm font-medium text-slate-700 underline hover:text-slate-900"
            >
              Filter zurücksetzen
            </button>
          ) : null}
        </div>

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
                  <div className="flex min-w-0 items-center gap-3">
                    {card.imageSmall ? (
                      <Image
                        src={card.imageSmall}
                        alt={card.name + " – " + (card.setName ?? "Pokémon-Karte")}
                        width={63}
                        height={88}
                        className="h-auto w-16 shrink-0 rounded shadow-sm"
                      />
                    ) : null}
                    <div className="min-w-0">
                      <p className="truncate font-medium text-slate-900">
                        {card.name}
                      </p>
                      <p className="text-sm text-slate-600">
                        {card.supertype}
                        {card.subtype ? ` • ${card.subtype}` : ""}
                      </p>
                      {card.setName ? (
                        <p className="text-sm text-slate-500">
                          {card.setName}
                          {card.cardNumber ? ` · Nr. ${card.cardNumber}` : ""}
                        </p>
                      ) : null}
                    </div>
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
