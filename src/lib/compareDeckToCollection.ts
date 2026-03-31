import type { Card, CollectionEntry, Deck } from "@/types";

export type DeckCollectionComparisonItem = {
  cardId: string;
  cardName: string;
  needed: number;
  owned: number;
  missing: number;
  isComplete: boolean;
};

export type DeckCollectionComparisonResult = {
  items: DeckCollectionComparisonItem[];
  totalMissingCards: number;
  missingUniqueCards: number;
  isFullyBuildable: boolean;
};

export function compareDeckToCollection(
  deck: Deck,
  collection: CollectionEntry[],
  allCards: Card[]
): DeckCollectionComparisonResult {
  const items: DeckCollectionComparisonItem[] = [];

  for (const deckEntry of deck.cards) {
    const card = allCards.find((item) => item.id === deckEntry.cardId);

    if (!card) {
      items.push({
        cardId: deckEntry.cardId,
        cardName: `Unbekannte Karte (${deckEntry.cardId})`,
        needed: deckEntry.count,
        owned: 0,
        missing: deckEntry.count,
        isComplete: false,
      });
      continue;
    }

    const collectionEntry = collection.find(
      (item) => item.cardId === deckEntry.cardId
    );

    const owned = collectionEntry ? collectionEntry.owned : 0;
    const missing = Math.max(0, deckEntry.count - owned);

    items.push({
      cardId: card.id,
      cardName: card.name,
      needed: deckEntry.count,
      owned,
      missing,
      isComplete: missing === 0,
    });
  }

  const totalMissingCards = items.reduce((sum, item) => sum + item.missing, 0);
  const missingUniqueCards = items.filter((item) => item.missing > 0).length;

  return {
    items,
    totalMissingCards,
    missingUniqueCards,
    isFullyBuildable: totalMissingCards === 0,
  };
}