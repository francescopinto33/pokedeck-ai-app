import type { CollectionEntry, Deck } from "@/types";

const DECKS_KEY = "pokedeck-ai-decks";
const COLLECTION_KEY = "pokedeck-ai-collection";

function canUseStorage() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function readJson<T>(key: string, fallback: T): T {
  if (!canUseStorage()) {
    return fallback;
  }

  try {
    const rawValue = window.localStorage.getItem(key);

    if (!rawValue) {
      return fallback;
    }

    return JSON.parse(rawValue) as T;
  } catch {
    return fallback;
  }
}

export function getSavedDecks(): Deck[] {
  return readJson<Deck[]>(DECKS_KEY, []);
}

export function saveDecks(decks: Deck[]): void {
  if (!canUseStorage()) {
    return;
  }

  window.localStorage.setItem(DECKS_KEY, JSON.stringify(decks));
}

export function getDeckById(id: string): Deck | undefined {
  const decks = getSavedDecks();
  return decks.find((deck) => deck.id === id);
}

export function upsertDeck(deck: Deck): Deck[] {
  const decks = getSavedDecks();
  const existingIndex = decks.findIndex((existingDeck) => existingDeck.id === deck.id);

  if (existingIndex >= 0) {
    decks[existingIndex] = deck;
  } else {
    decks.push(deck);
  }

  saveDecks(decks);
  return decks;
}

export function deleteDeck(id: string): Deck[] {
  const updatedDecks = getSavedDecks().filter((deck) => deck.id !== id);
  saveDecks(updatedDecks);
  return updatedDecks;
}

export function getCollection(): CollectionEntry[] {
  return readJson<CollectionEntry[]>(COLLECTION_KEY, []);
}

export function saveCollection(entries: CollectionEntry[]): void {
  if (!canUseStorage()) {
    return;
  }

  window.localStorage.setItem(COLLECTION_KEY, JSON.stringify(entries));
}